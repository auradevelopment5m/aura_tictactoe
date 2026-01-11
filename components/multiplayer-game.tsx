"use client"

import { useState, useEffect, useCallback, useRef, memo, useMemo } from "react"
import { io, type Socket } from "socket.io-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { GameBoard } from "@/components/game-board"
import { ArrowLeft, RotateCcw, Copy, Check, Loader2, Users, Wifi, WifiOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

type CellValue = "X" | "O" | null

interface MultiplayerGameProps {
  playerName: string
  sessionId?: string
  onBack: () => void
  onGameEnd?: () => void
}

interface GameState {
  board: CellValue[]
  currentPlayer: "X" | "O"
  players: { X?: string; O?: string }
  winner: CellValue
  winningLine: number[] | null
  isDraw: boolean
}

type Scores = { X: number; O: number }

const generateSessionId = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Connection Status Badge Component
const ConnectionBadge = memo(function ConnectionBadge({ isConnected }: { isConnected: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
      isConnected 
        ? "bg-green-500/20 text-green-400 border border-green-500/30" 
        : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
    )}>
      {isConnected ? (
        <>
          <Wifi className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Connected</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          <span className="hidden sm:inline">Connecting...</span>
        </>
      )}
    </div>
  )
})

// Score Display Component
const ScoreDisplay = memo(function ScoreDisplay({
  label,
  score,
  isActive,
  colorClass,
}: {
  label: string
  score: number
  isActive: boolean
  colorClass: string
}) {
  return (
    <div className={cn(
      "flex flex-col items-center p-2 sm:p-3 rounded-lg transition-all",
      isActive ? `${colorClass} border` : "bg-muted/30"
    )}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-lg sm:text-xl font-bold">{score}</span>
    </div>
  )
})

