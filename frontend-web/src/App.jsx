import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import GarageDashboard from './pages/GarageDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { getCurrentUser } from './api/auth';
import PublicVerification from './pages/PublicVerification';

import AdminLayout from './Layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import CustomerSupport from './pages/admin/CustomerSupport';
import HITLReviewQueue from "./pages/admin/HITLReviewQueue.jsx";
import AiLogs from "./pages/admin/AiLogs.jsx";
import NotificationsPage from './pages/admin/NotificationsPage';

const ValuationRules = () => <div className="text-slate-800">Valuation Rules CRUD goes here.</div>;

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
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login isModal={false} />} />
                <Route path="/register" element={<Register />} />

                {/* PUBLIC VERIFICATION ROUTE - Must be outside ProtectedRoute */}
                <Route path="/verify/:id" element={<PublicVerification />} />

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
                    <Route path="reviews" element={<HITLReviewQueue />} />
                    <Route path="logs" element={<AiLogs />} />
                    <Route path="rules" element={<ValuationRules />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                </Route>

                <Route
                    path="/garage"
                    element={
                        <ProtectedRoute allowedRoles={['Garage', 'ServiceCenter']}>
                            <GarageDashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <RoleBasedDashboardRedirect />
                        </ProtectedRoute>
                    }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}