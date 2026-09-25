from state.schema import WorkflowState
from state.persistence import save_workflow_state
from tools.vehicle_data import get_vehicle_profile
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
import os
from tenacity import retry, stop_after_attempt, wait_fixed

@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
def safe_llm_invoke(llm_with_tools, prompt_text):
    return llm_with_tools.invoke([HumanMessage(content=prompt_text)])

def agent_1_coordinator(state: WorkflowState) -> dict:
    plan = ["fetch_vehicle_data", "analyze_history", "detect_fraud", "validate_and_finalize"]
    state["plan"] = plan
    state["current_step"] = 1
    state["status"] = "planning"
    save_workflow_state(state)

    model_name = os.getenv("CHAT_MODEL", "gemini-3.5-flash-lite")
    llm = ChatGoogleGenerativeAI(model=model_name)
    llm_with_tools = llm.bind_tools([get_vehicle_profile])

    prompt = f"Fetch the vehicle profile for vehicle_id: {state['vehicle_id']}. Use the provided tool."

    try:
        response = safe_llm_invoke(llm_with_tools, prompt)
    except Exception as e:
        state["status"] = "failed"
        state["error"] = f"AI API connection failed: {str(e)}"
        save_workflow_state(state)
        return state

    # Bulletproof fallback: manually inject args if LLM hallucinates or drops the tool
    args = {"vehicle_id": state["vehicle_id"]}
    if response.tool_calls:
        tool_call = response.tool_calls[0]
        if tool_call.get("args") and tool_call["args"].get("vehicle_id"):
            args["vehicle_id"] = tool_call["args"]["vehicle_id"]

    tool_result = get_vehicle_profile.invoke(args)

    if "error" in tool_result:
        state["status"] = "failed"
        state["error"] = tool_result["error"]
    else:
        state["vehicle_profile"] = tool_result
        state["status"] = "analyzing_history"

    save_workflow_state(state)
    return state