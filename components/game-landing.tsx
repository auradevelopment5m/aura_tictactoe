"use client"

import { useEffect, useMemo, useState, useCallback, memo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SinglePlayerGame } from "@/components/single-player-game"
import { MultiplayerGame } from "@/components/multiplayer-game"
import { Leaderboard } from "@/components/leaderboard"
import { usePlayerStats, type PlayerStats } from "@/hooks/use-player-stats"
import { 
  User, Users, Trophy, Zap, Play, Crown, Star, ChevronDown, 
  Codesandbox, Sparkles, Target, TrendingUp
} from "lucide-react"
import { cn } from "@/lib/utils"

type GameMode = "menu" | "single" | "multi-create" | "multi-join"
type MenuSelection = "single" | "multi-create" | "multi-join"

// Stat Badge Component
const StatBadge = memo(function StatBadge({
  label,
  value,
  colorClass,
  icon: Icon,
}: {
  label: string
  value: number | string
  colorClass: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex flex-col items-center p-2 sm:p-2.5 rounded-lg bg-muted/50 min-w-[60px]">
      <div className="flex items-center gap-1">
        {Icon && <Icon className={cn("w-3 h-3", colorClass)} />}
        <span className={cn("font-mono text-base sm:text-lg font-bold", colorClass)}>{value}</span>
      </div>
      <span className="text-[10px] sm:text-xs text-muted-foreground">{label}</span>
    </div>
  )
})

// Game Mode Card Component
const GameModeCard = memo(function GameModeCard({
  title,
  description,
  icon: Icon,
  colorClass,
  isSelected,
  onClick,
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  colorClass: string
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      className={cn(
        "bg-card/80 backdrop-blur-sm border border-border/60 cursor-pointer group",
        "transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]",
        "hover:shadow-xl rounded-xl overflow-hidden",
        isSelected && "ring-2 ring-primary/50 border-primary/30"
      )}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <CardHeader className="text-center p-3 sm:p-4">
        <div className={cn(
          "mx-auto mb-2 sm:mb-3 p-2.5 sm:p-3 rounded-xl transition-all duration-300",
          `bg-${colorClass}/10 border border-${colorClass}/20`,
          `group-hover:bg-${colorClass}/20 group-hover:shadow-lg group-hover:shadow-${colorClass}/20`
        )}>
          <Icon className={cn("w-5 h-5 sm:w-6 sm:h-6 mx-auto", `text-${colorClass}`)} />
        </div>
        <CardTitle className="text-sm sm:text-base font-semibold">{title}</CardTitle>
        <CardDescription className="text-[10px] sm:text-xs">{description}</CardDescription>
      </CardHeader>
    </Card>
  )
})

