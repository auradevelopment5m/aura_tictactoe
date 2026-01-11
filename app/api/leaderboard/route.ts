import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get("mode") || "all"

    let leaderboardQuery: string

    if (mode === "all") {
      // Use aggregate stats from players table for "all" mode
      leaderboardQuery = `
        SELECT 
          username as playerName,
          wins as wins,
          losses as losses,
          draws as draws,
          (wins + losses + draws) as totalGames,
          CASE 
            WHEN (wins + losses + draws) > 0 
            THEN ROUND((wins * 100.0 / (wins + losses + draws)), 1)
            ELSE 0 
          END as winRate
        FROM players
        WHERE (wins + losses + draws) > 0
        ORDER BY wins DESC, winRate DESC, totalGames DESC, playerName ASC
        LIMIT 50
      `
    } else {
      // Calculate stats from games table filtered by mode
      leaderboardQuery = `
        SELECT 
          p.username as playerName,
          COALESCE(SUM(CASE 
            WHEN (g.player_x_id = p.id AND g.winner = 'X') OR (g.player_o_id = p.id AND g.winner = 'O') 
            THEN 1 ELSE 0 
          END), 0) as wins,
          COALESCE(SUM(CASE 
            WHEN (g.player_x_id = p.id AND g.winner = 'O') OR (g.player_o_id = p.id AND g.winner = 'X') 
            THEN 1 ELSE 0 
          END), 0) as losses,
          COALESCE(SUM(CASE WHEN g.winner = 'D' THEN 1 ELSE 0 END), 0) as draws,
          COUNT(g.id) as totalGames,
          CASE 
            WHEN COUNT(g.id) > 0 
            THEN ROUND(
              (SUM(CASE 
                WHEN (g.player_x_id = p.id AND g.winner = 'X') OR (g.player_o_id = p.id AND g.winner = 'O') 
                THEN 1 ELSE 0 
              END) * 100.0 / COUNT(g.id)), 1)
            ELSE 0 
          END as winRate
        FROM players p
        INNER JOIN games g ON (g.player_x_id = p.id OR g.player_o_id = p.id)
        WHERE g.mode = ? AND g.status = 'completed'
        GROUP BY p.id, p.username
        HAVING COUNT(g.id) > 0
        ORDER BY wins DESC, winRate DESC, totalGames DESC, playerName ASC
        LIMIT 50
      `
    }

    const leaderboard = mode === "all" 
      ? await query(leaderboardQuery)
      : await query(leaderboardQuery, [mode === "single" ? "single" : "multiplayer"])

    // Add ranks and ensure winRate is a number
    const rankedLeaderboard = (leaderboard as any[]).map((player, index) => ({
      ...player,
      rank: index + 1,
      wins: Number(player.wins) || 0,
      losses: Number(player.losses) || 0,
      draws: Number(player.draws) || 0,
      totalGames: Number(player.totalGames) || 0,
      winRate: typeof player.winRate === "number" ? player.winRate : parseFloat(player.winRate) || 0,
    }))

    return NextResponse.json({
      leaderboard: rankedLeaderboard,
      mode,
    })
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error)
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 })
  }
}
