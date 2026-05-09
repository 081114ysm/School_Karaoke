import { reservations, disabledDates } from '@/lib/db'

export async function GET() {
  const [allReservations, allDisabledDates] = await Promise.all([
    reservations.findAll(),
    disabledDates.findAll(),
  ])
  const data = { reservations: allReservations, disabledDates: allDisabledDates, exportedAt: new Date().toISOString() }
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="backup_${new Date().toISOString().slice(0,10)}.json"`,
    }
  })
}
