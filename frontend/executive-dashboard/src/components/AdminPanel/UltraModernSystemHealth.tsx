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
  Switch,
  FormControlLabel,
  Slider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  ListItemAvatar,
  ListItemSecondaryAction,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  useTheme,
  useMediaQuery,
  alpha,
  styled,
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
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Book as BookIcon,
  Psychology as PsychologyIcon,
  Group as GroupIcon,
  BugReport as BugReportIcon,
  Flag as FlagIcon,
  Email as EmailIcon,
  Code as CodeIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  BatteryChargingFull as BatteryChargingFullIcon,
  BatteryCharging60 as BatteryCharging60Icon,
  BatteryCharging80 as BatteryCharging80Icon,
  BatteryCharging90 as BatteryCharging90Icon,
  BatterySaver as BatterySaverIcon,
  AutoAwesome,
  FlashOn,
  Bolt,
  Zap,
  Thunderstorm,
  LocalFireDepartment,
  Whatshot,
  EmojiEvents,
  MilitaryTech,
  WorkspacePremium,
  Diamond,
  Grade,
  School as SchoolAdd,
  Work as WorkAdd,
  Home as HomeAdd,
  Public as PublicAdd,
  Analytics,
  Assessment,
  Timeline,
  BarChart,
  PieChart,
  TableChart,
  FilterList,
  Search,
  Sort,
  FilterAlt,
  Tune,
  ViewList,
  ViewModule,
  ViewComfy,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkCheckIcon,
  Security as SecurityIcon,
  BugReport as BugReportIcon2,
  Report as ReportIcon,
  Assignment as AssignmentIcon,
  TrendingFlat as TrendingFlatIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, RadialBarChart, RadialBar, ComposedChart, Scatter, ScatterChart, Treemap, FunnelChart, Sankey } from 'recharts';
import { format, subHours, subDays, subWeeks, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale/tr';
import { motion, AnimatePresence } from 'framer-motion';
import { systemHealthApi } from '../../services/systemHealthApi';
import { useNotification } from '../../hooks/useNotification';
import { useEventLogger } from '../../hooks/useEventLogger';

// Styled Components
const StyledCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
  backdropFilter: 'blur(10px)',
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  borderRadius: 16,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: `0 20px 40px ${alpha(theme.palette.primary.main, 0.2)}`,
  },
}));

const StyledMetricCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.7)} 100%)`,
  backdropFilter: 'blur(20px)',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  borderRadius: 20,
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  },
  '&:hover': {
    transform: 'translateY(-8px) scale(1.02)',
    boxShadow: `0 25px 50px ${alpha(theme.palette.primary.main, 0.3)}`,
  },
}));

const AnimatedCounter = ({ value, duration = 2000 }: { value: number; duration?: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{count}</span>;
};

// Veri tipleri
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
  uptime: number;
  lastCheck: string;
  responseTime: number;
}

interface PerformanceData {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  requests: number;
  errors: number;
  responseTime: number;
}

interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
  category: string;
}

interface MetricCard {
  title: string;
  value: number | string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  color: string;
  format?: 'number' | 'percentage' | 'currency' | 'time';
  unit?: string;
  target?: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

const UltraModernSystemHealth: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [currentTab, setCurrentTab] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);

  // Hooks
  const { showSuccess, showError, showInfo, NotificationComponent } = useNotification();
  const { logEvent } = useEventLogger();

  // Veri yükleme
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
        showSuccess('Sistem sağlık durumu güncellendi');
      } else {
        showError('Sistem sağlık durumu alınamadı');
      }

      if (metrics.success && metrics.data) {
        setSystemMetrics(metrics.data);
        showSuccess('Sistem metrikleri güncellendi');
      } else {
        showError('Sistem metrikleri alınamadı');
      }

      if (services.success && services.data) {
        setServiceStatus(services.data as any);
        showSuccess('Servis durumları güncellendi');
      } else {
        showError('Servis durumları alınamadı');
      }
      
      if (perf.success && perf.data) {
        const mapped = (perf.data as any[]).map(d => ({
          timestamp: d.timestamp,
          cpu: d.cpu || 0,
          memory: d.memory || 0,
          disk: d.disk || 0,
          network: d.network || 0,
          requests: d.requests || 0,
          errors: d.errors || 0,
          responseTime: d.responseTime || 0,
        }));
        setPerformanceData(mapped);
        showSuccess('Performans verileri güncellendi');
      } else {
        showError('Performans verileri alınamadı');
      }
      
      if (activeAlerts.success && activeAlerts.data) {
        setAlerts((activeAlerts.data as any[]).map(alert => ({
          ...alert,
          severity: alert.severity || 'medium',
          resolved: alert.resolved || false,
          category: alert.category || 'system',
        })));
        if ((activeAlerts.data as any[]).length > 0) {
          showInfo(`${(activeAlerts.data as any[]).length} aktif uyarı bulundu`);
        }
      } else {
        showError('Uyarılar alınamadı');
      }
      
      setLastUpdate(new Date());
      logEvent({ type: 'ULTRA_SYSTEM_HEALTH_LOADED' });
    } catch (error) {
      console.error('Sistem verileri yüklenemedi:', error);
      showError('Sistem verileri yüklenemedi');
      logEvent({ type: 'ULTRA_SYSTEM_HEALTH_ERROR', error: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Otomatik yenileme
  useEffect(() => {
    loadSystemData();
    
    if (autoRefresh) {
      const interval = setInterval(loadSystemData, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Metrik kartları
  const metricCards: MetricCard[] = [
    {
      title: 'Aktif Kullanıcılar',
      value: systemMetrics?.activeUsers || 0,
      change: 12.5,
      trend: 'up',
      icon: <People />,
      color: theme.palette.primary.main,
      format: 'number',
      unit: 'kişi',
      target: 1000,
      status: systemMetrics?.activeUsers && systemMetrics.activeUsers > 500 ? 'excellent' : 'good',
    },
    {
      title: 'Saatlik İstekler',
      value: systemMetrics?.requestsLastHour || 0,
      change: -3.2,
      trend: 'down',
      icon: <Api />,
      color: theme.palette.secondary.main,
      format: 'number',
      unit: 'istek',
      target: 10000,
      status: systemMetrics?.requestsLastHour && systemMetrics.requestsLastHour > 5000 ? 'excellent' : 'good',
    },
    {
      title: 'Hata Oranı',
      value: systemMetrics?.errorRate || 0,
      change: -15.8,
      trend: 'down',
      icon: <Error />,
      color: theme.palette.error.main,
      format: 'percentage',
      unit: '%',
      target: 1,
      status: systemMetrics?.errorRate && systemMetrics.errorRate < 2 ? 'excellent' : systemMetrics?.errorRate && systemMetrics.errorRate < 5 ? 'good' : 'warning',
    },
    {
      title: 'Yanıt Süresi',
      value: systemMetrics?.responseTime || 0,
      change: 8.3,
      trend: 'up',
      icon: <Timer />,
      color: theme.palette.warning.main,
      format: 'time',
      unit: 'ms',
      target: 200,
      status: systemMetrics?.responseTime && systemMetrics.responseTime < 300 ? 'excellent' : systemMetrics?.responseTime && systemMetrics.responseTime < 500 ? 'good' : 'warning',
    },
    {
      title: 'Uptime',
      value: systemMetrics?.uptime || 0,
      change: 0.1,
      trend: 'stable',
      icon: <CheckCircle />,
      color: theme.palette.success.main,
      format: 'percentage',
      unit: '%',
      target: 99.9,
      status: systemMetrics?.uptime && systemMetrics.uptime > 99.5 ? 'excellent' : 'good',
    },
  ];

  // Durum rengi
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
      case 'healthy':
        return 'success';
      case 'good':
        return 'info';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'error';
      default:
        return 'default';
    }
  };

  // Trend ikonu
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp color="error" />;
      case 'down':
        return <TrendingDown color="success" />;
      case 'stable':
        return <TrendingFlat color="info" />;
      default:
        return <TrendingFlat color="info" />;
    }
  };

  // Severity rengi
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'info';
      case 'medium':
        return 'warning';
      case 'high':
        return 'error';
      case 'critical':
        return 'error';
      default:
        return 'default';
    }
  };

  // Uyarı çözme
  const resolveAlert = async (alertId: string) => {
    try {
      // Gerçek API çağrısı burada yapılacak
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, resolved: true } : alert
      ));
      showSuccess('Uyarı çözüldü');
      logEvent({ type: 'ALERT_RESOLVED', alertId });
    } catch (error) {
      showError('Uyarı çözülemedi');
    }
  };

  return (
    <Box sx={{ p: 3, minHeight: '100vh', background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)` }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 4,
          p: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
          borderRadius: 3,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        }}>
          <Box>
            <Typography variant="h3" component="h1" sx={{ 
              fontWeight: 800,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1,
            }}>
              🚀 Ultra Modern Sistem Sağlığı
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Gerçek zamanlı sistem durumu ve performans analizi
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  color="primary"
                />
              }
              label="Otomatik Yenileme"
            />
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadSystemData}
              disabled={loading}
              sx={{ borderRadius: 3 }}
            >
              Yenile
            </Button>
            <IconButton
              onClick={() => setSettingsOpen(true)}
              sx={{ 
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                color: 'white',
                '&:hover': {
                  transform: 'scale(1.1)',
                },
              }}
            >
              <Settings />
            </IconButton>
          </Box>
        </Box>
      </motion.div>

      {/* Tabs */}
      <Tabs 
        value={currentTab} 
        onChange={(e, newValue) => setCurrentTab(newValue)}
        sx={{ mb: 3 }}
        variant={isMobile ? 'scrollable' : 'standard'}
        scrollButtons="auto"
      >
        <Tab label="📊 Genel Bakış" />
        <Tab label="⚡ Performans" />
        <Tab label="🔧 Servisler" />
        <Tab label="🚨 Uyarılar" />
        <Tab label="📈 Analitik" />
      </Tabs>

      {/* Genel Bakış Tab */}
      {currentTab === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Grid container spacing={3}>
            {metricCards.map((metric, index) => (
              <Grid item xs={12} sm={6} md={4} lg={2.4} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <StyledMetricCard>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ 
                          p: 1.5, 
                          borderRadius: 2, 
                          background: `linear-gradient(135deg, ${alpha(metric.color, 0.1)}, ${alpha(metric.color, 0.05)})`,
                          color: metric.color,
                        }}>
                          {metric.icon}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getTrendIcon(metric.trend)}
                          <Chip
                            label={metric.status.toUpperCase()}
                            color={getStatusColor(metric.status)}
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                          />
                        </Box>
                      </Box>
                      
                      <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
                        <AnimatedCounter value={typeof metric.value === 'number' ? metric.value : 0} />
                        {metric.unit && <Typography component="span" variant="h6" color="text.secondary" sx={{ ml: 1 }}>{metric.unit}</Typography>}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {metric.title}
                      </Typography>
                      
                      <LinearProgress
                        variant="determinate"
                        value={metric.target ? (metric.value as number / metric.target) * 100 : 0}
                        color={getStatusColor(metric.status)}
                        sx={{ 
                          mb: 2, 
                          height: 8, 
                          borderRadius: 4,
                          background: alpha(metric.color, 0.1),
                        }}
                      />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Hedef: {metric.target}{metric.unit}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color={metric.change > 0 ? 'error.main' : 'success.main'}
                          fontWeight="bold"
                        >
                          {metric.change > 0 ? '+' : ''}{metric.change}%
                        </Typography>
                      </Box>
                    </CardContent>
                  </StyledMetricCard>
                </motion.div>
              </Grid>
            ))}
          </Grid>

          {/* Sistem Sağlık Durumu */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <StyledCard sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  🏥 Sistem Sağlık Durumu
                </Typography>
                <Grid container spacing={3}>
                  {systemHealth && Object.entries(systemHealth).filter(([key]) => key !== 'timestamp').map(([key, value]) => (
                    <Grid item xs={12} sm={6} md={3} key={key}>
                      <Box sx={{ 
                        p: 2, 
                        borderRadius: 2, 
                        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)}, ${alpha(theme.palette.background.paper, 0.6)})`,
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          {key.toUpperCase()}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={value.toUpperCase()}
                            color={getStatusColor(value)}
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                          />
                          {value === 'healthy' && <CheckCircle color="success" />}
                          {value === 'warning' && <Warning color="warning" />}
                          {value === 'critical' && <Error color="error" />}
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </StyledCard>
          </motion.div>
        </motion.div>
      )}

      {/* Performans Tab */}
      {currentTab === 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <StyledCard>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    📈 Son 24 Saat Performans Trendi
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                      <XAxis 
                        dataKey="timestamp" 
                        stroke={theme.palette.text.secondary}
                        fontSize={12}
                      />
                      <YAxis 
                        stroke={theme.palette.text.secondary}
                        fontSize={12}
                      />
                      <RechartsTooltip 
                        contentStyle={{
                          background: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 8,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="cpu"
                        stroke={theme.palette.primary.main}
                        strokeWidth={3}
                        name="CPU (%)"
                        dot={{ fill: theme.palette.primary.main, strokeWidth: 2, r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="memory"
                        stroke={theme.palette.secondary.main}
                        strokeWidth={3}
                        name="Memory (%)"
                        dot={{ fill: theme.palette.secondary.main, strokeWidth: 2, r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="disk"
                        stroke={theme.palette.warning.main}
                        strokeWidth={3}
                        name="Disk (%)"
                        dot={{ fill: theme.palette.warning.main, strokeWidth: 2, r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="network"
                        stroke={theme.palette.error.main}
                        strokeWidth={3}
                        name="Network (%)"
                        dot={{ fill: theme.palette.error.main, strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </StyledCard>
            </Grid>
          </Grid>
        </motion.div>
      )}

      {/* Servisler Tab */}
      {currentTab === 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <StyledCard>
            <CardContent>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                🔧 Servis Durumları
              </Typography>
              <List>
                {serviceStatus.map((service, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <ListItem sx={{ 
                      p: 2, 
                      borderRadius: 2, 
                      mb: 1,
                      background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)}, ${alpha(theme.palette.background.paper, 0.6)})`,
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    }}>
                      <ListItemIcon>
                        <Box sx={{ 
                          p: 1, 
                          borderRadius: 1, 
                          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.primary.main, 0.05)})`,
                          color: theme.palette.primary.main,
                        }}>
                          <Api />
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={service.name}
                        secondary={`Uptime: ${service.uptime}% | Son Kontrol: ${format(new Date(service.lastCheck), 'dd/MM/yyyy HH:mm', { locale: tr })}`}
                      />
                      <Chip
                        label={service.status.toUpperCase()}
                        color={getStatusColor(service.status)}
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </ListItem>
                  </motion.div>
                ))}
              </List>
            </CardContent>
          </StyledCard>
        </motion.div>
      )}

      {/* Uyarılar Tab */}
      {currentTab === 3 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Grid container spacing={3}>
            {alerts.map((alert, index) => (
              <Grid item xs={12} sm={6} md={4} key={alert.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <StyledCard>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold">
                          {alert.title}
                        </Typography>
                        <Chip
                          label={alert.severity.toUpperCase()}
                          color={getSeverityColor(alert.severity)}
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {alert.description}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(alert.timestamp), 'dd/MM/yyyy HH:mm', { locale: tr })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {alert.category}
                        </Typography>
                      </Box>
                      
                      {!alert.resolved && (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => resolveAlert(alert.id)}
                          sx={{ 
                            background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                            '&:hover': {
                              background: `linear-gradient(135deg, ${theme.palette.success.dark}, ${theme.palette.success.main})`,
                            },
                          }}
                        >
                          Çöz
                        </Button>
                      )}
                    </CardContent>
                  </StyledCard>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </motion.div>
      )}

      {/* Analitik Tab */}
      {currentTab === 4 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <StyledCard>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    📊 Hata Dağılımı
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: '4xx Hatalar', value: 45, color: theme.palette.warning.main },
                          { name: '5xx Hatalar', value: 15, color: theme.palette.error.main },
                          { name: 'Timeout', value: 25, color: theme.palette.info.main },
                          { name: 'Diğer', value: 15, color: theme.palette.secondary.main },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { name: '4xx Hatalar', value: 45, color: theme.palette.warning.main },
                          { name: '5xx Hatalar', value: 15, color: theme.palette.error.main },
                          { name: 'Timeout', value: 25, color: theme.palette.info.main },
                          { name: 'Diğer', value: 15, color: theme.palette.secondary.main },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </StyledCard>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <StyledCard>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    📈 İstek Trendi
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceData.slice(-12)}>
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                      <XAxis dataKey="timestamp" stroke={theme.palette.text.secondary} fontSize={12} />
                      <YAxis stroke={theme.palette.text.secondary} fontSize={12} />
                      <RechartsTooltip 
                        contentStyle={{
                          background: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 8,
                        }}
                      />
                      <Bar 
                        dataKey="requests" 
                        fill={theme.palette.primary.main}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </StyledCard>
            </Grid>
          </Grid>
        </motion.div>
      )}

      {/* Ayarlar Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            ⚙️ Sistem Ayarları
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  color="primary"
                />
              }
              label="Otomatik Yenileme"
            />
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Yenileme Aralığı (saniye)
              </Typography>
              <Slider
                value={refreshInterval}
                onChange={(e, value) => setRefreshInterval(value as number)}
                min={10}
                max={300}
                step={10}
                marks={[
                  { value: 10, label: '10s' },
                  { value: 30, label: '30s' },
                  { value: 60, label: '1m' },
                  { value: 300, label: '5m' },
                ]}
                valueLabelDisplay="auto"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Kapat</Button>
          <Button variant="contained" onClick={() => setSettingsOpen(false)}>
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      {/* Loading Overlay */}
      {loading && (
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: alpha(theme.palette.background.paper, 0.8),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Sistem verileri yükleniyor...
            </Typography>
          </Box>
        </Box>
      )}

      <NotificationComponent />
    </Box>
  );
};

export default UltraModernSystemHealth;
