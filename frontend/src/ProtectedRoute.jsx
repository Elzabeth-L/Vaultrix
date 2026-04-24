import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * allowedRoles – optional array of roles that may access this route.
 * If omitted, any authenticated user is allowed.
 * Wrong-role users are redirected to their own dashboard.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  const user  = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();

  if (!token) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Send to the correct dashboard for their actual role
    return <Navigate to={`/dashboard/${user.role}`} replace />;
  }

  return children;
}
