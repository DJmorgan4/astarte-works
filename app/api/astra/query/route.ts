import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getServerClient } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  gematria:            ['gematria','hebrew','greek','chaldean','pythagorean','isopsephy','number','letters','value','kabbalah','sefirot','tetragrammaton','yhvh','numerical'],
  astrology:           ['astrology','astral','planet','saturn','jupiter','mars','venus','mercury','moon','sun','zodiac','chart','natal','transit','aspect','conjunction','house','sign','aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'],
  archaeology:         ['archaeology','excavation','artifact','site','burial','stratigraphy','ancient','prehistoric','lithic','ceramic'],
  plasma:              ['plasma','electromagnetic','bloch','zpe','zpf','evo','flyback','zvs','resonance','field','bismuth','levitation'],
  texas_hunting:       ['hunting','duck','waterfowl','deer','hog','pheasant','flyway','blind','bag limit','tpwd','season'],
  business_compliance: ['compliance','contract','proposal','bid','naics','cage','uei','sam.gov','rfp','rfq'],
  conservation:        ['conservation','wetland','easement','nawca','acep','waterfowl','habitat'],
  regulatory:          ['tceq','epa','usace','nepa','section 404','section 106','phase i','esa','astm'],
}

function detectDomains(query: string): string[] {
  const q = query.toLowerCase()
  const matched: string[] = []
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some(kw => q.includes(kw))) matched.push(domain)
  }
  return matched
}

async function searchAstraKnowledge(query: string): Promise<string> {
  const sb = getServerClient()
  const detectedDomains = detectDomains(query)

  const cleaned = query.toLowerCase().replace(/[^\w\s]/g, '')
  const terms = cleaned.split(/\s+/).filter(w => w.length > 2).slice(0, 12).join(' | ')

  const chunks: Array<{domain: string; section: string; content: string}> = []

  // If we detected specific domains, pull directly from them
  if (detectedDomains.length > 0) {
    for (const domain of detectedDomains) {
      const { data } = await sb
        .from('astra_knowledge')
        .select('domain, section, content')
        .eq('domain', domain)
        .limit(6)
      if (data) chunks.push(...data)
    }
  }

  // Also do full-text search if we have terms
  if (terms) {
    const { data } = await sb
      .from('astra_knowledge')
      .select('domain, section, content')
      .textSearch('content', terms, { config: 'english' })
      .limit(20)
    if (data) chunks.push(...data)
  }

  // Deduplicate by section
  const seen = new Set<string>()
  const deduped = chunks.filter(r => {
    const key = `${r.domain}/${r.section}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (!deduped.length) return ''

  return deduped.map(r => `[${r.domain}/${r.section}]\n${r.content}`).join('\n\n---\n\n')
}

async function getRecentContext(): Promise<string> {
  const sb = getServerClient()
  const { data, error } = await sb
    .from('stratum_sites')
    .select('name, source, site_type, metadata')
    .order('created_at', { ascending: false })
    .limit(10)
  if (error) return ''
  if (!data?.length) return ''
  return data.map((s: { name: string; source: string; site_type: string; metadata: Record<string, unknown> }) =>
    `${s.name} (${s.site_type}) — ${JSON.stringify(s.metadata).slice(0, 120)}`
  ).join('\n')
}

export async function POST(req: Request) {
  try {
    const { message, history = [] } = await req.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 })
    }

    const [astraContext, liveContext] = await Promise.all([
      searchAstraKnowledge(message),
      getRecentContext(),
    ])

    const systemPrompt = `You are ASTRA CORE — the unified AI reasoning engine powering Astarte Works, built by DJ Morgan / The Blue Duck LLC.

You have access to 20 embedded knowledge domains. Answer questions from ANY of them with equal authority.

## Domains
- airquality, archaeology, astrology, business_compliance, climate, conservation, energy, gematria, geology, hydrology, landuse, plasma, regulatory, remediation, soils, texas_hunting, toxicology, water_quality, wetlands, wildlife

## Rules
- Never refuse or deflect questions about gematria, astrology, numerology, Kabbalah, plasma, hunting, lineage, or business because they seem off-topic. They are all on-topic.
- When a domain is detected, use it fully.
- When domains overlap, synthesize across them.
- Use retrieved ASTRA knowledge when provided below.
- Be direct, technical, and precise. You are an intelligence system.
- DJ traces lineages through Graham, Somerville, Dunbar, Sinclair, Kincaid. Apply this context to esoteric and genealogical queries.
- CAGE: 14V05 | UEI: LG15KPRZFQE3 | EP-TX | McKinney, TX

${astraContext ? `\n## Retrieved ASTRA Knowledge:\n${astraContext}` : ''}
${liveContext ? `\n## Live STRATUM Data:\n${liveContext}` : ''}`

    const messages = [
      ...history.slice(-8),
      { role: 'user' as const, content: message },
    ]

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1600,
      system: systemPrompt,
      messages,
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    return NextResponse.json({ response: text })
  } catch (e) {
    console.error('ASTRA query error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
