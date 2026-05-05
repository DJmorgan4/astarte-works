import { NextResponse } from 'next/server'
import { getEvents, getStratumSites, getKnowledgeDomains } from '@/lib/astra'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'events'
  try {
    if (type === 'sites')   return NextResponse.json({ data: await getStratumSites() })
    if (type === 'domains') return NextResponse.json({ data: await getKnowledgeDomains() })
    return NextResponse.json({ data: await getEvents(100) })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
