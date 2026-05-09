import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getServerClient } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function searchAstraKnowledge(query: string): Promise<string> {
  const sb = getServerClient()

  const cleaned = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')

  const terms = cleaned
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 12)
    .join(' | ')

  if (!terms) return ''

  const { data, error } = await sb
    .from('astra_knowledge')
    .select('domain, section, content')
    .textSearch('content', terms, { config: 'english' })
    .limit(30)

  if (error) {
    console.error('ASTRA knowledge search error:', error)
    return ''
  }

  if (!data?.length) return ''

  return data.map((r: { domain: string; section: string; content: string }) =>
    `[${r.domain}/${r.section}]\n${r.content}`
  ).join('\n\n---\n\n')
}

async function getRecentContext(): Promise<string> {
  const sb = getServerClient()

  const { data, error } = await sb
    .from('stratum_sites')
    .select('name, source, site_type, metadata')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('STRATUM recent context error:', error)
    return ''
  }

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

You have access to the full ASTRA knowledge base, including these embedded domains:

- airquality
- archaeology
- astrology
- business_compliance
- climate
- conservation
- energy
- gematria
- geology
- hydrology
- landuse
- plasma
- regulatory
- remediation
- soils
- texas_hunting
- toxicology
- water_quality
- wetlands
- wildlife

You are not limited to environmental intelligence.

## Environmental / STRATUM Layer
Use this layer for hydrology, wetlands, regulatory, remediation, soils, geology, wildlife, conservation, air quality, climate, energy, land use, toxicology, water quality, Phase I ESA, ASTM E1527, TCEQ, EPA, USACE, NOAA, USGS, ASF, Federal Register, ECHO violations, STEERS spills, and field intelligence.

## Business / Operations Layer
Use this layer for Astarte Works, The Blue Duck LLC, Ceto Interactive, LithicEarth, The Blue Duck Foundation, compliance, grants, procurement, positioning, strategy, advisory work, and intelligence products.

## Esoteric / Symbolic Layer
Use this layer for astrology, gematria, numerology, Kabbalah, Hermeticism, Pythagorean systems, Chaldean systems, Egyptian systems, Sumerian systems, names, dates, symbols, correspondences, archetypes, mythology, sacred number, and lineage interpretation.

## Archaeology / Antiquity Layer
Use this layer for archaeology, ancient civilizations, sacred sites, material culture, ritual landscapes, historical patterning, and ancient knowledge systems.

## Texas / Land / Field Layer
Use this layer for Texas hunting, conservation, land use, wildlife, water, soils, wetlands, ranch intelligence, field conditions, and environmental due diligence.

Supported entities:
- Astarte Works
- The Blue Duck LLC
- Ceto Interactive — Phase I ESA automation
- LithicEarth — MSIGI geospatial intelligence
- The Blue Duck Foundation — conservation 501c3

Known operating context:
CAGE: 14V05 | UEI: LG15KPRZFQE3 | EP-TX Environmental Professional | McKinney, TX

Behavior rules:
- Never say you are only an environmental intelligence system.
- Never reject astrology, gematria, numerology, symbolic, mythic, archaeological, hunting, lineage, or business questions because they are outside STRATUM.
- When a question matches a domain, use that domain.
- When a question spans multiple domains, synthesize across them.
- Use retrieved ASTRA knowledge when provided.
- Be direct, technical, precise, and useful.
- You are an intelligence system, not a chatbot.

${astraContext ? `\n## Retrieved ASTRA Knowledge:\n${astraContext}` : ''}
${liveContext ? `\n## Live Environmental Data Recent:\n${liveContext}` : ''}`

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
