import { NextResponse } from 'next/server'
import { getAlerts, markAlertRead } from '@/lib/astra'

export async function GET() {
  try {
    const alerts = await getAlerts(50)
    return NextResponse.json({ alerts })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { id } = await req.json()
    await markAlertRead(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
