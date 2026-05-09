import { NextRequest, NextResponse } from 'next/server'

const sessions: Set<string> = ((globalThis as Record<string, unknown>).__adminSessions as Set<string>) ?? new Set()
;(globalThis as Record<string, unknown>).__adminSessions = sessions

export async function GET(request: NextRequest) {
  const token = request.cookies.get('adminToken')?.value
  if (token && sessions.has(token)) {
    return NextResponse.json({ valid: true })
  }
  return NextResponse.json({ valid: false }, { status: 401 })
}
