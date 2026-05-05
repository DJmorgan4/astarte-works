"""
ASTRA Agent Registry
Each agent = domain expert with own knowledge, data sources, confidence rules.
"""

AGENTS = {
    "regulatory": {
        "name": "Regulatory Agent",
        "icon": "⚖️",
        "knowledge_domain": "regulatory",
        "data_sources": ["tceq", "epa"],
        "connectors": ["tceq.py", "epa.py"],
        "confidence_rules": "ASTM E1527-21 REC tier system",
        "primary_question": "What regulated facilities and compliance issues exist at or near this site?",
    },
    "hydrology": {
        "name": "Hydrology Agent",
        "icon": "💧",
        "knowledge_domain": "hydrology",
        "data_sources": ["usgs", "fema", "noaa"],
        "connectors": ["usgs.py", "fema.py", "noaa.py"],
        "confidence_rules": "FEMA flood zone + USGS streamflow + NHD position",
        "primary_question": "What are the flood, drainage, and surface water conditions at this site?",
    },
    "soils": {
        "name": "Soils Agent",
        "icon": "🪨",
        "knowledge_domain": "soils",
        "data_sources": ["usda_ssurgo"],
        "connectors": [],
        "confidence_rules": "SSURGO mapunit confidence + drainage class + series behavior",
        "primary_question": "What are the soil conditions, limitations, and engineering implications?",
    },
    "wetlands": {
        "name": "Wetlands Agent",
        "icon": "🌿",
        "knowledge_domain": "wetlands",
        "data_sources": ["usfws_nwi"],
        "connectors": [],
        "confidence_rules": "NWI Cowardin classification + hydric soil + Section 404 trigger",
        "primary_question": "Are there wetlands on or adjacent to this site requiring Section 404 consideration?",
    },
    "geology": {
        "name": "Geology Agent",
        "icon": "🗻",
        "knowledge_domain": "geology",
        "data_sources": ["macrostrat"],
        "connectors": [],
        "confidence_rules": "Formation confidence + lithology + karst/subsidence indicators",
        "primary_question": "What geological formations are present and what are the subsurface implications?",
    },
    "wildlife": {
        "name": "Wildlife Agent",
        "icon": "🦅",
        "knowledge_domain": "wildlife",
        "data_sources": ["usfws", "tpwd"],
        "connectors": [],
        "confidence_rules": "ESA listing status + critical habitat designation + species range",
        "primary_question": "Are there ESA-listed species or critical habitat near this site?",
    },
    "climate": {
        "name": "Climate Agent",
        "icon": "🌦️",
        "knowledge_domain": "climate",
        "data_sources": ["noaa", "nws"],
        "connectors": ["noaa.py"],
        "confidence_rules": "PRISM 30-year normals + current drought index + recent anomalies",
        "primary_question": "What are the climate conditions and recent weather anomalies for this area?",
    },
    "contamination": {
        "name": "Contamination Agent",
        "icon": "⚠️",
        "knowledge_domain": "remediation",
        "data_sources": ["tceq", "epa"],
        "connectors": ["tceq.py", "epa.py"],
        "confidence_rules": "CETO Score + LPST proximity + migration pathway + contaminant behavior",
        "primary_question": "What contamination risk exists at or near this site based on regulatory and field evidence?",
    },
    "airquality": {
        "name": "Air Quality Agent",
        "icon": "🌬️",
        "knowledge_domain": "airquality",
        "data_sources": ["tceq", "epa_airnow"],
        "connectors": ["epa.py"],
        "confidence_rules": "AQI thresholds + TRI proximity + TCEQ permit status",
        "primary_question": "What are the air quality conditions and nearby emission sources?",
    },
    "landuse": {
        "name": "Land Use Agent",
        "icon": "🗺️",
        "knowledge_domain": "landuse",
        "data_sources": ["nlcd", "county_cad"],
        "connectors": [],
        "confidence_rules": "NLCD 2021 classification + parcel land use code + zoning",
        "primary_question": "What is the current and historical land use and what are the planning constraints?",
    },
    "conservation": {
        "name": "Conservation Agent",
        "icon": "🌱",
        "knowledge_domain": "conservation",
        "data_sources": ["nrcs", "usfws", "tpwd"],
        "connectors": [],
        "confidence_rules": "ACEP eligibility + NAWCA corridor + easement potential",
        "primary_question": "What conservation value does this site have and what programs apply?",
    },
    "water_quality": {
        "name": "Water Quality Agent",
        "icon": "🔬",
        "knowledge_domain": "water_quality",
        "data_sources": ["epa_attains", "tceq"],
        "connectors": ["epa.py", "tceq.py"],
        "confidence_rules": "303(d) impairment status + TCEQ water body class + TPDES permits",
        "primary_question": "Are nearby water bodies impaired and what are the water quality implications?",
    },
    "report_reviewer": {
        "name": "Report Review Agent",
        "icon": "📋",
        "knowledge_domain": "regulatory",
        "data_sources": ["all"],
        "connectors": ["tceq.py", "epa.py", "fema.py", "usgs.py"],
        "confidence_rules": "ASTM E1527-21 completeness + data consistency + language audit",
        "primary_question": "Does this Phase I ESA report meet ASTM E1527-21 requirements and accurately represent the site data?",
    },
    "qa_citation": {
        "name": "QA & Citation Agent",
        "icon": "✅",
        "knowledge_domain": "regulatory",
        "data_sources": ["all"],
        "connectors": [],
        "confidence_rules": "Source verification + claim support + regulatory citation accuracy",
        "primary_question": "Are all claims in this report supported by cited sources and regulatory standards?",
    },
}

def get_agent(agent_id: str) -> dict:
    return AGENTS.get(agent_id, {})

def list_agents() -> list:
    return list(AGENTS.keys())
