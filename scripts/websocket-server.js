// ============================================
// Socket.IO Server for AuraTicTac Multiplayer
// Run with: node scripts/websocket-server.js
// Port: 3001
// Nginx proxies /ws -> 3001, so Socket.IO path is /ws/socket.io
// ============================================

import { createServer } from "http"
import { Server } from "socket.io"
import mysql from "mysql2/promise"

const PORT = Number(process.env.WS_PORT || 3001)

function generateSessionId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Database configuration
const dbConfig = {
  host: "45.45.239.13",
  port: 3306,
  user: "auratictactoe_user",
  password: "TicTacToeAura2010@",
  database: "auratictactoe",
}

// Game sessions storage
const sessions = new Map()

// Database connection pool
let pool

async function initDB() {
  pool = mysql.createPool(dbConfig)
  console.log("Database connected")
}

function checkWinner(board) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ]

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] }
    }
  }
  return { winner: null, line: null }
}

async function getOrCreatePlayer(connection, username) {
  const [rows] = await connection.execute("SELECT id FROM players WHERE username = ?", [username])
  if (rows.length > 0) return rows[0].id

  const [result] = await connection.execute(
    "INSERT INTO players (username, created_at, last_active) VALUES (?, NOW(), NOW())",
    [username],
  )
  return result.insertId
}

async function updatePlayerStats(connection, playerId, winner, playerSymbol) {
  let wins = 0,
    losses = 0,
    draws = 0

  if (winner === "D") {
    draws = 1
  } else if (winner === playerSymbol) {
    wins = 1
  } else if (winner && winner !== playerSymbol) {
    losses = 1
  }

  await connection.execute(
    "UPDATE players SET total_games = total_games + 1, wins = wins + ?, losses = losses + ?, draws = draws + ?, last_active = NOW() WHERE id = ?",
    [wins, losses, draws, playerId],
  )
}

async function saveGameToDB(session) {
  try {
    if (!pool) return
    const connection = await pool.getConnection()

    const playerXId = await getOrCreatePlayer(connection, session.playerX.name)
    const playerOId = session.playerO ? await getOrCreatePlayer(connection, session.playerO.name) : null

    const boardState = session.board.map((cell) => cell || "-").join("")
    // NOTE: In the current MySQL schema, games.session_id is VARCHAR(6) (room-code sized)
    // and may also be UNIQUE. Rematches in the same room need a different id per completed game.
    // So we generate a fresh 6-char id for each saved game and retry on rare collisions.
    const insertSql =
      "INSERT INTO games (session_id, player_x_id, player_o_id, mode, board_state, current_turn, winner, status, created_at, updated_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())"

    let result
    let attempts = 0
    while (attempts < 5) {
      attempts += 1
      const gameSessionId = generateSessionId()
      try {
        ;[result] = await connection.execute(insertSql, [
          gameSessionId,
          playerXId,
          playerOId,
          "multiplayer",
          boardState,
          session.currentPlayer,
          session.winner,
          "completed",
        ])
        break
      } catch (error) {
        if (error?.code === "ER_DUP_ENTRY") continue
        throw error
      }
    }

    if (!result) {
      throw new Error("Failed to allocate a unique session_id for game insert")
    }

    if (playerXId) await updatePlayerStats(connection, playerXId, session.winner, "X")
    if (playerOId) await updatePlayerStats(connection, playerOId, session.winner, "O")

    connection.release()
    console.log("Game saved to database:", result.insertId)
  } catch (error) {
    console.error("Error saving game to database:", error)
  }
}

function getSessionOrNull(sessionId) {
  const session = sessions.get(sessionId)
  return session || null
}

function sessionToPublicState(session) {
  return {
    players: {
      X: session.playerX?.name,
      O: session.playerO?.name,
    },
    board: session.board,
    currentPlayer: session.currentPlayer,
    scores: session.scores,
  }
}

const server = createServer((req, res) => {
  // Important: do NOT immediately 404 unknown URLs here, because Socket.IO/Engine.IO
  // also uses normal HTTP requests on the same server for its handshake.
  if (req.url === "/health") {
    res.writeHead(200)
    res.end("socket.io server healthy")
    return
  }

  // Give Socket.IO a chance to handle its own routes first.
  setImmediate(() => {
    if (res.writableEnded) return
    res.writeHead(404)
    res.end()
  })
})

const io = new Server(server, {
  path: "/ws/socket.io",
  cors: {
    origin: true,
    credentials: true,
  },
})

