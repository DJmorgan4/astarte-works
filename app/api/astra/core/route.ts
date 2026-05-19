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

// ── RAG retrieval from astra_knowledge ───────────────────────────────
async function retrieveContext(query: string): Promise<{ context: string; chunks: number }> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { context: '', chunks: 0 }
  
  try {
    // Get embedding from Ollama for the query
    // Since Ollama is local-only, fall back to keyword search in production
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 4)
    
    const domainMap: Record<string, string> = {
      'wetland': 'wetlands', 'hydric': 'wetlands', 'delineat': 'wetlands', 'nwi': 'wetlands',
      'tceq': 'regulatory', 'rcra': 'regulatory', 'cercla': 'regulatory', 'superfund': 'regulatory',
      'phase': 'regulatory', 'astm': 'regulatory', 'rec': 'regulatory',
      'swppp': 'regulatory', 'tpdes': 'regulatory', 'stormwater': 'regulatory',
      'flood': 'hydrology', 'aquifer': 'hydrology', 'creek': 'hydrology', 'river': 'hydrology',
      'soil': 'soils', 'ssurgo': 'soils', 'drainage': 'soils', 'hydro': 'soils',
      'hunting': 'texas_hunting', 'wma': 'texas_hunting', 'tpwd': 'texas_hunting', 'crane': 'texas_hunting',
      'spring': 'water_quality', 'swimming': 'water_quality', 'water': 'water_quality',
      'wildlife': 'wildlife', 'habitat': 'wildlife', 'bird': 'wildlife', 'waterfowl': 'wildlife',
      'conservation': 'conservation', 'grant': 'conservation', 'easement': 'conservation',
      'geology': 'geology', 'formation': 'geology', 'lithic': 'geology',
      'climate': 'climate', 'weather': 'climate', 'temperature': 'climate',
      'remediation': 'remediation', 'cleanup': 'remediation', 'contamina': 'remediation',
      'ndvi': 'landuse', 'lidar': 'landuse', 'satellite': 'landuse', 'terrain': 'landuse',
    }

    // Find best matching domain
    let matchedDomain: string | null = null
    for (const keyword of keywords) {
      for (const [pattern, domain] of Object.entries(domainMap)) {
        if (keyword.includes(pattern) || pattern.includes(keyword)) {
          matchedDomain = domain
          break
        }
      }
      if (matchedDomain) break
    }

    // Query astra_knowledge by domain
    const url = matchedDomain
      ? `${SUPABASE_URL}/rest/v1/astra_knowledge?domain=eq.${matchedDomain}&select=content,domain,section&limit=4&order=chunk_index.asc`
      : `${SUPABASE_URL}/rest/v1/astra_knowledge?select=content,domain,section&limit=3&order=chunk_index.asc`

    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    })

    if (!res.ok) return { context: '', chunks: 0 }
    const chunks = await res.json()
    if (!Array.isArray(chunks) || !chunks.length) return { context: '', chunks: 0 }

    const context = `\n\n--- STRATUM KNOWLEDGE (${matchedDomain || 'general'}) ---\n` +
      chunks.map((c: any) => `[${c.domain}/${c.section}]\n${c.content}`).join('\n---\n') +
      '\n--- END STRATUM ---'

    return { context, chunks: chunks.length }
  } catch {
    return { context: '', chunks: 0 }
  }
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

    // RAG — retrieve relevant STRATUM knowledge
    const { context, chunks } = await retrieveContext(query)

    // Build system with injected context
    const system = systemOverride || (ASTRA_CORE_SYSTEM + context)

    const messages: Anthropic.MessageParam[] = [
      ...history.filter((m: any) => m.role && m.content).slice(-10),
      { role: 'user', content: query },
    ]

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system,
      messages,
    })

    const content = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('\n')
      .trim()

    // Classify domain
    const domainMap: Record<string, string> = {
      'phase i': 'esa', 'phase ii': 'esa', 'rec': 'esa', 'hrec': 'esa', 'astm': 'esa',
      'tceq': 'regulatory', 'epa': 'regulatory', 'rcra': 'regulatory', 'cercla': 'regulatory',
      'wetland': 'wetlands', 'hydric': 'wetlands', 'nwi': 'wetlands',
      'swppp': 'swppp', 'tpdes': 'swppp', 'bmp': 'swppp',
      'wma': 'discovery', 'hiking': 'discovery', 'spring': 'discovery', 'hunting': 'discovery',
      'ndvi': 'geospatial', 'sar': 'geospatial', 'lidar': 'geospatial', 'sentinel': 'geospatial',
      'muon': 'geospatial', 'elevation': 'geospatial', 'terrain': 'geospatial',
      'soil': 'soils', 'ssurgo': 'soils',
      'flood': 'hydrology', 'aquifer': 'hydrology',
      'conservation': 'conservation', 'grant': 'conservation',
    }
    const queryLower = query.toLowerCase()
    const domain = requestedDomain ||
      Object.entries(domainMap).find(([k]) => queryLower.includes(k))?.[1] ||
      'general'

    // Log interaction (fire and forget)
    storeInteraction(query, content, domain, source)

    return NextResponse.json({
      response: content,
      domain,
      subsystem: 'ASTRA',
      engine: 'LOCUS',
      stratum_chunks_used: chunks,
      stratum_domain: chunks > 0 ? domain : null,
      model: 'claude-sonnet-4-5',
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'ASTRA Core unavailable', detail: err.message },
      { status: 500 }
    )
  }
}