export function MultiplayerGame({ playerName, sessionId: joinSessionId, onBack, onGameEnd }: MultiplayerGameProps) {
  const [sessionId, setSessionId] = useState(joinSessionId || generateSessionId())
  const [playerSymbol, setPlayerSymbol] = useState<"X" | "O" | null>(null)
  const playerSymbolRef = useRef<"X" | "O" | null>(null)
  const [scores, setScores] = useState<Scores>({ X: 0, O: 0 })
  const [gameState, setGameState] = useState<GameState>({
    board: Array(9).fill(null),
    currentPlayer: "X",
    players: {},
    winner: null,
    winningLine: null,
    isDraw: false,
  })
  const [isConnected, setIsConnected] = useState(false)
  const [isWaiting, setIsWaiting] = useState(true)
  const [copied, setCopied] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    playerSymbolRef.current = playerSymbol
  }, [playerSymbol])

  const getSocketUrl = useCallback(() => {
    const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL
    if (envUrl) return envUrl
    if (typeof window === "undefined") return ""

    // Local dev convenience (Next on 3000, Socket.IO server on 3001)
    if ((window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") && window.location.port === "3000") {
      return "http://localhost:3001"
    }

    // Production via nginx: same origin, but Socket.IO path is /ws/socket.io
    return window.location.origin
  }, [])

  const connectSocket = useCallback(() => {
    // Ensure we don't keep multiple live sockets if this re-runs.
    socketRef.current?.disconnect()

    const socketUrl = getSocketUrl()
    const socket = io(socketUrl, {
      path: "/ws/socket.io",
      transports: ["websocket"],
      query: {
        session: sessionId,
        player: playerName,
        join: joinSessionId ? "true" : "false",
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    socket.on("connect", () => {
      setIsConnected(true)
    })

    socket.on("connect_error", (err) => {
      setIsConnected(false)
      setIsWaiting(true)
      toast({
        title: "Socket Connection Failed",
        description: `Server: ${socketUrl}\n${
          err instanceof Error
            ? err.message
            : "Could not connect to multiplayer server. Check NEXT_PUBLIC_SOCKET_URL and WS_CORS_ORIGIN."
        }`,
        variant: "destructive",
      })
    })

    socket.on("disconnect", () => {
      setIsConnected(false)
      setIsWaiting(true)
    })

    socket.on("session_error", (payload: { code: string; message: string }) => {
      toast({ title: "Session Error", description: payload.message, variant: "destructive" })
      socket.disconnect()
      onBack()
    })

    socket.on("error_message", (payload: { message: string }) => {
      toast({ title: "Error", description: payload.message, variant: "destructive" })
    })

    socket.on(
      "session_created",
      (payload: { sessionId: string; symbol: "X" | "O"; playerName: string; scores?: Scores }) => {
        setPlayerSymbol(payload.symbol)
        setSessionId(payload.sessionId)
        setIsWaiting(true)
        if (payload.scores) setScores(payload.scores)

        setGameState((prev) => ({
          ...prev,
          players: payload.symbol === "X" ? { X: payload.playerName } : { O: payload.playerName },
        }))

        if (payload.symbol === "X") {
          toast({ title: "🎮 Session Created", description: `Share code: ${payload.sessionId}` })
        } else {
          toast({ title: "🎮 Joined Session", description: `Joined code: ${payload.sessionId}` })
        }
      }
    )

    socket.on(
      "game_start",
      (payload: {
        players: { X?: string; O?: string }
        board: CellValue[]
        currentPlayer: "X" | "O"
        scores?: Scores
      }) => {
        setIsWaiting(false)
        if (payload.scores) setScores(payload.scores)
        setGameState((prev) => ({
          ...prev,
          players: payload.players,
          board: payload.board,
          currentPlayer: payload.currentPlayer,
          winner: null,
          winningLine: null,
          isDraw: false,
        }))
        toast({ title: "🚀 Game Start", description: "Opponent joined. Good luck!" })
      }
    )

    socket.on(
      "move_made",
      (payload: {
        board: CellValue[]
        currentPlayer: "X" | "O"
        lastMove: { position: number; symbol: "X" | "O" }
        scores?: Scores
      }) => {
        if (payload.scores) setScores(payload.scores)
        setGameState((prev) => ({
          ...prev,
          board: payload.board,
          currentPlayer: payload.currentPlayer,
        }))
      }
    )

    socket.on(
      "game_over",
      (payload: {
        board: CellValue[]
        winner: CellValue
        winningLine: number[] | null
        isDraw: boolean
        scores?: Scores
      }) => {
        if (payload.scores) setScores(payload.scores)
        setGameState((prev) => ({
          ...prev,
          board: payload.board,
          winner: payload.winner,
          winningLine: payload.winningLine,
          isDraw: payload.isDraw,
        }))

        // Notify parent to refresh stats
        onGameEnd?.()

        if (payload.isDraw) {
          toast({ title: "🤝 Draw!", description: "It's a tie game." })
        } else if (payload.winner && payload.winner === playerSymbolRef.current) {
          toast({ title: "🎉 Victory!", description: "You won the game!" })
        } else {
          toast({ title: "😔 Defeat!", description: "Your opponent won." })
        }
      }
    )

    socket.on("rematch_start", (payload: { board: CellValue[]; currentPlayer: "X" | "O"; scores?: Scores }) => {
      if (payload.scores) setScores(payload.scores)
      setGameState((prev) => ({
        ...prev,
        board: payload.board,
        currentPlayer: payload.currentPlayer,
        winner: null,
        winningLine: null,
        isDraw: false,
      }))
    })

    socket.on("player_disconnected", (payload: { player: string; symbol: "X" | "O" }) => {
      toast({ title: "👋 Player Left", description: `${payload.player} left the game.`, variant: "destructive" })
      setIsWaiting(true)
    })
  }, [joinSessionId, onBack, playerName, sessionId, getSocketUrl, onGameEnd, toast])

  useEffect(() => {
    connectSocket()
    const socket = socketRef.current
    return () => {
      socket?.disconnect()
    }
  }, [connectSocket])

  const handleCellClick = useCallback(
    (index: number) => {
      if (!playerSymbol || gameState.board[index] || gameState.winner || gameState.isDraw) return
      if (gameState.currentPlayer !== playerSymbol) return
      if (isWaiting) return

      // Server-authoritative move
      socketRef.current?.emit("move", { position: index })
    },
    [playerSymbol, gameState, isWaiting]
  )

  const resetGame = useCallback(() => {
    socketRef.current?.emit("rematch")
  }, [])

  const copySessionId = useCallback(() => {
    navigator.clipboard.writeText(sessionId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({ title: "📋 Copied!", description: "Session ID copied to clipboard" })
  }, [sessionId, toast])

  const isMyTurn = playerSymbol === gameState.currentPlayer
  const gameOver = gameState.winner !== null || gameState.isDraw

  // Status message
  const statusMessage = useMemo(() => {
    if (gameState.winner === playerSymbol) return { text: "You Win!", color: "text-green-400" }
    if (gameState.isDraw) return { text: "Draw!", color: "text-yellow-400" }
    if (gameOver) return { text: "You Lose!", color: "text-red-400" }
    if (isMyTurn) return { text: "Your turn", color: "text-green-400" }
    return { text: "Opponent's turn...", color: "text-muted-foreground" }
  }, [gameState.winner, gameState.isDraw, gameOver, isMyTurn, playerSymbol])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] sm:bg-[size:64px_64px]" />

      <div className="relative z-10 w-full max-w-md space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="hover:bg-muted/50 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          
          <ConnectionBadge isConnected={isConnected} />
        </div>

        {/* Session Info Card */}
        <Card className="bg-card/70 backdrop-blur-md border-border/50 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Session ID</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={copySessionId}
                className="h-7 px-2 hover:bg-muted/50"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
            <div className="font-mono text-xl sm:text-2xl tracking-[0.25em] text-center py-3 bg-muted/40 rounded-lg border border-border/50">
              {sessionId}
            </div>
          </CardContent>
        </Card>

        {/* Waiting State */}
        {isWaiting && (
          <Card className="bg-card/70 backdrop-blur-md border-border/50">
            <CardContent className="py-10 sm:py-12 text-center">
              <div className="relative mb-6">
                <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin mx-auto text-primary/60" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-primary/20 animate-ping" />
                </div>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground font-medium">
                {joinSessionId ? "Joining session..." : "Waiting for opponent..."}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-2">
                {joinSessionId ? "Getting ready to play" : "Share the session ID above"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Game Area */}
        {!isWaiting && (
          <>
            {/* Scores */}
            <div className="grid grid-cols-2 gap-3">
              <ScoreDisplay
                label={`${gameState.players.X || "Player X"} (X)`}
                score={scores.X}
                isActive={gameState.currentPlayer === "X" && !gameOver}
                colorClass="bg-cyan-500/20 border-cyan-500/40"
              />
              <ScoreDisplay
                label={`${gameState.players.O || "Player O"} (O)`}
                score={scores.O}
                isActive={gameState.currentPlayer === "O" && !gameOver}
                colorClass="bg-rose-500/20 border-rose-500/40"
              />
            </div>

            {/* Game Card */}
            <Card className="bg-card/70 backdrop-blur-md border-border/50 shadow-xl">
              <CardContent className="p-4 sm:p-6">
                {/* Players Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all",
                    gameState.currentPlayer === "X" && !gameOver
                      ? "bg-cyan-500/20 border border-cyan-500/40"
                      : "bg-muted/30"
                  )}>
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium truncate max-w-[70px] sm:max-w-[100px]">
                      {gameState.players.X || "..."}
                    </span>
                    <span className={cn(
                      "text-xs font-bold px-1.5 py-0.5 rounded",
                      playerSymbol === "X" ? "bg-cyan-500 text-white" : "bg-cyan-500/30 text-cyan-400"
                    )}>
                      X
                    </span>
                  </div>

                  <span className="text-xs text-muted-foreground">vs</span>

                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all",
                    gameState.currentPlayer === "O" && !gameOver
                      ? "bg-rose-500/20 border border-rose-500/40"
                      : "bg-muted/30"
                  )}>
                    <span className={cn(
                      "text-xs font-bold px-1.5 py-0.5 rounded",
                      playerSymbol === "O" ? "bg-rose-500 text-white" : "bg-rose-500/30 text-rose-400"
                    )}>
                      O
                    </span>
                    <span className="text-sm font-medium truncate max-w-[70px] sm:max-w-[100px]">
                      {gameState.players.O || "..."}
                    </span>
                    <Users className="w-4 h-4" />
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="text-center mb-4">
                  <span className={cn(
                    "inline-block px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                    gameOver ? "bg-muted/50" : "bg-muted/30"
                  )}>
                    <span className={statusMessage.color}>{statusMessage.text}</span>
                  </span>
                </div>

                {/* Game Board */}
                <div className="flex justify-center">
                  <GameBoard
                    board={gameState.board}
                    onCellClick={handleCellClick}
                    disabled={!isMyTurn || gameOver}
                    winningLine={gameState.winningLine}
                    currentPlayer={gameState.currentPlayer}
                    size="md"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Reset Button */}
            <Button
              onClick={resetGame}
              variant="outline"
              className="w-full bg-card/60 backdrop-blur-sm border-border/50 hover:bg-muted/50 gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              New Game
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
