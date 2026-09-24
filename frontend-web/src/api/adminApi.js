import { getToken } from './auth';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5183/api';

function authHeaders() {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

export async function getPendingRegistrations() {
    const response = await fetch(`${API_BASE_URL}/Admin/registrations/pending`, {
        headers: authHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch pending registrations.');
    }
    return data;
}

export async function getAllRegistrations() {
    const response = await fetch(`${API_BASE_URL}/Admin/registrations/all`, {
        headers: authHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch registrations.');
    }
    return data;
}

export async function getAssignedVehicles() {
    const response = await fetch(`${API_BASE_URL}/Admin/assigned-vehicles`, {
        headers: authHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch assigned vehicles.');
    }
    return data;
}

export async function approveGarage(id) {
    const response = await fetch(`${API_BASE_URL}/Admin/registrations/${id}/approve`, {
        method: 'PUT',
        headers: authHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Failed to approve partner.');
    }
    return data;
}

export async function rejectGarage(id, reason) {
    const response = await fetch(`${API_BASE_URL}/Admin/registrations/${id}/reject`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ reason })
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Failed to reject partner.');
    }
    return data;
}

export async function deleteGarage(id) {
    const response = await fetch(`${API_BASE_URL}/Admin/registrations/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Failed to delete partner.');
    }
    return data;
}