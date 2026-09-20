const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5183/api';

export async function loginUser(email, password) {
    const response = await fetch(`${API_BASE_URL}/Auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(data.message || 'Login failed. Please check your credentials.');
        error.status = response.status;
        error.data = data;
        throw error;
    }

    // Persist authentication state
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify({
        id: data.id,
        fullName: data.fullName,
        email: data.email,
        role: data.role,
        isActive: data.isActive,
        createdAt: data.createdAt
    }));

    return data;
}

export async function registerGarage(formData) {
    // formData is multipart/form-data with file
    const response = await fetch(`${API_BASE_URL}/Auth/register-garage`, {
        method: 'POST',
        body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Registration failed. Please check your details.');
    }

    return data;
}

export function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

export function getToken() {
    return localStorage.getItem('token');
}

export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}