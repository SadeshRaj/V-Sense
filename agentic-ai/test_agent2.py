import uuid
from dotenv import load_dotenv
from api.main import graph

load_dotenv()

# Use a vehicle ID that you know exists in your database AND has at least one service record
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

print("\n--- TEST: Agent 1 (Profile) -> Agent 2 (History) ---")
output_state = graph.invoke(create_initial_state(test_vehicle_id))

print("\nFinal Status:", output_state.get("status"))
print("\n--- Agent 1 Output ---")
print(output_state.get("vehicle_profile"))
print("\n--- Agent 2 Output ---")
print(output_state.get("history_summary"))
print("\nError (if any):", output_state.get("error"))