// Top Players Dropdown Content
const TopPlayersContent = memo(function TopPlayersContent({
  myStats,
  topPlayers,
  onViewLeaderboard,
}: {
  myStats: PlayerStats | null
  topPlayers: PlayerStats[]
  onViewLeaderboard: () => void
}) {
  return (
    <div className="p-4 space-y-4">
      {/* Your Stats */}
      <div className="text-center">
        <h3 className="font-bold text-foreground mb-3 flex items-center justify-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Your Stats
        </h3>
        <div className="grid grid-cols-4 gap-2">
          <StatBadge 
            label="Rank" 
            value={myStats ? `#${myStats.rank}` : "—"} 
            colorClass="text-amber-400"
            icon={Trophy}
          />
          <StatBadge 
            label="Wins" 
            value={myStats?.wins ?? 0} 
            colorClass="text-green-400"
          />
          <StatBadge 
            label="Losses" 
            value={myStats?.losses ?? 0} 
            colorClass="text-red-400"
          />
          <StatBadge 
            label="Draws" 
            value={myStats?.draws ?? 0} 
            colorClass="text-yellow-400"
          />
        </div>
      </div>

      {/* Top Players */}
      <div className="border-t border-border/50 pt-3">
        <h4 className="font-semibold text-foreground mb-2.5 flex items-center justify-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Top Players
        </h4>
        <div className="space-y-2">
          {topPlayers.length > 0 ? (
            topPlayers.map((p, idx) => (
              <div 
                key={`${p.playerName}-${p.rank}`} 
                className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  {idx === 0 ? (
                    <Crown className="w-4 h-4 text-yellow-400" />
                  ) : (
                    <Star className={cn("w-4 h-4", idx === 1 ? "text-gray-400" : "text-amber-600")} />
                  )}
                  <span className="text-sm font-medium">{p.playerName}</span>
                </div>
                <span className="text-sm text-green-400 font-mono font-bold">{p.wins}W</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">No players yet</p>
          )}
        </div>
      </div>

      {/* View Leaderboard Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onViewLeaderboard}
        className="w-full bg-gradient-to-r from-yellow-400/10 to-amber-500/10 border-yellow-400/30 hover:border-yellow-400/50 transition-all"
      >
        <Trophy className="w-4 h-4 mr-2 text-yellow-400" />
        View Full Leaderboard
      </Button>
    </div>
  )
})

export function GameLanding() {
  const [hasHydrated, setHasHydrated] = useState(false)
  const [gameMode, setGameMode] = useState<GameMode>("menu")
  const [menuSelection, setMenuSelection] = useState<MenuSelection>("single")
  const [usernameDraft, setUsernameDraft] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [showRankDropdown, setShowRankDropdown] = useState(false)
  const [transitionPhase, setTransitionPhase] = useState<"idle" | "fading-out" | "fading-in">("idle")
  const [username, setUsername] = useState("")
  const [showUsernameSetup, setShowUsernameSetup] = useState(false)

  // Use the player stats hook for data fetching
  const { stats: myStats, leaderboard, refetch: refetchStats } = usePlayerStats({
    username,
    enabled: hasHydrated && !!username,
  })

  // Get top players for dropdown (excluding current user)
  const topPlayersForDropdown = useMemo(() => {
    return leaderboard
      .filter((p) => p.playerName?.toLowerCase() !== username.toLowerCase())
      .slice(0, 3)
  }, [leaderboard, username])

  useEffect(() => {
    setHasHydrated(true)
    const savedUsername = localStorage.getItem("auratictactoe_username")
    if (savedUsername) {
      setUsername(savedUsername)
      setShowUsernameSetup(false)
    } else {
      setShowUsernameSetup(true)
    }
  }, [])

  const saveUsername = useCallback(async () => {
    if (!usernameDraft.trim()) return

    try {
      const response = await fetch("/api/check-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameDraft.trim() }),
      })
      const data = await response.json()

      if (!data.available) {
        alert("Username already taken. Please choose another one.")
        return
      }

      localStorage.setItem("auratictactoe_username", usernameDraft.trim())
      setUsername(usernameDraft.trim())
      setShowUsernameSetup(false)
      setUsernameDraft("")
    } catch (error) {
      console.error("Error checking username:", error)
      alert("Error checking username. Please try again.")
    }
  }, [usernameDraft])

  const transitionToGame = useCallback((mode: GameMode) => {
    if (!hasHydrated) return
    if (!username) {
      setShowUsernameSetup(true)
      return
    }
    setTransitionPhase("fading-out")
    setTimeout(() => {
      setGameMode(mode)
      setTransitionPhase("idle")
    }, 200)
  }, [hasHydrated, username])

  const backToMenu = useCallback(() => {
    setTransitionPhase("fading-out")
    setTimeout(() => {
      setGameMode("menu")
      setTransitionPhase("fading-in")
      // Refresh stats when returning to menu
      refetchStats()
      setTimeout(() => setTransitionPhase("idle"), 200)
    }, 200)
  }, [refetchStats])

  const handleGameEnd = useCallback(() => {
    // Refresh player stats after a game ends
    refetchStats()
  }, [refetchStats])

  const transitionToLeaderboard = useCallback(() => {
    const isPC = window.innerWidth >= 1024
    if (!isPC) {
      window.location.href = "/leaderboard"
    }
  }, [])

  // Render game views
  if (gameMode === "single") {
    return (
      <div className={cn(
        "transition-opacity duration-200",
        transitionPhase === "fading-out" ? "opacity-0" : "opacity-100"
      )}>
        <SinglePlayerGame 
          playerName={username} 
          onBack={backToMenu}
          onGameEnd={handleGameEnd}
        />
      </div>
    )
  }

  if (gameMode === "multi-create" || gameMode === "multi-join") {
    return (
      <div className={cn(
        "transition-opacity duration-200",
        transitionPhase === "fading-out" ? "opacity-0" : "opacity-100"
      )}>
        <MultiplayerGame
          playerName={username}
          sessionId={gameMode === "multi-join" ? sessionId : undefined}
          onBack={backToMenu}
          onGameEnd={handleGameEnd}
        />
      </div>
    )
  }

  // Username setup modal
  if (showUsernameSetup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat blur-sm opacity-20"
          style={{ backgroundImage: "url('/background/bg.jpeg')" }}
        />
        
        <Card className="w-full max-w-md bg-card/95 backdrop-blur-md border border-border/50 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Welcome to AuraTicTac!
              </CardTitle>
            </div>
            <CardDescription className="text-sm">
              Choose a unique username to start playing. This will be your identity in the game.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">Username</Label>
              <Input
                id="username"
                placeholder="Enter your username"
                value={usernameDraft}
                onChange={(e) => setUsernameDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveUsername()}
                className="bg-background/50 border-border/50 focus:border-primary"
                autoFocus
              />
            </div>
            <Button
              onClick={saveUsername}
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 font-semibold"
              disabled={!usernameDraft.trim()}
            >
              <Play className="w-4 h-4 mr-2" />
              Start Playing
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main menu
  return (
    <div className={cn(
      "min-h-screen bg-background lg:flex lg:flex-row relative overflow-hidden transition-opacity duration-200",
      transitionPhase !== "idle" ? "opacity-0" : "opacity-100"
    )}>
      {/* Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] sm:bg-[size:64px_64px]" />
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat blur-sm opacity-20"
        style={{ backgroundImage: "url('/background/bg.jpeg')" }}
      />

      {/* Inline Leaderboard for PC */}
      <div className="hidden lg:flex lg:flex-col lg:w-[28rem] xl:w-[32rem] lg:border-r lg:border-border/30 lg:bg-background/95 lg:backdrop-blur-sm">
        <div className="flex-1 p-4 overflow-y-auto">
          <Leaderboard 
            onBack={() => {}} 
            isPCView={true}
            onRefresh={refetchStats}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <div className="relative z-20 flex justify-between items-center p-3 sm:p-4">
          {/* Rank Dropdown - Mobile only */}
          <div className="lg:hidden">
            <DropdownMenu open={showRankDropdown} onOpenChange={setShowRankDropdown}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-card/80 backdrop-blur-sm border-border/50 hover:bg-card gap-2"
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="font-medium">
                    {myStats ? `#${myStats.rank}` : "Unranked"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="w-72 bg-card/95 backdrop-blur-md border-border/50" 
                align="start"
              >
                <TopPlayersContent
                  myStats={myStats}
                  topPlayers={topPlayersForDropdown}
                  onViewLeaderboard={transitionToLeaderboard}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* User Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur-sm border border-border/50">
            <User className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium truncate max-w-[120px]">
              {hasHydrated ? username : ""}
            </span>
          </div>
        </div>

        {/* Main Game Interface */}
        <div className="flex-1 relative z-10 p-3 sm:p-4 pb-6 flex flex-col justify-center">
          <div className="max-w-lg mx-auto w-full space-y-5 sm:space-y-6">
            {/* Hero Section */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                <Codesandbox className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white/90" />
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
                  <span className="text-green-400">Aura</span>
                  <span className="text-red-400">Tic</span>
                  <span className="text-white">Tac</span>
                </h1>
              </div>
              <p className="text-white/60 text-sm font-medium">
                Modern Tic-Tac-Toe Experience
              </p>
            </div>

            {/* Welcome Card */}
            <Card className="bg-card/70 backdrop-blur-md border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-cyan-500/20">
                    <User className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Welcome back,</p>
                    <p className="text-base font-bold">{hasHydrated ? username : ""}</p>
                  </div>
                </div>
                {myStats && (
                  <div className="flex gap-2">
                    <StatBadge label="Wins" value={myStats.wins} colorClass="text-green-400" />
                    <StatBadge label="Rate" value={`${myStats.winRate.toFixed(0)}%`} colorClass="text-primary" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Game Mode Selection */}
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground text-center">
                Select Game Mode
              </h2>
              
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <GameModeCard
                  title="Single Player"
                  description="vs AI"
                  icon={Zap}
                  colorClass="yellow-500"
                  isSelected={menuSelection === "single"}
                  onClick={() => setMenuSelection("single")}
                />
                <GameModeCard
                  title="Create Room"
                  description="Host game"
                  icon={Users}
                  colorClass="cyan-500"
                  isSelected={menuSelection === "multi-create"}
                  onClick={() => setMenuSelection("multi-create")}
                />
                <GameModeCard
                  title="Join Room"
                  description="Enter code"
                  icon={Codesandbox}
                  colorClass="purple-500"
                  isSelected={menuSelection === "multi-join"}
                  onClick={() => setMenuSelection("multi-join")}
                />
              </div>
            </div>

            {/* Session Code Input (for joining) */}
            {menuSelection === "multi-join" && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Room Code</Label>
                <Input
                  placeholder="Enter 6-digit code"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value.toUpperCase())}
                  className="bg-card/70 backdrop-blur-sm border-border/50 font-mono tracking-[0.2em] text-center uppercase text-lg h-12"
                  maxLength={6}
                  inputMode="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                />
              </div>
            )}

            {/* Play Button */}
            <Button
              className={cn(
                "w-full h-12 sm:h-14 font-bold text-base sm:text-lg shadow-lg transition-all duration-300",
                "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500",
                "border border-green-400/30 hover:border-green-400/50",
                "hover:shadow-xl hover:shadow-green-500/20",
                "active:scale-[0.98]"
              )}
              onClick={() => transitionToGame(menuSelection)}
              disabled={!hasHydrated || (menuSelection === "multi-join" && sessionId.trim().length !== 6)}
            >
              <Play className="w-5 h-5 mr-2" />
              {menuSelection === "single" && "Start Single Player"}
              {menuSelection === "multi-create" && "Create Room"}
              {menuSelection === "multi-join" && "Join Room"}
            </Button>

            {/* Mobile Leaderboard Link */}
            <div className="lg:hidden">
              <Button
                variant="outline"
                className="w-full bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70"
                onClick={transitionToLeaderboard}
              >
                <Trophy className="w-4 h-4 mr-2 text-yellow-400" />
                View Leaderboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
