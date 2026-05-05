#!/usr/bin/env python3
"""
ASTRA Environmental Ingestion Pipeline v2
Live data sources confirmed working:
- USGS Stream Gauges (real-time streamflow)
- USGS Water Quality
- Federal Register (regulatory filings)
- NWS Weather Alerts (Texas)
"""

import httpx, json, os
from datetime import datetime, timezone

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://jmkopheshisqqmocwhto.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_publishable_oJCKKDU8IGdOPPykH9aQFg_tJLjXdO4")
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

TX_GAUGES = [
    {"id": "08052700", "name": "East Fork Trinity near McKinney"},
    {"id": "08044400", "name": "Elm Fork Trinity near Lewisville"},
    {"id": "08048000", "name": "West Fork Trinity at Fort Worth"},
    {"id": "08042700", "name": "Trinity River at Dallas"},
    {"id": "08057000", "name": "Trinity River at Oakwood"},
    {"id": "08065000", "name": "Trinity River at Liberty"},
    {"id": "08016000", "name": "Sabine River near Longview"},
    {"id": "08108200", "name": "Little River near Cameron"},
    {"id": "08094000", "name": "Brazos River at Waco"},
    {"id": "08167000", "name": "Guadalupe River at Comfort"},
]

def upsert_stratum(record: dict) -> bool:
    res = httpx.post(
        f"{SUPABASE_URL}/rest/v1/stratum_sites",
        headers={**HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
        json=record, timeout=10
    )
    return res.status_code in (200, 201)

def pull_usgs_streamflow():
    print("💧 USGS Streamflow — Texas gauges...")
    gauge_ids = ",".join(g["id"] for g in TX_GAUGES)
    try:
        res = httpx.get(
            f"https://waterservices.usgs.gov/nwis/iv/?format=json&sites={gauge_ids}&parameterCd=00060&siteStatus=active",
            timeout=15, headers={"User-Agent": "ASTRABrain/1.0 CetoInteractive"}
        )
        data = res.json()
        count = 0
        for ts in data.get("value", {}).get("timeSeries", []):
            info = ts["sourceInfo"]
            geo = info.get("geoLocation", {}).get("geogLocation", {})
            vals = ts["values"][0]["value"]
            if not vals: continue
            latest = vals[-1]
            flow = float(latest["value"]) if latest["value"] != "-999999" else None
            if flow is None: continue

            rec = {
                "name": info["siteName"],
                "source": "usgs_streamflow",
                "site_type": "stream_gauge",
                "latitude": geo.get("latitude"),
                "longitude": geo.get("longitude"),
                "state": "TX",
                "status": "active",
                "tags": ["streamflow", "usgs", "texas", "hydrology"],
                "metadata": {
                    "gauge_id": info["siteCode"][0]["value"],
                    "flow_cfs": flow,
                    "observed_at": latest["dateTime"],
                    "pulled_at": datetime.now(timezone.utc).isoformat()
                }
            }
            if upsert_stratum(rec):
                count += 1
                print(f"  ✓ {info['siteName']}: {flow:.2f} cfs")
        print(f"  → {count} gauges stored\n")
        return count
    except Exception as e:
        print(f"  ✗ {e}\n")
        return 0

def pull_nws_alerts():
    print("⛈️  NWS Active Weather Alerts — Texas...")
    try:
        res = httpx.get(
            "https://api.weather.gov/alerts/active?area=TX",
            timeout=12, headers={"User-Agent": "ASTRABrain/1.0", "Accept": "application/json"}
        )
        data = res.json()
        features = data.get("features", [])
        count = 0
        for f in features[:10]:
            props = f.get("properties", {})
            event = props.get("event", "Unknown")
            areas = props.get("areaDesc", "Texas")
            severity = props.get("severity", "Unknown")
            rec = {
                "name": f"NWS Alert: {event} — {areas[:60]}",
                "source": "nws_alerts",
                "site_type": "weather_alert",
                "latitude": 31.0, "longitude": -99.0,
                "state": "TX", "status": "active",
                "tags": ["weather", "nws", "texas", "alert", event.lower().replace(" ", "_")],
                "metadata": {
                    "event": event,
                    "severity": severity,
                    "urgency": props.get("urgency"),
                    "areas": areas,
                    "onset": props.get("onset"),
                    "expires": props.get("expires"),
                    "headline": props.get("headline", "")[:200],
                    "pulled_at": datetime.now(timezone.utc).isoformat()
                }
            }
            if upsert_stratum(rec):
                count += 1
                print(f"  ✓ {event} — {severity} — {areas[:50]}")
        print(f"  → {count} alerts stored\n")
        return count
    except Exception as e:
        print(f"  ✗ {e}\n")
        return 0

def pull_federal_register():
    print("⚖️  Federal Register — Environmental filings...")
    agencies = [
        ("environmental-protection-agency", "EPA"),
        ("army-corps-of-engineers", "USACE"),
        ("fish-and-wildlife-service", "USFWS"),
    ]
    count = 0
    for slug, label in agencies:
        try:
            res = httpx.get(
                f"https://www.federalregister.gov/api/v1/documents.json?conditions[agencies][]={slug}&per_page=5&order=newest&fields[]=title,publication_date,document_number,type,abstract",
                timeout=10
            )
            docs = res.json().get("results", [])
            for doc in docs:
                rec = {
                    "name": f"{label}: {doc.get('title', 'Unknown')[:80]}",
                    "source": "federal_register",
                    "site_type": "regulatory_filing",
                    "latitude": 38.9, "longitude": -77.0,
                    "state": "US", "status": "active",
                    "tags": ["federal_register", label.lower(), "regulatory"],
                    "metadata": {
                        "agency": label,
                        "doc_number": doc.get("document_number"),
                        "doc_type": doc.get("type"),
                        "publication_date": doc.get("publication_date"),
                        "abstract": (doc.get("abstract") or "")[:300],
                        "pulled_at": datetime.now(timezone.utc).isoformat()
                    }
                }
                if upsert_stratum(rec):
                    count += 1
                    print(f"  ✓ {label}: {doc.get('title', '')[:60]}")
        except Exception as e:
            print(f"  ✗ {label}: {e}")
    print(f"  → {count} filings stored\n")
    return count

def pull_usgs_water_quality():
    print("🔬 USGS Water Quality — Trinity watershed...")
    try:
        res = httpx.get(
            "https://www.waterqualitydata.us/data/Station/search?statecode=US%3A48&huc=12030101&mimeType=json&siteType=Stream&providers=NWIS",
            timeout=15, headers={"User-Agent": "ASTRABrain/1.0"}
        )
        stations = res.json() if res.status_code == 200 else []
        count = 0
        for s in stations[:8]:
            rec = {
                "name": f"WQ Station: {s.get('MonitoringLocationName', 'Unknown')}",
                "source": "usgs_water_quality",
                "site_type": "water_quality_station",
                "latitude": float(s.get("LatitudeMeasure", 0) or 0),
                "longitude": float(s.get("LongitudeMeasure", 0) or 0),
                "state": "TX", "status": "active",
                "tags": ["water_quality", "usgs", "texas", "trinity"],
                "metadata": {
                    "station_id": s.get("MonitoringLocationIdentifier"),
                    "station_type": s.get("MonitoringLocationTypeName"),
                    "huc": s.get("HUCEightDigitCode"),
                    "pulled_at": datetime.now(timezone.utc).isoformat()
                }
            }
            if rec["latitude"] and upsert_stratum(rec):
                count += 1
        print(f"  → {count} water quality stations stored\n")
        return count
    except Exception as e:
        print(f"  ✗ {e}\n")
        return 0

def run():
    print("🌍 ASTRA Environmental Ingestion Pipeline v2")
    print(f"   {datetime.now().strftime('%Y-%m-%d %H:%M')} CST\n")
    print("=" * 52)
    total = 0
    total += pull_usgs_streamflow()
    total += pull_nws_alerts()
    total += pull_federal_register()
    total += pull_usgs_water_quality()
    print("=" * 52)
    print(f"✅ {total} environmental records written to STRATUM")
    print(f"   ASTRA brain now has live Texas environmental context")

if __name__ == "__main__":
    run()
