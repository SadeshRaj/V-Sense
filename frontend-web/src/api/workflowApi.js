const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const getHeaders = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('jwt_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export const getPendingWorkflows = async () => {
    const response = await fetch(`${API_URL}/workflows/pending-approval`, {
        method: 'GET',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
};

// NEW: Fetch all logs for Admin
export const getAllWorkflows = async () => {
    const response = await fetch(`${API_URL}/workflows/logs`, {
        method: 'GET',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
};

export const getWorkflowDetails = async (workflowId) => {
    const response = await fetch(`${API_URL}/workflows/${workflowId}/details`, {
        method: 'GET',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
};

export const approveWorkflow = async (workflowId, comment = '') => {
    const response = await fetch(`${API_URL}/workflows/${workflowId}/approve`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ comment })
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
};

export const rejectWorkflow = async (workflowId, comment = '') => {
    const response = await fetch(`${API_URL}/workflows/${workflowId}/reject`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ comment })
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
};