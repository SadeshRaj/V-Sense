import pytest
from unittest.mock import MagicMock, patch
from tools.fraud_detection import check_mileage_consistency, check_record_consistency
from tools.vehicle_data import get_vehicle_profile
from tools.vehicle_history import get_vehicle_history
from state.persistence import save_workflow_state
from state.schema import WorkflowState
from agents.coordinator import agent_1_coordinator
from agents.history_analysis import agent_2_history_analysis
from agents.fraud_detection import agent_3_fraud_detection
from agents.valuation_validation import agent_4_validation
from pydantic import TypeAdapter, ValidationError


# ============================================================
# ORIGINAL TESTS
# ============================================================

def test_tc_ai_01_odometer_fraud_check_normal():
    """TC_AI_01: Odometer sequence is valid, expect no flags."""
    mileage_timeline = [
        {"date": "2024-01-01", "mileage": 10000},
        {"date": "2025-01-01", "mileage": 15000}
    ]

    flags = check_mileage_consistency.invoke({
        "mileage_timeline": mileage_timeline
    })

    assert len(flags) == 0


def test_tc_ai_02_odometer_rollback_failure():
    """TC_AI_02: Detect mileage drop and assign high severity risk."""
    mileage_timeline = [
        {"date": "2024-01-01", "mileage": 50000},
        {"date": "2025-01-01", "mileage": 30000}
    ]

    flags = check_mileage_consistency.invoke({
        "mileage_timeline": mileage_timeline
    })

    assert len(flags) == 1
    assert flags[0]["type"] == "odometer_rollback"
    assert flags[0]["severity"] == "high"
    assert "dropped to 30000" in flags[0]["detail"]


def test_tc_ai_03_garage_verification_edge():
    """TC_AI_03: Unverified garage records should trigger medium severity flags."""
    service_records = [
        {
            "garage_id": "G001",
            "garage_verified": False,
            "date": "2025-05-05",
            "type": "Full Service"
        }
    ]

    flags = check_record_consistency.invoke({
        "service_records": service_records
    })

    assert len(flags) == 1
    assert flags[0]["type"] == "unverified_garage"
    assert flags[0]["severity"] == "medium"


def test_tc_ai_04_duplicate_service_boundary():
    """TC_AI_04: Identical records on the same day hash to a duplicate flag."""
    service_records = [
        {
            "garage_id": "G001",
            "garage_verified": True,
            "date": "2025-05-05",
            "type": "Full Service"
        },
        {
            "garage_id": "G001",
            "garage_verified": True,
            "date": "2025-05-05",
            "type": "Full Service"
        }
    ]

    flags = check_record_consistency.invoke({
        "service_records": service_records
    })

    assert len(flags) == 1
    assert flags[0]["type"] == "duplicate_record"
    assert flags[0]["severity"] == "low"


def test_tc_ai_05_ownership_sorting(mocker):
    """TC_AI_05: Verify Supabase database extraction and descending date sorting using mock chaining."""
    mock_supabase = MagicMock()
    mock_table = MagicMock()
    mock_select = MagicMock()
    mock_eq = MagicMock()
    mock_execute = MagicMock()

    mock_supabase.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq
    mock_eq.execute.return_value = mock_execute

    mock_execute.data = [
        {
            "OwnershipStartDate": "2020-01-01",
            "OwnershipEndDate": "2022-01-01",
            "OwnerName": "Alice"
        },
        {
            "OwnershipStartDate": "2022-01-01",
            "OwnershipEndDate": None,
            "OwnerName": "Bob"
        }
    ]

    mocker.patch(
        "tools.vehicle_data.get_supabase_client",
        return_value=mock_supabase
    )

    result = get_vehicle_profile.invoke({
        "vehicle_id": "V123"
    })

    assert result["current_owner"]["name"] == "Bob"
    assert len(result["ownership_history"]) == 1
    assert result["ownership_history"][0]["OwnerName"] == "Alice"


def test_tc_ai_06_state_persistence(mocker):
    """TC_AI_06: Verify JSON serialization and Supabase upsert of workflow state."""
    mock_supabase = MagicMock()
    mock_table = MagicMock()
    mock_upsert = MagicMock()

    mock_supabase.table.return_value = mock_table
    mock_table.upsert.return_value = mock_upsert
    mock_upsert.execute.return_value = True

    mocker.patch(
        "state.persistence.get_supabase_client",
        return_value=mock_supabase
    )

    dummy_state = {
        "workflow_id": "test-123",
        "status": "completed",
        "valuation": {
            "ai_insight": "Clean"
        },
        "fraud_flags": [
            {
                "type": "duplicate"
            }
        ],
        "history_summary": {
            "total": 1
        },
        "vehicle_id": "V1",
        "requested_by": "Admin"
    }

    result = save_workflow_state(dummy_state)

    assert result is True
    mock_supabase.table.assert_called_with("AIWorkflows")
    mock_upsert.execute.assert_called_once()


