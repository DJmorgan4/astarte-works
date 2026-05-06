'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface ChatMsg {
  role: 'user' | 'astra'
  content: string
  ts: string
}

interface ScanPoint {
  lat: number
  lon: number
  score: number
  label: string
}

function fmtTime() {
  return new Date().toLocaleTimeString('en-US', { hour12: false })
}

export default function NexusPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef   = useRef<number>(0)
  const rotRef    = useRef({ lon: -99.0, lat: 31.0, zoom: 2.5 })
  const dragging  = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const [clock, setClock]       = useState('')
  const [selected, setSelected] = useState<ScanPoint | null>(null)
  const [chat, setChat]         = useState<ChatMsg[]>([{
    role: 'astra',
    content: 'NEXUS online. Spatial brain active. Globe centered on Texas. Click any scan point to query terrain intelligence. Scroll to zoom.',
    ts: fmtTime(),
  }])
  const [input, setInput]   = useState('')
  const [thinking, setThinking] = useState(false)
  const [history, setHistory]   = useState<{role:string;content:string}[]>([])
  const chatRef = useRef<HTMLDivElement>(null)

  const scanPoints: ScanPoint[] = [
    { lat: 33.15, lon: -97.08, score: 0.87, label: 'Denton County — High terrain anomaly' },
    { lat: 30.27, lon: -97.74, score: 0.61, label: 'Travis County — Moderate SAR return' },
    { lat: 29.76, lon: -95.37, score: 0.43, label: 'Harris County — Low composite score' },
    { lat: 32.73, lon: -97.33, score: 0.79, label: 'Tarrant County — NDVI + terrain convergence' },
    { lat: 31.55, lon: -99.13, score: 0.92, label: 'Coleman County — Strong subsurface signal' },
    { lat: 30.51, lon: -99.74, score: 0.71, label: 'Kimble County — Aquifer inference hit' },
    { lat: 33.91, lon: -101.89, score: 0.55, label: 'Lubbock County — Llano Estacado scan' },
    { lat: 29.42, lon: -98.49, score: 0.38, label: 'Bexar County — Urban interference' },
  ]

  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toUTCString().split(' ')[4] + ' UTC'), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [chat])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let stars: {x:number;y:number;r:number;a:number}[] = []
    stars = Array.from({length: 200}, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.2 + 0.2,
      a: Math.random() * 0.8 + 0.2,
    }))

    function scoreColor(score: number) {
      if (score >= 0.75) return { fill: 'rgba(46,204,113,0.7)', stroke: '#2ECC71', glow: '#2ECC71' }
      if (score >= 0.5)  return { fill: 'rgba(200,151,58,0.7)',  stroke: '#C8973A', glow: '#C8973A' }
      return                    { fill: 'rgba(231,76,60,0.6)',   stroke: '#E74C3C', glow: '#E74C3C' }
    }

    function latLonToXY(lat: number, lon: number, cx: number, cy: number, r: number) {
      const dLon = ((lon - rotRef.current.lon) * Math.PI) / 180
      const dLat = ((lat - rotRef.current.lat) * Math.PI) / 180
      const x = cx + r * Math.sin(dLon) * Math.cos(dLat * 0.5)
      const y = cy - r * (Math.sin(dLat) * 0.7)
      const visible = Math.cos(dLon) > -0.3
      return { x, y, visible, depth: Math.cos(dLon) }
    }

    function draw(t: number) {
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      const W = canvas.width, H = canvas.height
      const cx = W * 0.42, cy = H * 0.5
      const R = Math.min(W, H) * 0.36 * rotRef.current.zoom

      ctx.clearRect(0, 0, W, H)

      stars.forEach(s => {
        ctx.beginPath()
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200,220,255,${s.a * (0.5 + 0.5 * Math.sin(t * 0.001 + s.x * 10))})`
        ctx.fill()
      })

      ctx.beginPath(); ctx.arc(cx + R * 0.15, cy + R * 0.15, R, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill()

      const globe = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.05, cx, cy, R)
      globe.addColorStop(0, '#0D2845')
      globe.addColorStop(0.5, '#08111F')
      globe.addColorStop(1, '#040C18')
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fillStyle = globe; ctx.fill()

      ctx.strokeStyle = 'rgba(18,168,172,0.08)'
      ctx.lineWidth = 0.5
      for (let lat = -80; lat <= 80; lat += 10) {
        ctx.beginPath()
        let first = true
        for (let lon = -180; lon <= 180; lon += 2) {
          const p = latLonToXY(lat, lon, cx, cy, R)
          if (!p.visible) { first = true; continue }
          first ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
          first = false
        }
        ctx.stroke()
      }
      for (let lon = -180; lon < 180; lon += 15) {
        ctx.beginPath()
        let first = true
        for (let lat = -80; lat <= 80; lat += 2) {
          const p = latLonToXY(lat, lon, cx, cy, R)
          if (!p.visible) { first = true; continue }
          first ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
          first = false
        }
        ctx.stroke()
      }

      const texasPts: [number,number][] = [
        [36.5,-103],[36.5,-100],[36.5,-99.5],[34.56,-99.38],[33.83,-99.18],
        [33.38,-99.99],[31.87,-103.98],[31.82,-106.53],[29.76,-104.55],
        [29.32,-103.66],[29.07,-102.9],[28.99,-100.96],[29.35,-99.51],
        [28.7,-99.12],[27.64,-99.44],[26.37,-99],[25.83,-97.14],[26.0,-97.0],
        [26.99,-97.4],[27.58,-97.43],[28.03,-97.05],[29.42,-94.52],
        [29.89,-93.84],[30.25,-93.77],[30.46,-93.74],[31.0,-93.53],
        [31.97,-93.81],[33.44,-93.99],[33.96,-94.04],[33.96,-95],
        [33.86,-96.67],[34.0,-97.46],[34.0,-98.0],[34.16,-98.12],
        [34.72,-98.54],[35.17,-99.52],[35.47,-99.99],[36.5,-100],
      ]
      ctx.beginPath()
      let firstTx = true
      texasPts.forEach(([lat,lon]) => {
        const p = latLonToXY(lat, lon, cx, cy, R)
        if (!p.visible) return
        firstTx ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
        firstTx = false
      })
      ctx.closePath()
      ctx.fillStyle = 'rgba(18,168,172,0.06)'
      ctx.strokeStyle = 'rgba(18,168,172,0.5)'
      ctx.lineWidth = 1.5
      ctx.fill(); ctx.stroke()

      scanPoints.forEach(pt => {
        const p = latLonToXY(pt.lat, pt.lon, cx, cy, R)
        if (!p.visible || p.depth < 0) return
        const c = scoreColor(pt.score)
        const pulse = 0.7 + 0.3 * Math.sin(t * 0.003 + pt.lon)
        const isSelected = selected?.label === pt.label
        const hr = isSelected ? 14 : 9

        ctx.shadowBlur = isSelected ? 24 : 12
        ctx.shadowColor = c.glow
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 6
          const hx = p.x + hr * Math.cos(a)
          const hy = p.y + hr * Math.sin(a)
          i === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy)
        }
        ctx.closePath()
        ctx.fillStyle = c.fill
        ctx.strokeStyle = c.stroke
        ctx.lineWidth = isSelected ? 2.5 : 1.5
        ctx.globalAlpha = pulse
        ctx.fill(); ctx.stroke()
        ctx.globalAlpha = 1
        ctx.shadowBlur = 0

        ctx.fillStyle = '#F0F4F8'
        ctx.font = `${isSelected ? '700' : '600'} ${isSelected ? 10 : 8}px monospace`
        ctx.fillText(`${Math.round(pt.score * 100)}%`, p.x + hr + 3, p.y + 4)
      })

      const rim = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R)
      rim.addColorStop(0, 'rgba(18,168,172,0)')
      rim.addColorStop(0.7, 'rgba(18,168,172,0.05)')
      rim.addColorStop(1, 'rgba(18,168,172,0.25)')
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fillStyle = rim; ctx.fill()
      ctx.strokeStyle = 'rgba(18,168,172,0.4)'; ctx.lineWidth = 1.5; ctx.stroke()

      const atm = ctx.createRadialGradient(cx, cy, R, cx, cy, R * 1.06)
      atm.addColorStop(0, 'rgba(18,168,172,0.1)')
      atm.addColorStop(1, 'rgba(18,168,172,0)')
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.06, 0, Math.PI * 2)
      ctx.fillStyle = atm; ctx.fill()

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [selected])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    const sensitivity = 0.15 / rotRef.current.zoom
    rotRef.current.lon -= dx * sensitivity * 30
    rotRef.current.lat = Math.max(-80, Math.min(80, rotRef.current.lat + dy * sensitivity * 20))
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseUp = useCallback(() => { dragging.current = false }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    rotRef.current.zoom = Math.max(0.8, Math.min(8.0, rotRef.current.zoom - e.deltaY * 0.002))
  }, [])

  const handleClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const W = canvas.offsetWidth, H = canvas.offsetHeight
    const cx = W * 0.42, cy = H * 0.5
    const R = Math.min(W, H) * 0.36 * rotRef.current.zoom

    for (const pt of scanPoints) {
      const dLon = ((pt.lon - rotRef.current.lon) * Math.PI) / 180
      const dLat = ((pt.lat - rotRef.current.lat) * Math.PI) / 180
      const px = cx + R * Math.sin(dLon) * Math.cos(dLat * 0.5)
      const py = cy - R * Math.sin(dLat) * 0.7
      const dist = Math.sqrt((mx - px) ** 2 + (my - py) ** 2)
      if (dist < 20) {
        setSelected(pt)
        setChat(c => [...c, {
          role: 'astra',
          content: `📍 ${pt.label}\n\nMSIGI Score: ${Math.round(pt.score * 100)}% — ${pt.score >= 0.75 ? 'HIGH PRIORITY' : pt.score >= 0.5 ? 'MODERATE INTEREST' : 'LOW PRIORITY'}\n\nQuery this location for detailed terrain, SAR, NDVI, and regulatory intelligence.`,
          ts: fmtTime(),
        }])
        return
      }
    }
  }, [scanPoints])

  async function sendMessage() {
    const msg = input.trim()
    if (!msg || thinking) return
    setInput('')
    const ts = fmtTime()
    setChat(c => [...c, { role: 'user', content: msg, ts }])
    setThinking(true)
    try {
      const context = selected
        ? `Current selected location: ${selected.label} (MSIGI score: ${Math.round(selected.score * 100)}%). `
        : ''
      const r = await fetch('/api/astra/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: context + msg, history }),
      })
      const j = await r.json()
      const reply = j.response || j.error || 'No response'
      setChat(c => [...c, { role: 'astra', content: reply, ts: fmtTime() }])
      setHistory(h => [...h, { role: 'user', content: msg }, { role: 'assistant', content: reply }])
    } catch (err) {
      setChat(c => [...c, { role: 'astra', content: `Error: ${String(err)}`, ts: fmtTime() }])
    } finally {
      setThinking(false)
    }
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateRows: '48px 1fr',
      gridTemplateColumns: '1fr 320px',
      height: '100vh',
      background: '#040C18',
      color: '#F0F4F8',
      fontFamily: "'Space Mono', monospace",
      overflow: 'hidden',
    }}>

      <header style={{
        gridColumn: '1/-1',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        background: 'rgba(4,12,24,0.98)',
        borderBottom: '1px solid rgba(18,168,172,0.2)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 26, height: 26, background: '#12A8AC',
            clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)',
          }}/>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', color: '#F0F4F8' }}>NEXUS</div>
            <div style={{ fontSize: 8, color: '#12A8AC', letterSpacing: '0.15em' }}>ASTRA SPATIAL BRAIN · ASTARTE WORKS</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 9, color: '#4A6080' }}>
          <span style={{ color: '#2ECC71' }}>● GLOBE ACTIVE</span>
          <span>{scanPoints.length} SCAN POINTS</span>
          <a href="/mission" style={{ color: '#C8973A', textDecoration: 'none', fontSize: 9 }}>← MISSION CONTROL</a>
        </div>
        <div style={{ fontSize: 11, color: '#12A8AC', fontFamily: 'monospace' }}>{clock}</div>
      </header>

      <main style={{ position: 'relative', overflow: 'hidden', cursor: dragging.current ? 'grabbing' : 'grab' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
          onWheel={handleWheel}
        />

        <div style={{
          position: 'absolute', bottom: 20, left: 20,
          background: 'rgba(8,17,31,0.9)', border: '1px solid rgba(18,168,172,0.2)',
          padding: '10px 14px', fontSize: 9,
        }}>
          <div style={{ color: '#4A6080', letterSpacing: '0.12em', marginBottom: 8 }}>MSIGI SCORE</div>
          {[
            { label: 'HIGH  ≥75%', color: '#2ECC71' },
            { label: 'MED   50–74%', color: '#C8973A' },
            { label: 'LOW   <50%',  color: '#E74C3C' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, background: l.color, clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)' }}/>
              <span style={{ color: '#9AA5B4' }}>{l.label}</span>
            </div>
          ))}
          <div style={{ marginTop: 8, color: '#4A6080', fontSize: 8 }}>SCROLL TO ZOOM · DRAG TO ROTATE · CLICK TO QUERY</div>
        </div>

        {selected && (
          <div style={{
            position: 'absolute', top: 16, left: 16,
            background: 'rgba(8,17,31,0.95)', border: '1px solid rgba(18,168,172,0.4)',
            padding: '12px 16px', maxWidth: 280, fontSize: 10,
          }}>
            <div style={{ fontSize: 8, color: '#12A8AC', letterSpacing: '0.15em', marginBottom: 6 }}>SELECTED LOCATION</div>
            <div style={{ color: '#F0F4F8', fontWeight: 700, marginBottom: 4, lineHeight: 1.4 }}>{selected.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                fontSize: 20, fontWeight: 800, fontFamily: 'monospace',
                color: selected.score >= 0.75 ? '#2ECC71' : selected.score >= 0.5 ? '#C8973A' : '#E74C3C',
              }}>{Math.round(selected.score * 100)}%</div>
              <div style={{ fontSize: 8, color: '#4A6080' }}>
                MSIGI COMPOSITE<br/>
                {selected.score >= 0.75 ? 'HIGH PRIORITY' : selected.score >= 0.5 ? 'MODERATE' : 'LOW PRIORITY'}
              </div>
            </div>
            <button onClick={() => setSelected(null)} style={{
              marginTop: 8, background: 'none', border: '1px solid rgba(18,168,172,0.3)',
              color: '#4A6080', fontSize: 8, padding: '3px 8px', cursor: 'pointer', fontFamily: 'monospace',
            }}>CLEAR</button>
          </div>
        )}
      </main>

      <aside style={{
        background: 'rgba(8,17,31,0.98)',
        borderLeft: '1px solid rgba(18,168,172,0.15)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(200,151,58,0.2)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: '#C8973A', letterSpacing: '0.15em' }}>ASTRA SPATIAL INTELLIGENCE</span>
          <span style={{ fontSize: 8, color: '#2ECC71' }}>● ONLINE</span>
        </div>

        <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(18,168,172,0.1)' }}>
          <div style={{ fontSize: 8, color: '#4A6080', marginBottom: 5, letterSpacing: '0.1em' }}>ACTIVE LAYERS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {['MSIGI v1', 'SAR Pipeline', 'NDVI', 'Terrain', 'STRATUM'].map(tag => (
              <span key={tag} style={{
                fontSize: 8, padding: '2px 6px',
                border: '1px solid rgba(18,168,172,0.3)',
                color: '#12A8AC', background: 'rgba(10,107,111,0.1)',
              }}>{tag}</span>
            ))}
          </div>
        </div>

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
                  padding: '7px 9px', fontSize: 11, lineHeight: 1.55, color: '#F0F4F8',
                  whiteSpace: 'pre-wrap',
                }}>{m.content}</div>
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
                  <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#12A8AC' }}/>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: 10, borderTop: '1px solid rgba(18,168,172,0.15)', display: 'flex', gap: 6 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Query spatial intelligence..."
            style={{
              flex: 1, background: 'rgba(4,12,24,0.8)',
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

        <div style={{ borderTop: '1px solid rgba(18,168,172,0.1)', maxHeight: 160, overflowY: 'auto' }}>
          <div style={{ padding: '6px 12px', fontSize: 8, color: '#4A6080', letterSpacing: '0.12em' }}>SCAN POINTS</div>
          {scanPoints.sort((a,b) => b.score - a.score).map(pt => (
            <div key={pt.label}
              onClick={() => {
                setSelected(pt)
                rotRef.current.lon = pt.lon
                rotRef.current.lat = pt.lat
              }}
              style={{
                padding: '5px 12px', cursor: 'pointer', fontSize: 9,
                background: selected?.label === pt.label ? 'rgba(18,168,172,0.08)' : 'transparent',
                borderLeft: selected?.label === pt.label ? '2px solid #12A8AC' : '2px solid transparent',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid rgba(18,168,172,0.05)',
              }}>
              <span style={{ color: '#9AA5B4', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pt.label}
              </span>
              <span style={{
                color: pt.score >= 0.75 ? '#2ECC71' : pt.score >= 0.5 ? '#C8973A' : '#E74C3C',
                fontWeight: 700, flexShrink: 0, marginLeft: 8,
              }}>{Math.round(pt.score * 100)}%</span>
            </div>
          ))}
        </div>
      </aside>

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(18,168,172,0.4); }
      `}</style>
    </div>
  )
}