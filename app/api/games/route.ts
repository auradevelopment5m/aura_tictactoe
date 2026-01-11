import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { playerName, result, mode, difficulty, sessionId, winner, boardState, currentTurn } = body

    if (typeof playerName !== "string" || !playerName.trim()) {
      return NextResponse.json({ error: "playerName is required" }, { status: 400 })
    }

    // Ensure player exists
    let playerId = await getOrCreatePlayer(playerName.trim())

    // Determine winner based on result for single player
    let gameWinner = winner
    if (mode === 'single') {
      if (result === 'win') gameWinner = 'X'
      else if (result === 'loss') gameWinner = 'O'
      else if (result === 'draw') gameWinner = 'D'
    }

    // Insert game
    const gameQuery = `
      INSERT INTO games (session_id, player_x_id, mode, difficulty, board_state, current_turn, winner, status, created_at, updated_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', NOW(), NOW(), NOW())
    `
    const gameValues = [sessionId || null, playerId, mode, difficulty || null, boardState || '---------', currentTurn || 'X', gameWinner]

    const gameResult = await query(gameQuery, gameValues)
    const gameId = (gameResult as any).insertId

    // Update player stats
    await updatePlayerStats(playerId, gameWinner, mode === 'single' ? 'X' : null)

    return NextResponse.json({ success: true, gameId })
  } catch (error) {
    console.error("Failed to save game:", error)
    return NextResponse.json({ error: "Failed to save game" }, { status: 500 })
  }
}

async function getOrCreatePlayer(username: string): Promise<number> {
  // Check if player exists
  const selectQuery = `SELECT id FROM players WHERE username = ?`
  const players = await query(selectQuery, [username])

  if ((players as any[]).length > 0) {
    return (players as any[])[0].id
  }

  // Create new player
  const insertQuery = `INSERT INTO players (username, created_at, last_active) VALUES (?, NOW(), NOW())`
  const result = await query(insertQuery, [username])
  return (result as any).insertId
}

async function updatePlayerStats(playerId: number, winner: string | null, playerSymbol: string | null) {
  let wins = 0, losses = 0, draws = 0

  if (winner === 'D') {
    draws = 1
  } else if (playerSymbol && winner === playerSymbol) {
    wins = 1
  } else if (playerSymbol && winner && winner !== playerSymbol) {
    losses = 1
  }

  const updateQuery = `
    UPDATE players 
    SET total_games = total_games + 1, 
        wins = wins + ?, 
        losses = losses + ?, 
        draws = draws + ?, 
        last_active = NOW() 
    WHERE id = ?
  `
  await query(updateQuery, [wins, losses, draws, playerId])
}

export async function GET() {
  // For now, return empty array or implement if needed
  return NextResponse.json({ games: [] })
}
