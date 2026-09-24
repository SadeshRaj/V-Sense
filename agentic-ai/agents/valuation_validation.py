from state.schema import WorkflowState
from state.persistence import save_workflow_state
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
import os
from datetime import datetime, timezone

def agent_4_validation(state: WorkflowState) -> dict:
    """
    LangGraph node for Agent 4. Computes condition, applies business rules,
    and forwards every report for mandatory admin approval.
    """
    state["current_step"] = 4

    vehicle_profile = state.get("vehicle_profile", {})
    history_summary = state.get("history_summary", {})
    fraud_flags = state.get("fraud_flags", [])
    risk_score = state.get("risk_score", 0.0)

    @tool
    def calculate_valuation(vehicle_id: str, ai_insight: str) -> dict:
        """
        Rule-based tool to estimate vehicle condition.
        You MUST provide a highly detailed 'ai_insight' formatted ONLY as a BULLETED LIST (using '- ' for each point).
        CRITICAL RULES FOR AI_INSIGHT (Make it highly valuable for a potential buyer):
        1. Overall Condition Assessment: State the overall condition based on service frequency, mileage, and fraud flags.
        2. Deep Service History Analysis: Summarize repair patterns, check for consistent mileage increments, and explicitly cite evidence from the history descriptions.
        3. Future Predictions: Predict future maintenance (e.g., 'Approaching major timing belt service at 75k km') based on the current mileage.
        4. Anomaly Detection: Point out ANY suspicious anomalies (e.g., 'Rapid succession of service records on the same day' or 'Nonsense descriptions').
        5. Legal & Ownership Evaluation: Evaluate the Insurance Status (Active/Expired) and Ownership stability (e.g., frequency of transfers).
        6. Final Buyer Recommendation based on the combined mechanical and legal evidence.
        Output must be 5 to 7 detailed bullet points.
        """
        mileage = 0
        if history_summary.get("mileage_timeline"):
            mileage = history_summary["mileage_timeline"][-1].get("mileage", 0)

        condition = "Good"
        if mileage > 100000 or risk_score > 0:
            condition = "Fair"
        if risk_score >= 0.5:
            condition = "Poor"

        return {
            "estimated_condition": condition,
            "ai_insight": ai_insight,
            "note": f"Evaluated based on {mileage} km and risk score {risk_score}"
        }

    @tool
    def validate_report(vehicle_id: str) -> dict:
        """Deterministic business rule checker requiring human approval for all certificates."""
        return {
            "passed": False,
            "requires_approval": True,
            "reason": "All V-Sense certificate generations require manual admin verification."
        }

    model_name = os.getenv("CHAT_MODEL", "gemini-3.5-flash-lite")
    llm = ChatGoogleGenerativeAI(model=model_name)
    llm_with_tools = llm.bind_tools([calculate_valuation, validate_report])

    prompt = f"""
        You are the Valuation & Validation Agent, an expert vehicle appraiser and data analyst.
        Your goal is to provide a highly valuable, detailed analysis for a potential buyer looking at vehicle_id: {state['vehicle_id']}.

        Review this service history carefully: {history_summary}
        Review these detected fraud flags: {fraud_flags}
        Review the legal status and ownership history: {vehicle_profile.get('legal_status')}, {vehicle_profile.get('ownership_history')}

        You MUST call BOTH 'calculate_valuation' and 'validate_report'.
        Your 'ai_insight' MUST cover BOTH the mechanical service history (mileage jumps, repair consistency, maintenance predictions) AND the legal/ownership status. Do not ignore the mechanical service history records!
        """

    response = llm_with_tools.invoke([HumanMessage(content=prompt)])

    valuation_result = {}
    validation_result = {}

    if response.tool_calls:
        for tool_call in response.tool_calls:
            if tool_call["name"] == "calculate_valuation":
                valuation_result = calculate_valuation.invoke(tool_call["args"])
            elif tool_call["name"] == "validate_report":
                validation_result = validate_report.invoke(tool_call["args"])

    state["valuation"] = valuation_result
    state["validation_result"] = validation_result

    state["status"] = "pending_approval"
    state["approval"] = {
        "required": True,
        "status": "pending",
        "reviewed_by": None,
        "reviewed_at": None,
        "comment": None
    }

    state["final_report"] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "vehicle": vehicle_profile,
        "history": history_summary,
        "condition": valuation_result,
        "certified": False
    }

    save_workflow_state(state)
    return state