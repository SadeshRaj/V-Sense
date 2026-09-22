import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Page Imports
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import GarageDashboard from './pages/GarageDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { getCurrentUser } from './api/auth';

// Admin Layout & Page Imports
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import CustomerSupport from './pages/admin/CustomerSupport';

// Admin Sub-route Components
const ReviewsQueue = () => <div className="text-slate-800">HITL Review Queue implementation goes here.</div>;
const AiLogs = () => <div className="text-slate-800">AI Execution Logs view goes here.</div>;
const ValuationRules = () => <div className="text-slate-800">Valuation Rules CRUD goes here.</div>;

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

export default function App() {
    return (
        <Router>
            <Routes>
                {/* Public Landing & Onboarding Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login isModal={false} />} />
                <Route path="/register" element={<Register />} />

                {/* Role-Protected Admin Dashboard & Nested Routes */}
                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute allowedRoles={['Administrator']}>
                            <AdminLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="support" element={<CustomerSupport />} />
                    <Route path="reviews" element={<ReviewsQueue />} />
                    <Route path="logs" element={<AiLogs />} />
                    <Route path="rules" element={<ValuationRules />} />
                </Route>

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