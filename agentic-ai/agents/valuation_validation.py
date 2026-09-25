from state.schema import WorkflowState
from state.persistence import save_workflow_state
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
import os
from datetime import datetime, timezone

def agent_4_validation(state: WorkflowState) -> dict:
    state["current_step"] = 4

    vehicle_profile = state.get("vehicle_profile", {})
    history_summary = state.get("history_summary", {})
    fraud_flags = state.get("fraud_flags", [])
    risk_score = state.get("risk_score", 0.0)

    @tool
    def calculate_valuation(ai_insight: str) -> dict:
        """
        Rule-based tool to estimate vehicle condition.
        You MUST provide a highly detailed 'ai_insight' formatted ONLY as a BULLETED LIST (using '- ' for each point).
        CRITICAL RULES FOR AI_INSIGHT:
        1. Overall Condition Assessment based on service frequency, mileage, and fraud flags.
        2. Deep Service History Analysis: explicitly quote and evaluate the 'description' field of service records to see what actual work was done.
        3. Future Predictions (e.g., 'Approaching major timing belt service').
        4. Anomaly Detection: You MUST point out suspicious, lazy, or nonsense text in the descriptions (e.g., 'test test test') and address the same-day mileage jumps if flagged.
        5. Legal & Ownership Evaluation.
        6. Final Buyer Recommendation.
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

    model_name = os.getenv("CHAT_MODEL", "gemini-3.5-flash-lite")
    llm = ChatGoogleGenerativeAI(model=model_name)
    llm_with_tools = llm.bind_tools([calculate_valuation])

    prompt = f"""
        You are the Valuation & Validation Agent, an expert vehicle appraiser and data analyst.
        Review this service history carefully: {history_summary}
        Review these detected fraud flags: {fraud_flags}
        Review the legal status and ownership history: {vehicle_profile.get('legal_status')}, {vehicle_profile.get('ownership_history')}

        Generate the detailed 'ai_insight' covering BOTH mechanical and legal status.
        Pay extreme attention to the 'description' field of the service records. Call out any suspicious or nonsensical descriptions.
        """

    response = llm_with_tools.invoke([HumanMessage(content=prompt)])

    valuation_result = {}

    if response.tool_calls:
        tool_call = response.tool_calls[0]
        args = tool_call.get("args", {})
        ai_insight_text = args.get("ai_insight", "- Report generated with standard condition metrics.")
        valuation_result = calculate_valuation.invoke({"ai_insight": ai_insight_text})
    else:
        valuation_result = calculate_valuation.invoke({"ai_insight": "- AI insight generation failed. Defaulting to baseline mechanical metrics."})

    validation_result = {
        "passed": False,
        "requires_approval": True,
        "reason": "All V-Sense certificate generations require manual admin verification."
    }

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