# ============================================================
# HELPER
# ============================================================

def get_base_state() -> dict:
    return {
        "messages": [],
        "workflow_id": "wf-123",
        "vehicle_id": "V-123",
        "requested_by": "user-1",
        "status": "init",
        "plan": [],
        "current_step": 0,
        "vehicle_profile": {},
        "history_summary": {},
        "fraud_flags": [],
        "risk_score": 0.0,
        "valuation": {},
        "validation_result": {},
        "approval": {},
        "final_report": None,
        "error": None
    }


# ============================================================
# AGENT 1 - COORDINATOR
# ============================================================

@patch("agents.coordinator.ChatGoogleGenerativeAI")
@patch("agents.coordinator.get_vehicle_profile")
@patch("agents.coordinator.safe_llm_invoke")
@patch("agents.coordinator.save_workflow_state")
def test_agent_1_coordinator_success(
    mock_save,
    mock_llm_invoke,
    mock_tool,
    mock_chat_model
):
    """
    Test Agent 1 Coordinator successful vehicle profile retrieval.
    """

    state = get_base_state()

    mock_tool.invoke.return_value = {
        "make": "Toyota",
        "model": "Corolla",
        "police_records": []
    }

    mock_llm = MagicMock()
    mock_llm_response = MagicMock()
    mock_llm_response.tool_calls = [{"args": {"vehicle_id": "V-123"}}]
    mock_llm_invoke.return_value = mock_llm_response

    mock_llm_with_tools = MagicMock()
    mock_chat_model.return_value = mock_llm
    mock_llm.bind_tools.return_value = mock_llm_with_tools

    new_state = agent_1_coordinator(state)

    assert new_state["status"] == "analyzing_history"
    assert new_state["vehicle_profile"]["make"] == "Toyota"
    assert new_state["vehicle_profile"]["model"] == "Corolla"

    mock_chat_model.assert_called_once()
    mock_llm.bind_tools.assert_called_once_with([mock_tool])
    mock_llm_invoke.assert_called_once()
    mock_tool.invoke.assert_called_once_with({"vehicle_id": "V-123"})
    mock_save.assert_called()


# ============================================================
# AGENT 2 - HISTORY ANALYSIS
# ============================================================

@patch("agents.history_analysis.ChatGoogleGenerativeAI")
@patch("agents.history_analysis.get_vehicle_history")
@patch("agents.history_analysis.save_workflow_state")
def test_agent_2_history_analysis_success(
    mock_save,
    mock_tool,
    mock_chat_model
):
    """Test Agent 2 successfully analyzes vehicle history."""

    state = get_base_state()

    mock_llm = MagicMock()
    mock_chat_model.return_value = mock_llm

    mock_llm_with_tools = MagicMock()
    mock_llm.bind_tools.return_value = mock_llm_with_tools

    mock_llm_response = MagicMock()
    mock_llm_response.tool_calls = [{"args": {"vehicle_id": "V-123"}}]
    mock_llm_with_tools.invoke.return_value = mock_llm_response

    mock_tool.invoke.return_value = {"total_records": 3, "service_records": []}

    new_state = agent_2_history_analysis(state)

    assert new_state["status"] == "checking_fraud"
    assert new_state["history_summary"]["total_records"] == 3
    mock_save.assert_called()


# ============================================================
# AGENT 3 - FRAUD DETECTION
# ============================================================

@patch("agents.fraud_detection.ChatGoogleGenerativeAI")
@patch("agents.fraud_detection.save_workflow_state")
def test_agent_3_fraud_detection_success(
    mock_save,
    mock_chat_model
):
    """Test Agent 3 successfully executes fraud detection and updates risk score."""
    state = get_base_state()

    mock_llm = MagicMock()
    mock_chat_model.return_value = mock_llm

    mock_llm_with_tools = MagicMock()
    mock_llm.bind_tools.return_value = mock_llm_with_tools

    mock_response = MagicMock()
    mock_response.tool_calls = [{"args": {"vehicle_id": "V-123"}}]
    mock_llm_with_tools.invoke.return_value = mock_response

    new_state = agent_3_fraud_detection(state)

    assert new_state["status"] == "validating"
    assert "risk_score" in new_state
    assert isinstance(new_state["fraud_flags"], list)

    mock_chat_model.assert_called_once()
    mock_save.assert_called()

