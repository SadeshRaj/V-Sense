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
        "risk_score": 0.0,
        "valuation": {},
        "validation_result": {},
        "approval": {},
        "final_report": None,
        "error": None
    }

print("\n--- TEST: FULL WORKFLOW (Agents 1 -> 2 -> 3 -> 4) ---")
output_state = graph.invoke(create_initial_state(test_vehicle_id))

print("\nFinal Status:", output_state.get("status"))
print("\n--- Agent 4 Output ---")
print("Validation Result:", output_state.get("validation_result"))
print("Valuation:", output_state.get("valuation"))
print("\nApproval Status:", output_state.get("approval"))

if output_state.get("status") == "completed":
    print("\n✅ Final Report Generated successfully.")
elif output_state.get("status") == "pending_approval":
    print("\n⚠️ Workflow Paused. Waiting for Admin Approval via C# / React.")