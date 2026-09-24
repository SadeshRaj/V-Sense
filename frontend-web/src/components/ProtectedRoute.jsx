import React from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentUser, getToken } from '../api/auth';

export default function ProtectedRoute({ children, allowedRoles }) {
    const token = getToken();
    const user = getCurrentUser();

    if (!token || !user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && allowedRoles.length > 0) {
        const hasRole = allowedRoles.includes(user.role);
        if (!hasRole) {
            // Redirect based on user's actual role
            if (user.role === 'Administrator') {
                return <Navigate to="/admin" replace />;
            }
            if (user.role === 'Garage' || user.role === 'ServiceCenter') {
                return <Navigate to="/garage" replace />;
            }
            return <Navigate to="/" replace />;
        }
    }

    return children;
}