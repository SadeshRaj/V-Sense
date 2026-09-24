import os
import json
from datetime import datetime, timezone
from supabase import create_client, Client, ClientOptions
from state.schema import WorkflowState

def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_KEY", "")
    if not url or not key:
        raise ValueError("Supabase credentials not found in environment.")

    # Enforce a 10-second timeout to satisfy Section 0.3 of the spec
    opts = ClientOptions(postgrest_client_timeout=10)
    return create_client(url, key, options=opts)

def save_workflow_state(state: WorkflowState):
    """
    Persists the shared state object to Postgres after every step.
    """
    supabase = get_supabase_client()
    try:
        # Extract data safely
        ai_insight = state.get("valuation", {}).get("ai_insight", "")
        fraud_flags_json = json.dumps(state.get("fraud_flags", []))
        history_summary_json = json.dumps(state.get("history_summary", {}))

        supabase.table("AIWorkflows").upsert({
            "id": state["workflow_id"],
            "Status": state["status"],
            "ai_insight": ai_insight,
            "fraud_flags": fraud_flags_json,
            "history_summary": history_summary_json,
            "vehicle_id": state.get("vehicle_id"),
            "requested_by": state.get("requested_by"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()
        return True
    except Exception as e:
        print(f"[Persistence Error] Failed to write state for {state.get('workflow_id')}: {e}")
        return False