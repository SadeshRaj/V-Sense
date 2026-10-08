import pytest
import jwt
import time
from datetime import datetime, timezone

# Helper to forge test JWT tokens mimicking Program.cs configuration
JWT_SECRET = "super_secret_test_key_for_vsense_jwt_authentication_minimum_256_bits!"
JWT_ISSUER = "VSenseAuthServer"
JWT_AUDIENCE = "VSenseClients"

def generate_test_token(user_id: str, role: str, expired: bool = False) -> str:
    exp = int(time.time()) - 3600 if expired else int(time.time()) + 3600
    payload = {
        "sub": user_id,
        "nameid": user_id,
        "role": role,
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "exp": exp
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

class MockApiResponse:
    def __init__(self, status_code: int, json_data: dict = None):
        self.status_code = status_code
        self._json_data = json_data or {}

    def json(self):
        return self._json_data


# --- Simulated Controller Security Gateway Logic ---
def simulate_request_pipeline(endpoint: str, method: str, token: str = None, body: dict = None, db_state: dict = None):
    """
    Simulates ASP.NET Core Middleware: Authentication -> Authorization -> Controller Actions.
    Matches routing and authorization attributes in WorkflowsController.cs and Program.cs.
    """
    claims = {}
    if token:
        try:
            claims = jwt.decode(token, JWT_SECRET, algorithms=["HS256"], audience=JWT_AUDIENCE, issuer=JWT_ISSUER)
        except jwt.ExpiredSignatureError:
            return MockApiResponse(401, {"message": "Token expired"})
        except Exception:
            return MockApiResponse(401, {"message": "Invalid token"})

    # 1. GET /api/workflows/pending-approval -> [Authorize(Roles = "Administrator")]
    if endpoint == "/api/workflows/pending-approval" and method == "GET":
        if not claims:
            return MockApiResponse(401, {"message": "Unauthorized"})
        if claims.get("role") != "Administrator":
            return MockApiResponse(403, {"message": "Forbidden: Requires Administrator role"})
        return MockApiResponse(200, {"pending_workflows": []})

    # 2. POST /api/workflows/{id}/reject -> [Authorize(Roles = "Administrator")]
    if "/reject" in endpoint and method == "POST":
        if not claims:
            return MockApiResponse(401, {"message": "Unauthorized"})
        if claims.get("role") != "Administrator":
            return MockApiResponse(403, {"message": "Forbidden"})
        if not body or not body.get("Comment") or not str(body.get("Comment")).strip():
            return MockApiResponse(400, {"message": "A reason must be provided when rejecting a certificate."})
        return MockApiResponse(200, {"message": "Report rejected safely. User will be notified."})

    # 3. GET /api/workflows/verify/{workflowId} -> [AllowAnonymous]
    if "/verify/" in endpoint and method == "GET":
        wf_id = endpoint.split("/")[-1]
        wf = db_state.get(wf_id) if db_state else None
        if not wf or wf.get("Status") != "completed":
            return MockApiResponse(400, {"valid": False, "message": "Invalid, pending, or rejected certificate."})
        return MockApiResponse(200, {"valid": True, "workflowId": wf_id, "status": "completed"})

    # 4. GET /api/workflows/my-workflows/{vehicleId} -> [Authorize]
    if "/my-workflows/" in endpoint and method == "GET":
        if not claims:
            return MockApiResponse(401, {"message": "Unauthorized"})
        # Note: WorkflowsController currently does not verify if claims['sub'] owns the vehicle!
        return MockApiResponse(200, {"workflows": [], "vulnerable_leak": True})

    return MockApiResponse(404, {"message": "Not Found"})


# --- Test Cases ---

def test_tc_sec_01_admin_route_success_with_valid_admin_jwt():
    """TC_SEC_01: Legitimate Administrator accessing pending approvals gets 200 OK."""
    admin_token = generate_test_token(user_id="admin-01", role="Administrator")
    res = simulate_request_pipeline("/api/workflows/pending-approval", "GET", token=admin_token)
    assert res.status_code == 200

def test_tc_sec_02_rbac_rejection_for_standard_customer():
    """TC_SEC_02: Customer trying to access Admin pending-approval gets 403 Forbidden."""
    customer_token = generate_test_token(user_id="cust-100", role="Customer")
    res = simulate_request_pipeline("/api/workflows/pending-approval", "GET", token=customer_token)
    assert res.status_code == 403

def test_tc_sec_03_expired_jwt_rejected():
    """TC_SEC_03: Expired JWT credentials must be denied immediately with 401 Unauthorized."""
    expired_token = generate_test_token(user_id="admin-01", role="Administrator", expired=True)
    res = simulate_request_pipeline("/api/workflows/pending-approval", "GET", token=expired_token)
    assert res.status_code == 401

def test_tc_sec_04_mandatory_rejection_reason_validation():
    """TC_SEC_04: Admin rejection without a reason must be blocked (HTTP 400)."""
    admin_token = generate_test_token(user_id="admin-01", role="Administrator")

    # Empty comment payload
    res_empty = simulate_request_pipeline("/api/workflows/wf-99/reject", "POST", token=admin_token, body={"Comment": "   "})
    assert res_empty.status_code == 400
    assert "A reason must be provided" in res_empty.json()["message"]

def test_tc_sec_05_unverified_or_rejected_certificate_access_denied():
    """TC_SEC_05: Public verification endpoint must refuse uncompleted or pending certificates."""
    mock_db = {
        "wf-pending": {"Status": "pending_approval"},
        "wf-rejected": {"Status": "rejected"},
        "wf-approved": {"Status": "completed"}
    }

    # Attempt to verify pending workflow
    res_pending = simulate_request_pipeline("/api/workflows/verify/wf-pending", "GET", db_state=mock_db)
    assert res_pending.status_code == 400
    assert res_pending.json()["valid"] is False

    # Attempt to verify rejected workflow
    res_rejected = simulate_request_pipeline("/api/workflows/verify/wf-rejected", "GET", db_state=mock_db)
    assert res_rejected.status_code == 400
    assert res_rejected.json()["valid"] is False

    # Attempt to verify completed workflow
    res_ok = simulate_request_pipeline("/api/workflows/verify/wf-approved", "GET", db_state=mock_db)
    assert res_ok.status_code == 200
    assert res_ok.json()["valid"] is True