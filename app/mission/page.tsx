'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface Alert {
  id: number
  source: string
  event_type: string
  alert_level: 'HIGH' | 'MEDIUM' | 'INFO'
  payload: Record<string, unknown>
  read: boolean
  created_at: string
}

interface Event {
  id: number
  source: string
  event_type: string
  severity: string
  payload: Record<string, unknown>
  status: string
  created_at: string
}

interface Site {
  id: string
  name: string
  source: string
  site_type: string
  metadata: Record<string, unknown>
  created_at: string
}

interface ChatMsg {
  role: 'user' | 'astra'
  content: string
  ts: string
}

const LEVEL_COLOR: Record<string, string> = {
  HIGH:   '#E53E3E',
  MEDIUM: '#DD6B20',
  INFO:   '#12A8AC',
}

const SOURCE_SHORT: Record<string, string> = {
  USGS_STREAMFLOW: 'USGS',
  EPA_ECHO:        'EPA',
  NOAA_KP:         'NOAA',
  ASF_SENTINEL1:   'ASF',
  TCEQ_STEERS:     'TCEQ',
  usgs_streamflow: 'USGS',
  nws_alerts:      'NWS',
  federal_register:'FED',
  usgs_water_quality:'WQ',
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour12: false })
  } catch { return '--:--:--' }
}

function fmtAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

