import { NextRequest } from 'next/server'
import { disabledDates } from '@/lib/db'

export async function GET() {
  return Response.json(await disabledDates.findAll())
}

export async function POST(request: NextRequest) {
  const { date, reason } = await request.json()

  if (!date) {
    return Response.json({ error: '날짜를 입력해주세요.' }, { status: 400 })
  }
  if (await disabledDates.findByDate(date)) {
    return Response.json({ error: '이미 비활성화된 날짜입니다.' }, { status: 409 })
  }

  try {
    const disabled = await disabledDates.create(date, reason || null)
    return Response.json(disabled, { status: 201 })
  } catch {
    return Response.json({ error: '날짜 추가 실패.' }, { status: 500 })
  }
}
