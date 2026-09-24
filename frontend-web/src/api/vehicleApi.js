import { getToken } from './auth';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5183/api';

export async function searchVehicle({ vehicleNumber, chassisNumber }) {
    const token = getToken();
    const params = new URLSearchParams();

    if (vehicleNumber) params.append('vehicleNumber', vehicleNumber);
    if (chassisNumber) params.append('chassisNumber', chassisNumber);

    const response = await fetch(`${API_BASE_URL}/Vehicles/search?${params.toString()}`, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Vehicle not found.');
    }

    return data;
}
