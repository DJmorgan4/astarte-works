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

const S = {
  void:        '#080808',
  panel:       '#0d0d0d',
  border:      'rgba(176,136,64,0.12)',
  borderHot:   'rgba(176,136,64,0.35)',
  amber:       '#B08840',
  amberDim:    '#4A3A1A',
  amberGlow:   'rgba(176,136,64,0.06)',
  muted:       '#2A2A2A',
  dim:         '#141414',
  text:        '#C8C0B0',
  textDim:     '#444038',
  redBright:   '#A03030',
  greenBright: '#3A6A3A',
  mono:        "'Space Mono', 'Courier New', monospace",
}

function fmtAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.floor(m/60)}h`
  return `${Math.floor(m/1440)}d`
}

function PulseCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pulseRef  = useRef<number[]>(new Array(200).fill(0))

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
      const spike = Math.random() > 0.95 ? Math.random() * 0.7 + 0.3 : 0
      pulseRef.current.shift()
      pulseRef.current.push((Math.random() - 0.5) * 0.12 + spike * 0.6)
      ctx.clearRect(0, 0, w, h)
      const step = w / pulseRef.current.length
      ctx.strokeStyle = 'rgba(176,136,64,0.7)'
      ctx.lineWidth = 1
      ctx.shadowBlur  = 4
      ctx.shadowColor = 'rgba(176,136,64,0.3)'
      ctx.beginPath()
      pulseRef.current.forEach((v, i) => {
        const x = i * step
        const y = h / 2 - v * h * 0.42
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.shadowBlur = 0
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
}

export default function MissionControl() {
  const [alerts,    setAlerts]    = useState<Alert[]>([])
  const [sites,     setSites]     = useState<Site[]>([])
  const [chat,      setChat]      = useState<ChatMsg[]>([{
    role: 'astra',
    content: 'ASTRA CORE online. STRATUM indexed. Monitoring USGS, EPA, NOAA, ASF, TCEQ feeds. Query anything.',
    ts: new Date().toLocaleTimeString('en-US', { hour12: false }),
  }])
  const [input,     setInput]     = useState('')
  const [thinking,  setThinking]  = useState(false)
  const [clock,     setClock]     = useState('')
  const [history,   setHistory]   = useState<{role:string;content:string}[]>([])
  const [activeTab, setActiveTab] = useState<'alerts'|'sites'>('alerts')
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setInterval(() => {
      setClock(new Date().toUTCString().replace('GMT', 'UTC'))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const fetchAlerts = useCallback(async () => {
    try {
      const r = await fetch('/api/astra/alerts')
      const j = await r.json()
      if (j.alerts) setAlerts(j.alerts)
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
    fetchAlerts(); fetchSites()
    const t = setInterval(fetchAlerts, 60000)
    return () => clearInterval(t)
  }, [fetchAlerts, fetchSites])

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [chat])

  const send = async () => {
    const msg = input.trim()
    if (!msg || thinking) return
    setInput('')
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false })
    setChat(c => [...c, { role: 'user', content: msg, ts }])
    setThinking(true)
    const newHistory = [...history, { role: 'user', content: msg }]
    try {
      const r = await fetch('/api/astra/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history }),
      })
      const j = await r.json()
      const reply = j.response || j.error || 'No response'
      setChat(c => [...c, { role: 'astra', content: reply, ts: new Date().toLocaleTimeString('en-US', { hour12: false }) }])
      setHistory([...newHistory, { role: 'assistant', content: reply }])
    } catch {
      setChat(c => [...c, { role: 'astra', content: 'Connection error.', ts }])
    }
    setThinking(false)
  }

  const unread = alerts.filter(a => !a.read).length
  const highAlerts = alerts.filter(a => a.alert_level === 'HIGH')

  return (
    <div style={{
      height: '100vh',
      background: S.void,
      color: S.text,
      fontFamily: S.mono,
      display: 'grid',
      gridTemplateRows: '44px 1fr',
      gridTemplateColumns: '1fr 380px',
      overflow: 'hidden',
    }}>

      {/* ── TOPBAR ── */}
      <header style={{
        gridColumn: '1/-1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: `1px solid ${S.borderHot}`,
        background: S.void,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 18, height: 18,
            background: S.amber,
            clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)',
          }}/>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.28em', color: S.text }}>ASTRA CORE</div>
            <div style={{ fontSize: 7, color: S.amberDim, letterSpacing: '0.2em', marginTop: 1 }}>MISSION CONTROL</div>
          </div>
          <div style={{ width: 1, height: 24, background: S.border, margin: '0 6px' }}/>
          <div style={{ display: 'flex', gap: 16, fontSize: 8, letterSpacing: '0.14em' }}>
            {['STRATUM', 'LOCUS', 'NEXUS'].map(s => (
              <span key={s} style={{ color: S.amberDim }}>{s}</span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {unread > 0 && (
            <div style={{
              fontSize: 8, letterSpacing: '0.14em',
              color: S.redBright, border: `1px solid ${S.redBright}`,
              padding: '2px 8px',
            }}>
              {unread} UNREAD
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 8, color: S.greenBright, letterSpacing: '0.14em' }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: S.greenBright, boxShadow: `0 0 6px ${S.greenBright}` }}/>
            FEEDS LIVE
          </div>
          <div style={{ fontSize: 9, color: S.amber, letterSpacing: '0.06em' }}>{clock}</div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 16, gap: 12 }}>

        {/* Pulse */}
        <div style={{
          height: 56,
          border: `1px solid ${S.border}`,
          background: S.panel,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 6, left: 10, zIndex: 1,
            fontSize: 7, color: S.textDim, letterSpacing: '0.2em',
          }}>INGEST PULSE</div>
          <PulseCanvas />
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {[
            { label: 'ALERTS', value: alerts.length,      hot: alerts.length > 0 },
            { label: 'HIGH',   value: highAlerts.length,  hot: highAlerts.length > 0 },
            { label: 'SITES',  value: sites.length,       hot: false },
            { label: 'FEEDS',  value: 5,                  hot: false },
          ].map(m => (
            <div key={m.label} style={{
              background: S.panel,
              border: `1px solid ${m.hot ? S.borderHot : S.border}`,
              padding: '10px 14px',
            }}>
              <div style={{ fontSize: 7, color: S.textDim, letterSpacing: '0.2em', marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 22, color: m.hot ? S.amber : S.textDim, lineHeight: 1 }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${S.border}` }}>
          {(['alerts', 'sites'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px 16px',
              fontSize: 8, letterSpacing: '0.2em',
              color: activeTab === t ? S.amber : S.textDim,
              borderBottom: activeTab === t ? `1px solid ${S.amber}` : '1px solid transparent',
              marginBottom: -1, fontFamily: S.mono,
            }}>
              {t.toUpperCase()} ({t === 'alerts' ? alerts.length : sites.length})
            </button>
          ))}
        </div>

        {/* Feed */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {activeTab === 'alerts' && alerts.map(a => {
            const payload = a.payload || {}
            const event = (payload as any).event || a.event_type || '—'
            const areas  = (payload as any).areas || ''
            return (
              <div key={a.id} style={{
                padding: '8px 12px',
                background: S.panel,
                border: `1px solid ${a.alert_level === 'HIGH' ? 'rgba(160,48,48,0.25)' : S.border}`,
                display: 'grid',
                gridTemplateColumns: '44px 1fr 32px',
                gap: 10,
                alignItems: 'center',
              }}>
                <div style={{
                  fontSize: 7, letterSpacing: '0.1em',
                  color: a.alert_level === 'HIGH' ? S.redBright : a.alert_level === 'MEDIUM' ? S.amber : S.textDim,
                }}>
                  {a.alert_level}
                </div>
                <div>
                  <div style={{ fontSize: 10, color: S.text, marginBottom: 2 }}>{event}</div>
                  {areas && <div style={{ fontSize: 8, color: S.textDim }}>{String(areas).slice(0, 80)}</div>}
                </div>
                <div style={{ fontSize: 7, color: S.textDim, textAlign: 'right' }}>{fmtAgo(a.created_at)}</div>
              </div>
            )
          })}

          {activeTab === 'sites' && sites.map(s => (
            <div key={s.id} style={{
              padding: '8px 12px',
              background: S.panel,
              border: `1px solid ${S.border}`,
              display: 'grid',
              gridTemplateColumns: '1fr 56px',
              gap: 10,
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 10, color: S.text, marginBottom: 2 }}>{s.name || '—'}</div>
                <div style={{ fontSize: 8, color: S.textDim }}>{s.site_type} · {s.source}</div>
              </div>
              <div style={{ fontSize: 7, color: S.amberDim, textAlign: 'right' }}>{fmtAgo(s.created_at)}</div>
            </div>
          ))}

          {activeTab === 'alerts' && alerts.length === 0 && (
            <div style={{ padding: 24, fontSize: 9, color: S.textDim, textAlign: 'center', letterSpacing: '0.14em' }}>
              NO ACTIVE ALERTS
            </div>
          )}
        </div>

        {/* Entity links */}
        <div style={{ display: 'flex', gap: 8, paddingTop: 8, borderTop: `1px solid ${S.border}` }}>
          {[
            { label: 'CETO INTERACTIVE', href: 'https://cetointeractive.com' },
            { label: 'LITHICEARTH',      href: 'https://lithicearth.com' },
            { label: 'BLUE DUCK FDN',    href: 'https://theblueduck.org' },
          ].map(e => (
            <a key={e.label} href={e.href} target="_blank" rel="noreferrer" style={{
              fontSize: 7, color: S.textDim, letterSpacing: '0.16em',
              textDecoration: 'none', padding: '3px 8px',
              border: `1px solid ${S.border}`,
            }}>{e.label}</a>
          ))}
        </div>
      </main>

      {/* ── ASTRA CHAT ── */}
      <aside style={{
        borderLeft: `1px solid ${S.borderHot}`,
        background: S.panel,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '10px 16px',
          borderBottom: `1px solid ${S.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 8, color: S.amber, letterSpacing: '0.22em' }}>ASTRA INTELLIGENCE</div>
          <div style={{ fontSize: 7, color: S.textDim, letterSpacing: '0.14em' }}>LOCUS CORE</div>
        </div>

        <div style={{ padding: '8px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {['ASTM E1527', 'TCEQ Rules', 'USACE Wetlands', 'MSIGI v1', 'SAR Pipeline', '14 Corpora'].map(tag => (
            <div key={tag} style={{
              fontSize: 7, color: S.amberDim, letterSpacing: '0.1em',
              padding: '2px 6px', border: `1px solid ${S.amberDim}`,
            }}>{tag}</div>
          ))}
        </div>

        <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {chat.map((m, i) => (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', gap: 4,
              alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{ fontSize: 7, color: S.textDim, letterSpacing: '0.12em' }}>
                {m.role === 'astra' ? 'ASTRA' : 'DJ'} · {m.ts}
              </div>
              <div style={{
                maxWidth: '88%',
                fontSize: 11,
                lineHeight: 1.6,
                color: m.role === 'astra' ? S.text : S.amber,
                background: m.role === 'astra' ? S.dim : 'transparent',
                border: `1px solid ${m.role === 'astra' ? S.border : S.borderHot}`,
                padding: '8px 12px',
                whiteSpace: 'pre-wrap',
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {thinking && (
            <div style={{ fontSize: 9, color: S.amberDim, letterSpacing: '0.14em' }}>
              ASTRA PROCESSING...
            </div>
          )}
        </div>

        <div style={{
          padding: '10px 16px',
          borderTop: `1px solid ${S.borderHot}`,
          display: 'flex', gap: 8,
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Query ASTRA..."
            style={{
              flex: 1,
              background: S.void,
              border: `1px solid ${S.border}`,
              color: S.text,
              fontSize: 11,
              padding: '8px 12px',
              fontFamily: S.mono,
              outline: 'none',
            }}
          />
          <button onClick={send} disabled={thinking} style={{
            background: thinking ? S.amberDim : S.amber,
            border: 'none',
            color: S.void,
            fontSize: 9,
            padding: '0 14px',
            cursor: thinking ? 'wait' : 'pointer',
            letterSpacing: '0.14em',
            fontFamily: S.mono,
          }}>
            {thinking ? '...' : 'SEND'}
          </button>
        </div>
      </aside>

      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:2px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(176,136,64,0.25)}
      `}</style>
    </div>
  )
}
