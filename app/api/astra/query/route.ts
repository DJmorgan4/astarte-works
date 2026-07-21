import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getServerClient } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Live domain inventory (cached 10 min; never hardcode the list again) ──
let domainCache: { domains: string[]; drafts: string[]; at: number } | null = null

async function getDomainInventory(): Promise<{ domains: string[]; drafts: string[] }> {
  if (domainCache && Date.now() - domainCache.at < 600_000) return domainCache
  const sb = getServerClient()
  const { data } = await sb
    .from('astra_knowledge')
    .select('domain, metadata')
    .not('domain', 'in', '(knowledge,lithicearth_scans)')
  const all = new Map<string, boolean>() // domain -> hasDraftOnly
  for (const row of data ?? []) {
    const conf = (row.metadata as Record<string, string> | null)?.confidence ?? 'unknown'
    const isDraft = conf === 'draft'
    if (!all.has(row.domain)) all.set(row.domain, isDraft)
    else if (!isDraft) all.set(row.domain, false)
  }
  const domains = Array.from(all.keys()).sort()
  const drafts = domains.filter(d => all.get(d))
  domainCache = { domains, drafts, at: Date.now() }
  return domainCache
}

// ── Retrieval: ranked full-text across the whole corpus ──────────────
async function searchAstraKnowledge(query: string): Promise<string> {
  const sb = getServerClient()
  const cleaned = query.toLowerCase().replace(/[^\w\s]/g, '')
  const terms = cleaned.split(/\s+/).filter(w => w.length > 2).slice(0, 12).join(' | ')
  if (!terms) return ''

  const { data } = await sb
    .from('astra_knowledge')
    .select('domain, section, content')
    .textSearch('content', terms, { config: 'english' })
    .not('domain', 'in', '(knowledge,lithicearth_scans)')
    .limit(14)

  if (!data?.length) return ''

  // Dedupe by domain/section, keep order (Postgres FTS returns by relevance)
  const seen = new Set<string>()
  const deduped = data.filter(r => {
    const key = `${r.domain}/${r.section}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return deduped
    .map(r => `[${r.domain}/${r.section}]\n${r.content}`)
    .join('\n\n---\n\n')
}

async function getRecentContext(): Promise<string> {
  const sb = getServerClient()
  const { data, error } = await sb
    .from('stratum_sites')
    .select('name, source, site_type, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(10)
  if (error || !data?.length) return ''
  return data.map((s: { name: string; source: string; site_type: string; metadata: Record<string, unknown>; created_at: string }) => {
    const when = s.created_at ? new Date(s.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'undated'
    return `[${when}] ${s.name} (${s.site_type}) — ${JSON.stringify(s.metadata).slice(0, 120)}`
  }).join('\n')
}

export async function POST(req: Request) {
  try {
    const { message, history = [] } = await req.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 })
    }

    const [astraContext, liveContext, inventory] = await Promise.all([
      searchAstraKnowledge(message),
      getRecentContext(),
      getDomainInventory(),
    ])

    const draftNote = inventory.drafts.length
      ? `\nDomains still in draft (scaffolded, thin content — say so if asked about them in depth): ${inventory.drafts.join(', ')}`
      : ''

    const now = new Date()
    const currentDateTime = now.toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const systemPrompt = `You are ASTRA CORE — the reasoning engine of Astarte Works, built by DJ Morgan / The Blue Duck LLC (EP-TX, McKinney, Texas. CAGE: 14V05 | UEI: LG15KPRZFQE3).

## Current date and time (server clock, America/Chicago)
${currentDateTime}
This is the ONLY authoritative source for today's date. Never state or compute from any other date as "today." Dated entries in Recent STRATUM Sites below are historical records from their bracketed dates — never present them as current events.

## Knowledge (STRATUM — live inventory, ${inventory.domains.length} domains)
${inventory.domains.join(', ')}${draftNote}

## How you reason
- Ground answers in retrieved STRATUM knowledge when provided below. Cite the domain/section you drew from.
- Calibrate confidence: distinguish what the corpus establishes, what is professional judgment, and what is unknown. State which.
- Never fabricate database results, site records, or regulatory statuses. For specific site lookups, say that live databases must be queried.
- Flag when field verification or a licensed professional (PE, geotechnical, legal counsel) is required — screening and interpretation are in scope; sealed design and legal advice are not.
- Synthesize across domains when a question spans them; name the domains you're bridging.
- All domains are legitimate subjects — environmental, esoteric (gematria, astrology, Kabbalah), plasma physics, hunting, lineage, business. Treat each with the same care and the same honesty about evidence quality. Esoteric analysis is interpretive within its tradition; present it as such, not as empirical claim.
- DJ traces lineage through Graham, Somerville, Dunbar, Sinclair, Kincaid — apply as context for genealogical and esoteric queries.
- Be direct, technical, precise. Authority comes from calibration, not volume.

${astraContext ? `\n## Retrieved STRATUM Knowledge\n${astraContext}` : '\n## Retrieved STRATUM Knowledge\n(none matched — answer from general reasoning and say so)'}
${liveContext ? `\n## Recent STRATUM Sites\n${liveContext}` : ''}`

    const messages = [
      ...history.slice(-8),
      { role: 'user' as const, content: message },
    ]

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    })

    let text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    if (response.stop_reason === 'max_tokens') {
      text +=
        '\n\n---\n*Response reached the output limit and was truncated. Ask me to continue for the remainder.*'
    }

    return NextResponse.json({ response: text })
  } catch (e) {
    console.error('ASTRA query error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
