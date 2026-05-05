#!/usr/bin/env python3
"""
USGS Data Connector
Sources: Water Services API, Water Quality Portal, National Map
"""
import httpx, json, os
from datetime import datetime, timezone

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://jmkopheshisqqmocwhto.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_publishable_oJCKKDU8IGdOPPykH9aQFg_tJLjXdO4")
HEADERS = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}

TX_HUC8_CODES = [
    "12030101",  # Upper Trinity
    "12030102",  # Clear Fork Trinity
    "12030103",  # West Fork Trinity
    "12030104",  # Elm Fork Trinity
    "12030105",  # East Fork Trinity
    "12030106",  # Lower Trinity
]

def get_streamflow(site_ids: list) -> list:
    ids = ",".join(site_ids)
    try:
        res = httpx.get(
            f"https://waterservices.usgs.gov/nwis/iv/?format=json&sites={ids}&parameterCd=00060&siteStatus=active",
            timeout=15, headers={"User-Agent": "ASTRABrain/1.0"}
        )
        return res.json().get("value", {}).get("timeSeries", [])
    except Exception as e:
        print(f"  ✗ USGS streamflow: {e}")
        return []

def get_groundwater_levels(state: str = "TX", county_cd: str = None) -> list:
    params = {"format": "json", "stateCd": state, "parameterCd": "72019", "siteType": "GW", "siteStatus": "active"}
    if county_cd:
        params["countyCd"] = county_cd
    try:
        res = httpx.get("https://waterservices.usgs.gov/nwis/iv/", params=params, timeout=15,
            headers={"User-Agent": "ASTRABrain/1.0"})
        return res.json().get("value", {}).get("timeSeries", [])
    except Exception as e:
        print(f"  ✗ USGS groundwater: {e}")
        return []

def get_water_quality_stations(huc8: str) -> list:
    try:
        res = httpx.get(
            f"https://www.waterqualitydata.us/data/Station/search?huc={huc8}&mimeType=json&siteType=Stream&providers=NWIS",
            timeout=15, headers={"User-Agent": "ASTRABrain/1.0"}
        )
        return res.json() if res.status_code == 200 else []
    except:
        return []

def get_elevation(lat: float, lng: float) -> float | None:
    try:
        res = httpx.get(
            f"https://epqs.nationalmap.gov/v1/json?x={lng}&y={lat}&wkid=4326&includeDate=false",
            timeout=8)
        val = res.json().get("value")
        return float(val) * 3.28084 if val else None
    except:
        return None

def store_gauge(ts: dict) -> bool:
    info = ts.get("sourceInfo", {})
    geo = info.get("geoLocation", {}).get("geogLocation", {})
    vals = ts.get("values", [{}])[0].get("value", [])
    if not vals: return False
    latest = vals[-1]
    flow = float(latest["value"]) if latest["value"] != "-999999" else None
    if not flow: return False
    
    record = {
        "name": info.get("siteName", "Unknown Gauge"),
        "source": "tceq",
        "site_type": "stream_gauge",
        "latitude": geo.get("latitude"),
        "longitude": geo.get("longitude"),
        "state": "TX", "status": "active",
        "tags": ["usgs", "streamflow", "hydrology", "texas"],
        "metadata": {
            "gauge_id": info.get("siteCode", [{}])[0].get("value"),
            "flow_cfs": flow,
            "observed_at": latest.get("dateTime"),
            "pulled_at": datetime.now(timezone.utc).isoformat()
        }
    }
    res = httpx.post(f"{SUPABASE_URL}/rest/v1/stratum_sites",
        headers=HEADERS, json=record, timeout=10)
    return res.status_code in (200, 201)

if __name__ == "__main__":
    print("💧 USGS Connector test")
    elev = get_elevation(33.197, -96.615)
    print(f"  McKinney elevation: {elev:.1f} ft" if elev else "  Elevation unavailable")
    
    wq = get_water_quality_stations("12030101")
    print(f"  Upper Trinity WQ stations: {len(wq)}")
