import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  FormControlLabel,
  Tooltip,
  Alert,
  CircularProgress,
  Avatar,
  Badge,
  Tabs,
  Tab,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Search,
  FilterList,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  Person,
  Email,
  CalendarToday,
  Group,
  Psychology,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Cancel,
  Warning,
  Refresh,
  Download,
  Upload,
  Add,
  PersonAdd,
  Settings,
  Assessment,
  Timeline,
  School,
  Assignment,
  DragIndicator,
  ExpandMore,
  Star,
  StarBorder,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale/tr';
import { coachManagementApi, Coach, UnassignedStudent, CoachPerformance, CoachNote, AssignmentStats } from '../../services/coachManagementApi';
import { useNotification } from '../../hooks/useNotification';
import { useWebSocket } from '../../hooks/useWebSocket';
import CoachFiltersDialog, { CoachFilters } from './CoachFilters';
import EmptyState from '../Shared/EmptyState';
import ConfirmDialog from '../Shared/ConfirmDialog';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useEventLogger } from '../../hooks/useEventLogger';
import CoachTable from './CoachTable';
import CoachDetailsDialog from './CoachDetailsDialog';
import VirtualList from '../Shared/VirtualList';

// Types are now imported from the API service

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
      id={`coach-tabpanel-${index}`}
      aria-labelledby={`coach-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const CoachManagementPanel: React.FC = () => {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<UnassignedStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCoaches, setTotalCoaches] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCoaches, setSelectedCoaches] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [coachDetailsOpen, setCoachDetailsOpen] = useState(false);
  const [coachPerformance, setCoachPerformance] = useState<CoachPerformance | null>(null);
  const [coachNotes, setCoachNotes] = useState<CoachNote[]>([]);
  const [assignmentStats, setAssignmentStats] = useState<AssignmentStats | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [assignmentMode, setAssignmentMode] = useState(false);
  const [selectedStudentsForAssignment, setSelectedStudentsForAssignment] = useState<string[]>([]);
      const fileInputRef = React.useRef<HTMLInputElement | null>(null);
      const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
      const [bulkSelectedStudents, setBulkSelectedStudents] = useState<string[]>([]);
      const searchDebounceRef = useRef<number | undefined>(undefined);
      const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
      const [createDialogOpen, setCreateDialogOpen] = useState(false);
      const [createForm, setCreateForm] = useState<{ userId: string; specialization: string; experience: number; bio?: string; isActive?: boolean }>({ userId: '', specialization: '', experience: 0, bio: '', isActive: true });
      const [createSubmitting, setCreateSubmitting] = useState(false);
  
  // Loading states for different operations
  const [loadingStates, setLoadingStates] = useState({
    coaches: false,
    performance: false,
    assignment: false,
    notes: false,
  });
  
  // Error states
  const [errors, setErrors] = useState({
    coaches: null as string | null,
    performance: null as string | null,
    assignment: null as string | null,
    notes: null as string | null,
  });

  // Notification hook
  const notificationHook = useNotification();
  const { showSuccess, showError, showWarning, showInfo, NotificationComponent } = notificationHook;
  const debouncedSearch = useDebouncedValue(searchTerm, 400);
  const { logEvent } = useEventLogger();

  // WebSocket for real-time updates
  const { isConnected, sendMessage } = useWebSocket({
    url: process.env.REACT_APP_WS_URL || 'ws://localhost:3000/coaching-updates',
    onMessage: (message) => {
      switch (message.type) {
        case 'coach-updated':
          loadCoaches();
          break;
        case 'assignment-created':
          loadUnassignedStudents();
          loadAssignmentStats();
          showSuccess('Yeni öğrenci ataması yapıldı');
          break;
        case 'assignment-removed':
          loadUnassignedStudents();
          loadAssignmentStats();
          showSuccess('Öğrenci ataması kaldırıldı');
          break;
        case 'note-created':
          if (selectedCoach) {
            loadCoachNotes(selectedCoach.id);
          }
          showSuccess('Yeni koç notu eklendi');
          break;
      }
    },
    onOpen: () => {
      showInfo('Koç yönetimi için gerçek zamanlı bağlantı kuruldu');
    },
    onClose: () => {
      showWarning('Gerçek zamanlı bağlantı kapandı');
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    },
  });

  // Filter states
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<CoachFilters>({});

  // API Functions
  const loadCoaches = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, coaches: true }));
      setErrors(prev => ({ ...prev, coaches: null }));
      
      const response = await coachManagementApi.getCoaches(page + 1, rowsPerPage, debouncedSearch);
      
      if (response.success && response.data) {
        setCoaches(response.data.data);
        setTotalCoaches(response.data.pagination.total);
      } else {
        throw new Error('Koçlar yüklenemedi');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Koçlar yüklenirken hata oluştu';
      setErrors(prev => ({ ...prev, coaches: errorMessage }));
      showError(errorMessage);
    } finally {
      setLoadingStates(prev => ({ ...prev, coaches: false }));
    }
  }, [page, rowsPerPage, debouncedSearch, showError]);

  const loadUnassignedStudents = useCallback(async () => {
    try {
      setErrors(prev => ({ ...prev, assignment: null }));
      
      const response = await coachManagementApi.getUnassignedStudents();
      
      if (response.success && response.data) {
        setUnassignedStudents(response.data);
      } else {
        throw new Error('Atanmamış öğrenciler yüklenemedi');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Atanmamış öğrenciler yüklenirken hata oluştu';
      setErrors(prev => ({ ...prev, assignment: errorMessage }));
      showError(errorMessage);
    }
  }, [showError]);

  const loadAssignmentStats = useCallback(async () => {
    try {
      const response = await coachManagementApi.getAssignmentStats();
      
      if (response.success && response.data) {
        setAssignmentStats(response.data);
      } else {
        throw new Error('Atama istatistikleri yüklenemedi');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Atama istatistikleri yüklenirken hata oluştu';
      showError(errorMessage);
    }
  }, [showError]);

  const loadCoachPerformance = useCallback(async (coachId: string) => {
    try {
      setLoadingStates(prev => ({ ...prev, performance: true }));
      setErrors(prev => ({ ...prev, performance: null }));
      
      const response = await coachManagementApi.getCoachPerformance(coachId);
      
      if (response.success && response.data) {
        setCoachPerformance(response.data);
      } else {
        throw new Error('Koç performansı yüklenemedi');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Koç performansı yüklenirken hata oluştu';
      setErrors(prev => ({ ...prev, performance: errorMessage }));
      showError(errorMessage);
    } finally {
      setLoadingStates(prev => ({ ...prev, performance: false }));
    }
  }, [showError]);

  const loadCoachNotes = useCallback(async (coachId: string) => {
    try {
      setLoadingStates(prev => ({ ...prev, notes: true }));
      setErrors(prev => ({ ...prev, notes: null }));
      
      const response = await coachManagementApi.getCoachNotes(coachId, 1, 10);
      
      if (response.success && response.data) {
        setCoachNotes(response.data.data);
      } else {
        throw new Error('Koç notları yüklenemedi');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Koç notları yüklenirken hata oluştu';
      setErrors(prev => ({ ...prev, notes: errorMessage }));
      showError(errorMessage);
    } finally {
      setLoadingStates(prev => ({ ...prev, notes: false }));
    }
  }, [showError]);

  useEffect(() => {
    loadCoaches();
    loadUnassignedStudents();
    loadAssignmentStats();
  }, [loadCoaches, loadUnassignedStudents, loadAssignmentStats]);

  // Arama için debounce ve sayfayı sıfırla
  useEffect(() => {
    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = window.setTimeout(() => {
      setPage(0);
      loadCoaches();
    }, 0);
    return () => {
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSelectCoach = (coachId: string) => {
    setSelectedCoaches(prev => 
      prev.includes(coachId) 
        ? prev.filter(id => id !== coachId)
        : [...prev, coachId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCoaches.length === coaches.length) {
      setSelectedCoaches([]);
    } else {
      setSelectedCoaches(coaches.map(coach => coach.id));
    }
  };

  const handleCoachDetails = useCallback(async (coach: Coach) => {
    setSelectedCoach(coach);
    setCoachDetailsOpen(true);
    
    // Load performance and notes data
    await Promise.all([
      loadCoachPerformance(coach.id),
      loadCoachNotes(coach.id)
    ]);
  }, [loadCoachPerformance, loadCoachNotes]);

  const handleStudentAssignment = useCallback(async (coachId: string, studentIds: string[]) => {
    try {
      setLoadingStates(prev => ({ ...prev, assignment: true }));
      
      const response = await coachManagementApi.assignStudents(coachId, studentIds);
      
      if (response.success) {
        showSuccess('Öğrenciler başarıyla atandı');
        // Refresh data
        await Promise.all([
          loadCoaches(),
          loadUnassignedStudents(),
          loadAssignmentStats()
        ]);
        setSelectedStudentsForAssignment([]);
      } else {
        throw new Error('Öğrenci ataması başarısız');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Öğrenci ataması yapılırken hata oluştu';
      showError(errorMessage);
    } finally {
      setLoadingStates(prev => ({ ...prev, assignment: false }));
    }
  }, [loadCoaches, loadUnassignedStudents, loadAssignmentStats, showSuccess, showError]);

  const handleUnassignStudent = useCallback(async (coachId: string, studentId: string) => {
    try {
      setLoadingStates(prev => ({ ...prev, assignment: true }));
      
      const response = await coachManagementApi.unassignStudent(coachId, studentId);
      
      if (response.success) {
        showSuccess('Öğrenci ataması kaldırıldı');
        logEvent({ type: 'ASSIGNMENT_REMOVED', context: { coachId, studentId } });
        // Refresh data
        await Promise.all([
          loadCoaches(),
          loadUnassignedStudents(),
          loadAssignmentStats()
        ]);
      } else {
        throw new Error('Öğrenci ataması kaldırılamadı');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Öğrenci ataması kaldırılırken hata oluştu';
      showError(errorMessage);
    } finally {
      setLoadingStates(prev => ({ ...prev, assignment: false }));
    }
  }, [loadCoaches, loadUnassignedStudents, loadAssignmentStats, showSuccess, showError]);

  const handleCreateCoachNote = useCallback(async (coachId: string, studentId: string, noteData: {
    title: string;
    content: string;
    type: string;
    priority: string;
  }) => {
    try {
      setLoadingStates(prev => ({ ...prev, notes: true }));
      
      const response = await coachManagementApi.createCoachNote(coachId, studentId, noteData);
      
      if (response.success) {
        showSuccess('Koç notu başarıyla oluşturuldu');
        logEvent({ type: 'COACH_NOTE_CREATED', context: { coachId, studentId } });
        // Refresh notes
        await loadCoachNotes(coachId);
      } else {
        throw new Error('Koç notu oluşturulamadı');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Koç notu oluşturulurken hata oluştu';
      showError(errorMessage);
    } finally {
      setLoadingStates(prev => ({ ...prev, notes: false }));
    }
  }, [loadCoachNotes, showSuccess, showError]);

      // Helpers
      const downloadBlob = (filename: string, data: Blob | string, mime = 'application/octet-stream') => {
        const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      };

      // Export current coach list to CSV
      const handleExportCoaches = () => {
        if (!coaches.length) {
          showWarning('Dışa aktarılacak koç bulunamadı');
          return;
        }
        const headers = ['id','name','email','studentCount','createdAt','lastActiveAt'];
        const rows = coaches.map(c => [
          c.id,
          JSON.stringify(c.name || ''),
          JSON.stringify(c.email || ''),
          String(c.coachStudents?.length || 0),
          c.createdAt ? new Date(c.createdAt as any).toISOString() : '',
          c.lastActiveAt ? new Date(c.lastActiveAt as any).toISOString() : ''
        ].join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        downloadBlob(`coaches_${new Date().toISOString()}.csv`, csv, 'text/csv;charset=utf-8');
        showSuccess('Koç listesi CSV olarak indirildi');
      };

      // Import coaches from CSV (basic parser) – shows a preview, real creation requires backend support
      const handleImportClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
      };

      const handleImportCoaches: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
        try {
          const file = e.target.files?.[0];
          if (!file) return;
          const text = await file.text();
          const lines = text.split(/\r?\n/).filter(Boolean);
          if (lines.length < 2) {
            showWarning('Geçersiz CSV');
            return;
          }
          const previewCount = Math.min(5, lines.length - 1);
          showSuccess(`CSV okundu. ${lines.length - 1} kayıt bulundu. (İlk ${previewCount} satır okundu)`);
          // Not: Gerçek koç oluşturma için backend endpoint gereklidir.
        } catch (err) {
          showError('İçe aktarma sırasında hata oluştu');
        } finally {
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };

      // Single coach performance report download
      const handleCoachPerformanceReport = useCallback(async (coachId: string) => {
        try {
          const res = await coachManagementApi.getCoachPerformance(coachId);
          if (!res.success || !res.data) throw new Error('Performans verisi alınamadı');
          downloadBlob(`coach_${coachId}_performance.json`, JSON.stringify(res.data, null, 2), 'application/json');
          showSuccess('Performans raporu indirildi');
        } catch (err) {
          showError(err instanceof Error ? err.message : 'Performans raporu indirilemedi');
        }
      }, [showSuccess, showError]);

      // Bulk report for selected coaches
      const handleBulkPerformanceReport = useCallback(async () => {
        if (!selectedCoaches.length) {
          showWarning('Lütfen koç seçiniz');
          return;
        }
        try {
          const reports: Record<string, any> = {};
          await Promise.all(selectedCoaches.map(async (id) => {
            const res = await coachManagementApi.getCoachPerformance(id);
            if (res.success && res.data) {
              reports[id] = res.data;
            }
          }));
          downloadBlob(`coaches_performance_${new Date().toISOString()}.json`, JSON.stringify(reports, null, 2), 'application/json');
          showSuccess('Seçili koçlar için performans raporları indirildi');
        } catch (err) {
          showError('Toplu rapor oluşturulamadı');
        }
      }, [selectedCoaches, showSuccess, showError]);

  const getPerformanceColor = (performance: number) => {
    if (performance >= 80) return 'success';
    if (performance >= 60) return 'warning';
    return 'error';
  };

  const getEngagementColor = (rate: number) => {
    if (rate >= 80) return 'success';
    if (rate >= 60) return 'warning';
    return 'error';
  };

  // Filter functions
  const handleApplyFilters = useCallback((filters: CoachFilters) => {
    setAppliedFilters(filters);
    // Apply filters to API call
    setPage(0);
    showInfo('Filtreler uygulandı');
    loadCoaches();
  }, [loadCoaches]);

  const handleClearFilters = useCallback(() => {
    setAppliedFilters({});
    setPage(0);
    showInfo('Filtreler temizlendi');
    loadCoaches();
  }, [loadCoaches]);

  return (
    <Box sx={{ p: 3 }}>
          {/* Hidden import input */}
          <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImportCoaches} />
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Koç Yönetimi
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadCoaches}
            disabled={loadingStates.coaches}
          >
            Yenile
          </Button>
          <Button
            variant={assignmentMode ? "contained" : "outlined"}
            startIcon={<Assignment />}
            onClick={() => setAssignmentMode(!assignmentMode)}
          >
            {assignmentMode ? 'Atama Modunu Kapat' : 'Atama Modu'}
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Yeni Koç
          </Button>
        </Box>
      </Box>

      {/* Assignment Stats */}
      {assignmentStats && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Atama İstatistikleri
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {assignmentStats.totalCoaches}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Toplam Koç
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {assignmentStats.assignedStudents}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Atanmış Öğrenci
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    {assignmentStats.unassignedStudents}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Atanmamış Öğrenci
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">
                    {assignmentStats.assignmentRate}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Atama Oranı
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Assignment Mode */}
      {assignmentMode && (
        <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Koç-Öğrenci Atama Modu
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: '1 1 50%', minWidth: '300px' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Koçlar
                </Typography>
                <List>
                  {coaches.map((coach) => (
                    <ListItem key={coach.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                      <ListItemIcon><Psychology /></ListItemIcon>
                      <ListItemText
                        primary={coach.name}
                        secondary={`${coach.coachStudents.length} öğrenci`}
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          // Open assignment dialog for this coach
                          setSelectedCoach(coach);
                          setAssignmentMode(true);
                        }}
                        disabled={loadingStates.assignment}
                      >
                        {loadingStates.assignment ? <CircularProgress size={16} /> : 'Öğrenci Ata'}
                      </Button>
                    </ListItem>
                  ))}
                </List>
              </Box>
              <Box sx={{ flex: '1 1 50%', minWidth: '300px' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Atanmamış Öğrenciler
                </Typography>
                <VirtualList
                  items={unassignedStudents}
                  height={360}
                  itemHeight={64}
                  renderItem={(student) => (
                    <ListItem key={student.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                      <ListItemIcon><School /></ListItemIcon>
                      <ListItemText
                        primary={student.user.name}
                        secondary={`${student.grade}. Sınıf • ${student.field}`}
                      />
                      <Checkbox
                        checked={selectedStudentsForAssignment.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudentsForAssignment(prev => [...prev, student.id]);
                          } else {
                            setSelectedStudentsForAssignment(prev => prev.filter(id => id !== student.id));
                          }
                        }}
                      />
                    </ListItem>
                  )}
                />
                {selectedStudentsForAssignment.length > 0 && selectedCoach && (
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => handleStudentAssignment(selectedCoach.id, selectedStudentsForAssignment)}
                    disabled={loadingStates.assignment}
                  >
                    {loadingStates.assignment ? (
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                    ) : null}
                    Seçili Öğrencileri Ata ({selectedStudentsForAssignment.length})
                  </Button>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <Box sx={{ flex: '1 1 50%', minWidth: '300px' }}>
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
            <Box sx={{ flex: '1 1 25%', minWidth: '200px' }}>
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => setFiltersOpen(true)}
                fullWidth
              >
                Filtreler
              </Button>
            </Box>
            <Box sx={{ flex: '1 1 25%', minWidth: '200px' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                onClick={handleExportCoaches}
                >
                  Dışa Aktar
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Upload />}
                onClick={handleImportClick}
                >
                  İçe Aktar
                </Button>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedCoaches.length > 0 && (
        <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1">
                {selectedCoaches.length} koç seçildi
              </Typography>
              <Button
                variant="contained"
                    color="secondary"
                    onClick={() => setBulkAssignOpen(true)}
              >
                    Toplu Öğrenci Ata
              </Button>
              <Button
                variant="contained"
                color="secondary"
                    onClick={handleBulkPerformanceReport}
              >
                Rapor Oluştur
              </Button>
              <Button
                variant="outlined"
                onClick={() => setSelectedCoaches([])}
              >
                Seçimi Temizle
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Coaches Table */}
      <Card>
        <CoachTable
          coaches={coaches}
          loading={loadingStates.coaches}
          error={errors.coaches}
          selectedCoaches={selectedCoaches}
          onSelectCoach={handleSelectCoach}
          onSelectAll={handleSelectAll}
          onCoachDetails={handleCoachDetails}
          onMenuClick={(e, coach) => {
            setAnchorEl(e.currentTarget);
            setSelectedCoach(coach);
          }}
          page={page}
          rowsPerPage={rowsPerPage}
          totalCoaches={totalCoaches}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          setAnchorEl(null);
          if (selectedCoach) handleCoachDetails(selectedCoach);
        }}>
          <Visibility sx={{ mr: 1 }} />
          Detayları Gör
        </MenuItem>
        <MenuItem onClick={() => {
          setAnchorEl(null);
          showInfo('Koç düzenleme formu yakında eklenecek');
        }}>
          <Edit sx={{ mr: 1 }} />
          Düzenle
        </MenuItem>
        <MenuItem onClick={() => {
          setAnchorEl(null);
          showInfo('Öğrenci atama akışı yakında eklenecek');
        }}>
          <PersonAdd sx={{ mr: 1 }} />
          Öğrenci Ata
        </MenuItem>
        <MenuItem onClick={() => {
          setAnchorEl(null);
              if (selectedCoach) handleCoachPerformanceReport(selectedCoach.id);
        }}>
          <Assessment sx={{ mr: 1 }} />
          Performans Raporu
        </MenuItem>
        <MenuItem onClick={() => {
          setAnchorEl(null);
          setConfirmDeleteOpen(true);
        }}>
          <Delete sx={{ mr: 1 }} />
          Sil
        </MenuItem>
      </Menu>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Koçu Sil"
        description="Bu işlem geri alınamaz. Emin misiniz?"
        confirmText="Sil"
        confirmColor="error"
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={async () => {
          try {
            if (!selectedCoach) return;
            const res = await coachManagementApi.deleteCoach(selectedCoach.id);
            if (res.success) {
              showSuccess('Koç silindi');
              logEvent({ type: 'COACH_DELETED', targetId: selectedCoach.id });
              await loadCoaches();
            } else {
              showError('Koç silinemedi');
            }
          } catch (e) {
            showError('Koç silinirken hata oluştu');
          } finally {
            setConfirmDeleteOpen(false);
          }
        }}
      />

      {/* Coach Details Dialog */}
      <CoachDetailsDialog
        open={coachDetailsOpen}
        onClose={() => setCoachDetailsOpen(false)}
        coach={selectedCoach}
        performance={coachPerformance}
        notes={coachNotes}
        loadingPerformance={loadingStates.performance}
        loadingNotes={loadingStates.notes}
        errorPerformance={errors.performance}
        errorNotes={errors.notes}
        onUnassignStudent={handleUnassignStudent}
        onCreateNote={handleCreateCoachNote}
      />

          {/* Bulk Student Assignment Dialog */}
          <Dialog open={bulkAssignOpen} onClose={() => setBulkAssignOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle>Toplu Öğrenci Atama</DialogTitle>
            <DialogContent>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Seçili koç sayısı: {selectedCoaches.length}. Atamak istediğiniz öğrencileri seçin.
              </Typography>
              {unassignedStudents.length === 0 ? (
                <Alert severity="info">Atanabilecek öğrenci bulunamadı.</Alert>
              ) : (
                <List>
                  {unassignedStudents.map((student) => (
                    <ListItem key={student.id} secondaryAction={
                      <Checkbox
                        edge="end"
                        checked={bulkSelectedStudents.includes(student.id)}
                        onChange={(e) => {
                          setBulkSelectedStudents(prev => e.target.checked ? [...prev, student.id] : prev.filter(id => id !== student.id));
                        }}
                      />
                    }>
                      <ListItemIcon><School /></ListItemIcon>
                      <ListItemText primary={student.user.name} secondary={`${student.grade}. Sınıf • ${student.field}`} />
                    </ListItem>
                  ))}
                </List>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setBulkAssignOpen(false)}>İptal</Button>
              <Button
                variant="contained"
                disabled={bulkSelectedStudents.length === 0 || selectedCoaches.length === 0 || loadingStates.assignment}
                onClick={async () => {
                  try {
                    // Basit strateji: ilk seçili koça ata
                    const targetCoachId = selectedCoaches[0];
                    await handleStudentAssignment(targetCoachId, bulkSelectedStudents);
                    setBulkSelectedStudents([]);
                    setBulkAssignOpen(false);
                  } catch {}
                }}
              >
                Ata ({bulkSelectedStudents.length})
              </Button>
            </DialogActions>
          </Dialog>
      
      {/* Filter Dialog */}
      <CoachFiltersDialog
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        currentFilters={appliedFilters}
      />

      {/* Create Coach Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Yeni Koç Oluştur</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="User ID" value={createForm.userId} onChange={(e) => setCreateForm(prev => ({ ...prev, userId: e.target.value }))} fullWidth />
            <TextField label="Uzmanlık" value={createForm.specialization} onChange={(e) => setCreateForm(prev => ({ ...prev, specialization: e.target.value }))} fullWidth />
            <TextField label="Deneyim (yıl)" type="number" value={createForm.experience} onChange={(e) => setCreateForm(prev => ({ ...prev, experience: Number(e.target.value) }))} fullWidth />
            <TextField label="Biyografi" value={createForm.bio} onChange={(e) => setCreateForm(prev => ({ ...prev, bio: e.target.value }))} fullWidth multiline rows={3} />
            <FormControlLabel control={<Checkbox checked={!!createForm.isActive} onChange={(e) => setCreateForm(prev => ({ ...prev, isActive: e.target.checked }))} />} label="Aktif" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>İptal</Button>
          <Button variant="contained" disabled={!createForm.userId || !createForm.specialization || createSubmitting} onClick={async () => {
            try {
              setCreateSubmitting(true);
              const res = await coachManagementApi.createCoach({
                userId: createForm.userId,
                specialization: createForm.specialization,
                experience: createForm.experience,
                bio: createForm.bio,
                isActive: createForm.isActive,
              });
              if (res.success) {
                showSuccess('Koç oluşturuldu');
                setCreateDialogOpen(false);
                setCreateForm({ userId: '', specialization: '', experience: 0, bio: '', isActive: true });
                await loadCoaches();
              } else {
                showError('Koç oluşturulamadı');
              }
            } catch (e) {
              showError('Koç oluşturulurken hata oluştu');
            } finally {
              setCreateSubmitting(false);
            }
          }}>
            {createSubmitting ? 'Kaydediliyor...' : 'Oluştur'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification Component */}
      <NotificationComponent />
    </Box>
  );
};

export default CoachManagementPanel;
