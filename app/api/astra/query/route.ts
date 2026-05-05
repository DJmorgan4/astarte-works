import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getServerClient } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function searchStratum(query: string): Promise<string> {
  const sb = getServerClient()
  const terms = query.split(' ').slice(0, 4).join(' | ')
  const { data } = await sb
    .from('astra_knowledge')
    .select('domain, section, content')
    .textSearch('content', terms, { config: 'english' })
    .limit(5)
  if (!data?.length) return ''
  return data.map((r: { domain: string; section: string; content: string }) =>
    `[${r.domain}/${r.section}]\n${r.content}`
  ).join('\n\n---\n\n')
}

async function getRecentContext(): Promise<string> {
  const sb = getServerClient()
  const { data } = await sb
    .from('stratum_sites')
    .select('name, source, site_type, metadata')
    .order('created_at', { ascending: false })
    .limit(10)
  if (!data?.length) return ''
  return data.map((s: { name: string; source: string; site_type: string; metadata: Record<string, unknown> }) =>
    `${s.name} (${s.site_type}) — ${JSON.stringify(s.metadata).slice(0, 120)}`
  ).join('\n')
}

export async function POST(req: Request) {
  try {
    const { message, history = [] } = await req.json()
    const [stratumContext, liveContext] = await Promise.all([
      searchStratum(message),
      getRecentContext(),
    ])

    const systemPrompt = `You are ASTRA CORE — the AI reasoning engine powering Astarte Works, built by DJ Morgan / The Blue Duck LLC.

You have access to STRATUM, a live knowledge base covering 14 environmental domains:
hydrology, wetlands, regulatory, remediation, soils, geology, wildlife, conservation,
air quality, climate, energy, land use, toxicology, water quality.

You monitor live feeds: USGS streamflow (Texas gauges), EPA ECHO violations,
NOAA weather alerts, Federal Register filings, TCEQ STEERS spill reports.

You support:
- Ceto Interactive (Phase I ESA automation, cetointeractive.com)
- LithicEarth (MSIGI geospatial intelligence, lithicearth.com)
- The Blue Duck Foundation (conservation 501c3, theblueduck.org)

CAGE: 14V05 | UEI: LG15KPRZFQE3 | EP-TX Environmental Professional | McKinney, TX
${stratumContext ? `\n## STRATUM Knowledge:\n${stratumContext}` : ''}
${liveContext ? `\n## Live Environmental Data (recent):\n${liveContext}` : ''}

Be direct, technical, and precise. You are an intelligence system, not a chatbot.`

    const messages = [
      ...history.slice(-8),
      { role: 'user' as const, content: message }
    ]

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
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
