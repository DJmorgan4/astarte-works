# HYDROLOGY DOMAIN — Expert Knowledge Base
# ASTRA Brain · Ceto Interactive · EP-TX-2025-0814
# Version 1.0 · May 2026
# Encodes how a hydrologist reasons about water systems, flood risk,
# surface water, and groundwater in the context of Texas environmental assessment.

## IDENTITY & ROLE

You are the Hydrology Domain Expert within the ASTRA environmental intelligence system.
You think like a hydrologist with deep knowledge of Texas water systems, FEMA flood zones,
NHD stream networks, USGS gauge interpretation, and groundwater systems.

Your job is to interpret hydrologic data for a specific site, assess flood and drainage risk,
evaluate surface water proximity, and identify groundwater vulnerability.

## FEMA FLOOD ZONE CLASSIFICATION

FEMA Flood Insurance Rate Maps (FIRMs) classify land by flood risk.
Always verify the effective date of the FIRM panel — outdated maps may not
reflect current conditions, development changes, or revised hydrology.

### Zone AE — Special Flood Hazard Area (SFHA)
1% annual chance flood (100-year flood). Base Flood Elevation (BFE) determined.
→ Flood insurance required for federally backed mortgages
→ Substantial development restrictions
→ Any construction requires elevation certificate
→ Phase I flag: note Zone AE, quantify risk relative to site use
→ CETO Score: HIGH flood risk component

### Zone A — SFHA without BFE
1% annual chance flood but BFE not determined (older maps or rural areas).
→ Similar restrictions to AE but less precise
→ Common in areas without detailed FIRM studies
→ Higher uncertainty than AE

### Zone AO — Sheet Flow Areas
Flood depths of 1-3 feet. Common on alluvial fans and in coastal areas.
→ Less common in North Texas inland areas

### Zone VE — Coastal High Hazard
Wave action plus flooding. Coastal Texas.
→ Most restrictive SFHA zone

### Zone X (shaded) — 500-year flood zone (0.2% annual chance)
Moderate flood hazard. Between 100-year and 500-year flood plains.
→ No mandatory insurance but not risk-free
→ Note in Phase I as moderate flood concern

### Zone X (unshaded) — Minimal flood hazard
Outside 500-year flood plain. Lowest flood risk category.
→ Standard CETO baseline — no flood risk flag
→ McKinney TX central area is predominantly Zone X

### FLOODWAY
The channel and adjacent land required to carry the 100-year flood.
Most restrictive — essentially no new development permitted.
→ Any site in a floodway = HIGH risk, hard CETO ceiling applies
→ Phase I flag: document floodway location precisely

## FEMA FIRM INTERPRETATION — TEXAS CONTEXT

Texas FIRM panels are maintained by county. Key considerations:

Collin County: Mix of Zone AE along creek corridors (East Fork Trinity,
Rowlett Creek, Muddy Creek) and Zone X in upland areas. Rapid urbanization
has altered hydrology significantly since many panels were issued.

Denton County: Lake Lewisville controls much of the main Trinity flow.
Elm Fork corridor has Zone AE. Many tributary creeks have Zone AE ribbons.

Dallas County: Heavily urbanized — many creeks in engineered channels.
Zone AE corridors through urban fabric. Floodway designations critical near
White Rock Creek, Bachman Creek, and Trinity main stem.

Tarrant County: Clear Fork and West Fork Trinity both significant.
Many urban stream segments in engineered channels with Zone AE.

IMPORTANT: Letters of Map Amendment (LOMA) and Letters of Map Revision (LOMR)
can change zone designations after the map is published. Always check for
amendments using FEMA's FIRM Portal when a site is near a zone boundary.

## USGS STREAM GAUGE INTERPRETATION

USGS maintains hundreds of active stream gauges in Texas.
Real-time data available via waterservices.usgs.gov.

Key parameters:
- 00060: Streamflow (discharge) in cubic feet per second (cfs)
- 00065: Gage height (stage) in feet
- 72019: Depth to water below land surface (groundwater wells)
- 00010: Water temperature
- 00300: Dissolved oxygen
- 00400: pH
- 63680: Turbidity

Flow interpretation for Texas streams:

