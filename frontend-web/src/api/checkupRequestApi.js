import { getToken } from './auth';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5183/api';

// GET /api/CheckupRequests/organization-requests
// Expected backend behaviour: resolves the caller's organization from the
// auth context (same pattern as GetUserId() in CheckupRequestsController)
// and returns all CheckupRequestDto rows for that organization, newest first.
export async function getOrganizationCheckupRequests() {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/CheckupRequests/organization-requests`, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    let data = null;
    try {
        data = await response.json();
    } catch {
        // no JSON body (e.g. 404 with no payload)
    }

    if (!response.ok) {
        throw new Error(data?.message || 'Failed to load checkup requests.');
    }

    return data;
}

// PUT /api/CheckupRequests/{id}/accept
// Expected backend behaviour: sets Status Pending -> Confirmed.
// Should reject (400/409) if the request does not belong to the caller's
// organization or is not currently Pending.
export async function acceptCheckupRequest(requestId) {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/CheckupRequests/${requestId}/accept`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    let data = null;
    try {
        data = await response.json();
    } catch {
        // no JSON body (e.g. 404 with no payload)
    }

    if (!response.ok) {
        throw new Error(data?.message || 'Failed to accept checkup request.');
    }

    return data;
}

// PUT /api/CheckupRequests/{id}/suggest-alternative
// Expected backend behaviour: sets Status Pending -> AlternativeSuggested
// and stores `garageResponse` as GarageResponse.
export async function suggestAlternative(requestId, message) {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/CheckupRequests/${requestId}/suggest-alternative`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ garageResponse: message })
    });

    let data = null;
    try {
        data = await response.json();
    } catch {
        // no JSON body (e.g. 404 with no payload)
    }

    if (!response.ok) {
        throw new Error(data?.message || 'Failed to send alternative availability.');
    }

    return data;
}