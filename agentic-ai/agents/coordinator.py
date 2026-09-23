from state.schema import WorkflowState
from state.persistence import save_workflow_state
from tools.vehicle_data import get_vehicle_profile
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
import os
from tenacity import retry, stop_after_attempt, wait_fixed

@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
def safe_llm_invoke(llm_with_tools, prompt_text):
    """Helper to invoke the LLM with automatic retries for transient network drops."""
    return llm_with_tools.invoke([HumanMessage(content=prompt_text)])

def agent_1_coordinator(state: WorkflowState) -> dict:
    """
    LangGraph node for Agent 1. Builds the plan, fetches data via LLM tool calling,
    and hands off to Agent 2.
    """
    plan = [
        "fetch_vehicle_data",
        "analyze_history",
        "detect_fraud",
        "validate_and_finalize"
    ]

    state["plan"] = plan
    state["current_step"] = 1
    state["status"] = "planning"
    save_workflow_state(state)

    # Safely get the model name, ensuring it never defaults to an empty string
    model_name = os.getenv("CHAT_MODEL")
    if not model_name:
        model_name = "gemini-3.5-flash-lite"

    # Removed 'timeout' to prevent the SDK payload crash.
    # Removed 'temperature' to prevent the warning.
    llm = ChatGoogleGenerativeAI(model=model_name)

    llm_with_tools = llm.bind_tools([get_vehicle_profile])

    prompt = f"Fetch the vehicle profile for vehicle_id: {state['vehicle_id']}. Use the provided tool."

    # Use the safe invoker with a try-except block to prevent ASGI server crashes
    try:
        response = safe_llm_invoke(llm_with_tools, prompt)
    except Exception as e:
        state["status"] = "failed"
        state["error"] = f"AI API connection failed after retries: {str(e)}"
        save_workflow_state(state)
        return state

    if response.tool_calls:
        tool_call = response.tool_calls[0]
        if tool_call["name"] == "get_vehicle_profile":
            tool_result = get_vehicle_profile.invoke(tool_call["args"])

            if "error" in tool_result:
                state["status"] = "failed"
                state["error"] = tool_result["error"]
            else:
                state["vehicle_profile"] = tool_result
                state["status"] = "analyzing_history"
    else:
        state["status"] = "failed"
        state["error"] = "Agent failed to determine the required tool call."

    save_workflow_state(state)
    return state