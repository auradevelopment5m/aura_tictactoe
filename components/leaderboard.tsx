"use client"

import { useCallback, useEffect, useState, memo, useMemo } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowLeft, Trophy, Medal, Award, Loader2, RefreshCw, TrendingUp, Gamepad2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LeaderboardEntry {
  rank: number
  playerName: string
  wins: number
  losses: number
  draws: number
  winRate: number
  totalGames: number
}

interface LeaderboardProps {
  onBack: () => void
  isPCView?: boolean
  onRefresh?: () => void
}

type LeaderboardMode = "all" | "single" | "multiplayer"

// Rank Icon Component
const RankIcon = memo(function RankIcon({ rank }: { rank: number }) {
  switch (rank) {
    case 1:
      return (
        <div className="relative">
          <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 drop-shadow-lg" />
          <div className="absolute inset-0 animate-ping opacity-30">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
          </div>
        </div>
      )
    case 2:
      return <Medal className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300 drop-shadow-md" />
    case 3:
      return <Award className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 drop-shadow-md" />
    default:
      return (
        <span className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-sm font-mono text-muted-foreground font-bold">
          {rank}
        </span>
      )
  }
})

// Leaderboard Row Component
const LeaderboardRow = memo(function LeaderboardRow({
  entry,
  isTopThree,
  isPCView,
}: {
  entry: LeaderboardEntry
  isTopThree: boolean
  isPCView: boolean
}) {
  const winRateColor = entry.winRate >= 60 
    ? "text-green-400" 
    : entry.winRate >= 40 
      ? "text-yellow-400" 
      : "text-muted-foreground"

  return (
    <div
      className={cn(
        "grid gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-all",
        isPCView
          ? "grid-cols-[40px_1fr_50px_50px_60px]"
          : "grid-cols-[32px_1fr_36px_36px_48px] sm:grid-cols-[40px_1fr_48px_48px_60px]",
        isTopThree
          ? "bg-gradient-to-r from-muted/40 via-muted/20 to-transparent border border-border/50"
          : "hover:bg-muted/20"
      )}
    >
      <div className="flex items-center justify-center">
        <RankIcon rank={entry.rank} />
      </div>
      
      <div className="flex items-center min-w-0">
        <span className={cn(
          "font-medium truncate",
          isPCView ? "text-sm" : "text-xs sm:text-sm",
          isTopThree && "font-semibold"
        )}>
          {entry.playerName}
        </span>
      </div>
      
      <div className={cn(
        "text-center font-mono font-bold text-green-400",
        isPCView ? "text-sm" : "text-xs sm:text-sm"
      )}>
        {entry.wins}
      </div>
      
      <div className={cn(
        "text-center font-mono font-bold text-red-400",
        isPCView ? "text-sm" : "text-xs sm:text-sm"
      )}>
        {entry.losses}
      </div>
      
      <div className={cn(
        "text-right font-mono font-bold",
        isPCView ? "text-sm" : "text-xs sm:text-sm",
        winRateColor
      )}>
        {entry.winRate.toFixed(0)}%
      </div>
    </div>
  )
})

// Empty State Component
const EmptyState = memo(function EmptyState({ isPCView }: { isPCView: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
      <div className="relative mb-4">
        <Gamepad2 className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/30" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary/20 rounded-full animate-pulse" />
      </div>
      <p className={cn(
        "font-medium text-muted-foreground",
        isPCView ? "text-sm" : "text-sm sm:text-base"
      )}>
        No games played yet
      </p>
      <p className="text-xs text-muted-foreground/60 mt-1">
        Be the first to claim the top spot!
      </p>
    </div>
  )
})

// Loading State Component  
const LoadingState = memo(function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16">
      <div className="relative">
        <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-primary/60" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-primary/20 animate-ping" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-4">Loading leaderboard...</p>
    </div>
  )
})

