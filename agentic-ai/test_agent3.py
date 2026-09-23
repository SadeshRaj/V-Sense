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

print("\n--- TEST: Agent 1 -> Agent 2 -> Agent 3 ---")
output_state = graph.invoke(create_initial_state(test_vehicle_id))

print("\nFinal Status:", output_state.get("status"))
print("\n--- Agent 3 Output ---")
print("Fraud Flags:", output_state.get("fraud_flags"))
print("Risk Score:", output_state.get("risk_score"))
print("\nError (if any):", output_state.get("error"))