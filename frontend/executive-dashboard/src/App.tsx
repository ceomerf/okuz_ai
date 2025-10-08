import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, AppBar, Toolbar, Typography, Button, Tabs, Tab, Container } from '@mui/material';
import SimpleDashboard from './components/Dashboard/SimpleDashboard';
import AdvancedDashboard from './components/Dashboard/AdvancedDashboard';
import ComprehensiveAdminPanel from './components/AdminPanel/ComprehensiveAdminPanel';
import RealDataAdminPanel from './components/AdminPanel/RealDataAdminPanel';
import EnhancedAdminPanel from './components/AdminPanel/EnhancedAdminPanel';

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

function App() {
  const [currentView, setCurrentView] = useState(0);

  const handleViewChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentView(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        {/* Navigation Bar */}
        <AppBar position="static" sx={{ mb: 3 }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              🚀 Okuz AI - Yönetim Paneli
            </Typography>
            <Tabs value={currentView} onChange={handleViewChange} textColor="inherit">
              <Tab label="Basit Dashboard" />
              <Tab label="Gelişmiş Dashboard" />
              <Tab label="Admin Panel (Mock)" />
              <Tab label="Admin Panel (Gerçek Veri)" />
              <Tab label="Gelişmiş Admin Panel" />
            </Tabs>
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Container maxWidth="xl">
          {currentView === 0 && (
            <Box
              sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 2,
                p: 2,
              }}
            >
              <SimpleDashboard />
            </Box>
          )}
          
          {currentView === 1 && (
            <AdvancedDashboard />
          )}
          
          {currentView === 2 && (
            <ComprehensiveAdminPanel />
          )}
          
          {currentView === 3 && (
            <RealDataAdminPanel />
          )}
          
          {currentView === 4 && (
            <EnhancedAdminPanel />
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;