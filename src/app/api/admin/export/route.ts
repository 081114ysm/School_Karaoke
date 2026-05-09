import { reservations } from '@/lib/db'

export async function GET() {
  const all = await reservations.findAll()
  const rows = [
    ['ID', '날짜', '시간대', '학생 목록', '등록일'].join(','),
    ...all.map(r => {
      const students = (() => { try { return JSON.parse(r.students).join(' / ') } catch { return r.students } })()
      return [r.id, r.date, r.timeSlot, `"${students}"`, r.createdAt].join(',')
    })
  ].join('\n')
  return new Response('﻿' + rows, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="reservations_${new Date().toISOString().slice(0,10)}.csv"`,
    }
  })
}
