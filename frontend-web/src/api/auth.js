const API_BASE_URL =
    import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5183/api';

async function readResponse(response) {
    const text = await response.text();

    if (!text) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch {
        return { message: text };
    }
}

export async function loginUser(email, password) {
    let response;

    try {
        response = await fetch(`${API_BASE_URL}/Auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
            signal: AbortSignal.timeout(15000),
        });
    } catch (error) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
            throw new Error(
                'Login request timed out. Please check that the backend is running and try again.'
            );
        }

        throw new Error(
            'Unable to connect to the server. Please check your connection and backend.'
        );
    }

    const data = await readResponse(response);

    if (!response.ok) {
        const error = new Error(
            data.message || data.title || 'Login failed. Please check your credentials.'
        );
        error.status = response.status;
        error.data = data;
        throw error;
    }

    if (!data.token) {
        throw new Error('Login response did not contain an authentication token.');
    }

    if (!data.role) {
        throw new Error('Login response did not contain a user role.');
    }

    const user = {
        id: data.id,
        fullName: data.fullName,
        email: data.email,
        role: data.role,
        isActive: data.isActive ?? data.active ?? true,
        createdAt: data.createdAt,
    };

    // Persist authentication state only after validating the response.
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(user));

    return { ...data, ...user };
}

export async function registerGarage(formData) {
    const response = await fetch(`${API_BASE_URL}/Auth/register-garage`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(15000),
    });

    const data = await readResponse(response);

    if (!response.ok) {
        const error = new Error(
            data.message || data.title || 'Registration failed. Please check your details.'
        );
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

export function getCurrentUser() {
    const user = localStorage.getItem('user');

    if (!user) {
        return null;
    }

    try {
        return JSON.parse(user);
    } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        return null;
    }
}

export function getToken() {
    return localStorage.getItem('token');
}

export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}