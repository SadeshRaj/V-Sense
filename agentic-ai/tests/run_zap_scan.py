import time
import requests
import json

ZAP_URL = "http://localhost:8080"
API_KEY = "zap-api-key"
TARGET_URL = "http://localhost:5183/api/workflows"

def trigger_zap_scan():
    print(f"[ZAP] Starting spider on {TARGET_URL}...")
    spider_resp = requests.get(f"{ZAP_URL}/JSON/spider/action/scan/", params={
        "apikey": API_KEY,
        "url": TARGET_URL
    })
    scan_id = spider_resp.json().get("scan")

    while True:
        status_resp = requests.get(f"{ZAP_URL}/JSON/spider/view/status/", params={"scan": scan_id})
        progress = int(status_resp.json().get("status", 0))
        print(f"[ZAP] Spider progress: {progress}%")
        if progress >= 100:
            break
        time.sleep(2)

    print("[ZAP] Fetching vulnerability alerts...")
    alerts_resp = requests.get(f"{ZAP_URL}/JSON/core/view/alerts/", params={"baseurl": TARGET_URL})
    alerts = alerts_resp.json().get("alerts", [])

    high_risks = [a for a in alerts if a.get("risk") == "High"]
    medium_risks = [a for a in alerts if a.get("risk") == "Medium"]

    print(f"\n[SCAN COMPLETE] Total Alerts: {len(alerts)}")
    print(f"High Severity: {len(high_risks)} | Medium Severity: {len(medium_risks)}")

    with open("zap_alerts_summary.json", "w") as f:
        json.dump(alerts, f, indent=2)

if __name__ == "__main__":
    try:
        trigger_zap_scan()
    except Exception as e:
        print(f"[ZAP Offline or Target unreachable]: {e}")