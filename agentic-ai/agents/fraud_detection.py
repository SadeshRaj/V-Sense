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
    vehicle_profile = state.get("vehicle_profile", {})
    ownership_history = vehicle_profile.get("ownership_history", [])
    police_records = vehicle_profile.get("police_records", []) # Pull in police data

    @tool
    def audit_vehicle_history(vehicle_id: str) -> list:
        """Single deterministic tool to run ALL fraud checks (mileage, records, ownership, police)."""
        flags = []
        max_mileage_seen = -1
        date_to_mileages = {}

        # 1. Police & Accident Flags (Highest Priority)
        for record in police_records:
            severity = record.get("Severity", "Minor")
            i_type = record.get("IncidentType", "Incident")
            # Automatically flag Stolen or Critical accidents as highest severity
            if i_type.lower() == "stolen" or severity.lower() == "critical":
                flags.append({
                    "type": "police_alert",
                    "detail": f"CRITICAL: Vehicle reported {i_type} on {record.get('IncidentDate')}. {record.get('Description', '')}",
                    "severity": "high"
                })
            else:
                flags.append({
                    "type": "police_record",
                    "detail": f"{severity} {i_type} logged on {record.get('IncidentDate')}. Station: {record.get('PoliceStation')}",
                    "severity": "medium"
                })

        # 2. Mileage & Date Checks
        for entry in mileage_timeline:
            current_mileage = entry.get("mileage", 0)
            date_str = entry.get("date", "")
            calendar_date = str(date_str)[:10] if date_str else ""

            if current_mileage < max_mileage_seen:
                flags.append({"type": "odometer_rollback", "detail": f"Mileage dropped to {current_mileage}.", "severity": "high"})
            else:
                max_mileage_seen = max(max_mileage_seen, current_mileage)

            if calendar_date:
                if calendar_date not in date_to_mileages:
                    date_to_mileages[calendar_date] = []
                date_to_mileages[calendar_date].append(current_mileage)

        for cal_date, mileages in date_to_mileages.items():
            if len(mileages) > 1:
                mileage_diff = max(mileages) - min(mileages)
                if mileage_diff > 500:
                    flags.append({
                        "type": "date_anomaly",
                        "detail": f"Impossible usage: A {mileage_diff}km jump was logged on the exact same day ({cal_date}).",
                        "severity": "high"
                    })

        # 3. Record Integrity Checks
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

        # 4. Ownership Checks
        if len(ownership_history) > 3:
            flags.append({
                "type": "ownership_anomaly",
                "detail": f"Vehicle has changed hands {len(ownership_history)} times, indicating potential issues.",
                "severity": "medium"
            })
        return flags

    model_name = os.getenv("CHAT_MODEL", "gemini-3.5-flash-lite")
    llm = ChatGoogleGenerativeAI(model=model_name)
    llm_with_tools = llm.bind_tools([audit_vehicle_history])

    prompt = f"You are the Fraud Detection Agent. Run the full fraud audit for vehicle_id: {state['vehicle_id']}."
    response = llm_with_tools.invoke([HumanMessage(content=prompt)])

    args = {"vehicle_id": state["vehicle_id"]}
    if response.tool_calls:
        tool_call = response.tool_calls[0]
        if tool_call.get("args") and tool_call["args"].get("vehicle_id"):
            args["vehicle_id"] = tool_call["args"]["vehicle_id"]

    all_flags = audit_vehicle_history.invoke(args)

    risk_score = 0.0
    has_police_critical = False

    for flag in all_flags:
        if flag["severity"] == "high":
            risk_score += 0.5
        elif flag["severity"] == "medium":
            risk_score += 0.2
        elif flag["severity"] == "low":
            risk_score += 0.1

        if flag["type"] == "police_alert":
            has_police_critical = True

    # Immediate max risk if a critical police or stolen record exists
    if has_police_critical:
        risk_score = 1.0

    state["fraud_flags"] = all_flags
    state["risk_score"] = min(risk_score, 1.0)
    state["status"] = "validating"
    save_workflow_state(state)
    return state