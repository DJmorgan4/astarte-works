import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const ASTRA_CORE_SYSTEM = `You are ASTRA CORE — the unified planetary intelligence engine of The Blue Duck LLC ecosystem, built by DJ Morgan (Environmental Professional, McKinney Texas).

You power three integrated platforms:
- CETO INTERACTIVE: Phase I/II ESA generation, TCEQ/EPA regulatory compliance, wetland delineation, SWPPP, ASTM E1527-21 reporting
- LITHICEARTH: Geospatial terrain intelligence, MSIGI multi-sensor scanning, satellite analysis (Sentinel-1/2, Landsat-9), LiDAR, NDVI, SAR backscatter
- ASTARTE WORKS: Strategic intelligence, design advisory, systems integration

YOUR KNOWLEDGE DOMAINS (STRATUM — 18 domains):
1. ASTM E1527-21 Phase I ESA — REC classification, HREC, CREC, de minimis conditions, vapor encroachment
2. TCEQ regulatory databases — LPST, RCRA, CERCLIS, VCP, IHW, dry cleaners, UST records
3. EPA federal databases — NPL Superfund, RCRA TSD, CERCLIS, ERNS, FINDS
4. Wetland delineation — Corps of Engineers 1987 manual, TCEQ §404, NWI classification, hydric soils, hydrophytic vegetation
5. FEMA flood zones — NFHL, AE/VE/X zones, LOMA, floodway vs floodplain
6. Soils — SSURGO, hydrologic groups A/B/C/D, drainage class, Ksat, depth to water table
7. Texas hydrology — NHD, NLDI, USGS stream gauges, aquifer systems (Trinity, Carrizo-Wilcox, Edwards, Ogallala)
8. Geospatial remote sensing — Sentinel-2 NDVI, Sentinel-1 SAR VV/VH backscatter, Landsat-9 ST_B10 thermal, USGS 3DEP LiDAR
9. TPWD Wildlife Management Areas — public hunting, Annual Public Hunting Permit, species management
10. Texas ecology — Central Flyway waterfowl, Hill Country, Pineywoods, Post Oak Savanna, Blackland Prairie, Coastal Prairie ecoregions
11. SWPPP — TPDES TXR150000 Texas Construction General Permit, BMP selection, inspection protocols
12. Phase II ESA — subsurface investigation, soil borings, groundwater monitoring, laboratory analysis
13. Cultural resources — NHPA Section 106, TPWD THC coordination, archaeological survey
14. Environmental risk scoring — CETO cetoScore algorithm, facility proximity, haversine decay, red flags
15. Muon tomography — Gaisser parametrization, void detection, NOAA Kp solar modulation
16. Texas public land access — state parks, WMAs, Corps of Engineers lakes, national forests (Angelina, Davy Crockett, Sam Houston, Sabine)
17. Hidden gem discovery — lowkey scoring, OSM tag density inversion, dispersed camping, spring-fed water
18. Conservation — ACEP, RCPP, NAWCA wetland grants, 501(c)(3) conservation easements

RESPONSE STYLE:
- Environmental consulting queries: be precise, cite standards, flag RECs/HRECs/CRECs, use EP-grade language
- Discovery queries: be specific about locations, access rules, terrain features, seasonal conditions
- Geospatial queries: reference specific sensors, resolution, data sources
- Always note when field verification is required
- For Texas public land: always mention permit requirements and TPWD rules
- Never fabricate regulatory database results — say "query live databases" for specific site lookups`

// ── RAG retrieval from stratum_chunks (when populated) ───────────────
async function retrieveContext(query: string): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return ''
  try {
    // When stratum_chunks has embeddings, this will do vector similarity search
    // For now: keyword-based retrieval from domain tags
    const keywords = query.toLowerCase().split(' ').filter(w => w.length > 4)
    const domain = keywords.find(k => [
      'wetland','tceq','phase','swppp','flood','soil','aquifer','sar','ndvi','lidar',
      'hunting','wma','spring','creek','river','hiking','camping','ranch'
    ].includes(k))

    if (!domain) return ''

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/stratum_chunks?domain=eq.${encodeURIComponent(domain)}&select=content,domain,chunk_index&limit=5`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    )
    if (!res.ok) return ''
    const chunks = await res.json()
    if (!Array.isArray(chunks) || !chunks.length) return ''
    return '\n\nSTRATUM CONTEXT:\n' + chunks.map((c: any) => c.content).join('\n---\n')
  } catch { return '' }
}

// ── Store interaction for learning ───────────────────────────────────
async function storeInteraction(query: string, response: string, domain: string, source: string) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/astra_interactions`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        query,
        response: response.slice(0, 2000),
        domain,
        source,
        created_at: new Date().toISOString(),
      }),
    })
  } catch {}
}

export async function POST(req: NextRequest) {
  try {
    const {
      query,
      history = [],
      domain: requestedDomain,
      source = 'unknown',
      systemOverride,
    } = await req.json()

    if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 })

    // Retrieve STRATUM context
    const stratumContext = await retrieveContext(query)

    // Build system prompt
    const system = systemOverride || (ASTRA_CORE_SYSTEM + stratumContext)

    // Build messages
    const messages: Anthropic.MessageParam[] = [
      ...history.filter((m: any) => m.role && m.content).slice(-10),
      { role: 'user', content: query },
    ]

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system,
      messages,
    })

    const content = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('\n')
      .trim()

    // Classify domain from response
    const domainMap: Record<string, string> = {
      'phase i': 'esa', 'phase ii': 'esa', 'rec': 'esa', 'hrec': 'esa',
      'tceq': 'regulatory', 'epa': 'regulatory', 'astm': 'regulatory',
      'wetland': 'wetlands', 'hydric': 'wetlands', 'nwi': 'wetlands',
      'swppp': 'swppp', 'tpdes': 'swppp', 'bmp': 'swppp',
      'wma': 'discovery', 'hiking': 'discovery', 'spring': 'discovery',
      'ndvi': 'geospatial', 'sar': 'geospatial', 'lidar': 'geospatial',
      'muon': 'geospatial', 'elevation': 'geospatial',
    }
    const queryLower = query.toLowerCase()
    const domain = requestedDomain ||
      Object.entries(domainMap).find(([k]) => queryLower.includes(k))?.[1] ||
      'general'

    // Store for learning (fire and forget)
    storeInteraction(query, content, domain, source)

    return NextResponse.json({
      response: content,
      domain,
      subsystem: 'ASTRA',
      engine: 'LOCUS',
      stratum_context: stratumContext ? true : false,
      model: 'claude-sonnet-4-20250514',
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'ASTRA Core unavailable', detail: err.message },
      { status: 500 }
    )
  }
}
