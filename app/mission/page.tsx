'use client'
// v4.0 — Ceto palette, no weather alerts

import { useEffect, useRef, useState, useCallback } from 'react'

interface Site {
  id: string; name: string; site_type: string; status: string; created_at: string
}
interface KnowledgeEntry {
  id: string; domain: string; created_at: string
}
interface ChatMsg { role: 'user' | 'astra'; content: string; ts: string }

const SB   = 'https://jmkopheshisqqmocwhto.supabase.co/rest/v1'
const SBKEY = 'sb_publishable_oJCKKDU8IGdOPPykH9aQFg_tJLjXdO4'
const H     = { apikey: SBKEY, Authorization: `Bearer ${SBKEY}` }

const S = {
  bg:       '#F6F7F8',
  panel:    '#FFFFFF',
  panelAlt: '#EEF0F2',
  border:   'rgba(20,35,55,0.1)',
  borderBlue:'rgba(47,93,140,0.35)',
  ink:      '#142337',
  inkDim:   '#4A5E72',
  inkFaint: '#8A9BAD',
  blue:     '#2F5D8C',
  blueDark: '#234B74',
  blueLight:'rgba(47,93,140,0.08)',
  teal:     '#4F7A6A',
  tealLight:'rgba(79,122,106,0.1)',
  red:      '#B04040',
  green:    '#3A7A5A',
  mono:     "'Space Mono','Courier New',monospace",
  sans:     "ui-sans-serif,system-ui,-apple-system,sans-serif",
}

function fmtAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.floor(m/60)}h`
  return `${Math.floor(m/1440)}d`
}

function PulseCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  const buf = useRef<number[]>(new Array(300).fill(0))
  useEffect(() => {
    const c = ref.current; if (!c) return
    let raf: number
    const draw = () => {
      const ctx = c.getContext('2d'); if (!ctx) return
      c.width = c.offsetWidth; c.height = c.offsetHeight
      const w = c.width, h = c.height
      buf.current.shift()
      buf.current.push((Math.random()-.5)*.08 + (Math.random()>.96 ? Math.random()*.7 : 0)*.4)
      ctx.clearRect(0,0,w,h)
      ctx.strokeStyle = 'rgba(47,93,140,0.5)'; ctx.lineWidth = 1.5
      ctx.shadowBlur = 3; ctx.shadowColor = 'rgba(47,93,140,0.2)'
      ctx.beginPath()
      buf.current.forEach((v,i) => {
        const x = i*(w/buf.current.length), y = h/2 - v*h*.45
        i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y)
      })
      ctx.stroke(); ctx.shadowBlur = 0
      raf = requestAnimationFrame(draw)
    }
    draw(); return () => cancelAnimationFrame(raf)
  },[])
  return <canvas ref={ref} style={{width:'100%',height:'100%',display:'block'}}/>
}

export default function MissionControl() {
  const [sites,     setSites]     = useState<Site[]>([])
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([])
  const [engine,    setEngine]    = useState<'online'|'offline'|'checking'>('checking')
  const [kCount,    setKCount]    = useState(0)
  const [chat,      setChat]      = useState<ChatMsg[]>([{
    role:'astra',
    content:'ASTRA CORE online. STRATUM indexed. Monitoring USGS, EPA, NOAA, ASF, TCEQ. Query anything — environmental, esoteric, operational.',
    ts: new Date().toLocaleTimeString('en-US',{hour12:false})
  }])
  const [input,    setInput]    = useState('')
  const [thinking, setThinking] = useState(false)
  const [clock,    setClock]    = useState('')
  const [history,  setHistory]  = useState<{role:string;content:string}[]>([])
  const [tab,      setTab]      = useState<'sites'|'knowledge'>('sites')
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toUTCString().replace('GMT','UTC')), 1000)
    return () => clearInterval(t)
  },[])

  const fetchSites = useCallback(async () => {
    try {
      const r = await fetch(`${SB}/stratum_sites?select=id,name,site_type,status,created_at&order=created_at.desc&limit=50`, {headers:H})
      const d = await r.json()
      if (Array.isArray(d)) setSites(d.filter((s:Site) => s.site_type !== 'weather_alert'))
    } catch {}
  },[])

  const fetchKnowledge = useCallback(async () => {
    try {
      const r = await fetch(`${SB}/astra_knowledge?select=id,domain,created_at&order=created_at.desc&limit=15`, {headers:H})
      const d = await r.json()
      if (Array.isArray(d)) setKnowledge(d)
    } catch {}
  },[])

  const fetchKCount = useCallback(async () => {
    try {
      const r = await fetch(`${SB}/astra_knowledge?select=id`, {headers:{...H,'Prefer':'count=exact'}})
      const cr = r.headers.get('content-range')
      if (cr) setKCount(parseInt(cr.split('/')[1])||0)
    } catch {}
  },[])

  const checkEngine = useCallback(async () => {
    try {
      const r = await fetch('https://lithicearth-production.up.railway.app/health', {signal:AbortSignal.timeout(5000)})
      setEngine(r.ok ? 'online' : 'offline')
    } catch { setEngine('offline') }
  },[])

  useEffect(() => {
    fetchSites(); fetchKnowledge(); fetchKCount(); checkEngine()
    const t = setInterval(() => { fetchSites(); fetchKnowledge(); fetchKCount() }, 60000)
    const e = setInterval(checkEngine, 120000)
    return () => { clearInterval(t); clearInterval(e) }
  },[fetchSites, fetchKnowledge, fetchKCount, checkEngine])

  useEffect(() => {
    chatRef.current?.scrollTo({top:chatRef.current.scrollHeight, behavior:'smooth'})
  },[chat])

  const send = async () => {
    const msg = input.trim(); if (!msg || thinking) return
    setInput('')
    const ts = new Date().toLocaleTimeString('en-US',{hour12:false})
    setChat(c => [...c, {role:'user', content:msg, ts}])
    setThinking(true)
    const nh = [...history, {role:'user', content:msg}]
    try {
      const r = await fetch('/api/astra/query', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({message:msg, history})
      })
      const j = await r.json()
      const reply = j.response || j.error || 'No response'
      setChat(c => [...c, {role:'astra', content:reply, ts:new Date().toLocaleTimeString('en-US',{hour12:false})}])
      setHistory([...nh, {role:'assistant', content:reply}])
    } catch { setChat(c => [...c, {role:'astra', content:'Connection error.', ts}]) }
    setThinking(false)
  }

  const esaSites   = sites.filter(s => s.site_type === 'ESA')
  const gaugeSites = sites.filter(s => s.site_type === 'stream_gauge')
  const todayK     = knowledge.filter(k => new Date(k.created_at).toDateString() === new Date().toDateString())

  return (
    <div style={{height:'100vh', background:S.bg, color:S.ink, fontFamily:S.sans,
      display:'grid', gridTemplateRows:'52px 1fr', gridTemplateColumns:'1fr 400px', overflow:'hidden'}}>

      {/* TOPBAR */}
      <header style={{gridColumn:'1/-1', display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 28px', borderBottom:`1px solid ${S.borderBlue}`, background:S.panel,
        boxShadow:'0 1px 4px rgba(20,35,55,0.06)'}}>
        <div style={{display:'flex', alignItems:'center', gap:16}}>
          <div style={{width:28, height:28, background:S.blue, borderRadius:6,
            display:'flex', alignItems:'center', justifyContent:'center'}}>
            <div style={{width:12, height:12, background:'white', borderRadius:2}}/>
          </div>
          <div>
            <div style={{fontSize:13, fontWeight:600, letterSpacing:'0.06em', color:S.ink}}>ASTRA CORE</div>
            <div style={{fontSize:10, color:S.inkFaint, letterSpacing:'0.12em'}}>MISSION CONTROL</div>
          </div>
          <div style={{width:1, height:28, background:S.border, margin:'0 8px'}}/>
          {['STRATUM','LOCUS','NEXUS'].map(s =>
            <span key={s} style={{fontSize:9, color:S.inkDim, letterSpacing:'0.12em',
              padding:'2px 8px', border:`1px solid ${S.border}`, borderRadius:3}}>{s}</span>
          )}
        </div>
        <div style={{display:'flex', alignItems:'center', gap:20}}>
          <div style={{display:'flex', alignItems:'center', gap:6, fontSize:10,
            color: engine==='online' ? S.green : engine==='offline' ? S.red : S.inkFaint}}>
            <div style={{width:6, height:6, borderRadius:'50%',
              background: engine==='online' ? S.green : engine==='offline' ? S.red : S.inkFaint,
              boxShadow: engine==='online' ? `0 0 6px ${S.green}` : 'none'}}/>
            ENGINE {engine.toUpperCase()}
          </div>
          <div style={{fontSize:11, color:S.inkDim, fontFamily:S.mono}}>{clock}</div>
        </div>
      </header>

      {/* MAIN */}
      <main style={{overflow:'hidden', display:'flex', flexDirection:'column', padding:20, gap:12,
        background:S.bg}}>

        {/* Pulse */}
        <div style={{height:52, border:`1px solid ${S.borderBlue}`, background:S.panel,
          borderRadius:6, position:'relative', overflow:'hidden', flexShrink:0,
          boxShadow:'0 1px 3px rgba(20,35,55,0.05)'}}>
          <div style={{position:'absolute', top:6, left:12, zIndex:1,
            fontSize:9, color:S.inkFaint, letterSpacing:'0.16em', fontFamily:S.mono}}>INGEST PULSE</div>
          <PulseCanvas/>
        </div>

        {/* Stats */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, flexShrink:0}}>
          {[
            {l:'KNOWLEDGE',  v:kCount,          c:S.blue},
            {l:'SITES',      v:sites.length,    c:S.teal},
            {l:'ESA ACTIVE', v:esaSites.length, c:S.blue},
            {l:'TODAY',      v:todayK.length,   c:S.teal},
          ].map(m => (
            <div key={m.l} style={{background:S.panel, border:`1px solid ${S.border}`,
              borderTop:`3px solid ${m.c}`, padding:'10px 14px', borderRadius:6,
              boxShadow:'0 1px 3px rgba(20,35,55,0.05)'}}>
              <div style={{fontSize:9, color:S.inkFaint, letterSpacing:'0.14em', marginBottom:6,
                fontFamily:S.mono}}>{m.l}</div>
              <div style={{fontSize:24, color:m.c, lineHeight:1, fontWeight:600}}>{m.v}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:'flex', borderBottom:`1px solid ${S.border}`, flexShrink:0}}>
          {(['sites','knowledge'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background:'none', border:'none', cursor:'pointer', padding:'7px 16px',
              fontSize:10, letterSpacing:'0.14em', fontFamily:S.mono,
              color: tab===t ? S.blue : S.inkFaint,
              borderBottom: tab===t ? `2px solid ${S.blue}` : '2px solid transparent',
              marginBottom:-1, fontWeight: tab===t ? 600 : 400,
            }}>
              {t.toUpperCase()} ({t==='sites'?sites.length:knowledge.length})
            </button>
          ))}
        </div>

        {/* Feed */}
        <div style={{flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:4}}>

          {tab==='sites' && sites.map(s => (
            <div key={s.id} style={{padding:'10px 14px', background:S.panel,
              border:`1px solid ${s.site_type==='ESA'?S.borderBlue:S.border}`,
              borderLeft:`3px solid ${s.site_type==='ESA'?S.blue:S.teal}`,
              borderRadius:6, display:'grid',
              gridTemplateColumns:'70px 1fr 60px 40px', gap:12, alignItems:'center',
              boxShadow:'0 1px 2px rgba(20,35,55,0.04)'}}>
              <div style={{fontSize:9, fontWeight:600, letterSpacing:'0.1em', fontFamily:S.mono,
                color:s.site_type==='ESA'?S.blue:S.teal}}>
                {s.site_type==='stream_gauge'?'GAUGE':s.site_type.toUpperCase()}
              </div>
              <div style={{fontSize:12, color:S.ink, fontWeight:500}}>{s.name}</div>
              <div style={{fontSize:9, color:s.status==='active'?S.green:S.inkFaint,
                letterSpacing:'0.08em', fontFamily:S.mono}}>
                {s.status?.toUpperCase()}
              </div>
              <div style={{fontSize:9, color:S.inkFaint, textAlign:'right',
                fontFamily:S.mono}}>{fmtAgo(s.created_at)}</div>
            </div>
          ))}

          {tab==='knowledge' && knowledge.map(k => (
            <div key={k.id} style={{padding:'10px 14px', background:S.panel,
              border:`1px solid ${S.border}`, borderLeft:`3px solid ${S.blue}`,
              borderRadius:6, display:'grid', gridTemplateColumns:'1fr 40px', gap:12,
              alignItems:'center', boxShadow:'0 1px 2px rgba(20,35,55,0.04)'}}>
              <div style={{fontSize:12, color:S.blue, fontWeight:500, letterSpacing:'0.04em'}}>
                {k.domain.replace(/_/g,' ')}
              </div>
              <div style={{fontSize:9, color:S.inkFaint, textAlign:'right',
                fontFamily:S.mono}}>{fmtAgo(k.created_at)}</div>
            </div>
          ))}

          {tab==='sites' && sites.length===0 &&
            <div style={{padding:32, fontSize:11, color:S.inkFaint, textAlign:'center',
              letterSpacing:'0.1em', fontFamily:S.mono}}>NO SITES TRACKED</div>
          }
        </div>

        {/* Entity links */}
        <div style={{display:'flex', gap:8, paddingTop:10,
          borderTop:`1px solid ${S.border}`, flexShrink:0}}>
          {[
            {l:'Ceto Interactive', h:'https://cetointeractive.com/portal'},
            {l:'LithicEarth',      h:'https://lithicearth.com/portal/viewer'},
            {l:'Blue Duck Fdn',    h:'https://theblueduck.org'},
          ].map(e => (
            <a key={e.l} href={e.h} target="_blank" rel="noreferrer" style={{
              fontSize:11, color:S.blue, letterSpacing:'0.04em', fontWeight:500,
              textDecoration:'none', padding:'5px 12px',
              border:`1px solid ${S.borderBlue}`, borderRadius:4,
              background:S.blueLight,
            }}>{e.l}</a>
          ))}
        </div>
      </main>

      {/* ASTRA CHAT */}
      <aside style={{borderLeft:`1px solid ${S.border}`, background:S.panel,
        display:'flex', flexDirection:'column', overflow:'hidden',
        boxShadow:'-2px 0 8px rgba(20,35,55,0.04)'}}>

        <div style={{padding:'12px 18px', borderBottom:`1px solid ${S.border}`,
          display:'flex', alignItems:'center', justifyContent:'space-between',
          background:S.blueDark}}>
          <div style={{fontSize:11, color:'white', letterSpacing:'0.16em', fontWeight:600}}>ASTRA INTELLIGENCE</div>
          <div style={{fontSize:9, color:'rgba(255,255,255,0.5)', letterSpacing:'0.12em'}}>LOCUS CORE</div>
        </div>

        <div style={{padding:'10px 18px', borderBottom:`1px solid ${S.border}`,
          display:'flex', flexWrap:'wrap', gap:5, background:S.panelAlt}}>
          {['ASTM E1527','TCEQ','USACE','MSIGI','SAR','20 DOMAINS'].map(tag => (
            <div key={tag} style={{fontSize:9, color:S.blue, letterSpacing:'0.08em',
              padding:'2px 7px', border:`1px solid ${S.borderBlue}`, borderRadius:3,
              background:S.blueLight}}>{tag}</div>
          ))}
        </div>

        <div ref={chatRef} style={{flex:1, overflowY:'auto', padding:'14px 18px',
          display:'flex', flexDirection:'column', gap:14}}>
          {chat.map((m,i) => (
            <div key={i} style={{display:'flex', flexDirection:'column', gap:4,
              alignItems:m.role==='user'?'flex-end':'flex-start'}}>
              <div style={{fontSize:9, color:S.inkFaint, letterSpacing:'0.08em'}}>
                {m.role==='astra'?'ASTRA':'DJ'} · {m.ts}
              </div>
              <div style={{maxWidth:'90%', fontSize:12, lineHeight:1.65,
                color:m.role==='astra'?S.ink:S.blue,
                background:m.role==='astra'?S.panelAlt:S.blueLight,
                border:`1px solid ${m.role==='astra'?S.border:S.borderBlue}`,
                borderRadius:6, padding:'10px 14px', whiteSpace:'pre-wrap'}}>
                {m.content}
              </div>
            </div>
          ))}
          {thinking && <div style={{fontSize:10, color:S.inkFaint, letterSpacing:'0.12em',
            fontFamily:S.mono}}>ASTRA PROCESSING...</div>}
        </div>

        <div style={{padding:'12px 18px', borderTop:`1px solid ${S.border}`,
          display:'flex', gap:8, background:S.panelAlt}}>
          <input value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Query ASTRA..."
            style={{flex:1, background:S.panel, border:`1px solid ${S.border}`,
              borderRadius:4, color:S.ink, fontSize:12, padding:'8px 12px',
              fontFamily:S.sans, outline:'none'}}/>
          <button onClick={send} disabled={thinking} style={{
            background:thinking?S.inkFaint:S.blue, border:'none', borderRadius:4,
            color:'white', fontSize:11, padding:'0 16px', cursor:thinking?'wait':'pointer',
            fontWeight:600, letterSpacing:'0.06em'}}>
            {thinking?'...':'SEND'}
          </button>
        </div>
      </aside>

      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(47,93,140,0.2);border-radius:2px}`}</style>
    </div>
  )
}
