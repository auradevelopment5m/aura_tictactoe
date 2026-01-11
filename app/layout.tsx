import type React from "react"
import type { Metadata } from "next"

import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"
import { Geist_Mono } from "next/font/google"

const geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "AuraTicTac - Modern Tic Tac Toe",
  description: "Play tic-tac-toe against AI or challenge friends in real-time multiplayer",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistMono.className} antialiased`}>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
