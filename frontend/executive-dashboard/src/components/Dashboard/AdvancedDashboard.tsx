import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  IconButton,
  Button,
  Avatar,
  Badge,
  Tooltip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  School,
  Book,
  Quiz,
  Assessment,
  Analytics,
  Notifications,
  Email,
  Phone,
  LocationOn,
  CalendarToday,
  Star,
  StarBorder,
  CheckCircle,
  Cancel,
  Warning,
  Info,
  Edit,
  Delete,
  Add,
  Refresh,
  Download,
  Upload,
  Visibility,
  MoreVert,
  Person,
  Group,
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
  Backup,
  Flag,
  ViewComfy,
  Dashboard,
  Security,
  Settings,
  NotificationsActive,
  NotificationsOff,
  VolumeUp,
  VolumeOff,
  Wifi,
  WifiOff,
  BatteryFull,
  BatteryAlert,
  Storage,
  Memory,
  Speed,
  Timer,
  Schedule,
  Event,
  Assignment,
  Task,
  Done,
  Pending,
  Error,
  CheckCircle as Success,
  Info as InfoIcon,
} from '@mui/icons-material';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { tr } from 'date-fns/locale/tr';

// Veri tipleri
interface Metric {
  title: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  color: string;
  format?: 'number' | 'currency' | 'percentage';
}

interface Activity {
  id: string;
  type: 'user' | 'system' | 'error' | 'success';
  message: string;
  timestamp: string;
  user?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

interface QuickStat {
  label: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  color: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AdvancedDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Gerçek veri için state
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  
  // Yeni sistem verileri için state'ler
  const [notificationData, setNotificationData] = useState<any>(null);
  const [securityData, setSecurityData] = useState<any>(null);
  const [mlData, setMLData] = useState<any>(null);
  const [reportingData, setReportingData] = useState<any>(null);
  const [rateLimitingData, setRateLimitingData] = useState<any>(null);
  const [auditData, setAuditData] = useState<any>(null);
  const [backupData, setBackupData] = useState<any>(null);
  const [featureFlagsData, setFeatureFlagsData] = useState<any>(null);
  const [aiManagementData, setAiManagementData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [realtimeData, setRealtimeData] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [exportData, setExportData] = useState<any>(null);

  // API'den veri çekme
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Backend'den dashboard verilerini çek
        const response = await fetch('http://localhost:3002/api/executive/dashboard', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setDashboardData(data);
          
          // Gerçek verilerle metrics'i güncelle
          setMetrics([
            {
              title: 'Toplam Kullanıcı',
              value: data.quickStats?.totalUsers || 0,
              change: 0, // Bu değer analytics'ten hesaplanabilir
              trend: 'up',
              icon: <People />,
              color: '#4caf50',
              format: 'number',
            },
            {
              title: 'Aktif Öğrenci',
              value: data.quickStats?.totalStudents || 0,
              change: 0,
              trend: 'up',
              icon: <School />,
              color: '#2196f3',
              format: 'number',
            },
            {
              title: 'Aylık Gelir',
              value: data.quickStats?.monthlyRevenue || 0,
              change: 0,
              trend: 'up',
              icon: <Assessment />,
              color: '#ff9800',
              format: 'currency',
            },
            {
              title: 'Sistem Uptime',
              value: data.quickStats?.systemUptime || 0,
              change: 0,
              trend: 'up',
              icon: <Analytics />,
              color: '#9c27b0',
              format: 'percentage',
            },
          ]);
        } else {
          // API başarısızsa mock veri kullan
          setMetrics([
            {
              title: 'Toplam Kullanıcı',
              value: 0,
              change: 0,
              trend: 'stable',
              icon: <People />,
              color: '#4caf50',
              format: 'number',
            },
            {
              title: 'Aktif Öğrenci',
              value: 0,
              change: 0,
              trend: 'stable',
              icon: <School />,
              color: '#2196f3',
              format: 'number',
            },
            {
              title: 'Aylık Gelir',
              value: 0,
              change: 0,
              trend: 'stable',
              icon: <Assessment />,
              color: '#ff9800',
              format: 'currency',
            },
            {
              title: 'Sistem Uptime',
              value: 0,
              change: 0,
              trend: 'stable',
              icon: <Analytics />,
              color: '#9c27b0',
              format: 'percentage',
            },
          ]);
        }
      } catch (error) {
        console.error('Dashboard verileri yüklenemedi:', error);
        // Hata durumunda boş veri göster
        setMetrics([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Yeni sistem verilerini çekme
  useEffect(() => {
    const fetchNotificationData = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/notification-management/dashboard', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setNotificationData(data);
        }
      } catch (error) {
        console.error('Failed to fetch notification data:', error);
      }
    };

    fetchNotificationData();
  }, []);

