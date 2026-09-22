import uuid
from dotenv import load_dotenv
from api.main import graph

load_dotenv()

test_vehicle_id = "0cb63bf1-94ca-4255-bbf4-afe0af04dd4c"

def create_initial_state(vehicle_id: str):
    return {
        "messages": [],
        "workflow_id": str(uuid.uuid4()),
        "vehicle_id": vehicle_id,
        "requested_by": "test-user-01",
        "status": "planning",
        "plan": [],
        "current_step": 0,
        "vehicle_profile": {},
        "history_summary": {},
        "fraud_flags": [],
        "valuation": {},
        "validation_result": {},
        "approval": {},
        "final_report": None,
        "error": None
    }

print("\n--- TEST 1: Golden Path ---")
output_state = graph.invoke(create_initial_state(test_vehicle_id))
print("Status:", output_state.get("status"))
print("Plan:", output_state.get("plan"))
print("Profile:", output_state.get("vehicle_profile"))
print("Error:", output_state.get("error"))

print("\n--- TEST 2: Invalid Vehicle ID (Safe Failure) ---")
fail_output = graph.invoke(create_initial_state("00000000-0000-0000-0000-000000000000"))
print("Status:", fail_output.get("status"))
print("Error:", fail_output.get("error"))