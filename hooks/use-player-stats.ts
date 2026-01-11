"use client"

import { useCallback, useEffect, useState, useRef } from "react"

export interface PlayerStats {
  rank: number
  playerName: string
  wins: number
  losses: number
  draws: number
  winRate: number
  totalGames: number
}

interface UsePlayerStatsOptions {
  username: string
  enabled?: boolean
  refetchInterval?: number | null
}

interface UsePlayerStatsReturn {
  stats: PlayerStats | null
  leaderboard: PlayerStats[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function usePlayerStats({
  username,
  enabled = true,
  refetchInterval = null,
}: UsePlayerStatsOptions): UsePlayerStatsReturn {
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [leaderboard, setLeaderboard] = useState<PlayerStats[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchStats = useCallback(async () => {
    if (!username || !enabled) return

    // Cancel any pending request
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/leaderboard?mode=all", {
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard")
      }

      const data = await response.json()
      const entries: PlayerStats[] = data.leaderboard || []

      setLeaderboard(entries)

      // Find current user's stats
      const userStats = entries.find(
        (e) => e.playerName?.toLowerCase() === username.toLowerCase()
      )
      setStats(userStats || null)
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return // Ignore abort errors
      }
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [username, enabled])

  // Initial fetch
  useEffect(() => {
    void fetchStats()

    return () => {
      abortControllerRef.current?.abort()
    }
  }, [fetchStats])

  // Optional interval-based refetch
  useEffect(() => {
    if (!refetchInterval || !enabled) return

    const intervalId = setInterval(() => {
      void fetchStats()
    }, refetchInterval)

    return () => clearInterval(intervalId)
  }, [refetchInterval, enabled, fetchStats])

  return {
    stats,
    leaderboard,
    isLoading,
    error,
    refetch: fetchStats,
  }
}
