export type TraditionId = 'hebrew' | 'greek' | 'english' | 'pythagorean' | 'chaldean' | 'latin'
export interface LetterValue { letter: string; value: number }
export interface TraditionResult { id: TraditionId; name: string; method: string; value: number; letters: LetterValue[] }
export interface Resonance { value: number; tradition: string; meaning: string }
const HEBREW: Record<string, number> = { A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:1,J:10,K:11,L:12,M:13,N:14,O:16,P:17,Q:100,R:20,S:21,T:22,U:6,V:6,W:6,X:15,Y:10,Z:7 }
const GREEK: Record<string, number> = { A:1,B:2,C:600,D:4,E:5,F:6,G:3,H:8,I:10,J:10,K:20,L:30,M:40,N:50,O:70,P:80,Q:90,R:100,S:200,T:300,U:400,V:400,W:800,X:60,Y:700,Z:7 }
const CHALDEAN: Record<string, number> = { A:1,B:2,C:3,D:4,E:5,F:8,G:3,H:5,I:1,J:1,K:2,L:3,M:4,N:5,O:7,P:8,Q:1,R:2,S:3,T:4,U:6,V:6,W:6,X:5,Y:1,Z:7 }
const LATIN: Record<string, number> = { I:1,V:5,X:10,L:50,C:100,D:500,M:1000 }
function digitSum(n: number): number { return String(n).split('').reduce((a,d)=>a+parseInt(d,10),0) }
export function pythagoreanReduce(n: number): number { while(n>9&&n!==11&&n!==22&&n!==33) n=digitSum(n); return n }
function fromMap(word: string, map: Record<string,number>): LetterValue[] { return word.toUpperCase().split('').map(ch=>({letter:ch,value:map[ch]??0})).filter(l=>l.value>0) }
export function calcHebrew(word: string): TraditionResult { const l=fromMap(word,HEBREW); return {id:'hebrew',name:'Hebrew',method:'Mispar Standard (transliterated)',value:l.reduce((s,x)=>s+x.value,0),letters:l} }
export function calcGreek(word: string): TraditionResult { const l=fromMap(word,GREEK); return {id:'greek',name:'Greek',method:'Isopsephy (transliterated)',value:l.reduce((s,x)=>s+x.value,0),letters:l} }
export function calcEnglishOrdinal(word: string): TraditionResult { const l=word.toUpperCase().split('').map(ch=>{const v=ch.charCodeAt(0)-64;return{letter:ch,value:v>=1&&v<=26?v:0}}).filter(x=>x.value>0); return {id:'english',name:'English',method:'Ordinal (A=1…Z=26)',value:l.reduce((s,x)=>s+x.value,0),letters:l} }
export function calcPythagorean(word: string): TraditionResult { const l=word.toUpperCase().split('').map(ch=>{const v=ch.charCodeAt(0)-64;if(v<1||v>26)return{letter:ch,value:0};return{letter:ch,value:pythagoreanReduce(v)}}).filter(x=>x.value>0); return {id:'pythagorean',name:'Pythagorean',method:'Reduced 1–9 (masters preserved)',value:l.reduce((s,x)=>s+x.value,0),letters:l} }
export function calcChaldean(word: string): TraditionResult { const l=fromMap(word,CHALDEAN); return {id:'chaldean',name:'Chaldean',method:'Ancient Babylonian (1–8)',value:l.reduce((s,x)=>s+x.value,0),letters:l} }
export function calcLatin(word: string): TraditionResult { const l=word.toUpperCase().split('').map(ch=>({letter:ch,value:LATIN[ch]??0})).filter(x=>x.value>0); return {id:'latin',name:'Latin',method:'Roman numeral letters only',value:l.reduce((s,x)=>s+x.value,0),letters:l} }
export function calcAll(word: string): TraditionResult[] { return [calcHebrew(word),calcGreek(word),calcEnglishOrdinal(word),calcPythagorean(word),calcChaldean(word),calcLatin(word)] }
const CORPUS: Record<number,Array<{tradition:string;meaning:string}>> = {
  1:[{tradition:'Kabbalah',meaning:'Kether — Crown, Unity, the First Cause'}],
  3:[{tradition:'Kabbalah',meaning:'Binah / Saturn — Understanding, the Great Mother'},{tradition:'Universal',meaning:'Trinity — Father/Son/Spirit; Brahma/Vishnu/Shiva'}],
  5:[{tradition:'Kabbalah',meaning:'Geburah / Mars — Severity, the pentagram'}],
  7:[{tradition:'Kabbalah',meaning:'Netzach / Venus — Victory, the seven classical planets'},{tradition:'Revelation',meaning:'Seven Seals, seven churches, seven bowls'}],
  8:[{tradition:'Kabbalah',meaning:'Hod / Mercury — Splendor, the Ogdoad'}],
  9:[{tradition:'Kabbalah',meaning:'Yesod / Moon — Foundation, the astral realm'},{tradition:'Egyptian',meaning:'The Ennead — nine great gods of Heliopolis'}],
  10:[{tradition:'Kabbalah',meaning:'Malkuth — the Kingdom, completion of the Tree'},{tradition:'Pythagorean',meaning:'Tetractys — sacred triangle 1+2+3+4=10'}],
  11:[{tradition:'Tarot',meaning:'Justice or Strength — master number of illumination'}],
  12:[{tradition:'Universal',meaning:'Zodiac, twelve tribes of Israel, twelve apostles'}],
  13:[{tradition:'Hebrew',meaning:'AHBH Love = 13; ACHD Unity = 13'},{tradition:'Tarot',meaning:'Death / Transformation — 13th Major Arcana'}],
  22:[{tradition:'Hebrew',meaning:'22 letters of the Hebrew alphabet, 22 Major Arcana'}],
  26:[{tradition:'Hebrew',meaning:'YHVH — the Tetragrammaton: Y(10)+H(5)+V(6)+H(5)=26'}],
  32:[{tradition:'Kabbalah',meaning:'32 Paths of Wisdom — 10 sefirot + 22 paths'}],
  33:[{tradition:'Masonic',meaning:"33 degree Scottish Rite; Christ's age at crucifixion"}],
  36:[{tradition:'Kabbalistic',meaning:'The 36 Tzaddikim — hidden righteous ones'}],
  40:[{tradition:'Biblical',meaning:'40 years in Sinai; 40 days of temptation'}],
  72:[{tradition:'Hebrew',meaning:'Shemhamphorash — 72 names of God, Exodus 14:19-21'}],
  78:[{tradition:'Tarot',meaning:'78 cards of the full Tarot deck'}],
  91:[{tradition:'Hebrew',meaning:'AMeN = 91; YHVH + Adonai combined'}],
  111:[{tradition:'Hebrew',meaning:'Aleph full spelling = 111; the divine breath'}],
  137:[{tradition:'Hebrew',meaning:'QBLh — gematria of the word Kabbalah itself'}],
  216:[{tradition:'Kabbalistic',meaning:'6 cubed = 216; hidden three-letter Name in the Zohar'}],
  666:[{tradition:'Greek/Solar',meaning:'NERON KAISAR = 666; solar hexagram triangular sum'}],
  777:[{tradition:'Thelema',meaning:'OZ = 77+700; crossing of the Abyss'}],
  888:[{tradition:'Greek Christian',meaning:'ΙΗΣΟΥΣ = 888; the Ogdoad — beyond the 7 spheres'}],
}
export function getResonances(results: TraditionResult[]): Resonance[] {
  const found: Resonance[] = []; const seen = new Set<number>()
  for (const r of results) { for (const v of new Set([r.value,pythagoreanReduce(r.value)])) { if(seen.has(v)) continue; const e=CORPUS[v]; if(e){seen.add(v);for(const x of e)found.push({value:v,...x})} } }
  return found.slice(0,10)
}
