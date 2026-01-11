"use client"

import { useState, useEffect, useCallback, useMemo, memo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GameBoard } from "@/components/game-board"
import { ArrowLeft, RotateCcw, Bot, User, Sparkles, Zap, Brain } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

type CellValue = "X" | "O" | null
type Difficulty = "easy" | "medium" | "hard"
type GameStatus = "playing" | "won" | "lost" | "draw"

interface SinglePlayerGameProps {
  playerName: string
  onBack: () => void
  onGameEnd?: () => void
}

// Winning line combinations
const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6], // Diagonals
] as const

const checkWinner = (board: CellValue[]): { winner: CellValue; line: number[] | null } => {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] }
    }
  }
  return { winner: null, line: null }
}

const getAvailableMoves = (board: CellValue[]): number[] => {
  const moves: number[] = []
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) moves.push(i)
  }
  return moves
}

// Minimax with alpha-beta pruning (memoized)
const minimax = (
  board: CellValue[],
  depth: number,
  isMaximizing: boolean,
  alpha: number,
  beta: number
): number => {
  const { winner } = checkWinner(board)
  if (winner === "O") return 10 - depth
  if (winner === "X") return depth - 10
  
  const available = getAvailableMoves(board)
  if (available.length === 0) return 0

  if (isMaximizing) {
    let maxEval = -Infinity
    for (const move of available) {
      board[move] = "O"
      const evaluation = minimax(board, depth + 1, false, alpha, beta)
      board[move] = null
      maxEval = Math.max(maxEval, evaluation)
      alpha = Math.max(alpha, evaluation)
      if (beta <= alpha) break
    }
    return maxEval
  } else {
    let minEval = Infinity
    for (const move of available) {
      board[move] = "X"
      const evaluation = minimax(board, depth + 1, true, alpha, beta)
      board[move] = null
      minEval = Math.min(minEval, evaluation)
      beta = Math.min(beta, evaluation)
      if (beta <= alpha) break
    }
    return minEval
  }
}

const getAIMove = (board: CellValue[], difficulty: Difficulty): number => {
  const available = getAvailableMoves(board)
  if (available.length === 0) return -1

  // Easy: pure random
  if (difficulty === "easy") {
    return available[Math.floor(Math.random() * available.length)]
  }

  // Medium: 30% random, 70% optimal
  if (difficulty === "medium" && Math.random() < 0.3) {
    return available[Math.floor(Math.random() * available.length)]
  }

  // Find best move using minimax
  let bestMove = available[0]
  let bestValue = -Infinity
  const boardCopy = [...board]

  for (const move of available) {
    boardCopy[move] = "O"
    const moveValue = minimax(boardCopy, 0, false, -Infinity, Infinity)
    boardCopy[move] = null
    
    if (moveValue > bestValue) {
      bestValue = moveValue
      bestMove = move
    }
  }

  return bestMove
}

// Stat Card Component
const StatCard = memo(function StatCard({
  label,
  value,
  colorClass,
}: {
  label: string
  value: number
  colorClass: string
}) {
  return (
    <div className="flex flex-col items-center p-3 sm:p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-border/50 transition-all hover:border-border">
      <span className="text-xs sm:text-sm text-muted-foreground font-medium">{label}</span>
      <span className={cn("font-mono text-xl sm:text-2xl font-bold", colorClass)}>{value}</span>
    </div>
  )
})

// Difficulty Icon Component
const DifficultyIcon = memo(function DifficultyIcon({ difficulty }: { difficulty: Difficulty }) {
  switch (difficulty) {
    case "easy":
      return <Zap className="w-4 h-4 text-green-400" />
    case "medium":
      return <Sparkles className="w-4 h-4 text-yellow-400" />
    case "hard":
      return <Brain className="w-4 h-4 text-red-400" />
  }
})

