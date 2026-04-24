import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Landing          from './pages/Landing';
import Login            from './pages/Login';
import Register         from './pages/Register';
import UserDashboard    from './pages/UserDashboard';
import AdminDashboard   from './pages/AdminDashboard';
import ServiceCatalog   from './pages/ServiceCatalog';
import ProtectedRoute   from './ProtectedRoute';
import { getCurrentUser } from './utils/auth';

function DashboardRedirect() {
  const user  = getCurrentUser() || {};
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  const role  = user.role ? user.role.toLowerCase() : 'user';
  return <Navigate to={`/dashboard/${role}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/"         element={<Landing />} />
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/services" element={<ServiceCatalog />} />

      <Route path="/dashboard" element={<DashboardRedirect />} />

      <Route path="/dashboard/user" element={
        <ProtectedRoute allowedRoles={['USER']}>
          <UserDashboard />
        </ProtectedRoute>
      } />

      <Route path="/dashboard/admin" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
