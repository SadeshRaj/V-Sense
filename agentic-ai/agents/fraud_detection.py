from state.schema import WorkflowState
from state.persistence import save_workflow_state
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
import os

def agent_3_fraud_detection(state: WorkflowState) -> dict:
    if state.get("status") == "failed": return state

    state["current_step"] = 3
    state["status"] = "checking_fraud"
    save_workflow_state(state)

    history_summary = state.get("history_summary", {})
    mileage_timeline = history_summary.get("mileage_timeline", [])
    service_records = history_summary.get("service_records", [])

    @tool
    def check_mileage(vehicle_id: str) -> list:
        """Deterministic tool to check for odometer rollbacks and same-date anomalies."""
        flags = []
        max_mileage_seen = -1
        date_to_mileages = {}

        for entry in mileage_timeline:
            current_mileage = entry.get("mileage", 0)
            date_str = entry.get("date", "")

            # 1. Rollback check
            if current_mileage < max_mileage_seen:
                flags.append({"type": "odometer_rollback", "detail": f"Mileage dropped to {current_mileage}.", "severity": "high"})
            else:
                max_mileage_seen = max(max_mileage_seen, current_mileage)

            # 2. Same-date anomaly tracking
            if date_str:
                if date_str not in date_to_mileages:
                    date_to_mileages[date_str] = []
                date_to_mileages[date_str].append(current_mileage)

        # Evaluate date anomalies
        for date_str, mileages in date_to_mileages.items():
            if len(mileages) > 1:
                mileage_diff = max(mileages) - min(mileages)
                if mileage_diff > 0:
                    flags.append({
                        "type": "date_anomaly",
                        "detail": f"Impossible usage: {mileage_diff}km gap logged on the exact same day ({date_str}).",
                        "severity": "high"
                    })

        return flags

    @tool
    def check_records(vehicle_id: str) -> list:
        """Deterministic tool to flag unverified garages and duplicate records."""
        flags = []
        seen_records = set()
        for record in service_records:
            is_verified = record.get("garage_verified", False)
            record_hash = f"{record.get('garage_id')}_{record.get('date')}_{record.get('type')}"
            if not is_verified:
                flags.append({"type": "unverified_garage", "detail": "Unverified garage.", "severity": "medium"})
            if record_hash in seen_records:
                flags.append({"type": "duplicate_record", "detail": "Duplicate entry.", "severity": "low"})
            else:
                seen_records.add(record_hash)
        return flags

    model_name = os.getenv("CHAT_MODEL", "gemini-3.5-flash-lite")
    llm = ChatGoogleGenerativeAI(model=model_name)
    llm_with_tools = llm.bind_tools([check_mileage, check_records])

    prompt = f"You are the Fraud Detection Agent. Run fraud checks for vehicle_id: {state['vehicle_id']} by calling BOTH tools."
    response = llm_with_tools.invoke([HumanMessage(content=prompt)])

    all_flags = []
    if response.tool_calls:
        for tool_call in response.tool_calls:
            if tool_call["name"] == "check_mileage":
                all_flags.extend(check_mileage.invoke(tool_call["args"]))
            elif tool_call["name"] == "check_records":
                all_flags.extend(check_records.invoke(tool_call["args"]))

    risk_score = 0.0
    for flag in all_flags:
        if flag["severity"] == "high": risk_score += 0.5
        elif flag["severity"] == "medium": risk_score += 0.2
        elif flag["severity"] == "low": risk_score += 0.1

    state["fraud_flags"] = all_flags
    state["risk_score"] = min(risk_score, 1.0)
    state["status"] = "validating"
    save_workflow_state(state)
    return state