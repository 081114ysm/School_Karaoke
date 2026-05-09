import { NextRequest, NextResponse } from 'next/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin1234'
const sessions: Set<string> = ((globalThis as Record<string, unknown>).__adminSessions as Set<string>) ?? new Set()
;(globalThis as Record<string, unknown>).__adminSessions = sessions

export async function POST(request: NextRequest) {
  const { password } = await request.json()
  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: '비밀번호가 틀렸습니다.' }, { status: 401 })
  }
  const token = crypto.randomUUID()
  sessions.add(token)
  const res = NextResponse.json({ success: true })
  res.cookies.set('adminToken', token, { httpOnly: true, path: '/', maxAge: 86400, sameSite: 'strict' })
  return res
}