def test_agent_3_fraud_detection_early_exit():
    """Cover the early return when workflow status is already 'failed'."""
    state = get_base_state()
    state["status"] = "failed"
    new_state = agent_3_fraud_detection(state)
    assert new_state["status"] == "failed"

@patch("agents.fraud_detection.ChatGoogleGenerativeAI")
@patch("agents.fraud_detection.save_workflow_state")
def test_agent_3_fraud_detection_comprehensive_anomalies(mock_save, mock_chat_model):
    """Cover all missing statements in the nested audit_vehicle_history tool."""
    state = get_base_state()
    state["vehicle_id"] = "V-123"

    # Inject data to trigger ALL fraud branches simultaneously
    state["vehicle_profile"] = {
        "police_records": [
            {"IncidentType": "Stolen", "Severity": "Critical", "IncidentDate": "2023-01-01"},
            {"IncidentType": "Accident", "Severity": "Minor", "IncidentDate": "2022-01-01", "PoliceStation": "Central"}
        ],
        "ownership_history": [1, 2, 3, 4] # >3 triggers ownership anomaly
    }
    state["history_summary"] = {
        "mileage_timeline": [
            {"date": "2023-01-01T10:00:00", "mileage": 10000},
            {"date": "2023-01-01T11:00:00", "mileage": 10600}, # Same day jump > 500
            {"date": "2023-01-02T10:00:00", "mileage": 5000}   # Odometer rollback
        ],
        "service_records": [
            {"garage_id": "G1", "date": "2023-01-01", "type": "Service", "garage_verified": False},
            {"garage_id": "G1", "date": "2023-01-01", "type": "Service", "garage_verified": False} # Duplicate record
        ]
    }

    # Mock the LLM to trigger the nested audit_vehicle_history tool
    mock_llm = MagicMock()
    mock_chat_model.return_value = mock_llm
    mock_llm_with_tools = MagicMock()
    mock_llm.bind_tools.return_value = mock_llm_with_tools

    mock_response = MagicMock()
    mock_response.tool_calls = [{"args": {"vehicle_id": "V-123"}}]
    mock_llm_with_tools.invoke.return_value = mock_response

    new_state = agent_3_fraud_detection(state)

    # Assertions to ensure all branches executed properly
    assert new_state["risk_score"] == 1.0 # Maxed out at 1.0 due to Stolen record flag

    flag_types = [f["type"] for f in new_state["fraud_flags"]]
    assert "police_alert" in flag_types
    assert "police_record" in flag_types
    assert "odometer_rollback" in flag_types
    assert "date_anomaly" in flag_types
    assert "unverified_garage" in flag_types
    assert "duplicate_record" in flag_types
    assert "ownership_anomaly" in flag_types


# ============================================================
# AGENT 4 - VALIDATION
# ============================================================

@patch("agents.valuation_validation.ChatGoogleGenerativeAI")
@patch("agents.valuation_validation.save_workflow_state")
def test_agent_4_validation_auto_approval(
    mock_save,
    mock_chat_model
):
    """Test Agent 4 automatically approves a clean vehicle."""

    state = get_base_state()
    state["risk_score"] = 0.0
    state["fraud_flags"] = []

    mock_llm = MagicMock()
    mock_chat_model.return_value = mock_llm

    mock_llm_with_tools = MagicMock()
    mock_llm.bind_tools.return_value = mock_llm_with_tools

    mock_response = MagicMock()
    mock_response.tool_calls = [{"args": {"ai_insight": "- Perfect condition"}}]
    mock_llm_with_tools.invoke.return_value = mock_response

    new_state = agent_4_validation(state)

    assert new_state["validation_result"]["passed"] is True
    assert new_state["validation_result"]["requires_approval"] is False
    assert new_state["status"] == "completed"


