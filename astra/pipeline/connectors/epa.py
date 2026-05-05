#!/usr/bin/env python3
"""
EPA ECHO Data Connector — two-step query (get_facilities → get_download CSV)
"""
import httpx, csv, io, os
from datetime import datetime, timezone

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://jmkopheshisqqmocwhto.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_publishable_oJCKKDU8IGdOPPykH9aQFg_tJLjXdO4")
HEADERS = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}

def get_facilities_bbox(lat, lng, radius_miles=1.0):
    deg = radius_miles / 69.0
    try:
        r1 = httpx.get(
            f"https://echodata.epa.gov/echo/echo_rest_services.get_facilities?output=JSON&p_c1lat={lat+deg}&p_c1lon={lng-deg}&p_c2lat={lat-deg}&p_c2lon={lng+deg}&p_act=Y",
            timeout=15, headers={"User-Agent": "ASTRABrain/1.0"}
        )
        qid = r1.json().get("Results", {}).get("QueryID")
        if not qid:
            return []
        r2 = httpx.get(
            f"https://echodata.epa.gov/echo/echo_rest_services.get_download?output=CSV&qid={qid}&qcolumns=1,2,3,4,5,6,7,8,9,10,11,12",
            timeout=15, headers={"User-Agent": "ASTRABrain/1.0"}
        )
        return list(csv.DictReader(io.StringIO(r2.text)))
    except Exception as e:
        print(f"  EPA ECHO error: {e}")
        return []

def store_facility(row, program="EPA_PERMIT"):
    name = row.get("FacName", "").strip()
    if not name:
        return False
    record = {
        "name": name[:200],
        "source": "tceq",
        "site_type": program,
        "latitude": None,
        "longitude": None,
        "state": row.get("FacState", "TX"),
        "county": row.get("FacCounty", ""),
        "status": "active",
        "tags": ["epa", "echo", "texas"],
        "metadata": {
            "registry_id": row.get("RegistryID"),
            "address": row.get("FacStreet", ""),
            "city": row.get("FacCity", ""),
            "zip": row.get("FacZip", ""),
            "federal": row.get("FacFederalFlg") == "Y",
            "pulled_at": datetime.now(timezone.utc).isoformat()
        }
    }
    res = httpx.post(f"{SUPABASE_URL}/rest/v1/stratum_sites",
        headers=HEADERS, json=record, timeout=10)
    return res.status_code in (200, 201)

if __name__ == "__main__":
    print("EPA ECHO Connector test — McKinney TX 1 mile radius")
    rows = get_facilities_bbox(33.197, -96.615, 1.0)
    print(f"Facilities found: {len(rows)}")
    for row in rows[:5]:
        print(f"  {row.get('FacName')} — {row.get('FacStreet')} — {row.get('FacCounty')}")
