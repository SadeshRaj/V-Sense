import { getToken } from './auth';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5183/api';

export async function createServiceRecord(formData) {
    const token = getToken();
    // formData is multipart/form-data with photos and fields
    const response = await fetch(`${API_BASE_URL}/ServiceRecords`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
            // Note: browser sets multipart/form-data boundary automatically when body is FormData
        },
        body: formData
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Failed to submit service record.');
    }

    return data;
}

export async function getVehicleServiceRecords(vehicleId) {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/ServiceRecords/vehicle/${vehicleId}`, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Failed to load vehicle service history.');
    }

    return data;
}

export async function getMyServiceRecords() {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/ServiceRecords/my-records`, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Failed to load your service records.');
    }

    return data;
}
