import { NextRequest } from 'next/server'
import { disabledDates } from '@/lib/db'

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/disabled-dates/[id]'>) {
  const { id } = await ctx.params
  const result = await disabledDates.delete(Number(id))
  if (result.rowsAffected === 0) {
    return Response.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })
  }
  return Response.json({ success: true })
}
