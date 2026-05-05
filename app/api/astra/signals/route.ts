import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const sb = getServerClient()
    const { data, error } = await sb
      .from('signal_scans')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw error
    return NextResponse.json({ data: data || [] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function GET_sessions() {
  try {
    const sb = getServerClient()
    const { data, error } = await sb
      .from('signal_scans')
      .select('scan_session, signal_type, created_at, lat, lon')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw error
    return NextResponse.json({ data: data || [] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