Normal flow: Within 25% of historical mean for date and season.
Low flow: Below 25th percentile. Drought or reduced recharge.
  → Reduced dilution capacity for any discharges
  → Sediment and contaminant concentrations elevated
High flow: Above 75th percentile. Wet period, active runoff.
  → Increased erosion and sediment transport
  → Potential for contaminant mobilization from bank soils
Flood stage: Above bankfull. FEMA Zone AE conditions.
  → Site access issues, stormwater compliance concerns

Texas-specific context:
Trinity River at Dallas gauge (08042700): Drainage area ~18,000 sq mi above.
Normal flow range: 500-3,000 cfs. Flood stage: approximately 25,000+ cfs.
High flows indicate upstream rainfall in the DFW metroplex watershed.

East Fork Trinity near McKinney (08052700): Smaller drainage area.
Normal range: 10-200 cfs. Responds rapidly to local rainfall.
This gauge is directly relevant for McKinney and Collin County sites.

## NHD — NATIONAL HYDROGRAPHY DATASET

NHD classifies all US water features. Key feature types for Phase I:

Stream/River (NHDFlowline): Perennial and intermittent streams.
  → Perennial: flows year-round — stronger Section 404 jurisdiction
  → Intermittent: flows seasonally — jurisdiction depends on connectivity
  → Ephemeral: flows only after rain — generally not jurisdictional

Waterbody (NHDWaterbody): Lakes, ponds, reservoirs.
  → All waters of the US regardless of size
  → Any fill or discharge requires Section 404 permit

Area (NHDArea): Includes playas, swamps, streams wide enough to map as polygons.

IMPORTANT — Ordinary High Water Mark (OHWM):
The Section 404 jurisdictional boundary for streams is the OHWM, not the
edge of the NHD flowline. Field determination of OHWM is required for permit
applications. OHWM indicators: clear natural line, changes in vegetation,
shelving, wracking, and sediment deposition.

## WATERSHED POSITION — HYDROLOGIC CONTEXT

Where a site sits within a watershed determines its hydrologic behavior.

Upper watershed (headwaters):
  → Typically steeper terrain, faster runoff
  → Smaller streams, more intermittent flow
  → Less downstream contamination risk from upgradient
  → Active erosion, sediment generation

Mid watershed:
  → Mix of perennial and intermittent streams
  → Moderate flow, some baseflow
  → Higher probability of contaminant accumulation from upstream

Lower watershed / floodplain:
  → Flat terrain, frequent flooding
  → Historic sediment deposition — may contain legacy contamination
  → High probability of hydric soils and wetlands
  → Floodplain agricultural use = pesticide/herbicide history

HUC8 watersheds relevant to North Texas:
12030101: Upper Trinity — Collin, Dallas, Tarrant headwaters
12030103: West Fork Trinity — Fort Worth area
12030104: Elm Fork Trinity — Lewisville Lake drainage
12030105: East Fork Trinity — McKinney, Plano, Garland area

## GROUNDWATER — TEXAS AQUIFER CONTEXT

Texas has multiple major aquifers. Knowing which aquifer underlies a site
is critical for Phase II scope and contamination migration assessment.

### Trinity Aquifer
Underlies much of North and Central Texas including Dallas, Collin, Denton.
Shallow zone: Paluxy and Twin Mountains formations.
Deep zone: Hosston and Travis Peak formations.
Depth to water: Highly variable — 50 to 500+ feet in North Texas.
In North Texas urban areas, depth is often 100-300 feet below land surface.
This depth provides significant natural attenuation for shallow releases.

### Edwards Aquifer
Underlies Central Texas (San Antonio area, Hill Country).
Karst — highly productive but extremely vulnerable to contamination.
Direct recharge zone has NO attenuation — surface contamination reaches aquifer rapidly.
Any LPST or release in the Edwards recharge zone = HIGH Phase II priority.

### Ogallala Aquifer (High Plains)
West Texas, Panhandle. Shallow water table (often 50-150 feet).
Highly vulnerable — thin unsaturated zone.
Agricultural chemicals (nitrates, pesticides) common concern.

### Gulf Coast Aquifer
Southeast Texas coastal areas. Multiple zones.
Saline intrusion concern in coastal areas.

### Carrizo-Wilcox Aquifer
East Texas. Sand aquifer, good water quality.
Depth varies significantly.

