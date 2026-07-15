import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getServerClient } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function getStratumContext(domains: string[]): Promise<string> {
  const sb = getServerClient()
  const chunks: string[] = []
  for (const domain of domains) {
    const { data } = await sb
      .from('astra_knowledge')
      .select('domain, section, content')
      .eq('domain', domain)
      .limit(3)
    if (data) {
      chunks.push(...data.map((r: { domain: string; section: string; content: string }) =>
        `[${r.domain}/${r.section}]\n${r.content}`
      ))
    }
  }
  return chunks.join('\n\n---\n\n')
}

async function storeVerdict(opportunity: Record<string, unknown>, verdict: object) {
  const sb = getServerClient()
  await sb.from('astra_bid_verdicts').insert({
    source_url: opportunity.source_url ?? null,
    title: opportunity.title ?? null,
    entity_key: opportunity.entity_key ?? null,
    verdict,
    created_at: new Date().toISOString(),
  })
}

export async function POST(req: Request) {
  try {
    const { opportunity } = await req.json()

    if (!opportunity || !opportunity.title) {
      return NextResponse.json({ error: 'opportunity object with title required' }, { status: 400 })
    }

    const entityKey = opportunity.entity_key ?? 'cetointeractive'
    const isGrant = opportunity.opportunity_type === 'grant'

    // Pull STRATUM context relevant to capture reasoning.
    const domains = isGrant
      ? ['regulatory', 'conservation', 'wetlands', 'wildlife', 'hydrology', 'water_quality', 'landuse']
      : ['regulatory', 'remediation', 'soils', 'wetlands', 'toxicology', 'geology', 'archaeology', 'business_compliance']
    const stratumContext = await getStratumContext(domains)

    const capability = entityKey === 'blue_duck'
      ? `The Blue Duck Foundation — a Texas 501(c)(3) conservation nonprofit (wetlands, waterfowl, land stewardship, cultural resources). Founder DJ Morgan holds an EP-TX environmental credential and a B.S. in Environmental Sciences. New nonprofit (est. Feb 2026), no prior federal grant history — strongest on private-lands habitat, wetland restoration, and Central Flyway work.`
      : `Ceto Interactive — a Texas environmental consulting firm. Core services: Phase I ESAs (ASTM E1527-21), stormwater/SWPPP, wetland delineation, geospatial/survey (LithicEarth), cultural resources. Principal DJ Morgan holds EP-TX credential, B.S. Environmental Sciences. Small business, SAM-registered (UEI LG15KPRZFQE3, CAGE 14V05). Solo-operator capacity — realistic on small-to-mid contracts and IDIQ task orders, not large multi-year primes without teaming.`

    const systemPrompt = `You are ASTRA CORE — the capture-intelligence engine for DJ Morgan's ventures. You judge federal ${isGrant ? 'grant' : 'contract'} opportunities for bid/no-bid, honestly and specifically. You do not inflate fit. A wrong "bid" wastes scarce solo-operator time, so be a skeptical capture manager.

## Pursuing entity:
${capability}

${stratumContext ? `## STRATUM Knowledge Context:\n${stratumContext}\n\n` : ''}

Return ONLY valid JSON in this exact structure — no preamble, no markdown:

{
  "recommendation": "<BID|NO_BID|TEAM|WATCH>",
  "win_probability": <0-100 integer>,
  "fit_summary": "<2-3 sentences: why this does or doesn't fit the entity's real capabilities>",
  "strengths": ["<specific reason this is winnable>"],
  "gaps": ["<capability, cert, past-performance, or capacity gap that threatens the bid>"],
  "deadline_risk": "<assessment of whether there is realistic time to respond>",
  "first_move": "<the single most important next action if pursuing>",
  "teaming_need": "<null, or what partner/cert would be required to be competitive>"
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1536,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Judge this ${isGrant ? 'grant' : 'contract'} opportunity:

Title: ${opportunity.title}
Organization: ${opportunity.organization ?? 'Unknown'}
Type: ${opportunity.opportunity_type ?? 'government'}
Location: ${opportunity.location ?? 'Unknown'}
Deadline: ${opportunity.deadline || 'Not stated'}
Heuristic score: ${opportunity.score ?? 'n/a'}/100
Heuristic notes: ${opportunity.fit_reason ?? 'none'}
Summary: ${opportunity.summary ?? 'none'}

Return your verdict as JSON only.`
      }]
    })

    const raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    let verdict: object
    try {
      verdict = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: 'ASTRA returned malformed verdict — retry', raw: clean.slice(0, 500) }, { status: 500 })
    }

    try {
      await storeVerdict(opportunity, verdict)
    } catch {
      // Non-fatal — return verdict even if storage fails
    }

    return NextResponse.json({
      ok: true,
      title: opportunity.title,
      verdict,
      tokens_used: response.usage.input_tokens + response.usage.output_tokens,
    })

  } catch (e) {
    console.error('ASTRA bid verdict error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
