"use client"

import { memo, useCallback } from "react"
import { cn } from "@/lib/utils"

type CellValue = "X" | "O" | null

interface GameBoardProps {
  board: CellValue[]
  onCellClick: (index: number) => void
  disabled?: boolean
  winningLine?: number[] | null
  currentPlayer?: "X" | "O"
  size?: "sm" | "md" | "lg"
}

const Cell = memo(function Cell({
  value,
  index,
  isWinning,
  isClickable,
  onClick,
  size,
}: {
  value: CellValue
  index: number
  isWinning: boolean
  isClickable: boolean
  onClick: () => void
  size: "sm" | "md" | "lg"
}) {
  const sizeClasses = {
    sm: "text-2xl sm:text-3xl",
    md: "text-3xl sm:text-4xl md:text-5xl",
    lg: "text-4xl sm:text-5xl md:text-6xl",
  }

  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      aria-label={`Cell ${index + 1}${value ? `, ${value}` : ", empty"}`}
      className={cn(
        "aspect-square rounded-xl border-2 border-border/60 bg-card/60 backdrop-blur-sm",
        "flex items-center justify-center font-bold transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        sizeClasses[size],
        isClickable && "hover:bg-muted/60 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 cursor-pointer active:scale-95",
        isWinning && "bg-green-500/20 border-green-500/60 shadow-lg shadow-green-500/30 animate-pulse",
        !isClickable && value === null && "cursor-not-allowed opacity-40",
        value === "X" && "text-cyan-400",
        value === "O" && "text-rose-400"
      )}
    >
      {value && (
        <span
          className={cn(
            "transform transition-all duration-300",
            "drop-shadow-md",
            isWinning && "scale-110 drop-shadow-lg"
          )}
        >
          {value}
        </span>
      )}
    </button>
  )
})

export const GameBoard = memo(function GameBoard({
  board,
  onCellClick,
  disabled = false,
  winningLine = null,
  currentPlayer,
  size = "md",
}: GameBoardProps) {
  const handleCellClick = useCallback(
    (index: number) => {
      if (!disabled && board[index] === null) {
        onCellClick(index)
      }
    },
    [disabled, board, onCellClick]
  )

  const sizeClasses = {
    sm: "max-w-[200px] sm:max-w-[240px]",
    md: "max-w-[260px] sm:max-w-[300px] md:max-w-[340px]",
    lg: "max-w-[300px] sm:max-w-[360px] md:max-w-[400px]",
  }

  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-2 sm:gap-3 w-full aspect-square p-2 sm:p-3 rounded-2xl bg-muted/30 backdrop-blur-sm border border-border/30",
        sizeClasses[size]
      )}
      role="grid"
      aria-label="Tic-tac-toe board"
    >
      {board.map((cell, index) => {
        const isWinning = winningLine?.includes(index) ?? false
        const isClickable = !disabled && cell === null

        return (
          <Cell
            key={index}
            value={cell}
            index={index}
            isWinning={isWinning}
            isClickable={isClickable}
            onClick={() => handleCellClick(index)}
            size={size}
          />
        )
      })}
    </div>
  )
})
