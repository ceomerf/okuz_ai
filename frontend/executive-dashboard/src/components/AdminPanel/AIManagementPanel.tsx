import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  Tooltip,
  Alert,
  CircularProgress,
  Avatar,
  Badge,
  Tabs,
  Tab,
  Grid,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import {
  Search,
  FilterList,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  Psychology,
  Timeline,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Cancel,
  Warning,
  Refresh,
  Download,
  Upload,
  Add,
  Settings,
  Assessment,
  BugReport,
  Speed,
  Memory,
  Cloud,
  Security,
  Analytics,
  Code,
  PlayArrow,
  Stop,
  Pause,
  PlayCircleOutline,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale/tr';
import { aiManagementApi } from '../../services/aiManagementApi';

// Types
interface AIStats {
  overview: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
    failureRate: number;
    averageResponseTime: number;
    totalTokens: number;
    totalCost: number;
  };
  serviceBreakdown: Array<{
    service: string;
    _count: { id: number };
    _sum: { cost: number; tokensUsed: number };
    _avg: { responseTime: number };
  }>;
  dailyUsage: Array<{
    date: string;
    requests: number;
    cost: number;
  }>;
  hourlyUsage: Array<{
    hour: string;
    requests: number;
    cost: number;
  }>;
}

interface AILog {
  id: string;
  service: string;
  prompt: string;
  response: string;
  status: string;
  level: string;
  errorMessage?: string;
  responseTime: number;
  tokensUsed: number;
  cost: number;
  userId: string;
  createdAt: string;
  metadata?: any;
}

interface AIService {
  name: string;
  totalRequests: number;
  totalCost: number;
  averageResponseTime: number;
}

