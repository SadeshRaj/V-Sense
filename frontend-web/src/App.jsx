import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import GarageDashboard from './pages/GarageDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { getCurrentUser } from './api/auth';

// Smart dispatcher based on role
function RoleBasedDashboardRedirect() {
    const user = getCurrentUser();
    if (!user) return <Navigate to="/login" replace />;

    if (user.role === 'Administrator') {
        return <Navigate to="/admin" replace />;
    }
    if (user.role === 'Garage' || user.role === 'ServiceCenter') {
        return <Navigate to="/garage" replace />;
    }
    return <Navigate to="/" replace />;
}

function App() {
    return (
        <Router>
            <Routes>
                {/* Public Landing & Onboarding Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login isModal={false} />} />
                <Route path="/register" element={<Register />} />

                {/* Role-Protected Admin Dashboard */}
                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute allowedRoles={['Administrator']}>
                            <AdminDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Role-Protected Garage / Service Center Dashboard */}
                <Route
                    path="/garage"
                    element={
                        <ProtectedRoute allowedRoles={['Garage', 'ServiceCenter']}>
                            <GarageDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Generic /dashboard redirect */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <RoleBasedDashboardRedirect />
                        </ProtectedRoute>
                    }
                />

                {/* Catch-all fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;