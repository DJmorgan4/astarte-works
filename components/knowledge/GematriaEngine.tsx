'use client'
import { useState, useCallback, useRef } from 'react'
import { calcAll, getResonances, pythagoreanReduce, type TraditionResult, type TraditionId, type Resonance } from '@/lib/gematria'

interface DeepAnalysis { loading: boolean; text: string; error: string }

const TRADITIONS_META = [
  { id:'hebrew' as TraditionId, era:'c. 900 BCE → Present', description:'Each of the 22 Hebrew letters carries a numerical value rooted in ancient scribal practice. Foundation of Kabbalistic sefirot mapping, Torah codes, and the Zohar hidden arithmetic.' },
  { id:'greek' as TraditionId, era:'c. 6th century BCE → Byzantine', description:'The 24-letter Greek alphabet assigned numeric values 1 to 900. Pythagorean philosophers, Gnostic writers, and early Christian scribes employed isopsephy — encoding 888 for ΙΗΣΟΥΣ and 666 in Revelation.' },
  { id:'chaldean' as TraditionId, era:'c. 2000 BCE → Hellenistic', description:'Originating in Mesopotamian number-letter mysticism, values 1–8 (9 withheld as sacred). Deeply planetary, tied to the seven classical spheres.' },
  { id:'latin' as TraditionId, era:'c. 200 BCE → Medieval', description:'Roman letters with numeric character (I V X L C D M) used in inscriptions, heraldry, and church cryptography. Medieval scholars extended this for monastic purposes.' },
  { id:'english' as TraditionId, era:'Renaissance → Modern', description:'A=1 through Z=26. Used in Rosicrucian, Masonic, and 20th-century occult contexts. Francis Bacon encoded ciphers in his works using English gematria.' },
  { id:'pythagorean' as TraditionId, era:'Classical Greece → Present', description:'All letters reduced to single digits 1–9, preserving master numbers 11, 22, and 33. Pythagoras drew this from Egyptian and Chaldean sources.' },
]

const NUMBER_KEYS = [
  {n:1,m:'Unity, the Monad, Kether'},{n:3,m:'Trinity, Binah, synthesis'},{n:7,m:'Planetary spheres, completion'},
  {n:10,m:'Tetractys, the sefirot'},{n:12,m:'Zodiac, tribes, apostles'},{n:22,m:'Hebrew letters, Major Arcana'},
  {n:26,m:'YHVH, the Tetragrammaton'},{n:72,m:'Shemhamphorash, Names of God'},{n:666,m:'Solar number, Rev. 13:18'},{n:888,m:'ΙΗΣΟΥΣ, Ogdoad, above 7'},
]

