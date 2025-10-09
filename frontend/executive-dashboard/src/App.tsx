import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, AppBar, Toolbar, Typography, Button, Tabs, Tab, Container, IconButton } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthGuard from './components/Auth/AuthGuard';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import LoginPage from './components/Auth/LoginPage';
import RegisterPage from './components/Auth/RegisterPage';
import SimpleDashboard from './components/Dashboard/SimpleDashboard';
import AdvancedDashboard from './components/Dashboard/AdvancedDashboard';
import ComprehensiveAdminPanel from './components/AdminPanel/ComprehensiveAdminPanel';
import RealDataAdminPanel from './components/AdminPanel/RealDataAdminPanel';
import EnhancedAdminPanel from './components/AdminPanel/EnhancedAdminPanel';
import UserManagementPanel from './components/AdminPanel/UserManagementPanel';
import SystemHealthDashboard from './components/AdminPanel/SystemHealthDashboard';
import StudentManagementPanel from './components/AdminPanel/StudentManagementPanel';
import ParentManagementPanel from './components/AdminPanel/ParentManagementPanel';
import CoachManagementPanel from './components/AdminPanel/CoachManagementPanel';
import RbacManagementPanel from './components/AdminPanel/RbacManagementPanel';
import AuditLogPanel from './components/AdminPanel/AuditLogPanel';
import FeatureFlagsPanel from './components/AdminPanel/FeatureFlagsPanel';
import NotificationsPanel from './components/AdminPanel/NotificationsPanel';
import TeacherDashboard from './components/TeacherPanel/TeacherDashboard';
import StudentDashboard from './components/StudentPanel/StudentDashboard';
import ParentDashboard from './components/ParentPanel/ParentDashboard';
import DynamicEntityPage from './components/Dynamic/DynamicEntityPage';
import DynamicSidebar from './components/Dynamic/DynamicSidebar';

// Material-UI tema oluştur
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3b82f6',
    },
    secondary: {
      main: '#10b981',
    },
    background: {
      default: '#f8fafc',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          borderRadius: '12px',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
});

// Ana Dashboard Bileşeni
const MainDashboard: React.FC = () => {
  const [currentView, setCurrentView] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, hasRole, hasPermission } = useAuth();

  const handleViewChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentView(newValue);
  };

  // Rol/izin bazlı görünür sekmeleri hesapla
  const views: Array<{ label: string; render: React.ReactNode; visible: boolean }> = [
    // Genel Dashboard'lar
    { label: 'Basit Dashboard', render: <SimpleDashboard />, visible: true },
    { label: 'Gelişmiş Dashboard', render: <AdvancedDashboard />, visible: true },
    
    // Role-based Panels
    { label: 'Öğretmen Paneli', render: <TeacherDashboard />, visible: hasRole('teacher') || hasRole('admin') },
    { label: 'Öğrenci Paneli', render: <StudentDashboard />, visible: hasRole('student') || hasRole('admin') },
    { label: 'Veli Paneli', render: <ParentDashboard />, visible: hasRole('parent') || hasRole('admin') },
    
    // Admin içerikleri
    { label: 'Admin Panel (Mock)', render: <ComprehensiveAdminPanel />, visible: hasRole('admin') || hasPermission('admin:read') },
    { label: 'Admin Panel (Gerçek Veri)', render: <RealDataAdminPanel />, visible: hasRole('admin') || hasPermission('admin:read') },
    { label: 'Gelişmiş Admin Panel', render: <EnhancedAdminPanel />, visible: hasRole('admin') || hasPermission('admin:read') },
    { label: 'Kullanıcı Yönetimi', render: <UserManagementPanel />, visible: hasRole('admin') || hasPermission('users:read') },
    { label: 'Sistem Sağlığı', render: <SystemHealthDashboard />, visible: hasRole('admin') || hasPermission('system:read') },
    { label: 'Öğrenci Yönetimi', render: <StudentManagementPanel />, visible: hasRole('admin') || hasPermission('students:read') },
    { label: 'Veli Yönetimi', render: <ParentManagementPanel />, visible: hasRole('admin') || hasPermission('parents:read') },
    { label: 'Koç Yönetimi', render: <CoachManagementPanel />, visible: hasRole('admin') || hasPermission('coaches:read') },
    { label: 'RBAC Yönetimi', render: <RbacManagementPanel />, visible: hasRole('admin') || hasPermission('rbac:manage') },
    { label: 'Audit Log', render: <AuditLogPanel />, visible: hasRole('admin') || hasPermission('audit:read') },
    { label: 'Feature Flags', render: <FeatureFlagsPanel />, visible: hasRole('admin') || hasPermission('flags:manage') },
    { label: 'Bildirimler', render: <NotificationsPanel />, visible: hasRole('admin') || hasPermission('notifications:manage') },
  ];

  const visibleViews = views.filter(v => v.visible);

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Navigation Bar */}
      <AppBar position="static" sx={{ mb: 3 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={() => setSidebarOpen(true)}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            🚀 Okuz AI - Yönetim Paneli
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            Hoş geldin, {user?.name} ({user?.roles?.[0]})
          </Typography>
          <Button color="inherit" onClick={logout}>
            Çıkış
          </Button>
          <Tabs value={currentView} onChange={handleViewChange} textColor="inherit">
            {visibleViews.map((v, idx) => (
              <Tab key={idx} label={v.label} />
            ))}
          </Tabs>
        </Toolbar>
      </AppBar>

      {/* Dynamic Sidebar */}
      <DynamicSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <Container maxWidth="xl">
        {visibleViews[currentView] && (
          visibleViews[currentView].label === 'Basit Dashboard' ? (
            <Box
              sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 2,
                p: 2,
              }}
            >
              {visibleViews[currentView].render}
            </Box>
          ) : (
            visibleViews[currentView].render
          )
        )}
      </Container>
    </Box>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route 
              path="/dashboard" 
              element={
                <AuthGuard>
                  <MainDashboard />
                </AuthGuard>
              } 
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <MainDashboard />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/dynamic/:entityName" 
              element={
                <AuthGuard>
                  <DynamicEntityPage />
                </AuthGuard>
              } 
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;