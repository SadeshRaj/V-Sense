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
        You MUST provide a comprehensive 'ai_insight' formatted ONLY as a BULLETED LIST (using '- ' for each point).
        CRITICAL RULES FOR AI_INSIGHT:
        You MUST provide EXACTLY 7 detailed bullet points in this specific order:

        1. Police & Accident History: Detail any police reports, theft/recovery incidents, accident records, or confirm a completely clean criminal/accident record.
        2. Legal & Ownership Evaluation: Detail registration date, license expiry, and insurance validity. SUMMARIZE the ownership history: state the total number of past owners. Name only the most recent 1 or 2 owners. If there is a high turnover (e.g., >3 owners in a short period), you MUST flag this as a potential concern.
        3. Overall Condition Assessment: High-level condition verdict based on mileage, service consistency, fraud flags, and police records.
        4. Deep Service History Analysis: SUMMARIZE the service history intelligently. Do NOT regurgitate every single record. Describe the general maintenance pattern, highlight the most recent major repair (e.g., collision damage or part replacements), but you MUST explicitly quote any suspicious/placeholder descriptions (like 'test test test') if they appear.
        5. Anomaly Detection: Detail all anomalies including same-day mileage spikes (e.g., 10,000 km logged on the same day), odometer rollbacks, and unverified/suspicious garage entries.
        6. Future Predictions: Predict upcoming maintenance milestones and mechanical risks (including ignition/electrical concerns if stolen, timing belts, fluid changes).
        7. Final Buyer Recommendation: Definitive recommendation (e.g., STRONGLY REJECT or PROCEED WITH CAUTION) with clear justification based on the combined evidence.
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
        You are the Valuation & Validation Agent, an expert vehicle appraiser and forensic data analyst.
        Review all data sources thoroughly:
        1. Service History & Descriptions: {history_summary}
        2. Detected Fraud & Mileage Anomalies: {fraud_flags}
        3. Legal & Registration Status: {vehicle_profile.get('legal_status')}
        4. Past Ownership History (names & dates): {vehicle_profile.get('ownership_history')}
        5. Police & Accident Records: {vehicle_profile.get('police_records')}

        Generate the 'ai_insight' adhering strictly to the 7 required bullet points.
        Intelligently summarize the ownership and service history so it is highly readable for a buyer. Do not write a massive block of raw data.
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