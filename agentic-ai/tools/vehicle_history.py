from langchain_core.tools import tool
from tenacity import retry, stop_after_attempt, wait_fixed
from state.persistence import get_supabase_client

@tool
@retry(stop=stop_after_attempt(2), wait=wait_fixed(2))
def get_vehicle_history(vehicle_id: str) -> dict:
    """
    Read-only query to fetch all service records and verify garage statuses.
    Returns a structured history and mileage timeline sorted by date.
    """
    if not vehicle_id:
        return {"error": "Validation failed: vehicle_id is missing."}

    supabase = get_supabase_client()
    try:
        records_res = supabase.table("ServiceRecords").select("*").eq("VehicleId", vehicle_id).execute()
        records = records_res.data or []

        if not records:
            return {"total_records": 0, "service_records": [], "mileage_timeline": []}

        garage_ids = list(set([r.get("GarageId") for r in records if r.get("GarageId")]))
        garages_verified = {}

        if garage_ids:
            orgs_res = supabase.table("Organizations").select("id, Status").in_("id", garage_ids).execute()
            for org in (orgs_res.data or []):
                garages_verified[org["id"]] = (org.get("Status") == "Active")

        service_records = []
        mileage_timeline = []
        records_sorted = sorted(records, key=lambda x: x.get("CreatedAt", ""))

        for r in records_sorted:
            date = r.get("CreatedAt", "")
            mileage = r.get("OdometerReading", 0)
            garage_id = r.get("GarageId")

            service_records.append({
                "date": date,
                "garage_id": garage_id,
                "garage_verified": garages_verified.get(garage_id, False),
                "type": r.get("Title", "General Service"),
                "description": r.get("Description", ""), # NEW: Pass description to AI
                "mileage": mileage,
                "images": r.get("PhotoUrls", "").split(",") if r.get("PhotoUrls") else []
            })

            mileage_timeline.append({"date": date, "mileage": mileage})

        return {
            "total_records": len(service_records),
            "service_records": service_records,
            "mileage_timeline": mileage_timeline
        }
    except Exception as e:
        return {"error": f"Database execution failure: {str(e)}"}