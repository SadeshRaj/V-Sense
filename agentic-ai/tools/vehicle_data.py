from langchain_core.tools import tool
from tenacity import retry, stop_after_attempt, wait_fixed
from state.persistence import get_supabase_client

@tool
@retry(stop=stop_after_attempt(2), wait=wait_fixed(2))
def get_vehicle_profile(vehicle_id: str) -> dict:
    """
    Read-only query to fetch core vehicle, true ownership history, and legal data.
    """
    if not vehicle_id:
        return {"error": "Validation failed: vehicle_id is missing."}

    supabase = get_supabase_client()
    try:
        veh_res = supabase.table("Vehicles").select("*").eq("id", vehicle_id).execute()
        if not veh_res.data:
            return {"error": f"Vehicle with ID {vehicle_id} not found."}

        vehicle = veh_res.data[0]

        # Fetch Legal/Insurance Status
        hist_res = supabase.table("VehicleHistory").select("*").eq("VehicleId", vehicle_id).execute()
        legal_status = hist_res.data[0] if hist_res.data else {}

        # Fetch Legal Ownership History
        past_own_res = supabase.table("VehicleOwnershipHistory").select("*").eq("VehicleId", vehicle_id).execute()
        all_ownership_records = past_own_res.data if past_own_res.data else []

        current_owner = {"name": "Unknown", "ownership_since": "Unknown"}
        past_owners = []

        # Split current vs past explicitly based on the End Date being null
        for owner in all_ownership_records:
            if not owner.get("OwnershipEndDate"):
                current_owner = {
                    "name": owner.get("OwnerName", "Unknown"),
                    "ownership_since": owner.get("OwnershipStartDate", "Unknown")
                }
            else:
                past_owners.append(owner)

        # Sort past owners descending by start date
        past_owners_sorted = sorted(past_owners, key=lambda x: x.get("OwnershipStartDate", ""), reverse=True)

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
            "ownership_history": past_owners_sorted, # AI only sees actual past owners now
            "police_records": police_records
        }
    except Exception as e:
        return {"error": f"Database execution failure: {str(e)}"}