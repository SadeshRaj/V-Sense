from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from langgraph.graph import StateGraph, START, END
from state.schema import WorkflowState
from agents.coordinator import agent_1_coordinator
from agents.history_analysis import agent_2_history_analysis
from agents.fraud_detection import agent_3_fraud_detection
from agents.valuation_validation import agent_4_validation
from dotenv import load_dotenv
import uuid

load_dotenv()

app = FastAPI()

class ReportRequest(BaseModel):
    vehicle_id: str
    requested_by: str

workflow_builder = StateGraph(WorkflowState)
workflow_builder.add_node("coordinator", agent_1_coordinator)
workflow_builder.add_node("history_analysis", agent_2_history_analysis)
workflow_builder.add_node("fraud_detection", agent_3_fraud_detection)
workflow_builder.add_node("validation", agent_4_validation)

workflow_builder.add_edge(START, "coordinator")
workflow_builder.add_edge("coordinator", "history_analysis")
workflow_builder.add_edge("history_analysis", "fraud_detection")
workflow_builder.add_edge("fraud_detection", "validation")
workflow_builder.add_edge("validation", END)

graph = workflow_builder.compile()

@app.post("/api/workflows/start")
def start_workflow(req: ReportRequest, background_tasks: BackgroundTasks):
    workflow_id = str(uuid.uuid4())
    initial_state = {
        "messages": [],
        "workflow_id": workflow_id,
        "vehicle_id": req.vehicle_id,
        "requested_by": req.requested_by,
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
    final_state = graph.invoke(initial_state)
    return {
        "workflow_id": workflow_id,
        "status": "completed",
        "current_state": final_state.get("status"),
        "approval_required": final_state.get("approval", {}).get("required", False)
    }