export default function MissionControl() {
  const [alerts, setAlerts]       = useState<Alert[]>([])
  const [events, setEvents]       = useState<Event[]>([])
  const [sites,  setSites]        = useState<Site[]>([])
  const [signals, setSignals]      = useState<any[]>([])
  const [chat,   setChat]         = useState<ChatMsg[]>([{
    role: 'astra',
    content: 'ASTRA CORE online. STRATUM indexed. Monitoring USGS, EPA, NOAA, ASF, TCEQ feeds. Query anything.',
    ts: new Date().toLocaleTimeString('en-US', { hour12: false }),
  }])
  const [input,    setInput]      = useState('')
  const [thinking, setThinking]   = useState(false)
  const [tab,      setTab]        = useState<'alerts'|'events'|'sites'|'signals'>('alerts')
  const [clock,    setClock]      = useState('')
  const [history,  setHistory]    = useState<{role:string;content:string}[]>([])
  const chatRef  = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pulseRef  = useRef<number[]>(new Array(120).fill(0))

  // Clock
  useEffect(() => {
    const t = setInterval(() => {
      setClock(new Date().toUTCString().split(' ')[4] + ' UTC')
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // Fetch data
  const fetchAlerts = useCallback(async () => {
    try {
      const r = await fetch('/api/astra/alerts')
      const j = await r.json()
      if (j.alerts) setAlerts(j.alerts)
    } catch {}
  }, [])

  const fetchEvents = useCallback(async () => {
    try {
      const r = await fetch('/api/astra/events')
      const j = await r.json()
      if (j.data) setEvents(j.data)
    } catch {}
  }, [])

  const fetchSignals = useCallback(async () => {
    try {
      const r = await fetch(`/api/astra/signals`)
      const j = await r.json()
      if (j.data) setSignals(j.data)
    } catch {}
  }, [])

  const fetchSites = useCallback(async () => {
    try {
      const r = await fetch('/api/astra/events?type=sites')
      const j = await r.json()
      if (j.data) setSites(j.data)
    } catch {}
  }, [])

  useEffect(() => {
    fetchAlerts()
    fetchEvents()
    fetchSites()
    fetchSignals()
    const t = setInterval(() => { fetchAlerts(); fetchEvents() }, 30000)
    return () => clearInterval(t)
  }, [fetchAlerts, fetchEvents, fetchSites, fetchSignals])

  // Pulse canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let raf: number

    function draw() {
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      const w = canvas.width, h = canvas.height

      // Push new value
      const spike = Math.random() > 0.92 ? Math.random() * 0.85 + 0.15 : 0
      pulseRef.current.shift()
      pulseRef.current.push((Math.random() - 0.5) * 0.25 + spike)

      ctx.clearRect(0, 0, w, h)

      // Grid
      ctx.strokeStyle = 'rgba(10,107,111,0.1)'
      ctx.lineWidth = 1
      for (let y = 0; y < h; y += 16) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
      }

      // Line
      const step = w / pulseRef.current.length
      const grad = ctx.createLinearGradient(0, 0, w, 0)
      grad.addColorStop(0, 'rgba(18,168,172,0.2)')
      grad.addColorStop(1, 'rgba(18,168,172,1)')
      ctx.strokeStyle = grad
      ctx.lineWidth   = 1.5
      ctx.shadowBlur  = 8
      ctx.shadowColor = 'rgba(18,168,172,0.5)'
      ctx.beginPath()
      pulseRef.current.forEach((v, i) => {
        const x = i * step
        const y = h / 2 - v * h * 0.4
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.shadowBlur = 0

      // Fill
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath()
      const fill = ctx.createLinearGradient(0, 0, 0, h)
      fill.addColorStop(0, 'rgba(18,168,172,0.12)')
      fill.addColorStop(1, 'rgba(18,168,172,0)')
      ctx.fillStyle = fill; ctx.fill()

      raf = requestAnimationFrame(draw)
    }

    const t = setTimeout(() => { raf = requestAnimationFrame(draw) }, 100)
    return () => { clearTimeout(t); cancelAnimationFrame(raf) }
  }, [])

  // Chat scroll
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [chat])

  async function sendMessage() {
    const msg = input.trim()
    if (!msg || thinking) return
    setInput('')
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false })
    setChat(c => [...c, { role: 'user', content: msg, ts }])
    setThinking(true)

    try {
      const r = await fetch('/api/astra/query', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history }),
      })
      const j = await r.json()
      const reply = j.response || j.error || 'No response'
      const rts = new Date().toLocaleTimeString('en-US', { hour12: false })
      setChat(c => [...c, { role: 'astra', content: reply, ts: rts }])
      setHistory(h => [...h, { role: 'user', content: msg }, { role: 'assistant', content: reply }])
    } catch (e) {
      setChat(c => [...c, { role: 'astra', content: `Error: ${String(e)}`, ts: new Date().toLocaleTimeString() }])
    } finally {
      setThinking(false)
    }
  }

  const unread = alerts.filter(a => !a.read && a.alert_level !== 'INFO').length

  return (
    <div style={{
      display: 'grid',
      gridTemplateRows: '52px 1fr',
      gridTemplateColumns: '240px 1fr 300px',
      height: '100vh',
      background: '#08111F',
      color: '#F0F4F8',
      fontFamily: "'Space Mono', monospace",
      overflow: 'hidden',
    }}>

      {/* ── TOPBAR ─────────────────────────────────────── */}
      <header style={{
        gridColumn: '1/-1',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        background: 'rgba(8,17,31,0.98)',
        borderBottom: '1px solid rgba(200,151,58,0.3)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 28, height: 28,
            background: '#C8973A',
            clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)',
          }}/>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', color: '#F0F4F8' }}>
              ASTRA CORE
            </div>
            <div style={{ fontSize: 8, color: '#12A8AC', letterSpacing: '0.15em' }}>
              ASTARTE WORKS · MISSION CONTROL
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 10, color: '#4A6080' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6,
            padding: '3px 10px', border: '1px solid #1A7A40', color: '#2ECC71' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#2ECC71',
              animation: 'none', boxShadow: '0 0 6px #2ECC71' }}/>
            FEEDS LIVE
          </div>
          <span>STRATUM · LOCUS · NEXUS</span>
          <span>CAGE 14V05 · UEI LG15KPRZFQE3</span>
        </div>

        <div style={{ fontSize: 11, color: '#C8973A', fontFamily: 'monospace' }}>{clock}</div>
      </header>

      {/* ── LEFT SIDEBAR ───────────────────────────────── */}
      <nav style={{
        background: 'rgba(13,30,53,0.95)',
        borderRight: '1px solid rgba(18,168,172,0.15)',
        padding: '16px 0',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 0,
      }}>
        {[
          { label: 'Mission Control', icon: '◈', href: '/mission' },
          { label: 'Ceto Interactive', icon: '◫', href: 'https://cetointeractive.com' },
          { label: 'LithicEarth',      icon: '◬', href: 'https://lithicearth.com' },
          { label: 'Blue Duck Fdn',    icon: '◉', href: 'https://theblueduck.org' },
        ].map(item => (
          <a key={item.label} href={item.href}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 16px', textDecoration: 'none',
              borderLeft: item.href === '/mission' ? '2px solid #C8973A' : '2px solid transparent',
              background: item.href === '/mission' ? 'rgba(200,151,58,0.07)' : 'transparent',
              color: item.href === '/mission' ? '#F0F4F8' : '#4A6080',
              fontSize: 12, fontWeight: 600,
              transition: 'all 0.15s',
            }}>
            <span style={{ fontSize: 13 }}>{item.icon}</span>
            {item.label}
          </a>
        ))}

        <div style={{ height: 1, background: 'rgba(18,168,172,0.15)', margin: '12px 0' }}/>

        <div style={{ padding: '4px 16px 8px', fontSize: 8, color: '#4A6080', letterSpacing: '0.15em' }}>
          FEED STATUS
        </div>

        {[
          { name: 'USGS Gauges',   interval: '15min', color: '#12A8AC' },
          { name: 'EPA ECHO',      interval: '6hr',   color: '#C8973A' },
          { name: 'NWS Alerts',    interval: 'live',  color: '#12A8AC' },
          { name: 'Federal Reg',   interval: '1hr',   color: '#C8973A' },
          { name: 'ASF S1',        interval: '2hr',   color: '#C8973A' },
        ].map(f => (
          <div key={f.name} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '5px 12px',
            margin: '0 8px 3px',
            background: 'rgba(10,107,111,0.06)',
            border: '1px solid rgba(18,168,172,0.12)',
            fontSize: 9,
          }}>
            <span style={{ color: '#F0F4F8' }}>{f.name}</span>
            <span style={{ color: f.color }}>{f.interval}</span>
          </div>
        ))}

        <div style={{ height: 1, background: 'rgba(18,168,172,0.15)', margin: '12px 0' }}/>

        <div style={{ padding: '4px 16px 8px', fontSize: 8, color: '#4A6080', letterSpacing: '0.15em' }}>
          SUBSYSTEMS
        </div>

        {[
          { name: 'STRATUM',       pct: 92,  color: '#12A8AC' },
          { name: 'LOCUS',         pct: 68,  color: '#C8973A' },
          { name: 'Ceto ESA',      pct: 100, color: '#2ECC71' },
          { name: 'LithicEarth',   pct: 78,  color: '#12A8AC' },
          { name: 'NEXUS',         pct: 35,  color: '#DD6B20' },
          { name: 'Ingest Worker', pct: 100, color: '#2ECC71' },
        ].map(s => (
          <div key={s.name} style={{ padding: '3px 12px', margin: '0 4px 4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 3 }}>
              <span style={{ color: '#9AA5B4' }}>{s.name}</span>
              <span style={{ color: s.color }}>{s.pct}%</span>
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }}>
              <div style={{ height: '100%', width: `${s.pct}%`, background: s.color, borderRadius: 1, transition: 'width 1s ease' }}/>
            </div>
          </div>
        ))}
      </nav>

      {/* ── MAIN ───────────────────────────────────────── */}
      <main style={{ overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {[
            { label: 'Active Alerts', value: alerts.length,                      color: '#C8973A' },
            { label: 'Unread',        value: unread,                              color: '#E53E3E' },
            { label: 'Sites Tracked', value: sites.length,                        color: '#12A8AC' },
            { label: 'Events (live)', value: events.length,                       color: '#2ECC71' },
          ].map(m => (
            <div key={m.label} style={{
              background: 'rgba(13,30,53,0.95)',
              border: '1px solid rgba(18,168,172,0.2)',
              borderTop: `2px solid ${m.color}`,
              padding: '12px 14px',
            }}>
              <div style={{ fontSize: 8, color: '#4A6080', letterSpacing: '0.12em', marginBottom: 6 }}>
                {m.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: m.color, fontFamily: 'monospace', lineHeight: 1 }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {/* Pulse */}
        <div style={{ background: 'rgba(13,30,53,0.95)', border: '1px solid rgba(18,168,172,0.2)' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(18,168,172,0.15)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 9, color: '#C8973A', letterSpacing: '0.15em' }}>INGEST PULSE</span>
            <span style={{ fontSize: 9, color: '#2ECC71' }}>● LIVE</span>
          </div>
          <div style={{ padding: '8px 14px 12px' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: 70, display: 'block' }} height={70}/>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ background: 'rgba(13,30,53,0.95)', border: '1px solid rgba(18,168,172,0.2)', flex: 1 }}>
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(18,168,172,0.15)' }}>
            {((['alerts','events','sites','signals'] as const)).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: tab === t ? '2px solid #C8973A' : '2px solid transparent',
                color: tab === t ? '#F0F4F8' : '#4A6080',
                fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
                fontFamily: 'monospace', marginBottom: -1,
              }}>
                {t} {t === 'alerts' ? `(${alerts.length})` : t === 'events' ? `(${events.length})` : t === 'sites' ? `(${sites.length})` : `(${signals.length})`}
              </button>
            ))}
          </div>

          <div style={{ maxHeight: 380, overflowY: 'auto' }}>

            {/* ALERTS */}
            {tab === 'alerts' && (
              alerts.length === 0
                ? <div style={{ padding: 24, fontSize: 11, color: '#4A6080', textAlign: 'center' }}>
                    No alerts — run ingest pipeline or check Supabase astra_alerts table
                  </div>
                : alerts.map(a => (
                  <div key={a.id} style={{
                    display: 'grid', gridTemplateColumns: '3px 1fr auto',
                    gap: 10, padding: '10px 14px',
                    borderBottom: '1px solid rgba(18,168,172,0.07)',
                    alignItems: 'start',
                  }}>
                    <div style={{ background: LEVEL_COLOR[a.alert_level] || '#4A6080', borderRadius: 1 }}/>
                    <div>
                      <div style={{ fontSize: 9, color: '#4A6080', marginBottom: 3 }}>
                        <span style={{
                          padding: '1px 5px', fontSize: 8, fontWeight: 700,
                          background: `${LEVEL_COLOR[a.alert_level]}22`,
                          border: `1px solid ${LEVEL_COLOR[a.alert_level]}66`,
                          color: LEVEL_COLOR[a.alert_level],
                          marginRight: 6,
                        }}>{a.alert_level}</span>
                        {SOURCE_SHORT[a.source] || a.source}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#F0F4F8', lineHeight: 1.4 }}>
                        {a.event_type.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: 9, color: '#4A6080', marginTop: 2 }}>
                        {JSON.stringify(a.payload).slice(0, 100)}
                      </div>
                    </div>
                    <div style={{ fontSize: 9, color: '#4A6080', whiteSpace: 'nowrap' }}>
                      {fmtAgo(a.created_at)}
                    </div>
                  </div>
                ))
            )}

            {/* EVENTS */}
            {tab === 'events' && (
              events.length === 0
                ? <div style={{ padding: 24, fontSize: 11, color: '#4A6080', textAlign: 'center' }}>
                    No events yet — run: python astra/ingestion/environment.py
                  </div>
                : events.map(e => (
                  <div key={e.id} style={{
                    display: 'grid', gridTemplateColumns: '52px 70px 1fr',
                    gap: 10, padding: '7px 14px',
                    borderBottom: '1px solid rgba(18,168,172,0.06)',
                    fontSize: 11, alignItems: 'start',
                  }}>
                    <span style={{ color: '#4A6080', fontSize: 9 }}>{fmtTime(e.created_at)}</span>
                    <span style={{ color: '#12A8AC', fontSize: 9 }}>{SOURCE_SHORT[e.source] || e.source}</span>
                    <span style={{ color: '#F0F4F8', lineHeight: 1.4 }}>
                      {e.event_type.replace(/_/g, ' ')} — {String(e.payload?.name || e.payload?.event || '').slice(0, 80)}
                    </span>
                  </div>
                ))
            )}

            {/* SITES */}
            {tab === 'sites' && (
              sites.length === 0
                ? <div style={{ padding: 24, fontSize: 11, color: '#4A6080', textAlign: 'center' }}>
                    No sites tracked yet — run the ingestion pipeline
                  </div>
                : sites.map(s => (
                  <div key={s.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr auto',
                    gap: 10, padding: '8px 14px',
                    borderBottom: '1px solid rgba(18,168,172,0.06)',
                  }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#F0F4F8', fontWeight: 600 }}>{s.name.slice(0, 60)}</div>
                      <div style={{ fontSize: 9, color: '#4A6080', marginTop: 2 }}>
                        {s.site_type} · {s.source}
                        {s.metadata?.flow_cfs ? ` · ${Number(s.metadata.flow_cfs).toFixed(1)} cfs` : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: 9, color: '#4A6080' }}>{fmtAgo(s.created_at)}</div>
                  </div>
                ))
            )}

            {tab === 'signals' && (
              signals.length === 0
                ? <div style={{ padding: 24, fontSize: 11, color: '#4A6080', textAlign: 'center' }}>
                    No signal scans yet — run a Whisper Map field scan from LithicEarth
                  </div>
                : signals.map((s, i) => (
                  <div key={s.id || i} style={{
                    display: 'grid', gridTemplateColumns: '80px 70px 1fr auto',
                    gap: 10, padding: '8px 14px',
                    borderBottom: '1px solid rgba(18,168,172,0.06)',
                    alignItems: 'start',
                  }}>
                    <span style={{ fontSize: 9, color: '#12A8AC', fontFamily: 'monospace', paddingTop: 1 }}>
                      {s.signal_type?.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 9, color: '#C8973A', fontFamily: 'monospace' }}>
                      {s.frequency_hz ? `${(s.frequency_hz/1e6).toFixed(0)}MHz` : '—'}
                    </span>
                    <div>
                      <div style={{ fontSize: 11, color: '#F0F4F8', fontWeight: 600 }}>
                        {s.ssid || s.notes || `${s.lat?.toFixed(4)}, ${s.lon?.toFixed(4)}`}
                      </div>
                      <div style={{ fontSize: 9, color: '#4A6080', marginTop: 2 }}>
                        RSSI: {s.rssi_dbm ? `${s.rssi_dbm} dBm` : '—'} · {s.lat?.toFixed(4)}, {s.lon?.toFixed(4)}
                      </div>
                    </div>
                    <div style={{ fontSize: 9, color: '#4A6080' }}>{fmtAgo(s.created_at)}</div>
                  </div>
                ))
            )}
          </div>
        </div>

      </main>

      {/* ── RIGHT SIDEBAR — ASTRA CHAT ──────────────────── */}
      <aside style={{
        background: 'rgba(13,30,53,0.95)',
        borderLeft: '1px solid rgba(18,168,172,0.15)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(200,151,58,0.2)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: '#C8973A', letterSpacing: '0.15em' }}>ASTRA INTELLIGENCE</span>
          <span style={{ fontSize: 9, color: '#C8973A', padding: '1px 6px',
            background: 'rgba(200,151,58,0.1)', border: '1px solid rgba(200,151,58,0.3)' }}>
            LOCUS CORE
          </span>
        </div>

        {/* Context tags */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(18,168,172,0.1)' }}>
          <div style={{ fontSize: 8, color: '#4A6080', marginBottom: 5, letterSpacing: '0.1em' }}>
            ACTIVE CONTEXT
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {['ASTM E1527','TCEQ Rules','USACE Wetlands','MSIGI v1','SAR Pipeline','14 Corpora'].map(tag => (
              <span key={tag} style={{
                fontSize: 8, padding: '2px 6px',
                border: '1px solid rgba(18,168,172,0.3)',
                color: '#12A8AC', background: 'rgba(10,107,111,0.1)',
              }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {chat.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
              <div style={{
                width: 22, height: 22, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, marginTop: 1,
                background: m.role === 'astra' ? 'rgba(10,107,111,0.4)' : 'rgba(200,151,58,0.2)',
                border: `1px solid ${m.role === 'astra' ? '#0A6B6F' : 'rgba(200,151,58,0.4)'}`,
                color: m.role === 'astra' ? '#12A8AC' : '#C8973A',
              }}>
                {m.role === 'astra' ? 'A' : 'DJ'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  background: m.role === 'astra' ? 'rgba(10,107,111,0.1)' : 'rgba(200,151,58,0.06)',
                  border: `1px solid ${m.role === 'astra' ? 'rgba(18,168,172,0.2)' : 'rgba(200,151,58,0.2)'}`,
                  padding: '7px 9px', fontSize: 11.5, lineHeight: 1.55, color: '#F0F4F8',
                  whiteSpace: 'pre-wrap',
                }}>
                  {m.content}
                </div>
                <div style={{ fontSize: 8, color: '#4A6080', marginTop: 2 }}>
                  {m.role === 'astra' ? 'ASTRA' : 'You'} · {m.ts}
                </div>
              </div>
            </div>
          ))}

          {thinking && (
            <div style={{ display: 'flex', gap: 7 }}>
              <div style={{ width: 22, height: 22, background: 'rgba(10,107,111,0.4)',
                border: '1px solid #0A6B6F', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 9, color: '#12A8AC' }}>A</div>
              <div style={{ background: 'rgba(10,107,111,0.1)', border: '1px solid rgba(18,168,172,0.2)',
                padding: '10px 12px', display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 5, height: 5, borderRadius: '50%', background: '#12A8AC',
                    animation: `bounce${i} 1.2s infinite`,
                    animationDelay: `${i * 0.2}s`,
                  }}/>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: 10, borderTop: '1px solid rgba(18,168,172,0.15)', display: 'flex', gap: 6 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Query ASTRA..."
            style={{
              flex: 1, background: 'rgba(8,17,31,0.8)',
              border: '1px solid rgba(18,168,172,0.25)', color: '#F0F4F8',
              padding: '7px 9px', fontSize: 11, fontFamily: 'monospace', outline: 'none',
            }}
          />
          <button onClick={sendMessage} disabled={thinking} style={{
            background: thinking ? 'rgba(10,107,111,0.2)' : 'rgba(10,107,111,0.4)',
            border: '1px solid #0A6B6F', color: '#12A8AC',
            padding: '7px 11px', cursor: thinking ? 'not-allowed' : 'pointer',
            fontSize: 9, fontFamily: 'monospace',
          }}>
            {thinking ? '...' : 'SEND'}
          </button>
        </div>

        {/* Entity list */}
        <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(18,168,172,0.1)' }}>
          {['Ceto Interactive · cetointeractive.com','LithicEarth · lithicearth.com','Blue Duck Fdn · theblueduck.org'].map(e => (
            <div key={e} style={{ fontSize: 9, color: '#4A6080', marginBottom: 3 }}>◈ {e}</div>
          ))}
          <div style={{ fontSize: 8, color: '#2A3A50', marginTop: 4 }}>CAGE: 14V05 · UEI: LG15KPRZFQE3</div>
        </div>
      </aside>

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(10,107,111,0.4); }
        @keyframes bounce0 { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
        @keyframes bounce1 { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
        @keyframes bounce2 { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
      `}</style>
    </div>
  )
}
