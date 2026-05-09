import { NextRequest } from 'next/server'
import { reservations } from '@/lib/db'

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/reservations/[id]'>) {
  const { id } = await ctx.params
  const result = await reservations.delete(Number(id))
  if (result.rowsAffected === 0) {
    return Response.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 })
  }
  return Response.json({ success: true })
}
