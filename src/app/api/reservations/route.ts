import { NextRequest } from 'next/server'
import { reservations, disabledDates } from '@/lib/db'

export async function GET() {
  return Response.json(await reservations.findAll())
}

export async function POST(request: NextRequest) {
  const { date, timeSlot, supervisor, students, pin } = await request.json()

  if (!date || !timeSlot || !Array.isArray(students) || students.length === 0) {
    return Response.json({ error: '모든 필드를 입력해주세요.' }, { status: 400 })
  }
  if (!['점심', '저녁'].includes(timeSlot)) {
    return Response.json({ error: '올바른 시간대를 선택해주세요.' }, { status: 400 })
  }
  if (!/^\d{4}$/.test(pin)) {
    return Response.json({ error: 'PIN은 숫자 4자리여야 합니다.' }, { status: 400 })
  }
  if (await reservations.findByDateAndSlot(date, timeSlot)) {
    return Response.json({ error: `${timeSlot} 시간대는 이미 예약되었습니다.` }, { status: 409 })
  }
  if (await disabledDates.findByDate(date)) {
    return Response.json({ error: '예약 불가 날짜입니다.' }, { status: 409 })
  }

  const yearMonth = (date as string).slice(0, 7)
  const monthReservations = await reservations.findByMonth(yearMonth)
  const existingStudents = new Set<string>()
  for (const r of monthReservations) {
    try {
      const arr = JSON.parse(r.students)
      if (Array.isArray(arr)) arr.forEach((s: string) => existingStudents.add(s.trim()))
    } catch {}
  }
  const duplicate = (students as string[]).find((s: string) => existingStudents.has(s.trim()))
  if (duplicate) {
    return Response.json(
      { error: `'${duplicate}'은(는) 이번 달에 이미 신청했습니다. 한달에 한번씩밖에 신청이 불가합니다.` },
      { status: 409 }
    )
  }

  const reservation = await reservations.create(date, timeSlot, supervisor, JSON.stringify(students), pin)
  return Response.json(reservation, { status: 201 })
}
