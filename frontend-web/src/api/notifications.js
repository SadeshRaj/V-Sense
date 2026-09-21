const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || process.env.REACT_APP_API_BASE_URL;

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export const uploadNotificationImage = async (file) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/Notifications/upload-image`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to upload image');
    }
    const data = await response.json();
    return data.url;
};

export const sendBroadcastNotification = async (notificationData) => {
    const response = await fetch(`${API_BASE_URL}/Notifications/broadcast`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(notificationData)
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error("Backend Error:", errorText);
        throw new Error(errorText || 'Failed to send broadcast');
    }
    return await response.json();
};

export const getUnreadCount = async () => {
    const response = await fetch(`${API_BASE_URL}/Notifications/unread-count`, {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store'
    });
    if (!response.ok) throw new Error('Failed to get unread count');
    return await response.json();
};

export const getMyNotifications = async () => {
    const response = await fetch(`${API_BASE_URL}/Notifications/my-notifications`, {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store'
    });
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return await response.json();
};

export const getSentNotifications = async () => {
    const response = await fetch(`${API_BASE_URL}/Notifications/sent-notifications`, {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store'
    });
    if (!response.ok) throw new Error('Failed to fetch sent notifications');
    return await response.json();
};

export const markAsRead = async (id) => {
    const response = await fetch(`${API_BASE_URL}/Notifications/${id}/read`, {
        method: 'PATCH',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to mark as read');
    return await response.json();
};
