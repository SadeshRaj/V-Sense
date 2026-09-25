from langchain_core.tools import tool
from tenacity import retry, stop_after_attempt, wait_fixed
from state.persistence import get_supabase_client

@tool
@retry(stop=stop_after_attempt(2), wait=wait_fixed(2))
def get_vehicle_profile(vehicle_id: str) -> dict:
    """
    Read-only query to fetch core vehicle, ownership history, and legal data.
    """
    if not vehicle_id:
        return {"error": "Validation failed: vehicle_id is missing."}

    supabase = get_supabase_client()
    try:
        veh_res = supabase.table("Vehicles").select("*").eq("id", vehicle_id).execute()
        if not veh_res.data:
            return {"error": f"Vehicle with ID {vehicle_id} not found."}

        vehicle = veh_res.data[0]

        own_res = supabase.table("VehicleOwnerships").select("*, Users(*)").eq("VehicleId", vehicle_id).execute()
        current_owner = {}
        if own_res.data:
            active_owner = next((o for o in own_res.data if o.get("Status") == "Active"), own_res.data[0])
            user = active_owner.get("Users", {})
            current_owner = {
                "user_id": user.get("Id"),
                "name": user.get("FullName", "Unknown"),
                "ownership_since": active_owner.get("CreatedAt")
            }

        hist_res = supabase.table("VehicleHistory").select("*").eq("VehicleId", vehicle_id).execute()
        legal_status = hist_res.data[0] if hist_res.data else {}

        past_own_res = supabase.table("VehicleOwnershipHistory").select("*").eq("VehicleId", vehicle_id).execute()
        ownership_history = past_own_res.data if past_own_res.data else []

        # NEW: Fetch Police and Accident Records
        police_res = supabase.table("VehiclePoliceRecords").select("*").eq("VehicleId", vehicle_id).execute()
        police_records = police_res.data if police_res.data else []

        return {
            "vehicle_id": vehicle_id,
            "make": vehicle.get("Make", "Unknown"),
            "model": vehicle.get("Model", "Unknown"),
            "year": vehicle.get("ManufacturingYear", 0),
            "registration_no": vehicle.get("RegistrationNumber", ""),
            "vin": vehicle.get("VIN", ""),
            "current_owner": current_owner,
            "legal_status": legal_status,
            "ownership_history": ownership_history,
            "police_records": police_records
        }
    except Exception as e:
        return {"error": f"Database execution failure: {str(e)}"}