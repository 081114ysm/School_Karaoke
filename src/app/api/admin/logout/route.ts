import { NextRequest, NextResponse } from 'next/server'

const sessions: Set<string> = ((globalThis as Record<string, unknown>).__adminSessions as Set<string>) ?? new Set()
;(globalThis as Record<string, unknown>).__adminSessions = sessions

export async function POST(request: NextRequest) {
  const token = request.cookies.get('adminToken')?.value
  if (token) sessions.delete(token)
  const res = NextResponse.json({ success: true })
  res.cookies.set('adminToken', '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
