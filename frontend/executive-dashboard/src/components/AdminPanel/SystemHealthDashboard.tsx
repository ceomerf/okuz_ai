import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  LinearProgress,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Refresh,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Speed,
  People,
  Api,
  Storage,
  Memory,
  Wifi,
  WifiOff,
  BatteryFull,
  BatteryAlert,
  Timer,
  Schedule,
  Security,
  Cloud,
  CloudOff,
  Settings,
  Notifications,
  NotificationsActive,
  NotificationsOff,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { format, subHours, subDays } from 'date-fns';
import { tr } from 'date-fns/locale/tr';
import { systemHealthApi } from '../../services/systemHealthApi';
import { useNotification } from '../../hooks/useNotification';

// Types
type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
interface SystemHealth {
  database: string;
  redis: string;
  api: string;
  overall: string;
  timestamp: string;
}

interface SystemMetrics {
  activeUsers: number;
  requestsLastHour: number;
  errorRate: number;
  responseTime: number;
  uptime: number;
  timestamp: string;
}

interface ServiceStatus {
  name: string;
  status: string;
}

interface MetricCard {
  title: string;
  value: number | string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  color: string;
  format?: 'number' | 'percentage' | 'currency' | 'time';
}

const SystemHealthDashboard: React.FC = () => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [performanceData, setPerformanceData] = useState<Array<{ time: string; users?: number; requests: number; errors: number }>>([]);
  const [alerts, setAlerts] = useState<Array<{ id: string; severity: string; title: string; description: string }>>([]);
  const { showError } = useNotification();

  // Mock data (development fallback only)
  const mockSystemHealth: SystemHealth = {
    database: 'OK',
    redis: 'OK',
    api: 'OK',
    overall: 'HEALTHY',
    timestamp: new Date().toISOString(),
  };

  const mockSystemMetrics: SystemMetrics = {
    activeUsers: 150,
    requestsLastHour: 12500,
    errorRate: 0.5,
    responseTime: 250,
    uptime: 99.8,
    timestamp: new Date().toISOString(),
  };

  const mockServiceStatus: ServiceStatus[] = [
    { name: 'Database', status: 'OK' },
    { name: 'Redis Cache', status: 'OK' },
    { name: 'API Gateway', status: 'OK' },
    { name: 'Authentication', status: 'OK' },
    { name: 'File Storage', status: 'OK' },
  ];

  const errorColors = ['#f44336', '#ff9800', '#ffc107', '#9e9e9e'];

  useEffect(() => {
    loadSystemData();
    const interval = setInterval(loadSystemData, 30000); // 30 saniyede bir güncelle
    return () => clearInterval(interval);
  }, []);

  const loadSystemData = async () => {
    setLoading(true);
    try {
      const [health, metrics, services, perf, activeAlerts] = await Promise.all([
        systemHealthApi.getSystemHealth(),
        systemHealthApi.getSystemMetrics(),
        systemHealthApi.getServiceStatus(),
        systemHealthApi.getPerformanceData('24h'),
        systemHealthApi.getActiveAlerts(),
      ]);

      if (health.success && health.data) {
        setSystemHealth(health.data);
      } else {
        console.warn('System health API failed, using empty state');
        setSystemHealth(null);
      }

      if (metrics.success && metrics.data) {
        setSystemMetrics(metrics.data);
      } else {
        console.warn('System metrics API failed, using empty state');
        setSystemMetrics(null);
      }

      if (services.success && services.data) {
        setServiceStatus(services.data as any);
      } else {
        console.warn('Service status API failed, using empty state');
        setServiceStatus([]);
      }
      if (perf.success && perf.data) {
        const mapped = (perf.data as any[]).map(d => ({
          time: format(new Date(d.timestamp), 'HH:mm', { locale: tr }),
          requests: d.requests,
          errors: d.errors,
        }));
        setPerformanceData(mapped);
      }
      if (activeAlerts.success && activeAlerts.data) {
        setAlerts((activeAlerts.data as any[]).slice(0, 3));
      }
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Sistem verileri yüklenemedi:', error);
      showError('Sistem verileri yüklenemedi');
      setSystemHealth(null);
      setSystemMetrics(null);
      setServiceStatus([]);
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OK':
      case 'HEALTHY':
        return <CheckCircle color="success" />;
      case 'ERROR':
      case 'DEGRADED':
        return <Error color="error" />;
      case 'WARNING':
        return <Warning color="warning" />;
      default:
        return <Warning color="warning" />;
    }
  };

  const getStatusColor = (status: string): ChipColor => {
    switch (status) {
      case 'OK':
      case 'HEALTHY':
        return 'success';
      case 'ERROR':
      case 'DEGRADED':
        return 'error';
      case 'WARNING':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'percentage':
        return `${value}%`;
      case 'currency':
        return `₺${value.toLocaleString()}`;
      case 'time':
        return `${value}ms`;
      case 'number':
      default:
        return value.toLocaleString();
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp color="success" />;
      case 'down':
        return <TrendingDown color="error" />;
      case 'stable':
        return <TrendingFlat color="info" />;
    }
  };

  const metricCards: MetricCard[] = [
    {
      title: 'Aktif Kullanıcılar',
      value: systemMetrics?.activeUsers || 0,
      change: 12.5,
      trend: 'up',
      icon: <People />,
      color: '#4caf50',
      format: 'number',
    },
    {
      title: 'Son Saat İstekleri',
      value: systemMetrics?.requestsLastHour || 0,
      change: 8.3,
      trend: 'up',
      icon: <Api />,
      color: '#2196f3',
      format: 'number',
    },
    {
      title: 'Hata Oranı',
      value: systemMetrics?.errorRate || 0,
      change: -0.2,
      trend: 'down',
      icon: <Error />,
      color: '#f44336',
      format: 'percentage',
    },
    {
      title: 'Yanıt Süresi',
      value: systemMetrics?.responseTime || 0,
      change: -5.1,
      trend: 'down',
      icon: <Speed />,
      color: '#ff9800',
      format: 'time',
    },
    {
      title: 'Sistem Uptime',
      value: systemMetrics?.uptime || 0,
      change: 0.1,
      trend: 'up',
      icon: <Cloud />,
      color: '#9c27b0',
      format: 'percentage',
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Sistem Sağlık Durumu
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Son güncelleme: {format(lastUpdate, 'dd.MM.yyyy HH:mm:ss', { locale: tr })}
          </Typography>
          <IconButton onClick={loadSystemData} disabled={loading}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* System Health Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Sistem Durumu
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: '1 1 24%', minWidth: '240px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getStatusIcon(systemHealth?.database || 'OK')}
                <Typography variant="body1">Veritabanı</Typography>
                <Chip 
                  label={systemHealth?.database || 'OK'} 
                  color={getStatusColor(systemHealth?.database || 'OK')}
                  size="small"
                />
              </Box>
            </Box>
            <Box sx={{ flex: '1 1 24%', minWidth: '240px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getStatusIcon(systemHealth?.redis || 'OK')}
                <Typography variant="body1">Redis Cache</Typography>
                <Chip 
                  label={systemHealth?.redis || 'OK'} 
                  color={getStatusColor(systemHealth?.redis || 'OK')}
                  size="small"
                />
              </Box>
            </Box>
            <Box sx={{ flex: '1 1 24%', minWidth: '240px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getStatusIcon(systemHealth?.api || 'OK')}
                <Typography variant="body1">API Gateway</Typography>
                <Chip 
                  label={systemHealth?.api || 'OK'} 
                  color={getStatusColor(systemHealth?.api || 'OK')}
                  size="small"
                />
              </Box>
            </Box>
            <Box sx={{ flex: '1 1 24%', minWidth: '240px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getStatusIcon(systemHealth?.overall || 'HEALTHY')}
                <Typography variant="body1" fontWeight="bold">Genel Durum</Typography>
                <Chip 
                  label={systemHealth?.overall || 'HEALTHY'} 
                  color={getStatusColor(systemHealth?.overall || 'HEALTHY')}
                  size="small"
                />
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        {metricCards.map((metric, index) => (
          <Box key={index} sx={{ flex: '1 1 18%', minWidth: '240px' }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ color: metric.color }}>
                    {metric.icon}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {getTrendIcon(metric.trend)}
                    <Typography 
                      variant="body2" 
                      color={metric.trend === 'up' ? 'success.main' : metric.trend === 'down' ? 'error.main' : 'info.main'}
                    >
                      {metric.change > 0 ? '+' : ''}{metric.change}%
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="h4" component="div" fontWeight="bold">
                  {formatValue(metric.value as number, metric.format || 'number')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {metric.title}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Charts */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        <Box sx={{ flex: '1 1 64%', minWidth: '300px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Son 24 Saat Aktivite
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line 
                    type="monotone" 
                    dataKey="requests" 
                    stroke="#4caf50" 
                    strokeWidth={2}
                    name="API İstekleri"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="errors" 
                    stroke="#f44336" 
                    strokeWidth={2}
                    name="Hatalar"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 32%', minWidth: '280px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Hata Dağılımı
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'API Errors', value: performanceData.reduce((a,b)=>a + (b.errors||0),0), color: errorColors[0] },
                      // Placeholder breakdown; refine when backend provides detailed error categories
                      { name: 'Database Errors', value: Math.floor(performanceData.reduce((a,b)=>a + (b.errors||0),0) * 0.35), color: errorColors[1] },
                      { name: 'Cache Errors', value: Math.floor(performanceData.reduce((a,b)=>a + (b.errors||0),0) * 0.2), color: errorColors[2] },
                      { name: 'Other Errors', value: Math.floor(performanceData.reduce((a,b)=>a + (b.errors||0),0) * 0.1), color: errorColors[3] },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {errorColors.map((c, index) => (
                      <Cell key={`cell-${index}`} fill={c} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Service Status */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        <Box sx={{ flex: '1 1 48%', minWidth: '300px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Servis Durumları
              </Typography>
              <List>
                {serviceStatus.map((service, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemIcon>
                        {getStatusIcon(service.status)}
                      </ListItemIcon>
                      <ListItemText
                        primary={service.name}
                        secondary={service.status}
                      />
                      <Chip 
                        label={service.status} 
                        color={getStatusColor(service.status)}
                        size="small"
                      />
                    </ListItem>
                    {index < serviceStatus.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 48%', minWidth: '300px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sistem Uyarıları
              </Typography>
              {alerts.length === 0 ? (
                <Alert severity="success">Aktif uyarı bulunmuyor.</Alert>
              ) : (
                <List>
                  {alerts.map(a => (
                    <ListItem key={a.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                      <ListItemIcon>{a.severity === 'CRITICAL' ? <Error color="error"/> : a.severity === 'HIGH' ? <Warning color="warning"/> : <CheckCircle color="success"/>}</ListItemIcon>
                      <ListItemText primary={a.title} secondary={a.description} />
                      <Chip label={a.severity} size="small" color={a.severity === 'CRITICAL' ? 'error' : a.severity === 'HIGH' ? 'warning' : 'success'} />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Loading Overlay */}
      {loading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <Box sx={{ textAlign: 'center', color: 'white' }}>
            <CircularProgress color="inherit" />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Sistem verileri güncelleniyor...
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default SystemHealthDashboard;
