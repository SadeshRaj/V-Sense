from state.schema import WorkflowState
from state.persistence import save_workflow_state
from tools.vehicle_history import get_vehicle_history
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
import os

def agent_2_history_analysis(state: WorkflowState) -> dict:
    """
    LangGraph node for Agent 2. Pulls repair/service history and
    builds the structured timeline.
    """
    state["current_step"] = 2
    state["status"] = "analyzing_history"
    save_workflow_state(state)

    model_name = os.getenv("CHAT_MODEL", "gemini-3.5-flash-lite")
    llm = ChatGoogleGenerativeAI(model=model_name)

    # Bind only the specific tool Agent 2 is allowed to use
    llm_with_tools = llm.bind_tools([get_vehicle_history])

    prompt = f"Analyze the service history for vehicle_id: {state['vehicle_id']}. Use the provided tool."
    response = llm_with_tools.invoke([HumanMessage(content=prompt)])

    if response.tool_calls:
        tool_call = response.tool_calls[0]
        if tool_call["name"] == "get_vehicle_history":
            tool_result = get_vehicle_history.invoke(tool_call["args"])

            if "error" in tool_result:
                state["status"] = "failed"
                state["error"] = tool_result["error"]
            else:
                state["history_summary"] = tool_result
                state["status"] = "checking_fraud"
    else:
        state["status"] = "failed"
        state["error"] = "Agent 2 failed to determine the required tool call."

    save_workflow_state(state)
    return state