export function Leaderboard({ onBack, isPCView = false, onRefresh }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [mode, setMode] = useState<LeaderboardMode>("all")

  const fetchLeaderboard = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setIsRefreshing(!showLoading)
    
    try {
      const res = await fetch(`/api/leaderboard?mode=${mode}`, {
        cache: "no-store",
      })
      const data = await res.json()
      setEntries(data.leaderboard || [])
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error)
      setEntries([])
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [mode])

  useEffect(() => {
    void fetchLeaderboard()
  }, [fetchLeaderboard])

  const handleModeChange = useCallback((newMode: string) => {
    if (newMode === "all" || newMode === "single" || newMode === "multiplayer") {
      setMode(newMode)
    }
  }, [])

  const handleRefresh = useCallback(() => {
    void fetchLeaderboard(false)
    onRefresh?.()
  }, [fetchLeaderboard, onRefresh])

  // Memoize the header row for better performance
  const headerRow = useMemo(() => (
    <div className={cn(
      "grid gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 text-xs font-medium text-muted-foreground border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-10",
      isPCView
        ? "grid-cols-[40px_1fr_50px_50px_60px]"
        : "grid-cols-[32px_1fr_36px_36px_48px] sm:grid-cols-[40px_1fr_48px_48px_60px]"
    )}>
      <div className="text-center">#</div>
      <div>Player</div>
      <div className="text-center">W</div>
      <div className="text-center">L</div>
      <div className="text-right">Rate</div>
    </div>
  ), [isPCView])

  return (
    <div className={cn(
      "w-full space-y-4 sm:space-y-5",
      isPCView ? "h-full px-2" : "max-w-lg mx-auto px-3 sm:px-4"
    )}>
      {/* Header */}
      {!isPCView && (
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
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="hover:bg-muted/50"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      )}

      {/* Title Section */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Trophy className={cn(
            "text-yellow-400",
            isPCView ? "w-5 h-5 sm:w-6 sm:h-6" : "w-6 h-6 sm:w-7 sm:h-7"
          )} />
          <h2 className={cn(
            "font-bold tracking-tight",
            isPCView ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"
          )}>
            Leaderboard
          </h2>
        </div>
        <p className={cn(
          "text-muted-foreground flex items-center justify-center gap-1",
          isPCView ? "text-xs" : "text-xs sm:text-sm"
        )}>
          <TrendingUp className="w-3 h-3" />
          Top players ranked by wins
        </p>
        
        {/* Refresh button for PC view */}
        {isPCView && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="mt-2 hover:bg-muted/50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        )}
      </div>

      {/* Mode Tabs */}
      <Tabs value={mode} onValueChange={handleModeChange}>
        <TabsList className="grid w-full grid-cols-3 bg-card/60 backdrop-blur-sm border border-border/50 p-1 rounded-lg">
          <TabsTrigger 
            value="all"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md text-xs sm:text-sm"
          >
            All
          </TabsTrigger>
          <TabsTrigger 
            value="single"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md text-xs sm:text-sm"
          >
            Single
          </TabsTrigger>
          <TabsTrigger 
            value="multiplayer"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md text-xs sm:text-sm"
          >
            Multi
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Leaderboard Content */}
      <div className={cn(
        "rounded-xl border border-border/50 overflow-hidden",
        isPCView ? "bg-card/40" : "bg-card/60 backdrop-blur-md shadow-lg"
      )}>
        {loading ? (
          <LoadingState />
        ) : entries.length === 0 ? (
          <EmptyState isPCView={isPCView} />
        ) : (
          <div>
            {headerRow}
            <ScrollArea className={cn(isPCView ? "h-[28rem]" : "h-72 sm:h-80")}>
              <div className="space-y-1 p-2">
                {entries.map((entry, index) => (
                  <LeaderboardRow
                    key={`${entry.playerName}-${entry.rank}`}
                    entry={entry}
                    isTopThree={index < 3}
                    isPCView={isPCView}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Stats Legend */}
      {!isPCView && (
        <div className="flex items-center justify-center gap-4 text-xs py-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-muted-foreground">Wins</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-muted-foreground">Losses</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-muted-foreground">Win Rate</span>
          </div>
        </div>
      )}

      {/* Support Section */}
      <div className={cn(
        "rounded-xl border border-border/50 p-4 sm:p-5 text-center",
        isPCView ? "bg-card/30" : "bg-card/60 backdrop-blur-md"
      )}>
        <p className={cn(
          "text-muted-foreground mb-3",
          isPCView ? "text-xs sm:text-sm" : "text-sm"
        )}>
          Enjoying AuraTicTac? Support the development! 🎮
        </p>
        <Button
          variant="outline"
          size="default"
          className="hover:bg-primary/10 hover:border-primary/50 transition-all gap-2"
          onClick={() => window.open("https://ko-fi.com/zlexif", "_blank")}
        >
          <Image
            src="/kofi.png"
            alt="Ko-fi"
            width={20}
            height={20}
            className="w-4 h-4 sm:w-5 sm:h-5"
          />
          Support on Ko-fi
        </Button>

        <p className="mt-3 text-xs text-muted-foreground">
          Developed by{" "}
          <button
            type="button"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
            onClick={() => window.open("https://ko-fi.com/zlexif", "_blank")}
          >
            zlexif
          </button>
        </p>
      </div>
    </div>
  )
}
