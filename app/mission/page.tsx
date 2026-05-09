'use client'
// ASTRA MISSION CONTROL v5.0

import { useEffect, useRef, useState, useCallback } from 'react'

interface Site {
  id: string; name: string; site_type: string; status: string; created_at: string
}
interface ChatMsg { role: 'user' | 'astra'; content: string; ts: string }

const SB    = 'https://jmkopheshisqqmocwhto.supabase.co/rest/v1'
const SBKEY = 'sb_publishable_oJCKKDU8IGdOPPykH9aQFg_tJLjXdO4'
const H     = { apikey: SBKEY, Authorization: `Bearer ${SBKEY}` }

// ─── EDIT YOUR BID PIPELINE HERE ─────────────────────────────────────────────
const BIDS = [
  { entity:'Ceto',        name:'City of Huntsville RFP 26-21',     due:'2026-06-01', status:'TRACKING'  },
  { entity:'Ceto',        name:'City of Fort Worth RFQ 26-0191',   due:'2026-06-15', status:'TRACKING'  },
  { entity:'LithicEarth', name:'Massachusetts Subcontract',        due:'TBD',        status:'TRACKING'  },
  // ADD MORE BIDS HERE:
  // { entity:'Ceto', name:'Your Opportunity Name', due:'2026-MM-DD', status:'TRACKING' },
]
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string,string> = {
  TRACKING:  '#2F5D8C',
  SUBMITTED: '#4F7A6A',
  AWARDED:   '#2A6A3A',
  LOST:      '#8A4040',
}

const S = {
  bg:        '#F0F2F5',
  panel:     '#FFFFFF',
  panelAlt:  '#F6F8FA',
  border:    'rgba(20,35,55,0.09)',
  borderBlue:'rgba(47,93,140,0.3)',
  ink:       '#142337',
  inkDim:    '#4A5E72',
  inkFaint:  '#8A9BAD',
  blue:      '#2F5D8C',
  blueDark:  '#1A3A5C',
  blueLight: 'rgba(47,93,140,0.07)',
  teal:      '#4F7A6A',
  tealLight: 'rgba(79,122,106,0.08)',
  green:     '#2A6A3A',
  red:       '#8A4040',
  mono:      "'Space Mono','Courier New',monospace",
  sans:      "ui-sans-serif,system-ui,-apple-system,sans-serif",
}

function fmtAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m ago`
  if (m < 1440) return `${Math.floor(m/60)}h ago`
  return `${Math.floor(m/1440)}d ago`
}

function daysUntil(due: string) {
  if (due === 'TBD') return null
  const d = Math.ceil((new Date(due).getTime() - Date.now()) / 86400000)
  return d
}

function PulseCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  const buf = useRef<number[]>(new Array(400).fill(0))
  useEffect(() => {
    const c = ref.current; if (!c) return
    let raf: number
    const draw = () => {
      const ctx = c.getContext('2d'); if (!ctx) return
      c.width = c.offsetWidth; c.height = c.offsetHeight
      const w = c.width, h = c.height
      buf.current.shift()
      buf.current.push((Math.random()-.5)*.06 + (Math.random()>.97?Math.random()*.6:0)*.4)
      ctx.clearRect(0,0,w,h)
      // fill under line
      const grad = ctx.createLinearGradient(0,0,0,h)
      grad.addColorStop(0,'rgba(47,93,140,0.12)')
      grad.addColorStop(1,'rgba(47,93,140,0)')
      ctx.beginPath()
      buf.current.forEach((v,i)=>{
        const x=i*(w/buf.current.length), y=h/2-v*h*.5
        i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)
      })
      ctx.lineTo(w,h); ctx.lineTo(0,h); ctx.closePath()
      ctx.fillStyle=grad; ctx.fill()
      // line
      ctx.strokeStyle='rgba(47,93,140,0.6)'; ctx.lineWidth=1.5
      ctx.shadowBlur=4; ctx.shadowColor='rgba(47,93,140,0.2)'
      ctx.beginPath()
      buf.current.forEach((v,i)=>{
        const x=i*(w/buf.current.length), y=h/2-v*h*.5
        i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)
      })
      ctx.stroke(); ctx.shadowBlur=0
      raf=requestAnimationFrame(draw)
    }
    draw(); return ()=>cancelAnimationFrame(raf)
  },[])
  return <canvas ref={ref} style={{width:'100%',height:'100%',display:'block'}}/>
}

export default function MissionControl() {
  const [sites,    setSites]    = useState<Site[]>([])
  const [engine,   setEngine]   = useState<'online'|'offline'|'checking'>('checking')
  const [kCount,   setKCount]   = useState(0)
  const [chat,     setChat]     = useState<ChatMsg[]>([{
    role:'astra',
    content:'ASTRA CORE online. 20 domains active. USGS, EPA, NOAA, ASF, TCEQ feeds live. Query anything.',
    ts:new Date().toLocaleTimeString('en-US',{hour12:false})
  }])
  const [input,    setInput]    = useState('')
  const [thinking, setThinking] = useState(false)
  const [clock,    setClock]    = useState('')
  const [history,  setHistory]  = useState<{role:string;content:string}[]>([])
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(()=>{
    const t=setInterval(()=>setClock(new Date().toLocaleString('en-US',{
      weekday:'short',month:'short',day:'numeric',
      hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZoneName:'short'
    })),1000)
    return ()=>clearInterval(t)
  },[])

  const fetchSites = useCallback(async()=>{
    try {
      const r = await fetch(`${SB}/stratum_sites?select=id,name,site_type,status,created_at&order=created_at.desc&limit=100`,{headers:H})
      const d = await r.json()
      if (!Array.isArray(d)) return
      // deduplicate by name, filter out weather
      const seen = new Set<string>()
      const clean = d.filter((s:Site)=>{
        if (s.site_type==='weather_alert') return false
        if (seen.has(s.name)) return false
        seen.add(s.name); return true
      })
      setSites(clean)
    } catch {}
  },[])

  const fetchKCount = useCallback(async()=>{
    try {
      const r = await fetch(`${SB}/astra_knowledge?select=id`,{headers:{...H,'Prefer':'count=exact'}})
      const cr = r.headers.get('content-range')
      if (cr) setKCount(parseInt(cr.split('/')[1])||0)
    } catch {}
  },[])

  const checkEngine = useCallback(async()=>{
    try {
      const r = await fetch('https://lithicearth-production.up.railway.app/health',{signal:AbortSignal.timeout(5000)})
      setEngine(r.ok?'online':'offline')
    } catch { setEngine('offline') }
  },[])

  useEffect(()=>{
    fetchSites(); fetchKCount(); checkEngine()
    const t=setInterval(()=>{fetchSites();fetchKCount()},60000)
    const e=setInterval(checkEngine,120000)
    return ()=>{clearInterval(t);clearInterval(e)}
  },[fetchSites,fetchKCount,checkEngine])

  useEffect(()=>{chatRef.current?.scrollTo({top:chatRef.current.scrollHeight,behavior:'smooth'})},[chat])

  const send = async()=>{
    const msg=input.trim(); if(!msg||thinking) return
    setInput('')
    const ts=new Date().toLocaleTimeString('en-US',{hour12:false})
    setChat(c=>[...c,{role:'user',content:msg,ts}])
    setThinking(true)
    const nh=[...history,{role:'user',content:msg}]
    try {
      const r=await fetch('/api/astra/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,history})})
      const j=await r.json()
      const reply=j.response||j.error||'No response'
      setChat(c=>[...c,{role:'astra',content:reply,ts:new Date().toLocaleTimeString('en-US',{hour12:false})}])
      setHistory([...nh,{role:'assistant',content:reply}])
    } catch { setChat(c=>[...c,{role:'astra',content:'Connection error.',ts}]) }
    setThinking(false)
  }

  const esaSites   = sites.filter(s=>s.site_type==='ESA')
  const gaugeSites = sites.filter(s=>s.site_type==='stream_gauge')

  return (
    <div style={{height:'100vh',background:S.bg,color:S.ink,fontFamily:S.sans,
      display:'grid',gridTemplateRows:'56px 1fr',gridTemplateColumns:'1fr 420px',overflow:'hidden'}}>

      {/* TOPBAR */}
      <header style={{gridColumn:'1/-1',display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'0 28px',background:S.blueDark,boxShadow:'0 2px 8px rgba(10,20,35,0.2)'}}>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <div style={{width:32,height:32,background:'rgba(255,255,255,0.15)',borderRadius:8,
            display:'flex',alignItems:'center',justifyContent:'center',
            border:'1px solid rgba(255,255,255,0.2)'}}>
            <div style={{width:14,height:14,background:S.blue,borderRadius:3,
              boxShadow:'0 0 8px rgba(47,93,140,0.8)'}}/>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:700,letterSpacing:'0.08em',color:'white'}}>ASTRA CORE</div>
            <div style={{fontSize:9,color:'rgba(255,255,255,0.4)',letterSpacing:'0.18em',marginTop:1}}>
              MISSION CONTROL · THE BLUE DUCK LLC
            </div>
          </div>
          <div style={{width:1,height:30,background:'rgba(255,255,255,0.1)',margin:'0 12px'}}/>
          {[
            {l:'STRATUM', sub:'knowledge'},
            {l:'LOCUS',   sub:'intelligence'},
            {l:'NEXUS',   sub:'geospatial'},
          ].map(s=>(
            <div key={s.l} style={{display:'flex',flexDirection:'column',gap:1}}>
              <span style={{fontSize:9,fontWeight:600,color:'rgba(255,255,255,0.8)',letterSpacing:'0.12em'}}>{s.l}</span>
              <span style={{fontSize:7,color:'rgba(255,255,255,0.3)',letterSpacing:'0.08em'}}>{s.sub}</span>
            </div>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:24}}>
          <div style={{display:'flex',alignItems:'center',gap:6,fontSize:10,
            color:engine==='online'?'#6AE08A':engine==='offline'?'#E08A6A':'rgba(255,255,255,0.4)'}}>
            <div style={{width:6,height:6,borderRadius:'50%',
              background:engine==='online'?'#6AE08A':engine==='offline'?'#E08A6A':'rgba(255,255,255,0.3)',
              boxShadow:engine==='online'?'0 0 8px #6AE08A':'none'}}/>
            ENGINE {engine.toUpperCase()}
          </div>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.5)',fontFamily:S.mono}}>{clock}</div>
        </div>
      </header>

      {/* MAIN */}
      <main style={{overflow:'hidden',display:'flex',flexDirection:'column',padding:'16px 20px',gap:14,background:S.bg}}>

        {/* Pulse */}
        <div style={{height:56,background:S.panel,borderRadius:8,position:'relative',overflow:'hidden',
          border:`1px solid ${S.border}`,boxShadow:'0 1px 4px rgba(20,35,55,0.06)',flexShrink:0}}>
          <div style={{position:'absolute',top:7,left:14,zIndex:1,display:'flex',alignItems:'center',gap:6}}>
            <div style={{width:5,height:5,borderRadius:'50%',background:S.blue,
              boxShadow:`0 0 6px ${S.blue}`,animation:'pulse 2s infinite'}}/>
            <span style={{fontSize:8,color:S.inkFaint,letterSpacing:'0.18em',fontFamily:S.mono}}>INGEST PULSE</span>
          </div>
          <PulseCanvas/>
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,flexShrink:0}}>
          {[
            {l:'KNOWLEDGE',  v:kCount,          c:S.blue,  sub:'astra corpus'},
            {l:'SITES',      v:sites.length,    c:S.teal,  sub:'stratum tracked'},
            {l:'ESA',        v:esaSites.length, c:S.blue,  sub:'phase i active'},
            {l:'GAUGES',     v:gaugeSites.length,c:S.teal, sub:'usgs live'},
            {l:'BIDS',       v:BIDS.length,     c:S.blue,  sub:'pipeline'},
          ].map(m=>(
            <div key={m.l} style={{background:S.panel,borderRadius:8,padding:'12px 14px',
              border:`1px solid ${S.border}`,borderTop:`3px solid ${m.c}`,
              boxShadow:'0 1px 4px rgba(20,35,55,0.06)'}}>
              <div style={{fontSize:8,color:S.inkFaint,letterSpacing:'0.16em',fontFamily:S.mono,marginBottom:4}}>{m.l}</div>
              <div style={{fontSize:26,color:m.c,fontWeight:700,lineHeight:1,marginBottom:3}}>{m.v}</div>
              <div style={{fontSize:8,color:S.inkFaint}}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* BID PIPELINE */}
        <div style={{background:S.panel,borderRadius:8,border:`1px solid ${S.border}`,
          boxShadow:'0 1px 4px rgba(20,35,55,0.06)',flexShrink:0}}>
          <div style={{padding:'10px 16px',borderBottom:`1px solid ${S.border}`,
            display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:3,height:14,background:S.blue,borderRadius:2}}/>
              <span style={{fontSize:10,fontWeight:600,color:S.ink,letterSpacing:'0.1em'}}>BID PIPELINE</span>
            </div>
            <span style={{fontSize:9,color:S.inkFaint,fontFamily:S.mono}}>{BIDS.length} opportunities</span>
          </div>
          <div>
            {BIDS.map((b,i)=>{
              const days = daysUntil(b.due)
              return (
                <div key={i} style={{padding:'10px 16px',borderBottom:i<BIDS.length-1?`1px solid ${S.border}`:'none',
                  display:'grid',gridTemplateColumns:'80px 1fr 100px 90px 80px',gap:12,alignItems:'center'}}>
                  <div style={{fontSize:9,fontWeight:600,color:b.entity==='Ceto'?S.blue:S.teal,
                    letterSpacing:'0.08em',fontFamily:S.mono}}>{b.entity.toUpperCase()}</div>
                  <div style={{fontSize:12,color:S.ink,fontWeight:500}}>{b.name}</div>
                  <div style={{fontSize:10,color:S.inkDim,fontFamily:S.mono}}>{b.due}</div>
                  <div style={{fontSize:9,color:days!==null&&days<14?'#C06030':S.inkFaint,fontFamily:S.mono}}>
                    {days!==null?`${days}d left`:'TBD'}
                  </div>
                  <div style={{fontSize:8,fontWeight:600,letterSpacing:'0.1em',
                    color:STATUS_COLOR[b.status]||S.inkFaint,
                    padding:'3px 8px',borderRadius:4,border:`1px solid ${STATUS_COLOR[b.status]||S.border}`,
                    background:`${STATUS_COLOR[b.status]}11`,textAlign:'center',
                    fontFamily:S.mono}}>{b.status}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* SITES */}
        <div style={{background:S.panel,borderRadius:8,border:`1px solid ${S.border}`,
          boxShadow:'0 1px 4px rgba(20,35,55,0.06)',flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
          <div style={{padding:'10px 16px',borderBottom:`1px solid ${S.border}`,
            display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:3,height:14,background:S.teal,borderRadius:2}}/>
              <span style={{fontSize:10,fontWeight:600,color:S.ink,letterSpacing:'0.1em'}}>STRATUM SITES</span>
            </div>
            <span style={{fontSize:9,color:S.inkFaint,fontFamily:S.mono}}>{sites.length} tracked · {esaSites.length} ESA</span>
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            {sites.map(s=>(
              <div key={s.id} style={{padding:'9px 16px',
                borderBottom:`1px solid ${S.border}`,
                borderLeft:`3px solid ${s.site_type==='ESA'?S.blue:S.teal}`,
                display:'grid',gridTemplateColumns:'70px 1fr 70px 60px',gap:12,alignItems:'center'}}>
                <div style={{fontSize:8,fontWeight:600,letterSpacing:'0.1em',fontFamily:S.mono,
                  color:s.site_type==='ESA'?S.blue:S.teal}}>
                  {s.site_type==='stream_gauge'?'GAUGE':s.site_type.toUpperCase()}
                </div>
                <div style={{fontSize:12,color:S.ink}}>{s.name}</div>
                <div style={{fontSize:9,color:s.status==='active'?S.green:S.inkFaint,
                  letterSpacing:'0.06em',fontFamily:S.mono}}>{s.status?.toUpperCase()}</div>
                <div style={{fontSize:9,color:S.inkFaint,textAlign:'right',fontFamily:S.mono}}>
                  {fmtAgo(s.created_at)}
                </div>
              </div>
            ))}
            {sites.length===0&&(
              <div style={{padding:32,textAlign:'center',fontSize:11,color:S.inkFaint,fontFamily:S.mono}}>
                NO SITES TRACKED
              </div>
            )}
          </div>
        </div>

        {/* Entity links */}
        <div style={{display:'flex',gap:8,flexShrink:0}}>
          {[
            {l:'Ceto Interactive', h:'https://cetointeractive.com/portal', c:S.blue},
            {l:'LithicEarth Viewer', h:'https://lithicearth.com/portal/viewer', c:S.teal},
            {l:'Blue Duck Foundation', h:'https://theblueduck.org', c:S.teal},
          ].map(e=>(
            <a key={e.l} href={e.h} target="_blank" rel="noreferrer" style={{
              fontSize:11,color:e.c,fontWeight:500,textDecoration:'none',
              padding:'6px 14px',borderRadius:6,border:`1px solid ${e.c}33`,
              background:`${e.c}08`}}>{e.l} →</a>
          ))}
        </div>
      </main>

      {/* ASTRA PANEL */}
      <aside style={{borderLeft:`1px solid ${S.border}`,background:S.panel,
        display:'flex',flexDirection:'column',overflow:'hidden'}}>

        <div style={{padding:'14px 18px',background:S.blueDark,
          display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:'white',letterSpacing:'0.14em'}}>ASTRA INTELLIGENCE</div>
            <div style={{fontSize:8,color:'rgba(255,255,255,0.35)',letterSpacing:'0.1em',marginTop:2}}>
              LOCUS CORE · 20 DOMAINS ACTIVE
            </div>
          </div>
          <div style={{fontSize:8,color:'rgba(255,255,255,0.3)',fontFamily:S.mono}}>v2.1</div>
        </div>

        <div style={{padding:'10px 18px',borderBottom:`1px solid ${S.border}`,
          display:'flex',flexWrap:'wrap',gap:5,background:S.panelAlt}}>
          {['ENV','GEO','ASTRO','GEM','PLASMA','HUNT','ARCH','OPS','REG','WET'].map(tag=>(
            <div key={tag} style={{fontSize:8,color:S.blue,letterSpacing:'0.08em',
              padding:'2px 7px',border:`1px solid ${S.borderBlue}`,borderRadius:3,
              background:S.blueLight,fontFamily:S.mono}}>{tag}</div>
          ))}
        </div>

        <div style={{padding:'10px 18px',borderBottom:`1px solid ${S.border}`,
          background:S.panelAlt,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div style={{fontSize:9,color:S.inkFaint}}>
            <span style={{color:S.ink,fontWeight:600}}>{kCount}</span> knowledge entries
          </div>
          <div style={{fontSize:9,color:S.inkFaint,textAlign:'right'}}>
            engine <span style={{color:engine==='online'?S.green:S.red,fontWeight:600}}>{engine}</span>
          </div>
        </div>

        <div ref={chatRef} style={{flex:1,overflowY:'auto',padding:'16px 18px',
          display:'flex',flexDirection:'column',gap:16}}>
          {chat.map((m,i)=>(
            <div key={i} style={{display:'flex',flexDirection:'column',gap:5,
              alignItems:m.role==='user'?'flex-end':'flex-start'}}>
              <div style={{fontSize:8,color:S.inkFaint,letterSpacing:'0.08em'}}>
                {m.role==='astra'?'ASTRA':'DJ'} · {m.ts}
              </div>
              <div style={{maxWidth:'92%',fontSize:12,lineHeight:1.65,
                color:m.role==='astra'?S.ink:'white',
                background:m.role==='astra'?S.panelAlt:S.blue,
                border:`1px solid ${m.role==='astra'?S.border:S.blue}`,
                borderRadius:m.role==='astra'?'0 8px 8px 8px':'8px 0 8px 8px',
                padding:'10px 14px',whiteSpace:'pre-wrap',
                boxShadow:'0 1px 3px rgba(20,35,55,0.08)'}}>
                {m.content}
              </div>
            </div>
          ))}
          {thinking&&(
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              {[0,1,2].map(i=>(
                <div key={i} style={{width:6,height:6,borderRadius:'50%',background:S.blue,
                  opacity:0.4+i*0.2}}/>
              ))}
              <span style={{fontSize:9,color:S.inkFaint,marginLeft:4}}>ASTRA processing...</span>
            </div>
          )}
        </div>

        <div style={{padding:'12px 18px',borderTop:`1px solid ${S.border}`,
          display:'flex',gap:8,background:S.panelAlt}}>
          <input value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&send()}
            placeholder="Query ASTRA..."
            style={{flex:1,background:S.panel,border:`1px solid ${S.border}`,
              borderRadius:6,color:S.ink,fontSize:12,padding:'9px 13px',
              fontFamily:S.sans,outline:'none',
              boxShadow:'inset 0 1px 3px rgba(20,35,55,0.06)'}}/>
          <button onClick={send} disabled={thinking} style={{
            background:thinking?S.inkFaint:S.blue,border:'none',borderRadius:6,
            color:'white',fontSize:11,padding:'0 18px',cursor:thinking?'wait':'pointer',
            fontWeight:600,letterSpacing:'0.06em',
            boxShadow:thinking?'none':'0 2px 6px rgba(47,93,140,0.3)'}}>
            {thinking?'...':'SEND'}
          </button>
        </div>
      </aside>

      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(47,93,140,0.2);border-radius:2px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
      `}</style>
    </div>
  )
}
