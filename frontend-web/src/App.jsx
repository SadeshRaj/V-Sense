import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

// Example Dashboard Component (Replace with your actual Dashboard page)
function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user'));
  return (
      <div className="min-h-screen bg-slate-950 text-white p-8">
        <h1 className="text-3xl font-bold">Welcome, {user?.fullName}!</h1>
        <p className="text-slate-400 mt-2">Role: {user?.role}</p>
      </div>
  );
}

function App() {
  return (
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Dashboard Route */}
          <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
          />
        </Routes>
      </Router>
  );
}

export default App;