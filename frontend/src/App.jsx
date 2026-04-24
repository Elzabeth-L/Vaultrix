import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Landing           from './pages/Landing';
import Login             from './pages/Login';
import Register          from './pages/Register';
import UserDashboard     from './pages/UserDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import ProtectedRoute    from './ProtectedRoute';

/** Redirect /dashboard to the role-specific sub-route */
function DashboardRedirect() {
  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <Navigate to={`/dashboard/${user.role ? user.role.toLowerCase() : 'user'}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/"         element={<Landing />} />
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Generic /dashboard → role-based redirect */}
      <Route path="/dashboard" element={<DashboardRedirect />} />

      {/* Role-gated dashboards */}
      <Route path="/dashboard/user" element={
        <ProtectedRoute allowedRoles={['USER']}>
          <UserDashboard />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/provider" element={
        <ProtectedRoute allowedRoles={['PROVIDER']}>
          <ProviderDashboard />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