io.on("connection", (socket) => {
  const sessionId = String(socket.handshake.query.session || "").trim().toUpperCase()
  const playerName = String(socket.handshake.query.player || "").trim()
  const join = String(socket.handshake.query.join || "false") === "true"

  if (!sessionId || !playerName) {
    socket.emit("session_error", { code: "missing_params", message: "Missing session or player name" })
    socket.disconnect(true)
    return
  }

  let session = getSessionOrNull(sessionId)
  let symbol

  if (join) {
    if (!session) {
      socket.emit("session_error", { code: "not_found", message: "Session not found" })
      socket.disconnect(true)
      return
    }
    if (session.playerO) {
      socket.emit("session_error", { code: "full", message: "Session is full" })
      socket.disconnect(true)
      return
    }

    symbol = "O"
    session.playerO = { name: playerName, socketId: socket.id }
    session.status = "active"
  } else {
    if (session) {
      // If someone tries to "create" a session that already exists, treat it as join if possible.
      if (!session.playerO) {
        symbol = "O"
        session.playerO = { name: playerName, socketId: socket.id }
        session.status = "active"
      } else {
        socket.emit("session_error", { code: "full", message: "Session is full" })
        socket.disconnect(true)
        return
      }
    } else {
      symbol = "X"
      session = {
        id: sessionId,
        playerX: { name: playerName, socketId: socket.id },
        playerO: null,
        board: Array(9).fill(null),
        currentPlayer: "X",
        status: "waiting",
        winner: null,
        winningLine: null,
        scores: { X: 0, O: 0 },
        createdAt: new Date(),
      }
      sessions.set(sessionId, session)

      socket.data.sessionId = sessionId
      socket.data.symbol = symbol
      socket.data.playerName = playerName

      socket.join(sessionId)
    }
  }

  socket.data.sessionId = sessionId
  socket.data.symbol = symbol
  socket.data.playerName = playerName
  socket.join(sessionId)

  // Always tell this socket its assigned symbol/session.
  // (Without this, the joiner would never learn they are "O" when game_start is broadcast.)
  socket.emit("session_created", { sessionId, symbol, playerName, scores: session.scores })

  // If both players are present, start (or resume) the game.
  if (session.playerX && session.playerO) {
    io.to(sessionId).emit("game_start", sessionToPublicState(session))
  }

  socket.on("move", async ({ position }) => {
    const currentSessionId = socket.data.sessionId
    const currentSymbol = socket.data.symbol
    const currentSession = getSessionOrNull(currentSessionId)

    if (!currentSession) {
      socket.emit("error_message", { message: "Session not found" })
      return
    }
    if (currentSession.status !== "active") {
      socket.emit("error_message", { message: "Game not active" })
      return
    }
    if (currentSession.currentPlayer !== currentSymbol) {
      socket.emit("error_message", { message: "Not your turn" })
      return
    }
    if (typeof position !== "number" || position < 0 || position > 8) {
      socket.emit("error_message", { message: "Invalid position" })
      return
    }
    if (currentSession.board[position] !== null) {
      socket.emit("error_message", { message: "Cell already taken" })
      return
    }

    currentSession.board[position] = currentSymbol

    const { winner, line } = checkWinner(currentSession.board)
    const isDraw = !winner && currentSession.board.every((cell) => cell !== null)

    if (winner || isDraw) {
      currentSession.status = "completed"
      currentSession.winner = winner || "D"
      currentSession.winningLine = line

      if (winner === "X" || winner === "O") {
        currentSession.scores[winner] = (currentSession.scores[winner] || 0) + 1
      }

      await saveGameToDB(currentSession)

      io.to(currentSessionId).emit("game_over", {
        board: currentSession.board,
        winner,
        winningLine: line,
        isDraw,
        scores: currentSession.scores,
      })
      return
    }

    currentSession.currentPlayer = currentSession.currentPlayer === "X" ? "O" : "X"
    io.to(currentSessionId).emit("move_made", {
      board: currentSession.board,
      currentPlayer: currentSession.currentPlayer,
      lastMove: { position, symbol: currentSymbol },
      scores: currentSession.scores,
    })
  })

  socket.on("rematch", () => {
    const currentSessionId = socket.data.sessionId
    const currentSession = getSessionOrNull(currentSessionId)
    if (!currentSession) return

    currentSession.board = Array(9).fill(null)
    currentSession.currentPlayer = "X"
    currentSession.status = currentSession.playerX && currentSession.playerO ? "active" : "waiting"
    currentSession.winner = null
    currentSession.winningLine = null

    io.to(currentSessionId).emit("rematch_start", {
      board: currentSession.board,
      currentPlayer: currentSession.currentPlayer,
      scores: currentSession.scores,
    })
  })

  socket.on("disconnect", () => {
    const currentSessionId = socket.data.sessionId
    const currentSymbol = socket.data.symbol
    const currentSession = getSessionOrNull(currentSessionId)
    if (!currentSession) return

    if (currentSymbol === "X" && currentSession.playerX?.socketId === socket.id) {
      currentSession.playerX = null
    }
    if (currentSymbol === "O" && currentSession.playerO?.socketId === socket.id) {
      currentSession.playerO = null
    }

    io.to(currentSessionId).emit("player_disconnected", {
      player: socket.data.playerName,
      symbol: currentSymbol,
    })

    if (currentSession.status !== "completed") {
      currentSession.status = "waiting"
    }

    // Cleanup abandoned sessions after 60 seconds (if not rejoined).
    setTimeout(() => {
      const s = getSessionOrNull(currentSessionId)
      if (!s) return
      if (s.status === "completed") return
      if (s.playerX || s.playerO) return
      sessions.delete(currentSessionId)
    }, 60000)
  })
})

// Cleanup old sessions periodically
setInterval(() => {
  const now = new Date()
  for (const [sessionId, session] of sessions) {
    const age = now - session.createdAt
    if (age > 3600000) {
      sessions.delete(sessionId)
    }
  }
}, 60000)

server.listen(PORT, async () => {
  console.log(`Socket.IO server running on port ${PORT}`)
  await initDB()
})
