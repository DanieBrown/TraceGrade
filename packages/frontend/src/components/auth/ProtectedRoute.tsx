import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../../features/auth/authApi';

interface Props {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: Props): JSX.Element {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
