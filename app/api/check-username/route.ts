import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 })
    }

    // Check if username exists
    const result = await query('SELECT id FROM players WHERE username = ?', [username.trim()])

    const available = (result as any[]).length === 0

    return NextResponse.json({ available })
  } catch (error) {
    console.error('Error checking username:', error)
    return NextResponse.json({ error: 'Failed to check username' }, { status: 500 })
  }
}