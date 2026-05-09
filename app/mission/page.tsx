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
  HIGH:   '#C0392B',
  MEDIUM: '#B08840',
  INFO:   '#4A4A4A',
}

const SOURCE_SHORT: Record<string, string> = {
  USGS_STREAMFLOW:    'USGS',
  EPA_ECHO:           'EPA',
  NOAA_KP:            'NOAA',
  ASF_SENTINEL1:      'ASF',
  TCEQ_STEERS:        'TCEQ',
  usgs_streamflow:    'USGS',
  nws_alerts:         'NWS',
  federal_register:   'FED',
  usgs_water_quality: 'WQ',
  NWS_ALERTS:         'NWS',
}

function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString('en-US', { hour12: false }) }
  catch { return '--:--:--' }
}

function fmtAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h`
}

export default function MissionControl() {
  const [alerts,  setAlerts]  = useState<Alert[]>([])
  const [events,  setEvents]  = useState<Event[]>([])
  const [sites,   setSites]   = useState<Site[]>([])
  const [signals, setSignals] = useState<any[]>([])
  const [chat,    setChat]    = useState<ChatMsg[]>([{
    role: 'astra',
    content: 'ASTRA CORE online. All 20 domains active — environmental, esoteric, operational. Query anything.',
    ts: new Date().toLocaleTimeString('en-US', { hour12: false }),
  }])
  const [input,    setInput]    = useState('')
  const [thinking, setThinking] = useState(false)
  const [tab,      setTab]      = useState<'alerts'|'events'|'sites'|'signals'>('alerts')
  const [clock,    setClock]    = useState('')
  const [history,  setHistory]  = useState<{role:string;content:string}[]>([])
  const chatRef  = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pulseRef  = useRef<number[]>(new Array(120).fill(0))

  useEffect(() => {
    const t = setInterval(() => {
      setClock(new Date().toUTCString().split(' ')[4] + ' UTC')
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const fetchAlerts = useCallback(async () => {
    try { const r = await fetch('/api/astra/alerts'); const j = await r.json(); if (j.alerts) setAlerts(j.alerts) } catch {}
  }, [])
  const fetchEvents = useCallback(async () => {
    try { const r = await fetch('/api/astra/events'); const j = await r.json(); if (j.data) setEvents(j.data) } catch {}
  }, [])
  const fetchSignals = useCallback(async () => {
    try { const r = await fetch('/api/astra/signals'); const j = await r.json(); if (j.data) setSignals(j.data) } catch {}
  }, [])
  const fetchSites = useCallback(async () => {
    try { const r = await fetch('/api/astra/events?type=sites'); const j = await r.json(); if (j.data) setSites(j.data) } catch {}
  }, [])

  useEffect(() => {
    fetchAlerts(); fetchEvents(); fetchSites(); fetchSignals()
    const t = setInterval(() => { fetchAlerts(); fetchEvents() }, 30000)
    return () => clearInterval(t)
  }, [fetchAlerts, fetchEvents, fetchSites, fetchSignals])

  // Pulse canvas — amber on void
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
      const spike = Math.random() > 0.92 ? Math.random() * 0.85 + 0.15 : 0
      pulseRef.current.shift()
      pulseRef.current.push((Math.random() - 0.5) * 0.18 + spike)
      ctx.clearRect(0, 0, w, h)
      // subtle grid
      ctx.strokeStyle = 'rgba(176,136,64,0.06)'
      ctx.lineWidth = 1
      for (let y = 0; y < h; y += 14) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
      }
      const step = w / pulseRef.current.length
      const grad = ctx.createLinearGradient(0, 0, w, 0)
      grad.addColorStop(0, 'rgba(176,136,64,0.15)')
      grad.addColorStop(1, 'rgba(176,136,64,0.9)')
      ctx.strokeStyle = grad
      ctx.lineWidth   = 1.5
      ctx.shadowBlur  = 6
      ctx.shadowColor = 'rgba(176,136,64,0.4)'
      ctx.beginPath()
      pulseRef.current.forEach((v, i) => {
        const x = i * step
        const y = h / 2 - v * h * 0.4
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath()
      const fill = ctx.createLinearGradient(0, 0, 0, h)
      fill.addColorStop(0, 'rgba(176,136,64,0.08)')
      fill.addColorStop(1, 'rgba(176,136,64,0)')
      ctx.fillStyle = fill; ctx.fill()
      raf = requestAnimationFrame(draw)
    }
    const t = setTimeout(() => { raf = requestAnimationFrame(draw) }, 100)
    return () => { clearTimeout(t); cancelAnimationFrame(raf) }
  }, [])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
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
        method: 'POST',
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

  const S = {
    // Colors
    void:      '#080808',
    panel:     '#0E0E0E',
    border:    'rgba(255,255,255,0.07)',
    borderAmber:'rgba(176,136,64,0.35)',
    amber:     '#B08840',
    amberDim:  '#6B5428',
    amberGlow: 'rgba(176,136,64,0.12)',
    muted:     '#3A3A3A',
    dim:       '#222222',
    text:      '#D8D0C0',
    textDim:   '#6A6258',
    red:       '#8B2020',
    redBright: '#C0392B',
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateRows: '48px 1fr',
      gridTemplateColumns: '220px 1fr 290px',
      height: '100vh',
      background: S.void,
      color: S.text,
      fontFamily: "var(--font-space-mono), 'Space Mono', monospace",
      overflow: 'hidden',
    }}>

      {/* TOPBAR */}
      <header style={{
        gridColumn: '1/-1',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        background: S.void,
        borderBottom: `1px solid ${S.borderAmber}`,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 22, height: 22,
            background: S.amber,
            clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)',
          }}/>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', color: S.text }}>
              ASTRA CORE
            </div>
            <div style={{ fontSize: 7, color: S.amberDim, letterSpacing: '0.18em' }}>
              ASTARTE WORKS · MISSION CONTROL
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 9, color: S.textDim }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5,
            padding: '2px 8px', border: `1px solid rgba(80,120,80,0.4)`, color: '#5A8A5A' }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#5A8A5A', boxShadow: '0 0 4px #5A8A5A' }}/>
            FEEDS LIVE
          </div>
          <span style={{ color: S.muted }}>STRATUM · LOCUS · NEXUS</span>
          <span style={{ color: S.muted }}>CAGE 14V05 · UEI LG15KPRZFQE3</span>
        </div>

        <div style={{ fontSize: 11, color: S.amber, fontFamily: 'monospace', letterSpacing: '0.08em' }}>{clock}</div>
      </header>

      {/* LEFT NAV */}
      <nav style={{
        background: S.void,
        borderRight: `1px solid ${S.border}`,
        padding: '12px 0',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        {[
          { label: 'Mission Control', icon: '◈', href: '/mission', active: true },
          { label: 'Ceto Interactive', icon: '◫', href: 'https://cetointeractive.com' },
          { label: 'LithicEarth',      icon: '◬', href: 'https://lithicearth.com' },
          { label: 'Blue Duck Fdn',    icon: '◉', href: 'https://theblueduck.org' },
        ].map(item => (
          <a key={item.label} href={item.href} style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '8px 14px', textDecoration: 'none',
            borderLeft: item.active ? `2px solid ${S.amber}` : '2px solid transparent',
            background: item.active ? S.amberGlow : 'transparent',
            color: item.active ? S.text : S.textDim,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
          }}>
            <span style={{ fontSize: 11, color: item.active ? S.amber : S.muted }}>{item.icon}</span>
            {item.label}
          </a>
        ))}

        <div style={{ height: 1, background: S.border, margin: '10px 0' }}/>

        <div style={{ padding: '3px 14px 6px', fontSize: 7, color: S.textDim, letterSpacing: '0.18em' }}>FEED STATUS</div>
        {[
          { name: 'USGS Gauges', interval: '15min' },
          { name: 'EPA ECHO',    interval: '6hr' },
          { name: 'NWS Alerts',  interval: 'live' },
          { name: 'Federal Reg', interval: '1hr' },
          { name: 'ASF S1',      interval: '2hr' },
        ].map(f => (
          <div key={f.name} style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '4px 10px', margin: '0 6px 2px',
            background: S.dim, border: `1px solid ${S.border}`,
            fontSize: 8,
          }}>
            <span style={{ color: S.text }}>{f.name}</span>
            <span style={{ color: f.interval === 'live' ? S.amber : S.amberDim }}>{f.interval}</span>
          </div>
        ))}

        <div style={{ height: 1, background: S.border, margin: '10px 0' }}/>

        <div style={{ padding: '3px 14px 6px', fontSize: 7, color: S.textDim, letterSpacing: '0.18em' }}>SUBSYSTEMS</div>
        {[
          { name: 'STRATUM',       pct: 92 },
          { name: 'LOCUS',         pct: 68 },
          { name: 'Ceto ESA',      pct: 100 },
          { name: 'LithicEarth',   pct: 78 },
          { name: 'NEXUS',         pct: 35 },
          { name: 'Ingest Worker', pct: 100 },
        ].map(s => (
          <div key={s.name} style={{ padding: '2px 10px', margin: '0 4px 3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, marginBottom: 2 }}>
              <span style={{ color: S.textDim }}>{s.name}</span>
              <span style={{ color: s.pct === 100 ? '#5A8A5A' : s.pct < 50 ? S.amberDim : S.amber }}>{s.pct}%</span>
            </div>
            <div style={{ height: 2, background: S.dim }}>
              <div style={{ height: '100%', width: `${s.pct}%`, background: s.pct === 100 ? '#5A8A5A' : s.pct < 50 ? S.amberDim : S.amber }}/>
            </div>
          </div>
        ))}
      </nav>

      {/* MAIN */}
      <main style={{ overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {[
            { label: 'Active Alerts', value: alerts.length,  color: S.amber },
            { label: 'Unread',        value: unread,          color: unread > 0 ? S.redBright : S.muted },
            { label: 'Sites Tracked', value: sites.length,   color: S.amber },
            { label: 'Events',        value: events.length,  color: S.amber },
          ].map(m => (
            <div key={m.label} style={{
              background: S.panel,
              border: `1px solid ${S.border}`,
              borderTop: `2px solid ${m.color}`,
              padding: '10px 12px',
            }}>
              <div style={{ fontSize: 7, color: S.textDim, letterSpacing: '0.14em', marginBottom: 5 }}>{m.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: m.color, fontFamily: 'monospace', lineHeight: 1 }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Pulse */}
        <div style={{ background: S.panel, border: `1px solid ${S.border}` }}>
          <div style={{ padding: '6px 12px', borderBottom: `1px solid ${S.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 8, color: S.amber, letterSpacing: '0.18em' }}>INGEST PULSE</span>
            <span style={{ fontSize: 8, color: '#5A8A5A' }}>● LIVE</span>
          </div>
          <div style={{ padding: '6px 12px 10px' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: 60, display: 'block' }} height={60}/>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ background: S.panel, border: `1px solid ${S.border}`, flex: 1 }}>
          <div style={{ display: 'flex', borderBottom: `1px solid ${S.border}` }}>
            {(['alerts','events','sites','signals'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: tab === t ? `2px solid ${S.amber}` : '2px solid transparent',
                color: tab === t ? S.text : S.textDim,
                fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase',
                fontFamily: 'monospace', marginBottom: -1,
              }}>
                {t} ({t==='alerts'?alerts.length:t==='events'?events.length:t==='sites'?sites.length:signals.length})
              </button>
            ))}
          </div>

          <div style={{ maxHeight: 360, overflowY: 'auto' }}>

            {tab === 'alerts' && (alerts.length === 0
              ? <div style={{ padding: 20, fontSize: 10, color: S.textDim, textAlign: 'center' }}>No alerts</div>
              : alerts.map(a => (
                <div key={a.id} style={{
                  display: 'grid', gridTemplateColumns: '3px 1fr auto',
                  gap: 10, padding: '9px 12px',
                  borderBottom: `1px solid ${S.border}`, alignItems: 'start',
                }}>
                  <div style={{ background: LEVEL_COLOR[a.alert_level] || S.muted, borderRadius: 1 }}/>
                  <div>
                    <div style={{ fontSize: 8, color: S.textDim, marginBottom: 3 }}>
                      <span style={{
                        padding: '1px 4px', fontSize: 7, fontWeight: 700,
                        background: `${LEVEL_COLOR[a.alert_level]}18`,
                        border: `1px solid ${LEVEL_COLOR[a.alert_level]}55`,
                        color: LEVEL_COLOR[a.alert_level], marginRight: 6,
                      }}>{a.alert_level}</span>
                      {SOURCE_SHORT[a.source] || a.source}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: S.text, lineHeight: 1.4 }}>
                      {a.event_type.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: 8, color: S.textDim, marginTop: 2 }}>
                      {JSON.stringify(a.payload).slice(0, 90)}
                    </div>
                  </div>
                  <div style={{ fontSize: 8, color: S.textDim, whiteSpace: 'nowrap' }}>{fmtAgo(a.created_at)}</div>
                </div>
              ))
            )}

            {tab === 'events' && (events.length === 0
              ? <div style={{ padding: 20, fontSize: 10, color: S.textDim, textAlign: 'center' }}>No events — run ingestion pipeline</div>
              : events.map(e => (
                <div key={e.id} style={{
                  display: 'grid', gridTemplateColumns: '48px 60px 1fr',
                  gap: 8, padding: '6px 12px',
                  borderBottom: `1px solid ${S.border}`, fontSize: 10, alignItems: 'start',
                }}>
                  <span style={{ color: S.textDim, fontSize: 8 }}>{fmtTime(e.created_at)}</span>
                  <span style={{ color: S.amber, fontSize: 8 }}>{SOURCE_SHORT[e.source] || e.source}</span>
                  <span style={{ color: S.text, lineHeight: 1.4 }}>
                    {e.event_type.replace(/_/g, ' ')} — {String(e.payload?.name || e.payload?.event || '').slice(0, 80)}
                  </span>
                </div>
              ))
            )}

            {tab === 'sites' && (sites.length === 0
              ? <div style={{ padding: 20, fontSize: 10, color: S.textDim, textAlign: 'center' }}>No sites tracked</div>
              : sites.map(s => (
                <div key={s.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr auto',
                  gap: 8, padding: '7px 12px',
                  borderBottom: `1px solid ${S.border}`,
                }}>
                  <div>
                    <div style={{ fontSize: 11, color: S.text, fontWeight: 600 }}>{s.name.slice(0, 60)}</div>
                    <div style={{ fontSize: 8, color: S.textDim, marginTop: 2 }}>
                      {s.site_type} · {s.source}
                      {s.metadata?.flow_cfs ? ` · ${Number(s.metadata.flow_cfs).toFixed(1)} cfs` : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 8, color: S.textDim }}>{fmtAgo(s.created_at)}</div>
                </div>
              ))
            )}

            {tab === 'signals' && (signals.length === 0
              ? <div style={{ padding: 20, fontSize: 10, color: S.textDim, textAlign: 'center' }}>No signal scans</div>
              : signals.map((s, i) => (
                <div key={s.id || i} style={{
                  display: 'grid', gridTemplateColumns: '70px 60px 1fr auto',
                  gap: 8, padding: '7px 12px',
                  borderBottom: `1px solid ${S.border}`, alignItems: 'start',
                }}>
                  <span style={{ fontSize: 8, color: S.amber, fontFamily: 'monospace' }}>{s.signal_type?.toUpperCase()}</span>
                  <span style={{ fontSize: 8, color: S.amberDim, fontFamily: 'monospace' }}>
                    {s.frequency_hz ? `${(s.frequency_hz/1e6).toFixed(0)}MHz` : '—'}
                  </span>
                  <div>
                    <div style={{ fontSize: 10, color: S.text, fontWeight: 600 }}>
                      {s.ssid || s.notes || `${s.lat?.toFixed(4)}, ${s.lon?.toFixed(4)}`}
                    </div>
                    <div style={{ fontSize: 8, color: S.textDim, marginTop: 2 }}>
                      {s.rssi_dbm ? `${s.rssi_dbm} dBm` : '—'} · {s.lat?.toFixed(4)}, {s.lon?.toFixed(4)}
                    </div>
                  </div>
                  <div style={{ fontSize: 8, color: S.textDim }}>{fmtAgo(s.created_at)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* RIGHT — ASTRA CHAT */}
      <aside style={{
        background: S.void,
        borderLeft: `1px solid ${S.border}`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '9px 12px', borderBottom: `1px solid ${S.borderAmber}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 8, color: S.amber, letterSpacing: '0.18em' }}>ASTRA INTELLIGENCE</span>
          <span style={{ fontSize: 7, color: S.amber, padding: '1px 5px',
            background: S.amberGlow, border: `1px solid ${S.borderAmber}` }}>LOCUS CORE</span>
        </div>

        <div style={{ padding: '7px 10px', borderBottom: `1px solid ${S.border}` }}>
          <div style={{ fontSize: 7, color: S.textDim, marginBottom: 4, letterSpacing: '0.12em' }}>ACTIVE DOMAINS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {['ENV','GEO','ASTRO','GEM','PLASMA','HUNT','OPS'].map(tag => (
              <span key={tag} style={{
                fontSize: 7, padding: '1px 5px',
                border: `1px solid ${S.border}`,
                color: S.amberDim, background: S.dim,
              }}>{tag}</span>
            ))}
          </div>
        </div>

        <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: 9, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {chat.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <div style={{
                width: 20, height: 20, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, fontWeight: 700, marginTop: 1,
                background: m.role === 'astra' ? S.dim : S.amberGlow,
                border: `1px solid ${m.role === 'astra' ? S.border : S.borderAmber}`,
                color: m.role === 'astra' ? S.amber : S.amber,
              }}>
                {m.role === 'astra' ? 'A' : 'DJ'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  background: m.role === 'astra' ? S.dim : S.amberGlow,
                  border: `1px solid ${m.role === 'astra' ? S.border : S.borderAmber}`,
                  padding: '6px 8px', fontSize: 11, lineHeight: 1.55, color: S.text,
                  whiteSpace: 'pre-wrap',
                }}>{m.content}</div>
                <div style={{ fontSize: 7, color: S.textDim, marginTop: 2 }}>
                  {m.role === 'astra' ? 'ASTRA' : 'DJ'} · {m.ts}
                </div>
              </div>
            </div>
          ))}
          {thinking && (
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ width: 20, height: 20, background: S.dim, border: `1px solid ${S.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: S.amber }}>A</div>
              <div style={{ background: S.dim, border: `1px solid ${S.border}`,
                padding: '8px 10px', display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 4, height: 4, borderRadius: '50%', background: S.amber,
                    animationDelay: `${i * 0.2}s`,
                  }}/>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: 9, borderTop: `1px solid ${S.border}`, display: 'flex', gap: 5 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Query ASTRA..."
            style={{
              flex: 1, background: S.dim,
              border: `1px solid ${S.border}`, color: S.text,
              padding: '6px 8px', fontSize: 11, fontFamily: 'monospace', outline: 'none',
            }}
          />
          <button onClick={sendMessage} disabled={thinking} style={{
            background: thinking ? S.dim : S.amberGlow,
            border: `1px solid ${S.borderAmber}`, color: S.amber,
            padding: '6px 10px', cursor: thinking ? 'not-allowed' : 'pointer',
            fontSize: 8, fontFamily: 'monospace',
          }}>
            {thinking ? '...' : 'SEND'}
          </button>
        </div>

        <div style={{ padding: '7px 10px', borderTop: `1px solid ${S.border}` }}>
          {['Ceto Interactive · cetointeractive.com','LithicEarth · lithicearth.com','Blue Duck Fdn · theblueduck.org'].map(e => (
            <div key={e} style={{ fontSize: 8, color: S.textDim, marginBottom: 2 }}>◈ {e}</div>
          ))}
          <div style={{ fontSize: 7, color: '#2A2A2A', marginTop: 3 }}>CAGE: 14V05 · UEI: LG15KPRZFQE3</div>
        </div>
      </aside>

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 2px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(176,136,64,0.3); }
      `}</style>
    </div>
  )
}
