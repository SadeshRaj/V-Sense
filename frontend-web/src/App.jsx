import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

import AdminLayout from './Layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import CustomerSupport from './pages/admin/CustomerSupport';
import NotificationsPage from './pages/admin/NotificationsPage';

const ReviewsQueue = () => <div className="text-slate-800">HITL Review Queue implementation goes here.</div>;
const AiLogs = () => <div className="text-slate-800">AI Execution Logs view goes here.</div>;
const ValuationRules = () => <div className="text-slate-800">Valuation Rules CRUD goes here.</div>;

export default function App() {
    return (
        <Router>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />

                {/* Protected Admin Routes */}
                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute>
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
                    <Route path="notifications" element={<NotificationsPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}