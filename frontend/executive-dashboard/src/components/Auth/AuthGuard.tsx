import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: string;
  requiredPermission?: string;
  fallbackPath?: string;
}

const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requiredRole,
  requiredPermission,
  fallbackPath = '/login',
}) => {
  const { isAuthenticated, isLoading, user, hasRole, hasPermission } = useAuth();

  // Loading durumu
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          Yükleniyor...
        </Typography>
      </Box>
    );
  }

  // Kimlik doğrulama kontrolü
  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Rol kontrolü
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
          p: 3,
        }}
      >
        <Typography variant="h4" color="error">
          ⚠️ Yetkisiz Erişim
        </Typography>
        <Typography variant="h6" color="text.secondary" textAlign="center">
          Bu sayfaya erişim için <strong>{requiredRole}</strong> rolü gereklidir.
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Mevcut rolünüz: <strong>{user?.role}</strong>
        </Typography>
      </Box>
    );
  }

  // İzin kontrolü
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
          p: 3,
        }}
      >
        <Typography variant="h4" color="error">
          ⚠️ Yetkisiz Erişim
        </Typography>
        <Typography variant="h6" color="text.secondary" textAlign="center">
          Bu sayfaya erişim için <strong>{requiredPermission}</strong> izni gereklidir.
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Mevcut izinleriniz: <strong>{user?.permissions.join(', ')}</strong>
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;
