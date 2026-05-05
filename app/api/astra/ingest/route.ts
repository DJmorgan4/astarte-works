import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { source } = await req.json()
    return NextResponse.json({
      ok: true,
      message: `Ingest triggered: ${source || 'all'}`,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
