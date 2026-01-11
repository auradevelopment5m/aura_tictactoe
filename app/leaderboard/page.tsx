"use client"

import { useState, useCallback } from "react"
import { Leaderboard } from "@/components/leaderboard"

export default function LeaderboardPage() {
  const [isTransitioningBack, setIsTransitioningBack] = useState(false)

  const handleBack = useCallback(() => {
    setIsTransitioningBack(true)
    setTimeout(() => {
      window.history.back()
    }, 200)
  }, [])

  return (
    <div className={`min-h-screen bg-background relative overflow-hidden transition-opacity duration-200 ${
      isTransitioningBack ? 'opacity-0' : 'opacity-100'
    }`}>
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />
      
      <div className="relative z-10 flex flex-col items-center justify-start min-h-screen py-6 sm:py-8">
        <Leaderboard onBack={handleBack} />
      </div>
    </div>
  )
}