import { getServerClient } from './supabase'

export interface AstraAlert {
  id: number
  source: string
  event_type: string
  alert_level: 'HIGH' | 'MEDIUM' | 'INFO'
  payload: Record<string, unknown>
  read: boolean
  created_at: string
}

export interface AstraEvent {
  id: number
  source: string
  event_type: string
  severity: string
  payload: Record<string, unknown>
  status: string
  created_at: string
}

export interface StratumSite {
  id: string
  name: string
  source: string
  site_type: string
  latitude: number | null
  longitude: number | null
  state: string
  status: string
  tags: string[]
  metadata: Record<string, unknown>
}

export async function getAlerts(limit = 50): Promise<AstraAlert[]> {
  const sb = getServerClient()
  const { data, error } = await sb
    .from('astra_alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function getEvents(limit = 100): Promise<AstraEvent[]> {
  const sb = getServerClient()
  const { data, error } = await sb
    .from('astra_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function getStratumSites(limit = 200): Promise<StratumSite[]> {
  const sb = getServerClient()
  const { data, error } = await sb
    .from('stratum_sites')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function getKnowledgeDomains(): Promise<string[]> {
  const sb = getServerClient()
  const { data, error } = await sb
    .from('astra_knowledge')
    .select('domain')
  if (error) return []
  const domains = [...new Set((data || []).map((r: { domain: string }) => r.domain))]
  return domains
}

export async function markAlertRead(id: number): Promise<void> {
  const sb = getServerClient()
  await sb.from('astra_alerts').update({ read: true }).eq('id', id)
}

export interface SignalScan {
  id: string
  scan_session: string
  signal_type: string
  lat: number
  lon: number
  frequency_hz: number | null
  rssi_dbm: number | null
  ssid: string | null
  notes: string | null
  created_at: string
}

export async function getSignalScans(limit = 200): Promise<SignalScan[]> {
  const sb = getServerClient()
  const { data, error } = await sb
    .from('signal_scans')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return data || []
}

export async function getSignalSessions(): Promise<Record<string, SignalScan[]>> {
  const scans = await getSignalScans(500)
  const sessions: Record<string, SignalScan[]> = {}
  for (const scan of scans) {
    if (!sessions[scan.scan_session]) sessions[scan.scan_session] = []
    sessions[scan.scan_session].push(scan)
  }
  return sessions
}