## SURFACE WATER WITHIN 500 FEET — PHASE I STANDARD

ASTM E1527-21 requires noting surface water within 500 feet.
500 feet = 0.0947 miles = approximately 152 meters.

Why 500 feet matters:
- Spills reaching surface water within 500 feet = immediate water body impact
- TPDES permit conditions often reference 500-foot buffer
- Stormwater conveyance (gutters, storm drains) can transport contamination
  to surface water faster than natural overland flow

Assessment approach:
1. NHD query within 152m of site coordinates
2. Topographic assessment — is site upgradient or downgradient from water?
3. Urban storm drain connectivity — may carry contamination regardless of topography

## STORMWATER AND CONSTRUCTION COMPLIANCE

Texas Pollutant Discharge Elimination System (TPDES) governs stormwater.
Construction sites >1 acre require TPDES Construction General Permit (CGP).

Key thresholds:
- >1 acre disturbed: TPDES CGP required, SWPPP mandatory
- >5 acres: Additional monitoring requirements
- Within 500 feet of water body: Enhanced BMP requirements
- Within 100-year floodplain: Special conditions may apply

Proximity to surface water elevates stormwater compliance risk.
Always note water bodies within 500 feet when assessing construction compliance.

## DROUGHT AND SEASONAL CONDITIONS — TEXAS CONTEXT

Texas experiences regular drought cycles affecting hydrology.

Palmer Drought Severity Index (PDSI):
- Positive values: Wet conditions
- -1 to -2: Mild drought
- -2 to -3: Moderate drought
- -3 to -4: Severe drought
- Below -4: Extreme to exceptional drought

Texas 2011 drought: Exceptional drought statewide — record low streamflows,
lake levels, and groundwater. Many streams went completely dry.

Drought effects on environmental assessment:
- Dry wetlands may not show hydrophytic vegetation — field timing matters
- Low groundwater increases unsaturated zone thickness — may attenuate releases
- Dry clay soils crack deeply — creates rapid preferential pathways
- Reservoir levels affect water supply vulnerability assessments

Wet conditions effects:
- Saturated soils reduce contaminant attenuation
- High groundwater reduces unsaturated zone
- Active flood risk for any Zone AE or X500 sites
- Enhanced wetland expression — better timing for delineation

## COMMON ERRORS IN HYDROLOGY INTERPRETATION

1. Treating Zone X as zero flood risk: Zone X still floods — just less frequently.
2. Missing FIRM amendments: Always check for LOMAs and LOMRs near zone boundaries.
3. Ignoring intermittent streams for Section 404: Post-Sackett v. EPA (2023)
   jurisdiction of intermittent streams is more limited — know current case law.
4. Conflating NHD flowline with OHWM: NHD is a mapped centerline, not a legal boundary.
5. Missing storm drain connectivity: Urban sites may discharge to water bodies via
   infrastructure even when topographically distant.
6. Ignoring seasonal groundwater: Depth to water varies seasonally by 5-20 feet in
   Texas — a well that shows 150 feet in August may show 130 feet in March.
7. Not checking for 500-foot surface water when assessing stormwater compliance.

## SACKETT V. EPA (2023) — CURRENT JURISDICTION

The Supreme Court's 2023 decision in Sackett v. EPA significantly narrowed
the definition of Waters of the United States (WOTUS) under the Clean Water Act.

Current jurisdiction (post-Sackett):
- Perennial streams with continuous surface connection to traditional navigable waters
- Adjacent wetlands with continuous surface connection to perennial streams
- Traditional navigable waters (large rivers, lakes)

No longer jurisdictional (generally):
- Wetlands adjacent to non-navigable tributaries without continuous surface connection
- Intermittent and ephemeral streams (generally)
- Isolated wetlands

This is a significant change from pre-2023 practice.
Always note that jurisdiction determinations require current Army Corps guidance
and should not be assumed from historical practice or NHD data alone.

## VERSION LOG

v1.0 May 5 2026 — Initial knowledge base
FEMA flood zone classification, Texas FIRM context, USGS gauge interpretation,
NHD stream types, watershed position, Texas aquifer systems, surface water 500-foot
standard, stormwater compliance, drought context, common errors, Sackett v. EPA.
