import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login             from './pages/Login';
import Register          from './pages/Register';
import CustomerDashboard from './pages/CustomerDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import AdminDashboard    from './pages/AdminDashboard';
import ProtectedRoute    from './ProtectedRoute';

/** Redirect /dashboard to the role-specific sub-route */
function DashboardRedirect() {
  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <Navigate to={`/dashboard/${user.role || 'customer'}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Generic /dashboard → role-based redirect */}
      <Route path="/dashboard" element={<DashboardRedirect />} />

      {/* Role-gated dashboards */}
      <Route path="/dashboard/customer" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <CustomerDashboard />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/provider" element={
        <ProtectedRoute allowedRoles={['provider']}>
          <ProviderDashboard />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
