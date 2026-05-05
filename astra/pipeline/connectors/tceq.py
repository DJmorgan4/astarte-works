#!/usr/bin/env python3
"""
TCEQ Data Connector
Sources: TCEQ Download Data, STEERS, GIS Hub
https://www.tceq.texas.gov/agency/data/lookup-data/download-data.html
"""
import httpx, json, os
from datetime import datetime, timezone

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://jmkopheshisqqmocwhto.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_publishable_oJCKKDU8IGdOPPykH9aQFg_tJLjXdO4")
HEADERS = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}

# TCEQ ArcGIS REST endpoints (confirmed working)
TCEQ_ENDPOINTS = {
    "pst":        "https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/TCEQ_PST/FeatureServer/0",
    "lpst":       "https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/TCEQ_LPST/FeatureServer/0",
    "vcp":        "https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/TCEQ_VCP/FeatureServer/0",
    "landfills":  "https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/TCEQ_MSW/FeatureServer/0",
    "dryclean":   "https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/TCEQ_DRYCLEANER/FeatureServer/0",
}

def query_tceq_layer(layer_name: str, where: str = "1=1", max_records: int = 100) -> list:
    url = TCEQ_ENDPOINTS.get(layer_name)
    if not url:
        return []
    try:
        res = httpx.get(f"{url}/query", params={
            "where": where, "outFields": "*", "returnGeometry": "true",
            "f": "json", "resultRecordCount": max_records
        }, timeout=15)
        return res.json().get("features", [])
    except Exception as e:
        print(f"  ✗ TCEQ {layer_name}: {e}")
        return []

def query_by_radius(layer_name: str, lat: float, lng: float, radius_miles: float = 1.0) -> list:
    """Query TCEQ layer within radius of a point."""
    radius_ft = radius_miles * 5280
    url = TCEQ_ENDPOINTS.get(layer_name)
    if not url:
        return []
    try:
        res = httpx.get(f"{url}/query", params={
            "geometry": f"{lng},{lat}",
            "geometryType": "esriGeometryPoint",
            "spatialRel": "esriSpatialRelIntersects",
            "distance": radius_ft,
            "units": "esriSRUnit_Foot",
            "outFields": "*",
            "returnGeometry": "true",
            "f": "json",
            "inSR": "4326",
            "outSR": "4326",
        }, timeout=15)
        return res.json().get("features", [])
    except Exception as e:
        print(f"  ✗ TCEQ {layer_name} radius query: {e}")
        return []

def store_tceq_site(feature: dict, program: str) -> bool:
    attrs = feature.get("attributes", {})
    geo = feature.get("geometry", {})
    lat = geo.get("y") or geo.get("latitude")
    lng = geo.get("x") or geo.get("longitude")
    if not lat or not lng:
        return False
    
    name = (attrs.get("SITE_NAME") or attrs.get("NAME") or 
            attrs.get("FACILITY_NAME") or f"TCEQ {program.upper()} Site")
    
    record = {
        "name": str(name)[:200],
        "source": "tceq",
        "site_type": program,
        "latitude": float(lat),
        "longitude": float(lng),
        "state": "TX",
        "county": attrs.get("COUNTY_NM") or attrs.get("COUNTY"),
        "status": "active",
        "tags": ["tceq", program, "texas"],
        "metadata": {
            "program": program,
            "attributes": {k: v for k, v in attrs.items() if v is not None},
            "pulled_at": datetime.now(timezone.utc).isoformat()
        }
    }
    res = httpx.post(f"{SUPABASE_URL}/rest/v1/stratum_sites",
        headers=HEADERS, json=record, timeout=10)
    return res.status_code in (200, 201)

if __name__ == "__main__":
    print("🏭 TCEQ Connector — testing radius query around McKinney TX")
    for prog in ["lpst", "pst", "vcp", "dryclean"]:
        features = query_by_radius(prog, 33.197, -96.615, 5.0)
        print(f"  {prog}: {len(features)} features within 5 miles of McKinney")
        for f in features[:3]:
            if store_tceq_site(f, prog):
                print(f"    ✓ stored: {f.get('attributes', {}).get('SITE_NAME', 'Unknown')}")