  useEffect(() => {
    const fetchSecurityData = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/security/dashboard', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setSecurityData(data);
        }
      } catch (error) {
        console.error('Failed to fetch security data:', error);
      }
    };

    fetchSecurityData();
  }, []);

  useEffect(() => {
    const fetchMLData = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/ml/dashboard', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setMLData(data);
        }
      } catch (error) {
        console.error('Failed to fetch ML data:', error);
      }
    };

    fetchMLData();
  }, []);

  useEffect(() => {
    const fetchReportingData = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/reporting/dashboard', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setReportingData(data);
        }
      } catch (error) {
        console.error('Failed to fetch reporting data:', error);
      }
    };

    fetchReportingData();
  }, []);

  useEffect(() => {
    const fetchRateLimitingData = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/rate-limiting/dashboard', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setRateLimitingData(data);
        }
      } catch (error) {
        console.error('Failed to fetch rate limiting data:', error);
      }
    };

    fetchRateLimitingData();
  }, []);

  useEffect(() => {
    const fetchAuditData = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/audit/dashboard', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setAuditData(data);
        }
      } catch (error) {
        console.error('Failed to fetch audit data:', error);
      }
    };

    fetchAuditData();
  }, []);

  useEffect(() => {
    const fetchBackupData = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/backup/dashboard', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setBackupData(data);
        }
      } catch (error) {
        console.error('Failed to fetch backup data:', error);
      }
    };

    fetchBackupData();
  }, []);

  useEffect(() => {
    const fetchFeatureFlagsData = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/feature-flags/dashboard', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setFeatureFlagsData(data);
        }
      } catch (error) {
        console.error('Failed to fetch feature flags data:', error);
      }
    };

    fetchFeatureFlagsData();
  }, []);

  useEffect(() => {
    const fetchAIManagementData = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/ai/management', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setAiManagementData(data);
        }
      } catch (error) {
        console.error('Failed to fetch AI management data:', error);
      }
    };

    fetchAIManagementData();
  }, []);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/analytics/advanced', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setAnalyticsData(data);
        }
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
      }
    };

    fetchAnalyticsData();
  }, []);

  useEffect(() => {
    const fetchRealtimeData = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/notifications/realtime', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setRealtimeData(data);
        }
      } catch (error) {
        console.error('Failed to fetch realtime data:', error);
      }
    };

    fetchRealtimeData();
  }, []);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/monitoring/performance', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setPerformanceData(data);
        }
      } catch (error) {
        console.error('Failed to fetch performance data:', error);
      }
    };

    fetchPerformanceData();
  }, []);

  useEffect(() => {
    const fetchTrackingData = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/tracking/activity', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setTrackingData(data);
        }
      } catch (error) {
        console.error('Failed to fetch tracking data:', error);
      }
    };

    fetchTrackingData();
  }, []);

  useEffect(() => {
    const fetchExportData = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/export/data', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setExportData(data);
        }
      } catch (error) {
        console.error('Failed to fetch export data:', error);
      }
    };

    fetchExportData();
  }, []);

  const quickStats: QuickStat[] = [
    { label: 'Bugünkü Girişler', value: '1,247', change: 5.2, trend: 'up', color: '#4caf50' },
    { label: 'Yeni Kayıtlar', value: '23', change: -2.1, trend: 'down', color: '#2196f3' },
    { label: 'Aktif Oturumlar', value: '456', change: 12.8, trend: 'up', color: '#ff9800' },
    { label: 'Hata Oranı', value: '0.02%', change: -0.01, trend: 'down', color: '#f44336' },
  ];

  const recentActivities: Activity[] = [
    {
      id: '1',
      type: 'user',
      message: 'Yeni kullanıcı kaydoldu: Ahmet Yılmaz',
      timestamp: '2024-01-20T10:30:00Z',
      user: 'System',
      severity: 'low',
    },
    {
      id: '2',
      type: 'system',
      message: 'Sistem güncellemesi tamamlandı',
      timestamp: '2024-01-20T09:15:00Z',
      severity: 'medium',
    },
    {
      id: '3',
      type: 'error',
      message: 'Veritabanı bağlantı hatası',
      timestamp: '2024-01-20T08:45:00Z',
      severity: 'high',
    },
    {
      id: '4',
      type: 'success',
      message: 'Yedekleme işlemi başarılı',
      timestamp: '2024-01-20T07:30:00Z',
      severity: 'low',
    },
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLastUpdate(new Date());
      setLoading(false);
    }, 1000);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp color="success" />;
      case 'down': return <TrendingDown color="error" />;
      default: return <TrendingUp color="disabled" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user': return <Person color="primary" />;
      case 'system': return <Settings color="info" />;
      case 'error': return <Error color="error" />;
      case 'success': return <CheckCircle color="success" />;
      default: return <Info color="disabled" />;
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const formatValue = (value: number, format?: string) => {
    switch (format) {
      case 'currency': return `$${value.toLocaleString()}`;
      case 'percentage': return `${value}%`;
      default: return value.toLocaleString();
    }
  };

  return (
    <Box>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                🚀 Gelişmiş Dashboard
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Son güncelleme: {format(lastUpdate, 'dd MMMM yyyy HH:mm', { locale: tr })}
              </Typography>
            </Box>
            <Box display="flex" gap={2}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleRefresh}
                disabled={loading}
              >
                Yenile
              </Button>
              <Button
                variant="contained"
                startIcon={<Download />}
                onClick={() => console.log('Export')}
              >
                Rapor İndir
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Ana Metrikler */}
      <Box display="flex" flexWrap="wrap" gap={3} sx={{ mb: 3 }}>
        {metrics.map((metric, index) => (
          <Box key={index} sx={{ flex: '1 1 300px', minWidth: 300 }}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 1,
                      bgcolor: `${metric.color}20`,
                      color: metric.color,
                    }}
                  >
                    {metric.icon}
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getTrendIcon(metric.trend)}
                    <Typography
                      variant="body2"
                      color={metric.trend === 'up' ? 'success.main' : 'error.main'}
                    >
                      {metric.change > 0 ? '+' : ''}{metric.change}%
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="h4" component="div" gutterBottom>
                  {formatValue(metric.value, metric.format)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {metric.title}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(metric.value / 100, 100)}
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Hızlı İstatistikler */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📊 Hızlı İstatistikler
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={2}>
            {quickStats.map((stat, index) => (
              <Box key={index} sx={{ flex: '1 1 200px', minWidth: 200 }}>
                <Box
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="h5" color={stat.color} gutterBottom>
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {stat.label}
                  </Typography>
                  <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                    {getTrendIcon(stat.trend)}
                    <Typography
                      variant="caption"
                      color={stat.trend === 'up' ? 'success.main' : 'error.main'}
                    >
                      {stat.change > 0 ? '+' : ''}{stat.change}%
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange} aria-label="dashboard tabs">
            <Tab icon={<Timeline />} label="Aktivite" />
            <Tab icon={<Analytics />} label="Analitik" />
            <Tab icon={<Settings />} label="Sistem" />
            <Tab icon={<Security />} label="Güvenlik" />
            <Tab icon={<Notifications />} label="Bildirimler" />
            <Tab icon={<Assessment />} label="Raporlama" />
            <Tab icon={<TrendingUp />} label="ML & AI" />
            <Tab icon={<Backup />} label="Yedekleme" />
            <Tab icon={<Flag />} label="Özellikler" />
          </Tabs>
        </Box>

        {/* Aktivite Tab */}
        <TabPanel value={currentTab} index={0}>
          <Box>
            <Typography variant="h6" gutterBottom>
              🔔 Son Aktiviteler
            </Typography>
            <List>
              {recentActivities.map((activity, index) => (
                <React.Fragment key={activity.id}>
                  <ListItem>
                    <ListItemIcon>
                      {getActivityIcon(activity.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.message}
                      secondary={
                        <Box display="flex" alignItems="center" gap={2}>
                          <Typography variant="caption">
                            {format(new Date(activity.timestamp), 'dd MMM yyyy HH:mm', { locale: tr })}
                          </Typography>
                          {activity.severity && (
                            <Chip
                              label={activity.severity}
                              color={getSeverityColor(activity.severity) as any}
                              size="small"
                            />
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end">
                        <MoreVert />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < recentActivities.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Box>
        </TabPanel>

        {/* Analitik Tab */}
        <TabPanel value={currentTab} index={1}>
          <Box>
            <Typography variant="h6" gutterBottom>
              📈 Detaylı Analitikler
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={3}>
              <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Kullanıcı Dağılımı
                    </Typography>
                    <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                      <CircularProgress size={100} variant="determinate" value={75} />
                      <Box sx={{ position: 'absolute' }}>
                        <Typography variant="h6">75%</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Performans Metrikleri
                    </Typography>
                    <Box>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">CPU Kullanımı</Typography>
                        <Typography variant="body2">45%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={45} />
                      
                      <Box display="flex" justifyContent="space-between" mb={1} mt={2}>
                        <Typography variant="body2">Bellek Kullanımı</Typography>
                        <Typography variant="body2">67%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={67} />
                      
                      <Box display="flex" justifyContent="space-between" mb={1} mt={2}>
                        <Typography variant="body2">Disk Kullanımı</Typography>
                        <Typography variant="body2">23%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={23} />
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </Box>
        </TabPanel>

        {/* Sistem Tab */}
        <TabPanel value={currentTab} index={2}>
          <Box>
            <Typography variant="h6" gutterBottom>
              ⚙️ Sistem Durumu
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={3}>
              <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Servis Durumu
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircle color="success" />
                        </ListItemIcon>
                        <ListItemText primary="Web Sunucu" secondary="Çalışıyor" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircle color="success" />
                        </ListItemIcon>
                        <ListItemText primary="Veritabanı" secondary="Çalışıyor" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircle color="success" />
                        </ListItemIcon>
                        <ListItemText primary="Redis Cache" secondary="Çalışıyor" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <Warning color="warning" />
                        </ListItemIcon>
                        <ListItemText primary="Email Servisi" secondary="Yavaş" />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Sistem Bilgileri
                    </Typography>
                    <Box>
                      <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography variant="body2">Sunucu Adı</Typography>
                        <Typography variant="body2">okuz-ai-server</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography variant="body2">İşletim Sistemi</Typography>
                        <Typography variant="body2">Ubuntu 22.04</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography variant="body2">Node.js Versiyonu</Typography>
                        <Typography variant="body2">v18.17.0</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography variant="body2">Çalışma Süresi</Typography>
                        <Typography variant="body2">15 gün 3 saat</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </Box>
        </TabPanel>

        {/* Güvenlik Tab */}
        <TabPanel value={currentTab} index={3}>
          <Box>
            <Typography variant="h6" gutterBottom>
              🔒 Güvenlik Durumu
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={3}>
              <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Güvenlik Skoru
                    </Typography>
                    <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                      <CircularProgress size={100} variant="determinate" value={85} />
                      <Box sx={{ position: 'absolute' }}>
                        <Typography variant="h6">85/100</Typography>
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      Güvenlik seviyesi yüksek
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Son Güvenlik Olayları
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircle color="success" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="SSL Sertifikası" 
                          secondary="Geçerli (30 gün kaldı)" 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircle color="success" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Firewall" 
                          secondary="Aktif" 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <Warning color="warning" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Son Tarama" 
                          secondary="2 gün önce" 
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </Box>
        </TabPanel>

        {/* Bildirimler Tab */}
        <TabPanel value={currentTab} index={4}>
          <Box>
            <Typography variant="h6" gutterBottom>
              📧 Bildirim Yönetimi
            </Typography>
            {notificationData ? (
              <Box display="flex" flexWrap="wrap" gap={3}>
                <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Bildirim İstatistikleri
                      </Typography>
                      <Typography variant="h4" color="primary">
                        {notificationData.stats?.totalSent || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Toplam Gönderilen
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
                <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Başarı Oranı
                      </Typography>
                      <Typography variant="h4" color="success.main">
                        {notificationData.stats?.deliveryRate || 0}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Teslim Edilen
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            ) : (
              <Typography>Bildirim verileri yükleniyor...</Typography>
            )}
          </Box>
        </TabPanel>

        {/* Raporlama Tab */}
        <TabPanel value={currentTab} index={5}>
          <Box>
            <Typography variant="h6" gutterBottom>
              📊 Gelişmiş Raporlama
            </Typography>
            {reportingData ? (
              <Box display="flex" flexWrap="wrap" gap={3}>
                <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Toplam Rapor
                      </Typography>
                      <Typography variant="h4" color="primary">
                        {reportingData.stats?.totalReports || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Oluşturulan Raporlar
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
                <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Başarı Oranı
                      </Typography>
                      <Typography variant="h4" color="success.main">
                        {reportingData.stats?.successRate || 0}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Başarılı Raporlar
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            ) : (
              <Typography>Raporlama verileri yükleniyor...</Typography>
            )}
          </Box>
        </TabPanel>

        {/* ML & AI Tab */}
        <TabPanel value={currentTab} index={6}>
          <Box>
            <Typography variant="h6" gutterBottom>
              🤖 Makine Öğrenmesi & AI
            </Typography>
            {mlData ? (
              <Box display="flex" flexWrap="wrap" gap={3}>
                <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Aktif Modeller
                      </Typography>
                      <Typography variant="h4" color="primary">
                        {mlData.metrics?.activeModels || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Çalışan ML Modelleri
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
                <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Ortalama Doğruluk
                      </Typography>
                      <Typography variant="h4" color="success.main">
                        {mlData.metrics?.averageAccuracy || 0}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Model Doğruluğu
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            ) : (
              <Typography>ML verileri yükleniyor...</Typography>
            )}
          </Box>
        </TabPanel>

        {/* Yedekleme Tab */}
        <TabPanel value={currentTab} index={7}>
          <Box>
            <Typography variant="h6" gutterBottom>
              💾 Yedekleme Sistemi
            </Typography>
            {backupData ? (
              <Box display="flex" flexWrap="wrap" gap={3}>
                <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Toplam Yedek
                      </Typography>
                      <Typography variant="h4" color="primary">
                        {backupData.stats?.totalBackups || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Oluşturulan Yedekler
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
                <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Toplam Boyut
                      </Typography>
                      <Typography variant="h4" color="info.main">
                        {backupData.stats?.totalSize || 0} MB
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Yedek Boyutu
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            ) : (
              <Typography>Yedekleme verileri yükleniyor...</Typography>
            )}
          </Box>
        </TabPanel>

        {/* Özellikler Tab */}
        <TabPanel value={currentTab} index={8}>
          <Box>
            <Typography variant="h6" gutterBottom>
              🚩 Özellik Bayrakları
            </Typography>
            {featureFlagsData ? (
              <Box display="flex" flexWrap="wrap" gap={3}>
                <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Toplam Bayrak
                      </Typography>
                      <Typography variant="h4" color="primary">
                        {featureFlagsData.stats?.totalFlags || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tanımlanan Bayraklar
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
                <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Aktif Bayrak
                      </Typography>
                      <Typography variant="h4" color="success.main">
                        {featureFlagsData.stats?.enabledFlags || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Etkin Bayraklar
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            ) : (
              <Typography>Özellik bayrağı verileri yükleniyor...</Typography>
            )}
          </Box>
        </TabPanel>
      </Card>

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
          <Box textAlign="center">
            <CircularProgress color="primary" />
            <Typography variant="h6" sx={{ mt: 2, color: 'white' }}>
              Veriler güncelleniyor...
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AdvancedDashboard;