interface AIModel {
  name: string;
  status: string;
  lastUsed: string;
  successRate: number;
  averageResponseTime: number;
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
      id={`ai-tabpanel-${index}`}
      aria-labelledby={`ai-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AIManagementPanel: React.FC = () => {
  const [aiStats, setAiStats] = useState<AIStats | null>(null);
  const [aiLogs, setAiLogs] = useState<AILog[]>([]);
  const [aiServices, setAiServices] = useState<AIService[]>([]);
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalLogs, setTotalLogs] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedLog, setSelectedLog] = useState<AILog | null>(null);
  const [logDetailsOpen, setLogDetailsOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testService, setTestService] = useState('');
  const [testPrompt, setTestPrompt] = useState('');
  const [testSubmitting, setTestSubmitting] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const searchDebounceRef = useRef<number | undefined>(undefined);

  // Mock fallback (geçici)
  const mockAIStats: AIStats = {
    overview: {
      totalRequests: 15420,
      successfulRequests: 14850,
      failedRequests: 570,
      successRate: 96.3,
      failureRate: 3.7,
      averageResponseTime: 1.2,
      totalTokens: 2450000,
      totalCost: 12.45,
    },
    serviceBreakdown: [
      {
        service: 'GPT-4',
        _count: { id: 8500 },
        _sum: { cost: 8.5, tokensUsed: 1200000 },
        _avg: { responseTime: 1.5 },
      },
      {
        service: 'GPT-3.5-turbo',
        _count: { id: 5200 },
        _sum: { cost: 2.6, tokensUsed: 800000 },
        _avg: { responseTime: 0.8 },
      },
      {
        service: 'Claude-3',
        _count: { id: 1720 },
        _sum: { cost: 1.35, tokensUsed: 450000 },
        _avg: { responseTime: 1.8 },
      },
    ],
    dailyUsage: [
      { date: '2024-01-20', requests: 450, cost: 0.45 },
      { date: '2024-01-19', requests: 380, cost: 0.38 },
      { date: '2024-01-18', requests: 520, cost: 0.52 },
    ],
    hourlyUsage: [
      { hour: '00:00', requests: 15, cost: 0.015 },
      { hour: '01:00', requests: 8, cost: 0.008 },
      { hour: '02:00', requests: 5, cost: 0.005 },
    ],
  };

  const mockAILogs: AILog[] = [
    {
      id: '1',
      service: 'GPT-4',
      prompt: 'Öğrenci performansını analiz et',
      response: 'Öğrenci performansı iyi durumda...',
      status: 'SUCCESS',
      level: 'INFO',
      responseTime: 1200,
      tokensUsed: 150,
      cost: 0.0015,
      userId: 'user1',
      createdAt: '2024-01-20T14:30:00Z',
    },
    {
      id: '2',
      service: 'GPT-3.5-turbo',
      prompt: 'Matematik problemi çöz',
      response: '',
      status: 'ERROR',
      level: 'ERROR',
      errorMessage: 'Rate limit exceeded',
      responseTime: 0,
      tokensUsed: 0,
      cost: 0,
      userId: 'user2',
      createdAt: '2024-01-20T14:25:00Z',
    },
  ];

  const mockAIServices: AIService[] = [
    {
      name: 'GPT-4',
      totalRequests: 8500,
      totalCost: 8.5,
      averageResponseTime: 1.5,
    },
    {
      name: 'GPT-3.5-turbo',
      totalRequests: 5200,
      totalCost: 2.6,
      averageResponseTime: 0.8,
    },
    {
      name: 'Claude-3',
      totalRequests: 1720,
      totalCost: 1.35,
      averageResponseTime: 1.8,
    },
  ];

  const mockAIModels: AIModel[] = [
    {
      name: 'GPT-4',
      status: 'ACTIVE',
      lastUsed: '2024-01-20T14:30:00Z',
      successRate: 98.5,
      averageResponseTime: 1200,
    },
    {
      name: 'GPT-3.5-turbo',
      status: 'ACTIVE',
      lastUsed: '2024-01-20T14:25:00Z',
      successRate: 99.2,
      averageResponseTime: 800,
    },
    {
      name: 'Claude-3',
      status: 'MAINTENANCE',
      lastUsed: '2024-01-20T10:00:00Z',
      successRate: 95.5,
      averageResponseTime: 2000,
    },
  ];

  useEffect(() => {
    loadAIStats();
    // searchTerm backend'de desteklenmiyor; client-side filtreleme uygulanacak
  }, []);

  useEffect(() => {
    loadAILogs();
  }, [page, rowsPerPage, levelFilter, serviceFilter, statusFilter]);

  useEffect(() => {
    loadAIServices();
    loadAIModels();
  }, []);

  // Filtre değiştiğinde sayfayı sıfırla
  useEffect(() => {
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelFilter, serviceFilter, statusFilter]);

  const loadAIStats = async () => {
    setStatsLoading(true);
    try {
      const res = await aiManagementApi.getAIStats();
      if (res?.success && res.data) {
        // Servis tipleri farklı olabilir; panel tipine uydurmak için dönüştürme gerekebilir
        setAiStats({
          overview: {
            totalRequests: (res.data as any).totalRequests ?? 0,
            successfulRequests: (res.data as any).successfulRequests ?? 0,
            failedRequests: (res.data as any).failedRequests ?? 0,
            successRate: (res.data as any).successRate ?? 0,
            failureRate: (res.data as any).failureRate ?? 0,
            averageResponseTime: (res.data as any).averageResponseTime ?? 0,
            totalTokens: (res.data as any).totalTokens ?? 0,
            totalCost: (res.data as any).totalCost ?? 0,
          },
          serviceBreakdown: (res.data as any).serviceBreakdown ?? [],
          dailyUsage: (res.data as any).dailyUsage ?? [],
          hourlyUsage: (res.data as any).hourlyUsage ?? [],
        });
      } else {
        setAiStats(mockAIStats);
      }
    } catch (error) {
      console.error('AI istatistikleri yüklenemedi:', error);
      setAiStats(mockAIStats);
      setSnackbarSeverity('error');
      setSnackbarMessage('AI istatistikleri yüklenemedi');
      setSnackbarOpen(true);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadAILogs = async () => {
    setLogsLoading(true);
    try {
      const res = await aiManagementApi.getAILogs(page + 1, rowsPerPage, {
        level: levelFilter || undefined,
        service: serviceFilter || undefined,
      });
      if (res?.success && (res.data as any)?.data) {
        const payload = res.data as any;
        const mappedLogs: AILog[] = (payload.data || []).map((l: any) => ({
          id: String(l.id ?? ''),
          service: l.service ?? l.model ?? 'UNKNOWN',
          prompt: l.prompt ?? '',
          response: l.response ?? '',
          status: l.status ?? 'INFO',
          level: l.level ?? 'INFO',
          errorMessage: l.error || l.errorMessage,
          responseTime: l.responseTime ?? 0,
          tokensUsed: l.tokensUsed ?? l.tokens?.total ?? 0,
          cost: l.cost ?? 0,
          userId: String(l.userId ?? ''),
          createdAt: l.createdAt ?? new Date().toISOString(),
          metadata: l.metadata,
        }));
        setAiLogs(mappedLogs);
        setTotalLogs(payload.pagination?.total ?? mappedLogs.length);
      } else {
        setAiLogs(mockAILogs);
        setTotalLogs(150);
      }
    } catch (error) {
      console.error('AI logları yüklenemedi:', error);
      setAiLogs(mockAILogs);
      setTotalLogs(150);
      setSnackbarSeverity('error');
      setSnackbarMessage('AI logları yüklenemedi');
      setSnackbarOpen(true);
    } finally {
      setLogsLoading(false);
    }
  };

  const loadAIServices = async () => {
    setServicesLoading(true);
    try {
      const res = await aiManagementApi.getAIServices();
      if (res?.success && res.data) {
        setAiServices(res.data as any);
      } else {
        setAiServices(mockAIServices);
      }
    } catch (error) {
      console.error('AI servisleri yüklenemedi:', error);
      setAiServices(mockAIServices);
      setSnackbarSeverity('error');
      setSnackbarMessage('AI servisleri yüklenemedi');
      setSnackbarOpen(true);
    } finally {
      setServicesLoading(false);
    }
  };

  const loadAIModels = async () => {
    setModelsLoading(true);
    try {
      const res = await aiManagementApi.getAIModels();
      if (res?.success && res.data) {
        setAiModels(res.data as any);
      } else {
        setAiModels(mockAIModels);
      }
    } catch (error) {
      console.error('AI modelleri yüklenemedi:', error);
      setAiModels(mockAIModels);
      setSnackbarSeverity('error');
      setSnackbarMessage('AI modelleri yüklenemedi');
      setSnackbarOpen(true);
    } finally {
      setModelsLoading(false);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSelectLog = (logId: string) => {
    setSelectedLogs(prev => 
      prev.includes(logId) 
        ? prev.filter(id => id !== logId)
        : [...prev, logId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLogs.length === aiLogs.length) {
      setSelectedLogs([]);
    } else {
      setSelectedLogs(aiLogs.map(log => log.id));
    }
  };

  const handleLogDetails = (log: AILog) => {
    setSelectedLog(log);
    setLogDetailsOpen(true);
  };

  const handleTestService = () => {
    setTestDialogOpen(true);
  };

  const handleRunTest = async () => {
    if (!testService || !testPrompt) {
      setSnackbarSeverity('warning');
      setSnackbarMessage('Servis ve prompt gerekli');
      setSnackbarOpen(true);
      return;
    }
    setTestSubmitting(true);
    try {
      const res = await aiManagementApi.sendAIRequest({ model: testService, prompt: testPrompt });
      if (res?.success && res.data) {
        setSnackbarSeverity('success');
        setSnackbarMessage('Test başarılı');
      } else {
        setSnackbarSeverity('error');
        setSnackbarMessage('Test başarısız');
      }
      setSnackbarOpen(true);
    } catch (e) {
      setSnackbarSeverity('error');
      setSnackbarMessage('Test sırasında hata oluştu');
      setSnackbarOpen(true);
    } finally {
      setTestSubmitting(false);
    }
  };

  // Arama için basit debounce (client-side filtreleme amaçlı)
  const debouncedSearchTerm = useMemo(() => searchTerm, [searchTerm]);
  useEffect(() => {
    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = window.setTimeout(() => {
      // ileride server-side desteklenirse burada loadAILogs çağrılabilir
    }, 400);
    return () => {
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current);
      }
    };
  }, [debouncedSearchTerm]);

  const filteredLogs = useMemo(() => {
    if (!searchTerm) return aiLogs;
    const q = searchTerm.toLowerCase();
    return aiLogs.filter(l => (l.prompt || '').toLowerCase().includes(q) || (l.response || '').toLowerCase().includes(q));
  }, [aiLogs, searchTerm]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'success';
      case 'ERROR': return 'error';
      case 'WARNING': return 'warning';
      default: return 'default';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'error';
      case 'WARNING': return 'warning';
      case 'INFO': return 'info';
      default: return 'default';
    }
  };

  const getModelStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'MAINTENANCE': return 'warning';
      case 'INACTIVE': return 'error';
      default: return 'default';
    }
  };

  const colorFor = (key: string) => {
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ 
          color: 'primary.main',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #FF6B35 0%, #FFA726 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          🤖 AI Sistem Yönetimi
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadAIStats}
            disabled={loading}
          >
            Yenile
          </Button>
          <Button
            variant="outlined"
            startIcon={<PlayArrow />}
            onClick={handleTestService}
          >
            Servis Testi
          </Button>
          <Button
            variant="contained"
            startIcon={<Settings />}
            onClick={() => console.log('AI ayarları')}
          >
            AI Ayarları
          </Button>
        </Box>
      </Box>

      {/* AI Stats Overview */}
      {aiStats && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
          <Box sx={{ flex: '1 1 24%', minWidth: '240px' }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <Psychology />
                  </Avatar>
                  <Box>
                    <Typography variant="h4">{aiStats.overview.totalRequests.toLocaleString()}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Toplam İstek
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: '1 1 24%', minWidth: '240px' }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <CheckCircle />
                  </Avatar>
                  <Box>
                    <Typography variant="h4">{aiStats.overview.successRate}%</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Başarı Oranı
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: '1 1 24%', minWidth: '240px' }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <Speed />
                  </Avatar>
                  <Box>
                    <Typography variant="h4">{aiStats.overview.averageResponseTime}s</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ort. Yanıt Süresi
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: '1 1 24%', minWidth: '240px' }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'error.main' }}>
                    <Memory />
                  </Avatar>
                  <Box>
                    <Typography variant="h4">${aiStats.overview.totalCost.toFixed(2)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Toplam Maliyet
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {/* AI Models Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            AI Model Durumları
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {aiModels.map((model) => (
              <Box key={model.name} sx={{ flex: '1 1 32%', minWidth: '280px' }}>
                <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {model.name}
                    </Typography>
                    <Chip
                      label={model.status}
                      color={getModelStatusColor(model.status) as any}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Son kullanım: {format(new Date(model.lastUsed), 'dd.MM.yyyy HH:mm', { locale: tr })}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Başarı Oranı
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {model.successRate}%
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Ort. Süre
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {model.averageResponseTime}ms
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
            <Tab label="İstatistikler" />
            <Tab label="Loglar" />
            <Tab label="Servisler" />
            <Tab label="Performans" />
          </Tabs>
        </Box>

        <TabPanel value={currentTab} index={0}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ flex: '1 1 64%', minWidth: '300px' }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Günlük Kullanım Trendi
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={aiStats?.dailyUsage || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <RechartsTooltip />
                      <Area type="monotone" dataKey="requests" stroke="#8884d8" fill="#8884d8" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 32%', minWidth: '280px' }}>
            <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Servis Dağılımı
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={aiStats?.serviceBreakdown || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: any) => `${entry.service}: ${entry._count?.id ?? 0}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey={(d: any) => d?._count?.id ?? 0}
                      >
                        {(aiStats?.serviceBreakdown || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={colorFor(entry.service || String(index))} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          {/* Filters */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <Box sx={{ flex: '1 1 30%', minWidth: '240px' }}>
                  <TextField
                    fullWidth
                    label="Arama"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                </Box>
                <Box sx={{ flex: '1 1 15%', minWidth: '200px' }}>
                  <FormControl fullWidth>
                    <InputLabel>Seviye</InputLabel>
                    <Select
                      value={levelFilter}
                      onChange={(e) => setLevelFilter(e.target.value)}
                      label="Seviye"
                    >
                      <MenuItem value="">Tümü</MenuItem>
                      <MenuItem value="ERROR">Hata</MenuItem>
                      <MenuItem value="WARNING">Uyarı</MenuItem>
                      <MenuItem value="INFO">Bilgi</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ flex: '1 1 15%', minWidth: '200px' }}>
                  <FormControl fullWidth>
                    <InputLabel>Servis</InputLabel>
                    <Select
                      value={serviceFilter}
                      onChange={(e) => setServiceFilter(e.target.value)}
                      label="Servis"
                    >
                      <MenuItem value="">Tümü</MenuItem>
                      <MenuItem value="GPT-4">GPT-4</MenuItem>
                      <MenuItem value="GPT-3.5-turbo">GPT-3.5-turbo</MenuItem>
                      <MenuItem value="Claude-3">Claude-3</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ flex: '1 1 15%', minWidth: '200px' }}>
                  <FormControl fullWidth>
                    <InputLabel>Durum</InputLabel>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      label="Durum"
                    >
                      <MenuItem value="">Tümü</MenuItem>
                      <MenuItem value="SUCCESS">Başarılı</MenuItem>
                      <MenuItem value="ERROR">Hatalı</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ flex: '1 1 20%', minWidth: '240px' }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<Download />}
                      onClick={() => console.log('Logları dışa aktar')}
                    >
                      Dışa Aktar
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<FilterList />}
                      onClick={() => console.log('Gelişmiş filtreler')}
                    >
                      Filtreler
                    </Button>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedLogs.length > 0 && selectedLogs.length < aiLogs.length}
                        checked={selectedLogs.length === aiLogs.length && aiLogs.length > 0}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell>Servis</TableCell>
                    <TableCell>Prompt</TableCell>
                    <TableCell>Durum</TableCell>
                    <TableCell>Seviye</TableCell>
                    <TableCell>Yanıt Süresi</TableCell>
                    <TableCell>Token</TableCell>
                    <TableCell>Maliyet</TableCell>
                    <TableCell>Tarih</TableCell>
                    <TableCell align="center">İşlemler</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logsLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedLogs.includes(log.id)}
                            onChange={() => handleSelectLog(log.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip label={log.service} size="small" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {log.prompt}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={log.status}
                            color={getStatusColor(log.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={log.level}
                            color={getLevelColor(log.level) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {log.responseTime}ms
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {log.tokensUsed.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            ${log.cost.toFixed(4)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {format(new Date(log.createdAt), 'dd.MM.yyyy HH:mm', { locale: tr })}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            onClick={(e) => {
                              setAnchorEl(e.currentTarget);
                              setSelectedLog(log);
                            }}
                          >
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[10, 20, 50, 100]}
              component="div"
              count={totalLogs}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Card>
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {aiServices.map((service) => (
              <Box key={service.name} sx={{ flex: '1 1 32%', minWidth: '280px' }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">{service.name}</Typography>
                      <Chip label="Aktif" color="success" size="small" />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Toplam İstek
                      </Typography>
                      <Typography variant="h6">
                        {service.totalRequests.toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Toplam Maliyet
                      </Typography>
                      <Typography variant="h6">
                        ${service.totalCost.toFixed(2)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Ortalama Yanıt Süresi
                      </Typography>
                      <Typography variant="h6">
                        {service.averageResponseTime}s
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ flex: '1 1 48%', minWidth: '300px' }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Yanıt Süresi Trendi
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={aiStats?.hourlyUsage || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <RechartsTooltip />
                      <Line type="monotone" dataKey="requests" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 48%', minWidth: '300px' }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Maliyet Dağılımı
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={aiStats?.serviceBreakdown || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="service" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="_sum.cost" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </TabPanel>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          setAnchorEl(null);
          if (selectedLog) handleLogDetails(selectedLog);
        }}>
          <Visibility sx={{ mr: 1 }} />
          Detayları Gör
        </MenuItem>
        <MenuItem onClick={() => {
          setAnchorEl(null);
          console.log('Logu kopyala:', selectedLog?.id);
        }}>
          <Code sx={{ mr: 1 }} />
          Kopyala
        </MenuItem>
        <MenuItem onClick={() => {
          setAnchorEl(null);
          console.log('Logu analiz et:', selectedLog?.id);
        }}>
          <Analytics sx={{ mr: 1 }} />
          Analiz Et
        </MenuItem>
      </Menu>

      {/* Log Details Dialog */}
      <Dialog
        open={logDetailsOpen}
        onClose={() => setLogDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Psychology />
            <Box>
              <Typography variant="h6">AI Log Detayları</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedLog?.service} • {selectedLog?.status}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: '1 1 48%', minWidth: '300px' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Prompt
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2">
                      {selectedLog.prompt}
                    </Typography>
                  </Paper>
                </Box>
                <Box sx={{ flex: '1 1 48%', minWidth: '300px' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Yanıt
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2">
                      {selectedLog.response || 'Yanıt yok'}
                    </Typography>
                  </Paper>
                </Box>
                {selectedLog.errorMessage && (
                  <Box sx={{ flex: '1 1 100%' }}>
                    <Typography variant="subtitle1" gutterBottom color="error">
                      Hata Mesajı
                    </Typography>
                    <Alert severity="error">
                      {selectedLog.errorMessage}
                    </Alert>
                  </Box>
                )}
                <Box sx={{ flex: '1 1 100%' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Metrikler
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ flex: '1 1 22%', minWidth: '180px' }}>
                      <Typography variant="body2" color="text.secondary">
                        Yanıt Süresi
                      </Typography>
                      <Typography variant="h6">
                        {selectedLog.responseTime}ms
                      </Typography>
                    </Box>
                    <Box sx={{ flex: '1 1 22%', minWidth: '180px' }}>
                      <Typography variant="body2" color="text.secondary">
                        Token Kullanımı
                      </Typography>
                      <Typography variant="h6">
                        {selectedLog.tokensUsed.toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: '1 1 22%', minWidth: '180px' }}>
                      <Typography variant="body2" color="text.secondary">
                        Maliyet
                      </Typography>
                      <Typography variant="h6">
                        ${selectedLog.cost.toFixed(4)}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: '1 1 22%', minWidth: '180px' }}>
                      <Typography variant="body2" color="text.secondary">
                        Tarih
                      </Typography>
                      <Typography variant="h6">
                        {format(new Date(selectedLog.createdAt), 'dd.MM.yyyy HH:mm', { locale: tr })}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogDetailsOpen(false)}>
            Kapat
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Service Dialog */}
      <Dialog
        open={testDialogOpen}
        onClose={() => setTestDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>AI Servis Testi</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Servis</InputLabel>
              <Select
                value={testService}
                onChange={(e) => setTestService(e.target.value)}
                label="Servis"
              >
                <MenuItem value="GPT-4">GPT-4</MenuItem>
                <MenuItem value="GPT-3.5-turbo">GPT-3.5-turbo</MenuItem>
                <MenuItem value="Claude-3">Claude-3</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Test Prompt'u"
              multiline
              rows={4}
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Test etmek istediğiniz prompt'u buraya yazın..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)} disabled={testSubmitting}>
            İptal
          </Button>
          <Button variant="contained" onClick={handleRunTest} disabled={testSubmitting}>
            {testSubmitting ? 'Çalışıyor...' : 'Test Başlat'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AIManagementPanel;
