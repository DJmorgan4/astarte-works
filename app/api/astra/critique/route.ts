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

async function storeCritique(report_text: string, critique: object, site_address: string) {
  const sb = getServerClient()
  await sb.from('esa_critiques').insert({
    site_address,
    report_excerpt: report_text.slice(0, 500),
    critique,
    created_at: new Date().toISOString(),
  })
}

export async function POST(req: Request) {
  try {
    const { report_text, site_address, site_lat, site_lng } = await req.json()

    if (!report_text || report_text.length < 50) {
      return NextResponse.json({ error: 'Report text required (min 50 chars)' }, { status: 400 })
    }

    // Pull relevant STRATUM context
    const stratumContext = await getStratumContext([
      'regulatory', 'remediation', 'wetlands', 'hydrology', 'soils'
    ])

    const systemPrompt = `You are ASTRA CORE — an expert Phase I Environmental Site Assessment (ESA) review engine built on ASTM E1527-21 standards, Texas TCEQ regulations, and USACE wetland guidance.

Your job is to critically review Phase I ESA draft text and return a structured JSON critique. Be rigorous, specific, and cite exact ASTM E1527-21 sections where relevant.

${stratumContext ? `## STRATUM Knowledge Context:\n${stratumContext}\n\n` : ''}

You must return ONLY valid JSON in this exact structure — no preamble, no markdown, no explanation outside the JSON:

{
  "overall_defensibility_score": <0-100 integer>,
  "grade": "<A|B|C|D|F>",
  "summary": "<2-3 sentence executive summary of report quality>",
  "missing_sections": [
    "<section name that is absent or inadequate>"
  ],
  "rec_tier_errors": [
    {
      "finding": "<what the report says>",
      "current_tier": "<REC|CREC|HREC|PHREC|de minimis>",
      "correct_tier": "<correct classification>",
      "reason": "<why the classification is wrong per ASTM E1527-21>"
    }
  ],
  "data_gap_flags": [
    "<specific data gap not addressed per ASTM E1527-21 Section 12>"
  ],
  "overstatements": [
    "<language that overstates conclusions beyond available data>"
  ],
  "language_audit": [
    "<non-standard or legally problematic phrasing>"
  ],
  "regulatory_flags": [
    "<TCEQ, EPA, or USACE regulatory issues not addressed>"
  ],
  "strengths": [
    "<what the report does well>"
  ],
  "recommended_actions": [
    "<specific action to improve defensibility>"
  ]
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Please critique this Phase I ESA draft text:

Site Address: ${site_address || 'Not provided'}
${site_lat && site_lng ? `Coordinates: ${site_lat}, ${site_lng}` : ''}

--- REPORT TEXT ---
${report_text}
--- END REPORT TEXT ---

Return your critique as JSON only.`
      }]
    })

    const raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    // Parse JSON — strip any accidental markdown fences
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    let critique: object
    try {
      critique = JSON.parse(clean)
    } catch {
      return NextResponse.json({
        error: 'ASTRA returned malformed critique — retry',
        raw: clean.slice(0, 500)
      }, { status: 500 })
    }

    // Store in Supabase
    try {
      await storeCritique(report_text, critique, site_address || 'Unknown')
    } catch {
      // Non-fatal — return critique even if storage fails
    }

    return NextResponse.json({
      ok: true,
      site_address,
      critique,
      tokens_used: response.usage.input_tokens + response.usage.output_tokens,
    })

  } catch (e) {
    console.error('ESA critique error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