export function SinglePlayerGame({ playerName, onBack, onGameEnd }: SinglePlayerGameProps) {
  const [board, setBoard] = useState<CellValue[]>(Array(9).fill(null))
  const [currentPlayer, setCurrentPlayer] = useState<"X" | "O">("X")
  const [difficulty, setDifficulty] = useState<Difficulty>("medium")
  const [gameStatus, setGameStatus] = useState<GameStatus>("playing")
  const [winningLine, setWinningLine] = useState<number[] | null>(null)
  const [stats, setStats] = useState({ wins: 0, losses: 0, draws: 0 })
  const [isAIThinking, setIsAIThinking] = useState(false)
  const { toast } = useToast()

  const resetGame = useCallback(() => {
    setBoard(Array(9).fill(null))
    setCurrentPlayer("X")
    setGameStatus("playing")
    setWinningLine(null)
    setIsAIThinking(false)
  }, [])

  const saveGameResult = useCallback(
    async (result: "win" | "loss" | "draw") => {
      try {
        const boardState = board.map((cell) => cell || "-").join("")
        await fetch("/api/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerName,
            result,
            mode: "single",
            difficulty,
            boardState,
            currentTurn: currentPlayer,
          }),
        })
        // Notify parent to refresh stats
        onGameEnd?.()
      } catch (error) {
        console.error("Failed to save game result:", error)
      }
    },
    [board, currentPlayer, difficulty, playerName, onGameEnd]
  )

  const handleCellClick = useCallback(
    (index: number) => {
      if (board[index] || gameStatus !== "playing" || currentPlayer !== "X" || isAIThinking) return

      const newBoard = [...board]
      newBoard[index] = "X"
      setBoard(newBoard)

      const { winner, line } = checkWinner(newBoard)
      if (winner) {
        setWinningLine(line)
        setGameStatus("won")
        setStats((prev) => ({ ...prev, wins: prev.wins + 1 }))
        saveGameResult("win")
        toast({
          title: "🎉 Victory!",
          description: "You beat the AI! Great job!",
        })
        return
      }

      if (getAvailableMoves(newBoard).length === 0) {
        setGameStatus("draw")
        setStats((prev) => ({ ...prev, draws: prev.draws + 1 }))
        saveGameResult("draw")
        toast({
          title: "🤝 Draw!",
          description: "It's a tie game.",
        })
        return
      }

      setCurrentPlayer("O")
      setIsAIThinking(true)
    },
    [board, currentPlayer, gameStatus, isAIThinking, saveGameResult, toast]
  )

  // AI move effect
  useEffect(() => {
    if (currentPlayer === "O" && gameStatus === "playing" && isAIThinking) {
      const timer = setTimeout(() => {
        const aiMove = getAIMove(board, difficulty)
        if (aiMove === -1) {
          setIsAIThinking(false)
          return
        }

        const newBoard = [...board]
        newBoard[aiMove] = "O"
        setBoard(newBoard)
        setIsAIThinking(false)

        const { winner, line } = checkWinner(newBoard)
        if (winner) {
          setWinningLine(line)
          setGameStatus("lost")
          setStats((prev) => ({ ...prev, losses: prev.losses + 1 }))
          saveGameResult("loss")
          toast({
            title: "😔 Defeat!",
            description: "The AI wins this round. Try again!",
          })
          return
        }

        if (getAvailableMoves(newBoard).length === 0) {
          setGameStatus("draw")
          setStats((prev) => ({ ...prev, draws: prev.draws + 1 }))
          saveGameResult("draw")
          toast({
            title: "🤝 Draw!",
            description: "It's a tie game.",
          })
          return
        }

        setCurrentPlayer("X")
      }, 400 + Math.random() * 300) // Slight randomness for natural feel

      return () => clearTimeout(timer)
    }
  }, [currentPlayer, board, gameStatus, difficulty, isAIThinking, saveGameResult, toast])

  // Compute game over state
  const isGameOver = gameStatus !== "playing"
  
  // Status message
  const statusMessage = useMemo(() => {
    if (gameStatus === "won") return { text: "You Win!", color: "text-green-400" }
    if (gameStatus === "lost") return { text: "AI Wins!", color: "text-red-400" }
    if (gameStatus === "draw") return { text: "Draw!", color: "text-yellow-400" }
    if (isAIThinking) return { text: "AI is thinking...", color: "text-muted-foreground" }
    return { text: "Your turn", color: "text-cyan-400" }
  }, [gameStatus, isAIThinking])

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
          
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/60 backdrop-blur-sm border border-border/50">
            <DifficultyIcon difficulty={difficulty} />
            <span className="text-sm font-medium capitalize">{difficulty}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatCard label="Wins" value={stats.wins} colorClass="text-green-400" />
          <StatCard label="Losses" value={stats.losses} colorClass="text-red-400" />
          <StatCard label="Draws" value={stats.draws} colorClass="text-yellow-400" />
        </div>

        {/* Game Card */}
        <Card className="bg-card/70 backdrop-blur-md border-border/50 shadow-xl">
          <CardContent className="p-4 sm:p-6">
            {/* Players Header */}
            <div className="flex items-center justify-between mb-4">
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all",
                currentPlayer === "X" && gameStatus === "playing"
                  ? "bg-cyan-500/20 border border-cyan-500/40"
                  : "bg-muted/30"
              )}>
                <User className="w-4 h-4" />
                <span className="text-sm font-medium truncate max-w-[80px] sm:max-w-[100px]">{playerName}</span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-cyan-500/30 text-cyan-400">X</span>
              </div>
              
              <span className="text-xs text-muted-foreground">vs</span>
              
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all",
                currentPlayer === "O" && gameStatus === "playing"
                  ? "bg-rose-500/20 border border-rose-500/40"
                  : "bg-muted/30"
              )}>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-400">O</span>
                <span className="text-sm font-medium">AI</span>
                <Bot className={cn("w-4 h-4", isAIThinking && "animate-pulse")} />
              </div>
            </div>

            {/* Status Indicator */}
            <div className="text-center mb-4">
              <span className={cn(
                "inline-block px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                isGameOver ? "bg-muted/50" : "bg-muted/30"
              )}>
                <span className={statusMessage.color}>{statusMessage.text}</span>
              </span>
            </div>

            {/* Game Board */}
            <div className="flex justify-center">
              <GameBoard
                board={board}
                onCellClick={handleCellClick}
                disabled={currentPlayer !== "X" || gameStatus !== "playing" || isAIThinking}
                winningLine={winningLine}
                currentPlayer={currentPlayer}
                size="md"
              />
            </div>
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="flex gap-2 sm:gap-3">
          <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
            <SelectTrigger className="bg-card/60 backdrop-blur-sm border-border/50 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-green-400" />
                  Easy
                </span>
              </SelectItem>
              <SelectItem value="medium">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  Medium
                </span>
              </SelectItem>
              <SelectItem value="hard">
                <span className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-red-400" />
                  Hard
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            onClick={resetGame}
            variant="outline"
            className="flex-1 bg-card/60 backdrop-blur-sm border-border/50 hover:bg-muted/50 gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>New Game</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
