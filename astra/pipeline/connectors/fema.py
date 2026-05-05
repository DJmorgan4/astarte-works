#!/usr/bin/env python3
"""
FEMA Data Connector
Sources: FEMA NFHL ArcGIS REST, FEMA API open data
"""
import httpx, os
from datetime import datetime, timezone

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://jmkopheshisqqmocwhto.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_publishable_oJCKKDU8IGdOPPykH9aQFg_tJLjXdO4")
HEADERS = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}

NFHL_BASE = "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer"

def get_flood_zone(lat: float, lng: float) -> dict:
    """Get FEMA flood zone for a point."""
    try:
        res = httpx.get(f"{NFHL_BASE}/28/query", params={
            "geometry": f"{lng},{lat}",
            "geometryType": "esriGeometryPoint",
            "spatialRel": "esriSpatialRelIntersects",
            "outFields": "FLD_ZONE,ZONE_SUBTY,SFHA_TF,STUDY_TYP",
            "returnGeometry": "false",
            "f": "json", "inSR": "4326", "distance": "100", "units": "esriSRUnit_Meter"
        }, timeout=10)
        features = res.json().get("features", [])
        if features:
            attrs = features[0].get("attributes", {})
            zone = attrs.get("FLD_ZONE", "X")
            return {
                "zone": zone,
                "subtype": attrs.get("ZONE_SUBTY"),
                "sfha": attrs.get("SFHA_TF") == "T",
                "study_type": attrs.get("STUDY_TYP"),
                "risk": "HIGH" if zone.startswith("A") or zone.startswith("V") else "LOW"
            }
    except Exception as e:
        print(f"  ✗ FEMA flood zone: {e}")
    return {"zone": "X", "risk": "LOW", "sfha": False}

def get_floodway(lat: float, lng: float) -> bool:
    """Check if point is in a FEMA floodway."""
    try:
        res = httpx.get(f"{NFHL_BASE}/16/query", params={
            "geometry": f"{lng},{lat}",
            "geometryType": "esriGeometryPoint",
            "spatialRel": "esriSpatialRelIntersects",
            "outFields": "FLOODWAY",
            "returnGeometry": "false",
            "f": "json", "inSR": "4326"
        }, timeout=10)
        return len(res.json().get("features", [])) > 0
    except:
        return False

def get_recent_disasters(state: str = "TX", limit: int = 10) -> list:
    """Get recent FEMA disaster declarations via OpenFEMA."""
    try:
        res = httpx.get(
            f"https://www.fema.gov/api/open/v2/disasterDeclarationsSummaries",
            params={"$filter": f"state eq '{state}'", "$top": limit, "$orderby": "declarationDate desc"},
            headers={"Accept": "application/json"}, timeout=12
        )
        if res.status_code == 200:
            return res.json().get("DisasterDeclarationsSummaries", [])
    except Exception as e:
        print(f"  ✗ FEMA disasters: {e}")
    return []

if __name__ == "__main__":
    print("🌊 FEMA Connector test")
    zone = get_flood_zone(33.197, -96.615)
    print(f"  McKinney flood zone: {zone}")
    in_floodway = get_floodway(33.197, -96.615)
    print(f"  In floodway: {in_floodway}")
