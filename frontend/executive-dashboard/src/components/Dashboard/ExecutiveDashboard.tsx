import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Warning,
  CheckCircle,
  Error,
  Info,
} from '@mui/icons-material';
import { DashboardData } from '../../types/dashboard';
import { apiService } from '../../services/api';

const ExecutiveDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: string;
    endpoint: string;
  }>({ open: false, action: '', endpoint: '' });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    loadDashboard();
    // Her 30 saniyede bir güncelle
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await apiService.getDashboard();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError('Dashboard verileri yüklenemedi');
      console.error('Dashboard yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (action: string, endpoint: string) => {
    setActionDialog({ open: true, action, endpoint });
  };

  const handleActionConfirm = async () => {
    try {
      const result = await apiService.executeAction(actionDialog.endpoint, true);
      setSnackbar({
        open: true,
        message: result.message || 'Aksiyon başarıyla gerçekleştirildi',
        severity: result.success ? 'success' : 'error',
      });
      if (result.success) {
        loadDashboard(); // Dashboard'u yenile
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Aksiyon gerçekleştirilemedi',
        severity: 'error',
      });
    } finally {
      setActionDialog({ open: false, action: '', endpoint: '' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
      case 'good':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
      case 'good':
        return <CheckCircle />;
      case 'warning':
        return <Warning />;
      case 'critical':
        return <Error />;
      default:
        return <Info />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp color="success" />;
      case 'down':
        return <TrendingDown color="error" />;
      default:
        return <TrendingFlat color="info" />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Dashboard yükleniyor...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={loadDashboard}>
            Tekrar Dene
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!dashboardData) {
    return (
      <Box p={3}>
        <Alert severity="info">
          Dashboard verileri bulunamadı
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          🚀 Executive Dashboard
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Chip
            icon={getStatusIcon(dashboardData.overallHealth.status)}
            label={`${dashboardData.overallHealth.score}/100 - ${dashboardData.overallHealth.status.toUpperCase()}`}
            color={getStatusColor(dashboardData.overallHealth.status) as any}
            size="medium"
          />
          <Typography variant="body2" color="text.secondary">
            Son güncelleme: {new Date(dashboardData.overallHealth.lastUpdated).toLocaleString('tr-TR')}
          </Typography>
          {getTrendIcon(dashboardData.overallHealth.trend)}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Kritik Metrikler */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Kritik Metrikler
              </Typography>
              
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Kullanıcılar</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {dashboardData.criticalMetrics.users.active.toLocaleString()}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(dashboardData.criticalMetrics.users.active / 5000) * 100}
                  color={getStatusColor(dashboardData.criticalMetrics.users.status) as any}
                />
              </Box>

              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Gelir (MRR)</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    ${dashboardData.criticalMetrics.revenue.current.toLocaleString()}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(dashboardData.criticalMetrics.revenue.current / dashboardData.criticalMetrics.revenue.target) * 100}
                  color={getStatusColor(dashboardData.criticalMetrics.revenue.status) as any}
                />
              </Box>

              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Uptime</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {dashboardData.criticalMetrics.performance.uptime}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={dashboardData.criticalMetrics.performance.uptime}
                  color={getStatusColor(dashboardData.criticalMetrics.performance.status) as any}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Hedefler */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🎯 Hedefler
              </Typography>
              {dashboardData.goals.map((goal, index) => (
                <Box key={index} mb={2}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">{goal.name}</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {goal.progress.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={goal.progress}
                    color={goal.status === 'ahead' ? 'success' : goal.status === 'behind' ? 'error' : 'primary'}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Acil Durumlar */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🚨 Acil Durumlar
              </Typography>
              {dashboardData.urgentIssues.length === 0 ? (
                <Alert severity="success">
                  ✅ Tüm sistemler normal
                </Alert>
              ) : (
                dashboardData.urgentIssues.map((issue, index) => (
                  <Alert 
                    key={index} 
                    severity={issue.severity === 'high' ? 'error' : issue.severity === 'medium' ? 'warning' : 'info'}
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="subtitle2">{issue.title}</Typography>
                    <Typography variant="body2">{issue.description}</Typography>
                    <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                      Aksiyon: {issue.action}
                    </Typography>
                  </Alert>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Hızlı Aksiyonlar */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ⚡ Hızlı Aksiyonlar
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={2}>
                {dashboardData.quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="contained"
                    color={action.action.includes('Kapat') || action.action.includes('Durdur') ? 'error' : 'primary'}
                    onClick={() => handleActionClick(action.action, action.endpoint)}
                    sx={{ mb: 1 }}
                  >
                    {action.buttonText}
                  </Button>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Aksiyon Onay Dialog'u */}
      <Dialog open={actionDialog.open} onClose={() => setActionDialog({ open: false, action: '', endpoint: '' })}>
        <DialogTitle>Onay Gerekli</DialogTitle>
        <DialogContent>
          <Typography>
            <strong>{actionDialog.action}</strong> işlemini gerçekleştirmek istediğinizden emin misiniz?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Bu işlem geri alınamaz!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog({ open: false, action: '', endpoint: '' })}>
            İptal
          </Button>
          <Button onClick={handleActionConfirm} color="error" variant="contained">
            Onayla
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ open: false, message: '', severity: 'info' })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default ExecutiveDashboard;
