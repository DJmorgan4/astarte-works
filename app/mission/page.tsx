'use client'
// v3.0 — clean operational brain

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
  void:'#080808', panel:'#0d0d0d', border:'rgba(176,136,64,0.12)',
  borderHot:'rgba(176,136,64,0.35)', amber:'#B08840', amberDim:'#4A3A1A',
  amberFade:'rgba(176,136,64,0.06)', dim:'#141414', text:'#C8C0B0',
  textDim:'#444038', red:'#A03030', green:'#3A6A3A',
  mono:"'Space Mono','Courier New',monospace",
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
      buf.current.push((Math.random()-.5)*.1 + (Math.random()>.96 ? Math.random()*.8 : 0)*.5)
      ctx.clearRect(0,0,w,h)
      ctx.strokeStyle = 'rgba(176,136,64,0.6)'; ctx.lineWidth = 1
      ctx.shadowBlur = 3; ctx.shadowColor = 'rgba(176,136,64,0.25)'
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
  const [sites,    setSites]    = useState<Site[]>([])
  const [knowledge,setKnowledge]= useState<KnowledgeEntry[]>([])
  const [engine,   setEngine]   = useState<'online'|'offline'|'checking'>('checking')
  const [kCount,   setKCount]   = useState(0)
  const [chat,     setChat]     = useState<ChatMsg[]>([{
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
      const r = await fetch(`${SB}/stratum_sites?select=id,name,site_type,status,created_at&order=created_at.desc&limit=20`, {headers:H})
      const d = await r.json()
      if (Array.isArray(d)) setSites(d)
    } catch {}
  },[])

  const fetchKnowledge = useCallback(async () => {
    try {
      const r = await fetch(`${SB}/astra_knowledge?select=id,domain,created_at&order=created_at.desc&limit=10`, {headers:H})
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

  const esaSites    = sites.filter(s => s.site_type === 'ESA')
  const gaugeSites  = sites.filter(s => s.site_type === 'stream_gauge')
  const todayK      = knowledge.filter(k => new Date(k.created_at).toDateString() === new Date().toDateString())
  const domainCounts = knowledge.reduce((acc,k) => { acc[k.domain] = (acc[k.domain]||0)+1; return acc }, {} as Record<string,number>)

  return (
    <div style={{height:'100vh', background:S.void, color:S.text, fontFamily:S.mono,
      display:'grid', gridTemplateRows:'44px 1fr', gridTemplateColumns:'1fr 380px', overflow:'hidden'}}>

      {/* TOPBAR */}
      <header style={{gridColumn:'1/-1', display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 24px', borderBottom:`1px solid ${S.borderHot}`, background:S.void}}>
        <div style={{display:'flex', alignItems:'center', gap:14}}>
          <div style={{width:18, height:18, background:S.amber,
            clipPath:'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)'}}/>
          <div>
            <div style={{fontSize:10, letterSpacing:'0.28em', color:S.text}}>ASTRA CORE</div>
            <div style={{fontSize:7, color:S.amberDim, letterSpacing:'0.2em', marginTop:1}}>MISSION CONTROL</div>
          </div>
          <div style={{width:1, height:24, background:S.border, margin:'0 8px'}}/>
          {['STRATUM','LOCUS','NEXUS'].map(s =>
            <span key={s} style={{fontSize:8, color:S.amberDim, letterSpacing:'0.14em', marginRight:10}}>{s}</span>
          )}
        </div>
        <div style={{display:'flex', alignItems:'center', gap:20}}>
          <div style={{display:'flex', alignItems:'center', gap:5, fontSize:8,
            color: engine==='online' ? S.green : engine==='offline' ? S.red : S.amberDim,
            letterSpacing:'0.14em'}}>
            <div style={{width:4, height:4, borderRadius:'50%',
              background: engine==='online' ? S.green : engine==='offline' ? S.red : S.amberDim,
              boxShadow: engine==='online' ? `0 0 6px ${S.green}` : 'none'}}/>
            ENGINE {engine.toUpperCase()}
          </div>
          <div style={{fontSize:9, color:S.amber, letterSpacing:'0.06em'}}>{clock}</div>
        </div>
      </header>

      {/* MAIN */}
      <main style={{overflow:'hidden', display:'flex', flexDirection:'column', padding:16, gap:10}}>

        {/* Pulse */}
        <div style={{height:48, border:`1px solid ${S.border}`, background:S.panel,
          position:'relative', overflow:'hidden', flexShrink:0}}>
          <div style={{position:'absolute', top:5, left:10, zIndex:1,
            fontSize:7, color:S.textDim, letterSpacing:'0.2em'}}>INGEST PULSE</div>
          <PulseCanvas/>
        </div>

        {/* Stats */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, flexShrink:0}}>
          {[
            {l:'KNOWLEDGE', v:kCount,          hot:kCount>0},
            {l:'SITES',     v:sites.length,     hot:sites.length>0},
            {l:'ESA ACTIVE',v:esaSites.length,  hot:esaSites.length>0},
            {l:'TODAY',     v:todayK.length,    hot:todayK.length>0},
          ].map(m => (
            <div key={m.l} style={{background:S.panel, border:`1px solid ${m.hot?S.borderHot:S.border}`, padding:'8px 12px'}}>
              <div style={{fontSize:7, color:S.textDim, letterSpacing:'0.18em', marginBottom:5}}>{m.l}</div>
              <div style={{fontSize:20, color:m.hot?S.amber:S.textDim, lineHeight:1}}>{m.v}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:'flex', borderBottom:`1px solid ${S.border}`, flexShrink:0}}>
          {(['sites','knowledge'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background:'none', border:'none', cursor:'pointer', padding:'5px 14px',
              fontSize:8, letterSpacing:'0.18em', fontFamily:S.mono,
              color: tab===t ? S.amber : S.textDim,
              borderBottom: tab===t ? `1px solid ${S.amber}` : '1px solid transparent',
              marginBottom:-1,
            }}>
              {t.toUpperCase()} ({t==='sites'?sites.length:knowledge.length})
            </button>
          ))}
        </div>

        {/* Feed */}
        <div style={{flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:2}}>

          {tab==='sites' && sites.map(s => (
            <div key={s.id} style={{padding:'7px 12px', background:S.panel,
              border:`1px solid ${s.site_type==='ESA'?S.borderHot:S.border}`,
              display:'grid', gridTemplateColumns:'60px 1fr 60px 36px', gap:10, alignItems:'center'}}>
              <div style={{fontSize:7, letterSpacing:'0.1em',
                color:s.site_type==='ESA'?S.amber:S.textDim}}>
                {s.site_type==='stream_gauge'?'GAUGE':s.site_type}
              </div>
              <div style={{fontSize:10, color:S.text}}>{s.name}</div>
              <div style={{fontSize:7, color:s.status==='active'?S.green:S.textDim,
                letterSpacing:'0.1em'}}>{s.status?.toUpperCase()}</div>
              <div style={{fontSize:7, color:S.textDim, textAlign:'right'}}>{fmtAgo(s.created_at)}</div>
            </div>
          ))}

          {tab==='knowledge' && knowledge.map(k => (
            <div key={k.id} style={{padding:'7px 12px', background:S.panel,
              border:`1px solid ${S.border}`,
              display:'grid', gridTemplateColumns:'1fr 36px', gap:10, alignItems:'center'}}>
              <div style={{fontSize:10, color:S.amber, letterSpacing:'0.08em'}}>
                {k.domain.replace(/_/g,' ').toUpperCase()}
              </div>
              <div style={{fontSize:7, color:S.textDim, textAlign:'right'}}>{fmtAgo(k.created_at)}</div>
            </div>
          ))}

          {tab==='sites' && sites.length===0 &&
            <div style={{padding:24, fontSize:9, color:S.textDim, textAlign:'center', letterSpacing:'0.14em'}}>
              NO SITES TRACKED
            </div>
          }
        </div>

        {/* Entity links */}
        <div style={{display:'flex', gap:8, paddingTop:8, borderTop:`1px solid ${S.border}`, flexShrink:0}}>
          {[
            {l:'CETO INTERACTIVE', h:'https://cetointeractive.com/portal'},
            {l:'LITHICEARTH',      h:'https://lithicearth.com/portal/viewer'},
            {l:'BLUE DUCK FDN',    h:'https://theblueduck.org'},
          ].map(e => (
            <a key={e.l} href={e.h} target="_blank" rel="noreferrer" style={{
              fontSize:7, color:S.textDim, letterSpacing:'0.14em',
              textDecoration:'none', padding:'3px 8px', border:`1px solid ${S.border}`,
            }}>{e.l}</a>
          ))}
        </div>
      </main>

      {/* ASTRA CHAT */}
      <aside style={{borderLeft:`1px solid ${S.borderHot}`, background:S.panel,
        display:'flex', flexDirection:'column', overflow:'hidden'}}>

        <div style={{padding:'10px 16px', borderBottom:`1px solid ${S.border}`,
          display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div style={{fontSize:8, color:S.amber, letterSpacing:'0.22em'}}>ASTRA INTELLIGENCE</div>
          <div style={{fontSize:7, color:S.textDim, letterSpacing:'0.12em'}}>LOCUS CORE</div>
        </div>

        <div style={{padding:'8px 16px', borderBottom:`1px solid ${S.border}`,
          display:'flex', flexWrap:'wrap', gap:4}}>
          {Object.keys(domainCounts).slice(0,6).map(d => (
            <div key={d} style={{fontSize:7, color:S.amberDim, letterSpacing:'0.08em',
              padding:'2px 6px', border:`1px solid ${S.amberDim}`}}>
              {d.replace(/_/g,' ').toUpperCase()}
            </div>
          ))}
        </div>

        <div ref={chatRef} style={{flex:1, overflowY:'auto', padding:'12px 16px',
          display:'flex', flexDirection:'column', gap:14}}>
          {chat.map((m,i) => (
            <div key={i} style={{display:'flex', flexDirection:'column', gap:4,
              alignItems:m.role==='user'?'flex-end':'flex-start'}}>
              <div style={{fontSize:7, color:S.textDim, letterSpacing:'0.1em'}}>
                {m.role==='astra'?'ASTRA':'DJ'} · {m.ts}
              </div>
              <div style={{maxWidth:'88%', fontSize:11, lineHeight:1.6,
                color:m.role==='astra'?S.text:S.amber,
                background:m.role==='astra'?S.dim:'transparent',
                border:`1px solid ${m.role==='astra'?S.border:S.borderHot}`,
                padding:'8px 12px', whiteSpace:'pre-wrap'}}>
                {m.content}
              </div>
            </div>
          ))}
          {thinking && <div style={{fontSize:9, color:S.amberDim, letterSpacing:'0.14em'}}>
            ASTRA PROCESSING...
          </div>}
        </div>

        <div style={{padding:'10px 16px', borderTop:`1px solid ${S.borderHot}`, display:'flex', gap:8}}>
          <input value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Query ASTRA..."
            style={{flex:1, background:S.void, border:`1px solid ${S.border}`,
              color:S.text, fontSize:11, padding:'8px 12px', fontFamily:S.mono, outline:'none'}}/>
          <button onClick={send} disabled={thinking} style={{
            background:thinking?S.amberDim:S.amber, border:'none', color:S.void,
            fontSize:9, padding:'0 14px', cursor:thinking?'wait':'pointer',
            letterSpacing:'0.14em', fontFamily:S.mono}}>
            {thinking?'...':'SEND'}
          </button>
        </div>
      </aside>

      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:2px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(176,136,64,0.2)}`}</style>
    </div>
  )
}
