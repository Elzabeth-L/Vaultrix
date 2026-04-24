import React from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentUser } from './utils/auth';

export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  const user  = getCurrentUser() || {};

  if (!token) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const role = user.role ? user.role.toLowerCase() : 'user';
    return <Navigate to={`/dashboard/${role}`} replace />;
  }

  return children;
}
