from langchain_core.tools import tool
from tenacity import retry, stop_after_attempt, wait_fixed
from state.persistence import get_supabase_client

@tool
@retry(stop=stop_after_attempt(2), wait=wait_fixed(2))
def get_vehicle_profile(vehicle_id: str) -> dict:
    """
    Read-only query to fetch core vehicle and ownership data.
    Must be used to gather facts before handing off to Agent 2.
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

        return {
            "vehicle_id": vehicle_id,
            "make": vehicle.get("Make", "Unknown"),
            "model": vehicle.get("Model", "Unknown"),
            "year": vehicle.get("ManufacturingYear", 0),
            "registration_no": vehicle.get("RegistrationNumber", ""),
            "vin": vehicle.get("VIN", ""),
            "current_owner": current_owner,
            "ownership_history": []
        }
    except Exception as e:
        return {"error": f"Database execution failure: {str(e)}"}