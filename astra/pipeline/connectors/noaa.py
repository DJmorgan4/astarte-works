#!/usr/bin/env python3
"""
NOAA/NWS Data Connector
Sources: NWS API (alerts, forecasts), NOAA CDO (climate data)
"""
import httpx, os
from datetime import datetime, timezone

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://jmkopheshisqqmocwhto.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_publishable_oJCKKDU8IGdOPPykH9aQFg_tJLjXdO4")
HEADERS = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}
NWS_HEADERS = {"User-Agent": "ASTRABrain/1.0 CetoInteractive", "Accept": "application/json"}

def get_active_alerts(state: str = "TX") -> list:
    try:
        res = httpx.get(f"https://api.weather.gov/alerts/active?area={state}",
            headers=NWS_HEADERS, timeout=12)
        return res.json().get("features", [])
    except Exception as e:
        print(f"  ✗ NWS alerts: {e}")
        return []

def get_forecast(lat: float, lng: float) -> dict:
    try:
        point = httpx.get(f"https://api.weather.gov/points/{lat},{lng}",
            headers=NWS_HEADERS, timeout=8).json()
        forecast_url = point.get("properties", {}).get("forecast")
        if forecast_url:
            forecast = httpx.get(forecast_url, headers=NWS_HEADERS, timeout=8).json()
            return forecast.get("properties", {}).get("periods", [{}])[0]
    except:
        pass
    return {}

def get_flood_observations(state: str = "TX") -> list:
    try:
        res = httpx.get(
            f"https://api.weather.gov/alerts/active?area={state}&event=Flood%20Warning",
            headers=NWS_HEADERS, timeout=12)
        return res.json().get("features", [])
    except:
        return []

def store_alert(feature: dict) -> bool:
    props = feature.get("properties", {})
    record = {
        "name": f"NWS: {props.get('event', 'Alert')} — {props.get('areaDesc', 'TX')[:60]}",
        "source": "tceq",
        "site_type": "weather_alert",
        "latitude": 31.0, "longitude": -99.0,
        "state": "TX", "status": "active",
        "tags": ["nws", "weather", "texas", props.get("event", "").lower().replace(" ", "_")],
        "metadata": {
            "event": props.get("event"),
            "severity": props.get("severity"),
            "urgency": props.get("urgency"),
            "areas": props.get("areaDesc"),
            "onset": props.get("onset"),
            "expires": props.get("expires"),
            "headline": (props.get("headline") or "")[:200],
            "pulled_at": datetime.now(timezone.utc).isoformat()
        }
    }
    res = httpx.post(f"{SUPABASE_URL}/rest/v1/stratum_sites",
        headers=HEADERS, json=record, timeout=10)
    return res.status_code in (200, 201)

if __name__ == "__main__":
    print("🌦️ NOAA Connector test")
    alerts = get_active_alerts("TX")
    print(f"  Active TX alerts: {len(alerts)}")
    for a in alerts[:3]:
        p = a.get("properties", {})
        print(f"  → {p.get('event')} — {p.get('severity')} — {p.get('areaDesc', '')[:50]}")
    
    print("\n  McKinney forecast:")
    fc = get_forecast(33.197, -96.615)
    print(f"  → {fc.get('name')}: {fc.get('shortForecast')}")
