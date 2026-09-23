import os
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
        # Extract the ai_insight safely if it exists
        ai_insight = state.get("valuation", {}).get("ai_insight", "")

        supabase.table("AIWorkflows").upsert({
            "id": state["workflow_id"],
            "Status": state["status"],
            "ai_insight": ai_insight
        }).execute()
        return True
    except Exception as e:
        print(f"[Persistence Error] Failed to write state for {state.get('workflow_id')}: {e}")
        return False