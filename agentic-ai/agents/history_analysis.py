from state.schema import WorkflowState
from state.persistence import save_workflow_state
from tools.vehicle_history import get_vehicle_history
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
import os

def agent_2_history_analysis(state: WorkflowState) -> dict:
    state["current_step"] = 2
    state["status"] = "analyzing_history"
    save_workflow_state(state)

    model_name = os.getenv("CHAT_MODEL", "gemini-3.5-flash-lite")
    llm = ChatGoogleGenerativeAI(model=model_name)
    llm_with_tools = llm.bind_tools([get_vehicle_history])

    prompt = f"Analyze the service history for vehicle_id: {state['vehicle_id']}. Use the provided tool."
    response = llm_with_tools.invoke([HumanMessage(content=prompt)])

    # Bulletproof fallback
    args = {"vehicle_id": state["vehicle_id"]}
    if response.tool_calls:
        tool_call = response.tool_calls[0]
        if tool_call.get("args") and tool_call["args"].get("vehicle_id"):
            args["vehicle_id"] = tool_call["args"]["vehicle_id"]

    tool_result = get_vehicle_history.invoke(args)

    if "error" in tool_result:
        state["status"] = "failed"
        state["error"] = tool_result["error"]
    else:
        state["history_summary"] = tool_result
        state["status"] = "checking_fraud"

    save_workflow_state(state)
    return state