import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  LinearProgress,
  Tooltip,
  Badge,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Terminal,
  PlayArrow,
  Stop,
  Pause,
  Refresh,
  CheckCircle,
  Error,
  Warning,
  Info,
  History,
  Schedule,
  Timer,
  Speed,
  Memory,
  Storage,
  NetworkCheck,
  Security,
  Settings,
  Code,
  BugReport,
  Report,
  Assessment,
  Analytics,
  Dashboard,
  People,
  School,
  Psychology,
  Notifications,
  Email,
  Phone,
  Cloud,
  CloudOff,
  Wifi,
  WifiOff,
  BatteryFull,
  BatteryAlert,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Add,
  Edit,
  Delete,
  Visibility,
  Download,
  Upload,
  FilterList,
  Search,
  Sort,
  MoreVert,
  ExpandMore,
  ExpandLess,
  AutoAwesome,
  SmartToy,
  PsychologyAlt,
  Insights,
  Lightbulb,
  Rocket,
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
  School as SchoolIcon,
  Book,
  Quiz,
  Assignment,
  LibraryBooks,
  MenuBook,
  AutoStories,
  Article,
  Description,
  TextSnippet,
  Note,
  StickyNote2,
  Task,
  Checklist,
  Done,
  DoneAll,
  Pending,
  Schedule as ScheduleIcon,
  Event,
  EventAvailable,
  EventBusy,
  EventNote,
  Today,
  DateRange,
  AccessTime,
  AccessTimeFilled,
  HourglassEmpty,
  HourglassFull,
  Timer as TimerIcon,
  WatchLater,
  Update,
  Sync,
  Cached,
  Autorenew,
  Loop,
  Replay,
  RestartAlt,
  GetApp,
  Publish,
  CloudUpload,
  CloudDownload,
  CloudSync,
  CloudDone,
  CloudQueue,
  SignalWifi4Bar,
  SignalWifiOff,
  SignalWifi1Bar,
  SignalWifi2Bar,
  SignalWifi3Bar,
  SignalCellular4Bar,
  SignalCellularOff,
  SignalCellular1Bar,
  SignalCellular2Bar,
  SignalCellular3Bar,
  BatteryUnknown,
  Battery1Bar,
  Battery2Bar,
  Battery3Bar,
  Battery4Bar,
  Battery5Bar,
  Battery6Bar,
  BatteryStd,
  BatteryVeryLow,
  BatteryLow,
  BatteryMedium,
  BatteryHigh,
  BatteryVeryHigh,
  BatteryChargingFull,
  BatteryCharging20,
  BatteryCharging30,
  BatteryCharging50,
  BatteryCharging60,
  BatteryCharging80,
  BatteryCharging90,
  BatterySaver,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale/tr';
import { useNotification } from '../../hooks/useNotification';
import { useEventLogger } from '../../hooks/useEventLogger';

// Komut tipleri
interface Command {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  action: () => Promise<void>;
  requiresConfirmation: boolean;
  isDestructive: boolean;
  parameters?: CommandParameter[];
  estimatedDuration?: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface CommandParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  required: boolean;
  defaultValue?: any;
  options?: string[];
  description?: string;
}

interface CommandExecution {
  id: string;
  commandId: string;
  commandName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration?: number;
  output?: string;
  error?: string;
  parameters?: Record<string, any>;
}

interface CommandTemplate {
  id: string;
  name: string;
  description: string;
  commands: string[];
  category: string;
  icon: React.ReactNode;
}