@patch("agents.valuation_validation.ChatGoogleGenerativeAI")
@patch("agents.valuation_validation.save_workflow_state")
def test_agent_4_validation_hitl_confidence_threshold(
    mock_save,
    mock_chat_model
):
    """Test Agent 4 sends risky vehicles for manual approval."""

    state = get_base_state()
    state["risk_score"] = 0.25
    state["fraud_flags"] = [{"type": "unverified_garage"}]

    mock_llm = MagicMock()
    mock_chat_model.return_value = mock_llm

    mock_llm_with_tools = MagicMock()
    mock_llm.bind_tools.return_value = mock_llm_with_tools

    mock_response = MagicMock()
    mock_response.tool_calls = [{"args": {"ai_insight": "- Suspicious flags found"}}]
    mock_llm_with_tools.invoke.return_value = mock_response

    new_state = agent_4_validation(state)

    assert new_state["validation_result"]["passed"] is False
    assert new_state["validation_result"]["requires_approval"] is True
    assert new_state["status"] == "pending_approval"
    assert new_state["approval"]["required"] is True


# ============================================================
# PYDANTIC SCHEMA VALIDATION
# ============================================================

def test_pydantic_schema_validation_strict_enforcement():
    """Verify WorkflowState accepts valid data and rejects invalid data."""

    adapter = TypeAdapter(WorkflowState)
    valid_data = get_base_state()

    try:
        adapter.validate_python(valid_data)
    except ValidationError:
        pytest.fail("Valid state failed Pydantic schema validation.")

    invalid_data = get_base_state()
    invalid_data["current_step"] = "Not-an-integer"

    with pytest.raises(ValidationError):
        adapter.validate_python(invalid_data)


# ============================================================
# TOOLS - VEHICLE HISTORY
# ============================================================

def test_vehicle_history_missing_id():
    """Cover validation failure when vehicle_id is missing."""
    result = get_vehicle_history.invoke({"vehicle_id": ""})
    assert "Validation failed" in result["error"]

@patch("tools.vehicle_history.get_supabase_client")
def test_vehicle_history_empty_records(mock_supabase):
    """Cover DB returning no service records."""
    mock_execute = MagicMock()
    mock_execute.data = []
    mock_supabase.return_value.table.return_value.select.return_value.eq.return_value.execute = MagicMock(return_value=mock_execute)

    result = get_vehicle_history.invoke({"vehicle_id": "V-123"})
    assert result["total_records"] == 0
    assert result["service_records"] == []

@patch("tools.vehicle_history.get_supabase_client")
def test_vehicle_history_with_data_and_unverified_garage(mock_supabase):
    """Cover full timeline mapping, sorting, and garage verification logic."""
    mock_client = MagicMock()
    mock_supabase.return_value = mock_client

    # Mock ServiceRecords table response
    mock_records = MagicMock()
    mock_records.data = [
        {"CreatedAt": "2023-01-02", "OdometerReading": 15000, "GarageId": "G1", "Title": "Oil Change", "PhotoUrls": "url1,url2"},
        {"CreatedAt": "2023-01-01", "OdometerReading": 10000, "GarageId": "G2", "Title": "Tires", "PhotoUrls": ""}
    ]

    # Mock Organizations table response (G1 is Active, G2 is Inactive)
    mock_orgs = MagicMock()
    mock_orgs.data = [
        {"id": "G1", "Status": "Active"},
        {"id": "G2", "Status": "Inactive"}
    ]

    # Side effect to return different data based on the Supabase table name queried
    def table_side_effect(table_name):
        mock_table = MagicMock()
        if table_name == "ServiceRecords":
            mock_table.select.return_value.eq.return_value.execute.return_value = mock_records
        elif table_name == "Organizations":
            mock_table.select.return_value.in_.return_value.execute.return_value = mock_orgs
        return mock_table

    mock_client.table.side_effect = table_side_effect

    result = get_vehicle_history.invoke({"vehicle_id": "V-123"})

    assert result["total_records"] == 2
    # Verify chronological sorting (2023-01-01 should be moved to index 0)
    assert result["service_records"][0]["date"] == "2023-01-01"
    # G2 was Inactive
    assert result["service_records"][0]["garage_verified"] is False
    # G1 was Active
    assert result["service_records"][1]["garage_verified"] is True
    # Verify image string splitting
    assert len(result["service_records"][0]["images"]) == 0
    assert len(result["service_records"][1]["images"]) == 2

@patch("tools.vehicle_history.get_supabase_client")
def test_vehicle_history_db_exception(mock_supabase):
    """Cover DB execution failure branch."""
    mock_supabase.return_value.table.side_effect = Exception("Connection lost")
    result = get_vehicle_history.invoke({"vehicle_id": "V-123"})
    assert "Database execution failure: Connection lost" in result["error"]