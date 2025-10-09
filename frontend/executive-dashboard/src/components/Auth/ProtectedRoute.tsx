import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
  requiredPermission?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermission,
}) => {
  const { isAuthenticated, isLoading, hasRole, hasPermission } = useAuth();
  const location = useLocation();

  // Loading durumu
  if (isLoading) {
    return null; // AuthGuard'da loading gösterilecek
  }

  // Kimlik doğrulama kontrolü
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Rol kontrolü
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // İzin kontrolü
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