const CommandCenter: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showSuccess, showError, showInfo, NotificationComponent } = useNotification();
  const { logEvent } = useEventLogger();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);
  const [commandDialogOpen, setCommandDialogOpen] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<CommandExecution[]>([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [commandParameters, setCommandParameters] = useState<Record<string, any>>({});
  const [isExecuting, setIsExecuting] = useState(false);

  // Komut kategorileri
  const categories = [
    { id: 'all', name: 'Tümü', icon: <Dashboard /> },
    { id: 'system', name: 'Sistem', icon: <Settings /> },
    { id: 'database', name: 'Veritabanı', icon: <Storage /> },
    { id: 'users', name: 'Kullanıcılar', icon: <People /> },
    { id: 'students', name: 'Öğrenciler', icon: <School /> },
    { id: 'ai', name: 'AI Koçluk', icon: <Psychology /> },
    { id: 'reports', name: 'Raporlar', icon: <Assessment /> },
    { id: 'communication', name: 'İletişim', icon: <Notifications /> },
  ];

  // Komutlar
  const commands: Command[] = [
    // Sistem Komutları
    {
      id: 'restart-services',
      name: 'Servisleri Yeniden Başlat',
      description: 'Tüm sistem servislerini yeniden başlatır',
      category: 'system',
      icon: <Refresh />,
      action: async () => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        showSuccess('Servisler başarıyla yeniden başlatıldı');
      },
      requiresConfirmation: true,
      isDestructive: true,
      estimatedDuration: 30,
      riskLevel: 'high',
    },
    {
      id: 'clear-cache',
      name: 'Önbelleği Temizle',
      description: 'Sistem önbelleğini temizler',
      category: 'system',
      icon: <Memory />,
      action: async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        showSuccess('Önbellek başarıyla temizlendi');
      },
      requiresConfirmation: false,
      isDestructive: false,
      estimatedDuration: 5,
      riskLevel: 'low',
    },
    {
      id: 'update-system',
      name: 'Sistemi Güncelle',
      description: 'Sistem güncellemelerini uygular',
      category: 'system',
      icon: <Update />,
      action: async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        showSuccess('Sistem başarıyla güncellendi');
      },
      requiresConfirmation: true,
      isDestructive: true,
      estimatedDuration: 120,
      riskLevel: 'critical',
    },
    {
      id: 'check-system-health',
      name: 'Sistem Sağlığını Kontrol Et',
      description: 'Sistem sağlık durumunu kontrol eder',
      category: 'system',
      icon: <NetworkCheck />,
      action: async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        showSuccess('Sistem sağlık kontrolü tamamlandı');
      },
      requiresConfirmation: false,
      isDestructive: false,
      estimatedDuration: 10,
      riskLevel: 'low',
    },

    // Veritabanı Komutları
    {
      id: 'backup-database',
      name: 'Veritabanı Yedekle',
      description: 'Veritabanının yedeğini alır',
      category: 'database',
      icon: <Cloud />,
      action: async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        showSuccess('Veritabanı yedeği başarıyla alındı');
      },
      requiresConfirmation: true,
      isDestructive: false,
      estimatedDuration: 60,
      riskLevel: 'medium',
      parameters: [
        {
          name: 'backupType',
          type: 'select',
          required: true,
          defaultValue: 'full',
          options: ['full', 'incremental', 'differential'],
          description: 'Yedek türü',
        },
        {
          name: 'compress',
          type: 'boolean',
          required: false,
          defaultValue: true,
          description: 'Sıkıştır',
        },
      ],
    },
    {
      id: 'optimize-database',
      name: 'Veritabanını Optimize Et',
      description: 'Veritabanı performansını optimize eder',
      category: 'database',
      icon: <Speed />,
      action: async () => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        showSuccess('Veritabanı optimizasyonu tamamlandı');
      },
      requiresConfirmation: true,
      isDestructive: false,
      estimatedDuration: 45,
      riskLevel: 'medium',
    },

    // Kullanıcı Komutları
    {
      id: 'bulk-user-import',
      name: 'Toplu Kullanıcı İçe Aktar',
      description: 'CSV dosyasından kullanıcıları içe aktarır',
      category: 'users',
      icon: <Upload />,
      action: async () => {
        await new Promise(resolve => setTimeout(resolve, 4000));
        showSuccess('Kullanıcılar başarıyla içe aktarıldı');
      },
      requiresConfirmation: true,
      isDestructive: false,
      estimatedDuration: 30,
      riskLevel: 'medium',
      parameters: [
        {
          name: 'file',
          type: 'string',
          required: true,
          description: 'CSV dosya yolu',
        },
        {
          name: 'updateExisting',
          type: 'boolean',
          required: false,
          defaultValue: false,
          description: 'Mevcut kullanıcıları güncelle',
        },
      ],
    },
    {
      id: 'send-bulk-notification',
      name: 'Toplu Bildirim Gönder',
      description: 'Tüm kullanıcılara bildirim gönderir',
      category: 'users',
      icon: <Notifications />,
      action: async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        showSuccess('Bildirimler başarıyla gönderildi');
      },
      requiresConfirmation: true,
      isDestructive: false,
      estimatedDuration: 15,
      riskLevel: 'low',
      parameters: [
        {
          name: 'message',
          type: 'string',
          required: true,
          description: 'Bildirim mesajı',
        },
        {
          name: 'userGroup',
          type: 'select',
          required: true,
          options: ['all', 'students', 'teachers', 'parents', 'admins'],
          description: 'Hedef kullanıcı grubu',
        },
      ],
    },

    // Öğrenci Komutları
    {
      id: 'generate-student-reports',
      name: 'Öğrenci Raporları Oluştur',
      description: 'Tüm öğrenciler için performans raporları oluşturur',
      category: 'students',
      icon: <Assessment />,
      action: async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        showSuccess('Öğrenci raporları başarıyla oluşturuldu');
      },
      requiresConfirmation: false,
      isDestructive: false,
      estimatedDuration: 90,
      riskLevel: 'low',
      parameters: [
        {
          name: 'dateRange',
          type: 'string',
          required: true,
          description: 'Tarih aralığı (örn: 2024-01-01,2024-12-31)',
        },
        {
          name: 'includeDetails',
          type: 'boolean',
          required: false,
          defaultValue: true,
          description: 'Detaylı rapor',
        },
      ],
    },
    {
      id: 'assign-coaches',
      name: 'Koç Atama',
      description: 'Öğrencilere otomatik koç atar',
      category: 'students',
      icon: <Psychology />,
      action: async () => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        showSuccess('Koç atamaları başarıyla tamamlandı');
      },
      requiresConfirmation: true,
      isDestructive: false,
      estimatedDuration: 20,
      riskLevel: 'medium',
    },

    // AI Komutları
    {
      id: 'train-ai-models',
      name: 'AI Modellerini Eğit',
      description: 'AI koçluk modellerini yeniden eğitir',
      category: 'ai',
      icon: <SmartToy />,
      action: async () => {
        await new Promise(resolve => setTimeout(resolve, 10000));
        showSuccess('AI modelleri başarıyla eğitildi');
      },
      requiresConfirmation: true,
      isDestructive: false,
      estimatedDuration: 300,
      riskLevel: 'high',
    },
    {
      id: 'analyze-student-behavior',
      name: 'Öğrenci Davranış Analizi',
      description: 'Öğrenci davranışlarını analiz eder',
      category: 'ai',
      icon: <Analytics />,
      action: async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        showSuccess('Davranış analizi tamamlandı');
      },
      requiresConfirmation: false,
      isDestructive: false,
      estimatedDuration: 60,
      riskLevel: 'low',
    },

    // Rapor Komutları
    {
      id: 'generate-system-report',
      name: 'Sistem Raporu Oluştur',
      description: 'Kapsamlı sistem performans raporu oluşturur',
      category: 'reports',
      icon: <Report />,
      action: async () => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        showSuccess('Sistem raporu başarıyla oluşturuldu');
      },
      requiresConfirmation: false,
      isDestructive: false,
      estimatedDuration: 45,
      riskLevel: 'low',
    },
    {
      id: 'export-user-data',
      name: 'Kullanıcı Verilerini Dışa Aktar',
      description: 'Kullanıcı verilerini CSV/Excel formatında dışa aktarır',
      category: 'reports',
      icon: <Download />,
      action: async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        showSuccess('Kullanıcı verileri başarıyla dışa aktarıldı');
      },
      requiresConfirmation: false,
      isDestructive: false,
      estimatedDuration: 30,
      riskLevel: 'low',
      parameters: [
        {
          name: 'format',
          type: 'select',
          required: true,
          defaultValue: 'csv',
          options: ['csv', 'excel', 'json'],
          description: 'Dışa aktarma formatı',
        },
        {
          name: 'includeSensitiveData',
          type: 'boolean',
          required: false,
          defaultValue: false,
          description: 'Hassas verileri dahil et',
        },
      ],
    },
  ];

  // Komut şablonları
  const commandTemplates: CommandTemplate[] = [
    {
      id: 'system-maintenance',
      name: 'Sistem Bakımı',
      description: 'Tam sistem bakım rutini',
      commands: ['clear-cache', 'optimize-database', 'check-system-health'],
      category: 'system',
      icon: <Settings />,
    },
    {
      id: 'user-management',
      name: 'Kullanıcı Yönetimi',
      description: 'Kullanıcı yönetim rutini',
      commands: ['bulk-user-import', 'send-bulk-notification'],
      category: 'users',
      icon: <People />,
    },
    {
      id: 'student-analysis',
      name: 'Öğrenci Analizi',
      description: 'Öğrenci analiz rutini',
      commands: ['generate-student-reports', 'analyze-student-behavior', 'assign-coaches'],
      category: 'students',
      icon: <School />,
    },
  ];

  // Filtrelenmiş komutlar
  const filteredCommands = useMemo(() => {
    return commands.filter(command => {
      const matchesSearch = command.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          command.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || command.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  // Komut çalıştırma
  const executeCommand = async (command: Command) => {
    setIsExecuting(true);
    const executionId = `exec_${Date.now()}`;
    
    const execution: CommandExecution = {
      id: executionId,
      commandId: command.id,
      commandName: command.name,
      status: 'running',
      startTime: new Date().toISOString(),
      parameters: commandParameters,
    };

    setExecutionHistory(prev => [execution, ...prev]);
    logEvent({ type: 'COMMAND_STARTED', commandId: command.id, executionId });

    try {
      await command.action();
      
      setExecutionHistory(prev => 
        prev.map(exec => 
          exec.id === executionId 
            ? { 
                ...exec, 
                status: 'completed', 
                endTime: new Date().toISOString(),
                duration: Date.now() - new Date(exec.startTime).getTime()
              }
            : exec
        )
      );
      
      showSuccess(`${command.name} başarıyla çalıştırıldı`);
    } catch (error) {
      setExecutionHistory(prev => 
        prev.map(exec => 
          exec.id === executionId 
            ? { 
                ...exec, 
                status: 'failed', 
                endTime: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Bilinmeyen hata'
              }
            : exec
        )
      );
      
      showError(`${command.name} çalıştırılamadı: ${error}`);
    } finally {
      setIsExecuting(false);
      setCommandDialogOpen(false);
      setCommandParameters({});
    }
  };

  // Komut dialog açma
  const handleCommandClick = (command: Command) => {
    setSelectedCommand(command);
    setCommandParameters({});
    setCommandDialogOpen(true);
  };

  // Risk seviyesi rengi
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  // Durum ikonu
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Schedule />;
      case 'running': return <PlayArrow />;
      case 'completed': return <CheckCircle />;
      case 'failed': return <Error />;
      case 'cancelled': return <Stop />;
      default: return <Info />;
    }
  };

  // Durum rengi
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'running': return 'info';
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ 
          color: 'primary.main',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          🎯 Komut Merkezi
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<History />}
            onClick={() => setCurrentTab(1)}
          >
            Geçmiş
          </Button>
          <Button
            variant="contained"
            startIcon={<Terminal />}
            onClick={() => setCurrentTab(0)}
          >
            Komutlar
          </Button>
        </Box>
      </Box>

      <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Komutlar" />
        <Tab label="Geçmiş" />
        <Tab label="Şablonlar" />
      </Tabs>

      {/* Komutlar Tab */}
      {currentTab === 0 && (
        <Box>
          {/* Filtreler */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Komut Ara"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Kategori</InputLabel>
                    <Select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      label="Kategori"
                    >
                      {categories.map((category) => (
                        <MenuItem key={category.id} value={category.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {category.icon}
                            {category.name}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Komut Listesi */}
          <Grid container spacing={2}>
            {filteredCommands.map((command) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={command.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    sx={{
                      height: '100%',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                      },
                    }}
                    onClick={() => handleCommandClick(command)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {command.icon}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" fontWeight="bold">
                            {command.name}
                          </Typography>
                          <Chip
                            label={command.category}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Box>
                        <Chip
                          label={command.riskLevel.toUpperCase()}
                          size="small"
                          color={getRiskColor(command.riskLevel)}
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {command.description}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          {command.estimatedDuration}s
                        </Typography>
                        {command.requiresConfirmation && (
                          <Chip label="Onay Gerekli" size="small" color="warning" />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Geçmiş Tab */}
      {currentTab === 1 && (
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Komut Geçmişi
              </Typography>
              <List>
                {executionHistory.map((execution) => (
                  <ListItem key={execution.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                    <ListItemIcon>
                      {getStatusIcon(execution.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={execution.commandName}
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            {format(new Date(execution.startTime), 'dd.MM.yyyy HH:mm:ss', { locale: tr })}
                          </Typography>
                          {execution.duration && (
                            <Typography variant="caption" color="text.secondary">
                              Süre: {Math.round(execution.duration / 1000)}s
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <Chip
                      label={execution.status.toUpperCase()}
                      size="small"
                      color={getStatusColor(execution.status)}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Şablonlar Tab */}
      {currentTab === 2 && (
        <Box>
          <Grid container spacing={2}>
            {commandTemplates.map((template) => (
              <Grid item xs={12} sm={6} md={4} key={template.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'secondary.main' }}>
                        {template.icon}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {template.name}
                        </Typography>
                        <Chip
                          label={template.category}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {template.description}
                    </Typography>
                    
                    <Typography variant="caption" color="text.secondary">
                      {template.commands.length} komut
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Komut Dialog */}
      <Dialog open={commandDialogOpen} onClose={() => setCommandDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {selectedCommand?.icon}
            <Typography variant="h6">{selectedCommand?.name}</Typography>
            <Chip
              label={selectedCommand?.riskLevel.toUpperCase()}
              size="small"
              color={getRiskColor(selectedCommand?.riskLevel || 'low')}
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 3 }}>
            {selectedCommand?.description}
          </Typography>
          
          {selectedCommand?.parameters && selectedCommand.parameters.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Parametreler
              </Typography>
              {selectedCommand.parameters.map((param) => (
                <Box key={param.name} sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    label={param.name}
                    value={commandParameters[param.name] || param.defaultValue || ''}
                    onChange={(e) => setCommandParameters(prev => ({
                      ...prev,
                      [param.name]: param.type === 'boolean' ? e.target.checked : e.target.value
                    }))}
                    required={param.required}
                    helperText={param.description}
                    type={param.type === 'number' ? 'number' : 'text'}
                    select={param.type === 'select'}
                  >
                    {param.type === 'select' && param.options?.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              ))}
            </Box>
          )}
          
          {selectedCommand?.requiresConfirmation && (
            <Alert severity="warning">
              Bu işlem geri alınamaz. Devam etmek istediğinizden emin misiniz?
            </Alert>
          )}
          
          {selectedCommand?.estimatedDuration && (
            <Alert severity="info">
              Tahmini süre: {selectedCommand.estimatedDuration} saniye
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommandDialogOpen(false)}>
            İptal
          </Button>
          <Button
            variant="contained"
            color={selectedCommand?.isDestructive ? 'error' : 'primary'}
            onClick={() => selectedCommand && executeCommand(selectedCommand)}
            disabled={isExecuting}
            startIcon={isExecuting ? <CircularProgress size={20} /> : <PlayArrow />}
          >
            {isExecuting ? 'Çalıştırılıyor...' : 'Çalıştır'}
          </Button>
        </DialogActions>
      </Dialog>

      <NotificationComponent />
    </Box>
  );
};

export default CommandCenter;
