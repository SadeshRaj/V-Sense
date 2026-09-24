from typing import TypedDict, List, Optional, Dict, Any, Annotated
from langgraph.graph.message import add_messages

class VehicleProfile(TypedDict, total=False):
    vehicle_id: str
    make: str
    model: str
    year: int
    registration_no: str
    vin: str
    current_owner: Dict[str, Any]
    legal_status: Dict[str, Any]  # NEW
    ownership_history: List[Dict[str, Any]] # NEW

class WorkflowState(TypedDict):
    messages: Annotated[list, add_messages]
    workflow_id: str
    vehicle_id: str
    requested_by: str
    status: str
    plan: List[str]
    current_step: int
    vehicle_profile: VehicleProfile
    history_summary: Dict[str, Any]
    fraud_flags: List[Dict[str, Any]]
    risk_score: float
    valuation: Dict[str, Any]
    validation_result: Dict[str, Any]
    approval: Dict[str, Any]
    final_report: Optional[Dict[str, Any]]
    error: Optional[str]