export default function GematriaEngine() {
  const [word, setWord] = useState('')
  const [results, setResults] = useState<TraditionResult[]>([])
  const [resonances, setResonances] = useState<Resonance[]>([])
  const [activeSystem, setActiveSystem] = useState<TraditionId>('hebrew')
  const [analysis, setAnalysis] = useState<DeepAnalysis>({loading:false,text:'',error:''})
  const debounceRef = useRef<ReturnType<typeof setTimeout>|null>(null)

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; setWord(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (val.trim().length >= 1) { const r=calcAll(val.trim()); setResults(r); setResonances(getResonances(r)) }
      else { setResults([]); setResonances([]) }
      setAnalysis({loading:false,text:'',error:''})
    }, 80)
  }, [])

  const activeResult = results.find(r=>r.id===activeSystem)

  const invokeDeepAnalysis = useCallback(async () => {
    if (!word.trim()||analysis.loading||results.length===0) return
    setAnalysis({loading:true,text:'',error:''})
    const vals = Object.fromEntries(results.map(r=>[r.id,r.value]))
    const prompt = `Analyze the word or name "${word.trim()}" across these computed gematria values: Hebrew Standard: ${vals.hebrew}, Greek Isopsephy: ${vals.greek}, English Ordinal: ${vals.english}, Pythagorean Reduced: ${vals.pythagorean}, Chaldean: ${vals.chaldean}, Latin/Roman: ${vals.latin}. Provide a deep reading in 4-6 sentences covering: (1) most significant numerical correspondences across traditions, (2) Kabbalistic, Hermetic, or ancient symbolic resonances, (3) connections to Scottish/Welsh heraldic or initiatic contexts if relevant, (4) cross-tradition alignments where multiple systems converge. Speak directly.`
    try {
      const response = await fetch('/api/astra/gematria', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({word:word.trim(),values:vals,prompt}) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setAnalysis({loading:false,text:data.text||'No analysis returned.',error:''})
    } catch { setAnalysis({loading:false,text:'',error:'Archive unreachable. Check API route.'}) }
  }, [word,results,analysis.loading])

  return (
    <div className="gem-root">
      <svg className="gem-sigil" viewBox="0 0 500 500" aria-hidden="true">
        <circle cx="250" cy="250" r="240" fill="none" stroke="#C9A84C" strokeWidth="0.5"/>
        <circle cx="250" cy="250" r="160" fill="none" stroke="#C9A84C" strokeWidth="0.5"/>
        <circle cx="250" cy="250" r="80" fill="none" stroke="#C9A84C" strokeWidth="0.5"/>
        <polygon points="250,10 490,375 10,375" fill="none" stroke="#C9A84C" strokeWidth="0.5"/>
        <polygon points="250,490 10,125 490,125" fill="none" stroke="#C9A84C" strokeWidth="0.5"/>
        <line x1="250" y1="10" x2="250" y2="490" stroke="#C9A84C" strokeWidth="0.3"/>
        <line x1="10" y1="250" x2="490" y2="250" stroke="#C9A84C" strokeWidth="0.3"/>
        <line x1="62" y1="62" x2="438" y2="438" stroke="#C9A84C" strokeWidth="0.3"/>
        <line x1="438" y1="62" x2="62" y2="438" stroke="#C9A84C" strokeWidth="0.3"/>
      </svg>
      <header className="gem-header">
        <p className="gem-eyebrow">ASTRA CORE · Gematria Intelligence Module</p>
        <h1 className="gem-title">ARITHMOS · The Living Number</h1>
        <p className="gem-subtitle">Hebrew · Greek · Latin · Chaldean · English — from Sumer to the present</p>
      </header>
      <div className="gem-grid">
        <section className="gem-left">
          <div className="gem-input-wrap">
            <label className="gem-label" htmlFor="gem-word">Enter word, name, or phrase</label>
            <input id="gem-word" className="gem-input" type="text" value={word} onChange={handleInput} placeholder="e.g. SINCLAIR, SPIRIT, YHVH..." autoComplete="off" spellCheck={false}/>
          </div>
          {results.length===0 ? (
            <p className="gem-empty">Enter a word above to begin calculation</p>
          ) : (<>
            <div className="gem-results">
              {results.map(r=>(
                <button key={r.id} className={`gem-card ${r.id===activeSystem?'active':''}`} onClick={()=>setActiveSystem(r.id)}>
                  <span className="gc-tradition">{r.name}</span>
                  <span className="gc-value">{r.value}</span>
                  <span className="gc-reduced">reduced: {pythagoreanReduce(r.value)}</span>
                  <span className="gc-method">{r.method}</span>
                </button>
              ))}
            </div>
            {activeResult&&activeResult.letters.length>0&&(
              <div className="gem-breakdown">
                <p className="gem-label">{activeResult.name} · Letter Decomposition</p>
                <div className="gb-row">
                  {activeResult.letters.map((lv,i)=>(
                    <span key={i} className="gb-cell">
                      {i>0&&<span className="gb-plus">+</span>}
                      <span className="gb-letter">{lv.letter}</span>
                      <span className="gb-num">{lv.value}</span>
                    </span>
                  ))}
                  <span className="gb-cell"><span className="gb-plus">=</span><span className="gb-letter" style={{color:'#C9A84C'}}>{activeResult.value}</span></span>
                </div>
              </div>
            )}
            <hr className="gem-divider"/>
            {resonances.length>0&&(
              <div className="gem-resonances">
                <p className="gem-label">Cross-Tradition Resonances</p>
                <ul>{resonances.map((r,i)=>(
                  <li key={i} className="gr-item">
                    <span className="gr-val">{r.value}</span>
                    <span className="gr-meaning">{r.meaning}</span>
                    <span className="gr-trad">{r.tradition}</span>
                  </li>
                ))}</ul>
              </div>
            )}
            <div className="gem-analysis">
              <p className="gem-label">ASTRA Deep Reading</p>
              {analysis.loading&&<div className="ga-loading"><span className="ga-spinner"/>Consulting the archive...</div>}
              {analysis.text&&<p className="ga-text">{analysis.text}</p>}
              {analysis.error&&<p className="ga-error">{analysis.error}</p>}
              <button className="gem-btn" onClick={invokeDeepAnalysis} disabled={analysis.loading}>
                {analysis.loading?'reading...':'invoke deep analysis'}
              </button>
            </div>
          </>)}
        </section>
        <aside className="gem-right">
          <div className="gem-knowledge">
            <p className="gem-section-title">Traditions of the Number-Letter</p>
            {TRADITIONS_META.map(t=>(
              <div key={t.id} className="gt-entry">
                <p className="gt-name">{results.find(r=>r.id===t.id)?.name||t.id}</p>
                <p className="gt-era">{t.era}</p>
                <p className="gt-desc">{t.description}</p>
              </div>
            ))}
          </div>
          <div className="gem-numkeys">
            <p className="gem-section-title">Primary Number Keys</p>
            {NUMBER_KEYS.map(k=>(
              <div key={k.n} className="nk-row">
                <span className="nk-num">{k.n}</span>
                <span className="nk-meaning">{k.m}</span>
              </div>
            ))}
          </div>
          <div className="gem-note">
            <p className="gn-label">ASTRA Protocol</p>
            <p className="gn-text">Values computed locally across six traditions. Deep Analysis routes through /api/astra/gematria for Kabbalistic and genealogical cross-referencing.</p>
          </div>
        </aside>
      </div>
      <style>{`
        .gem-root{font-family:Georgia,serif;background:#0A0800;color:#F5EDD6;position:relative;overflow:hidden;min-height:680px;--gold:#C9A84C;--gold-dim:#8B6E2A;--gold-pale:#F0E0A0}
        .gem-sigil{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:520px;height:520px;opacity:.04;pointer-events:none}
        .gem-header{background:linear-gradient(180deg,#1A0F00 0%,#0E0800 100%);border-bottom:1px solid var(--gold-dim);padding:20px 28px 16px;position:relative;z-index:2}
        .gem-eyebrow{font-size:9px;letter-spacing:.35em;color:var(--gold-dim);text-transform:uppercase;margin-bottom:4px}
        .gem-title{font-size:22px;font-weight:700;color:var(--gold);letter-spacing:.06em}
        .gem-subtitle{font-size:13px;color:#EDE0C0;opacity:.6;font-style:italic;margin-top:2px}
        .gem-grid{display:grid;grid-template-columns:1fr 260px;position:relative;z-index:2}
        .gem-left{padding:20px 24px;border-right:1px solid rgba(201,168,76,.2)}
        .gem-right{padding:18px}
        .gem-label{display:block;font-size:9px;letter-spacing:.22em;color:var(--gold-dim);text-transform:uppercase;margin-bottom:8px}
        .gem-input-wrap{margin-bottom:16px}
        .gem-input{width:100%;background:rgba(10,8,0,.6);border:1px solid var(--gold-dim);border-radius:3px;color:var(--gold-pale);font-size:18px;padding:10px 14px;letter-spacing:.08em;outline:none;font-family:Georgia,serif}
        .gem-input:focus{border-color:var(--gold)}
        .gem-input::placeholder{color:rgba(201,168,76,.25);font-size:13px}
        .gem-empty{text-align:center;padding:30px 0;color:rgba(201,168,76,.25);font-size:11px;letter-spacing:.15em;font-style:italic}
        .gem-results{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px}
        .gem-card{background:rgba(201,168,76,.05);border:1px solid rgba(201,168,76,.18);border-radius:4px;padding:10px 8px;text-align:center;cursor:pointer;transition:border-color .15s;display:flex;flex-direction:column;gap:2px}
        .gem-card:hover{border-color:rgba(201,168,76,.4)}.gem-card.active{background:rgba(201,168,76,.13);border-color:var(--gold-dim)}
        .gc-tradition{font-size:8px;letter-spacing:.18em;color:var(--gold-dim);text-transform:uppercase}
        .gc-value{font-size:26px;font-weight:700;color:var(--gold);line-height:1}
        .gc-reduced{font-size:11px;color:rgba(201,168,76,.5)}
        .gc-method{font-size:10px;color:rgba(245,237,214,.35);font-style:italic}
        .gem-breakdown{background:rgba(10,8,0,.4);border:1px solid rgba(201,168,76,.14);border-radius:4px;padding:12px 14px;margin-bottom:14px}
        .gb-row{display:flex;gap:4px;flex-wrap:wrap;align-items:flex-end}
        .gb-cell{display:flex;flex-direction:column;align-items:center}
        .gb-plus{color:rgba(201,168,76,.3);font-size:12px;align-self:center;margin:0 2px}
        .gb-letter{font-size:13px;color:var(--gold-pale)}
        .gb-num{font-size:10px;color:var(--gold-dim);margin-top:2px}
        .gem-divider{border:none;border-top:1px solid rgba(201,168,76,.14);margin:14px 0}
        .gem-resonances ul{list-style:none;padding:0;margin-bottom:14px}
        .gr-item{display:flex;gap:10px;align-items:baseline;padding:5px 0;border-bottom:1px solid rgba(201,168,76,.07)}
        .gr-val{font-size:13px;color:var(--gold);min-width:36px;text-align:right}
        .gr-meaning{font-size:12px;color:rgba(245,237,214,.7);font-style:italic;flex:1}
        .gr-trad{font-size:10px;color:var(--gold-dim)}
        .gem-analysis{margin-top:4px}
        .ga-loading{display:flex;align-items:center;gap:8px;color:var(--gold-dim);font-size:11px;letter-spacing:.15em;padding:10px 0}
        .ga-spinner{display:inline-block;width:14px;height:14px;border:1.5px solid rgba(201,168,76,.2);border-top-color:var(--gold-dim);border-radius:50%;animation:spin .8s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .ga-text{font-size:13px;color:rgba(245,237,214,.75);line-height:1.65;font-style:italic;margin-bottom:10px}
        .ga-error{font-size:12px;color:#F09595;margin-bottom:8px}
        .gem-btn{font-size:9.5px;letter-spacing:.2em;text-transform:uppercase;padding:8px 16px;background:rgba(201,168,76,.1);border:1px solid var(--gold-dim);color:var(--gold);cursor:pointer;border-radius:2px;transition:all .15s;width:100%;margin-top:6px;font-family:Georgia,serif}
        .gem-btn:hover:not(:disabled){background:rgba(201,168,76,.2)}.gem-btn:disabled{opacity:.5;cursor:default}
        .gem-section-title{font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:var(--gold-dim);border-bottom:1px solid rgba(201,168,76,.15);padding-bottom:6px;margin-bottom:10px}
        .gem-knowledge{margin-bottom:16px}
        .gt-entry{margin-bottom:12px}
        .gt-name{font-size:11px;color:var(--gold);margin-bottom:2px}
        .gt-era{font-size:10px;color:var(--gold-dim);font-style:italic;margin-bottom:3px}
        .gt-desc{font-size:11.5px;color:rgba(245,237,214,.6);line-height:1.55}
        .gem-numkeys{border-top:1px solid rgba(201,168,76,.12);padding-top:12px;margin-bottom:14px}
        .nk-row{display:flex;gap:8px;align-items:baseline;margin-bottom:4px}
        .nk-num{font-size:12px;color:var(--gold);min-width:32px;text-align:right}
        .nk-meaning{font-size:11px;color:rgba(245,237,214,.55);font-style:italic}
        .gem-note{background:rgba(201,168,76,.05);border-left:2px solid var(--gold-dim);padding:8px 10px;border-radius:0 3px 3px 0}
        .gn-label{font-size:8px;letter-spacing:.25em;text-transform:uppercase;color:var(--gold-dim);margin-bottom:4px}
        .gn-text{font-size:11px;color:rgba(245,237,214,.55);line-height:1.5;font-style:italic}
        @media(max-width:700px){.gem-grid{grid-template-columns:1fr}.gem-left{border-right:none;border-bottom:1px solid rgba(201,168,76,.2)}.gem-results{grid-template-columns:repeat(2,1fr)}}
      `}</style>
    </div>
  )
}
