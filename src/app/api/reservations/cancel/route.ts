import { NextRequest } from 'next/server'
import { reservations } from '@/lib/db'

export async function POST(request: NextRequest) {
  const { studentInfo, pin } = await request.json()
  if (!studentInfo?.trim()) {
    return Response.json({ error: '학생 정보를 입력해주세요.' }, { status: 400 })
  }
  if (!/^\d{4}$/.test(pin)) {
    return Response.json({ error: 'PIN 4자리를 입력해주세요.' }, { status: 400 })
  }

  const all = await reservations.findAll()
  const found = all.filter(r => {
    try {
      const arr = JSON.parse(r.students)
      return Array.isArray(arr) && arr.some((s: string) => s.trim() === studentInfo.trim())
    } catch { return false }
  })

  if (found.length === 0) {
    return Response.json({ error: '해당 학생의 예약을 찾을 수 없습니다.' }, { status: 404 })
  }

  const pinMatched = found.filter(r => r.pin === pin)
  if (pinMatched.length === 0) {
    return Response.json({ error: 'PIN이 올바르지 않습니다.' }, { status: 403 })
  }

  await Promise.all(pinMatched.map(r => reservations.delete(r.id)))
  return Response.json({ success: true, cancelled: pinMatched.length })
}
