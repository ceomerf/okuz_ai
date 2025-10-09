import React, { useState, useEffect, useRef } from 'react';
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
} from '@mui/material';
import EmptyState from '../Shared/EmptyState';
import ConfirmDialog from '../Shared/ConfirmDialog';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { maybeAnonymize } from '../../utils/pii';
import { useEventLogger } from '../../hooks/useEventLogger';
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
  School,
  Group,
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
  Psychology,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale/tr';
import { studentManagementApi } from '../../services/studentManagementApi';
import { useNotification } from '../../hooks/useNotification';

// Types
interface Student {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    lastActiveAt?: string;
  };
  grade: number;
  field: string;
  school?: string;
  coachStudents: Array<{
    coach: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  familyMembers: Array<{
    parent: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

interface StudentAcademicHistory {
  studySessions: Array<{
    id: string;
    subject: string;
    topic: string;
    duration: number;
    performance: number;
    startTime: string;
    isCompleted: boolean;
  }>;
  quizResults: Array<{
    id: string;
    subject: string;
    score: number;
    percentage: number;
    completedAt: string;
  }>;
  examResults: Array<{
    id: string;
    subject: string;
    examType: string;
    score: number;
    totalScore: number;
    createdAt: string;
  }>;
  metrics: {
    totalStudyTime: number;
    averagePerformance: number;
    totalSessions: number;
  };
}

interface CoachNote {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  createdAt: string;
  coachStudent: {
    coach: {
      name: string;
      email: string;
    };
  };
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
      id={`student-tabpanel-${index}`}
      aria-labelledby={`student-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const StudentManagementPanel: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalStudents, setTotalStudents] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [fieldFilter, setFieldFilter] = useState('');
  const [coachFilter, setCoachFilter] = useState('');
  const [hasParentFilter, setHasParentFilter] = useState<boolean | undefined>(undefined);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentDetailsOpen, setStudentDetailsOpen] = useState(false);
  const [academicHistory, setAcademicHistory] = useState<StudentAcademicHistory | null>(null);
  const [coachNotes, setCoachNotes] = useState<CoachNote[]>([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [detailsLoading, setDetailsLoading] = useState({ academic: false, notes: false });
  const searchDebounceRef = useRef<number | undefined>(undefined);
  const { showSuccess, showError, showInfo, NotificationComponent } = useNotification();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(searchTerm, 400);
  const { logEvent } = useEventLogger();
  const [assignParentOpen, setAssignParentOpen] = useState(false);
  const [assignParentId, setAssignParentId] = useState('');
  const [exporting, setExporting] = useState(false);

  // Mock data (fallback)
  const mockStudents: Student[] = [
    {
      id: '1',
      user: {
        id: '1',
        name: 'Ahmet Yılmaz',
        email: 'ahmet@example.com',
        createdAt: '2024-01-15T10:30:00Z',
        lastActiveAt: '2024-01-20T14:30:00Z',
      },
      grade: 12,
      field: 'Sayısal',
      school: 'Ankara Fen Lisesi',
      coachStudents: [{
        coach: {
          id: '1',
          name: 'Dr. Mehmet Koç',
          email: 'mehmet@example.com',
        },
      }],
      familyMembers: [{
        parent: {
          id: '1',
          name: 'Ayşe Yılmaz',
          email: 'ayse@example.com',
        },
      }],
    },
    {
      id: '2',
      user: {
        id: '2',
        name: 'Zeynep Demir',
        email: 'zeynep@example.com',
        createdAt: '2024-01-10T09:15:00Z',
        lastActiveAt: '2024-01-20T16:45:00Z',
      },
      grade: 11,
      field: 'Sözel',
      school: 'İstanbul Anadolu Lisesi',
      coachStudents: [],
      familyMembers: [],
    },
  ];

  const mockAcademicHistory: StudentAcademicHistory = {
    studySessions: [
      {
        id: '1',
        subject: 'Matematik',
        topic: 'Türev',
        duration: 120,
        performance: 85,
        startTime: '2024-01-20T14:00:00Z',
        isCompleted: true,
      },
      {
        id: '2',
        subject: 'Fizik',
        topic: 'Elektrik',
        duration: 90,
        performance: 78,
        startTime: '2024-01-19T16:00:00Z',
        isCompleted: true,
      },
    ],
    quizResults: [
      {
        id: '1',
        subject: 'Matematik',
        score: 8,
        percentage: 80,
        completedAt: '2024-01-20T15:00:00Z',
      },
    ],
    examResults: [
      {
        id: '1',
        subject: 'Matematik',
        examType: 'TYT',
        score: 35,
        totalScore: 40,
        createdAt: '2024-01-15T10:00:00Z',
      },
    ],
    metrics: {
      totalStudyTime: 210,
      averagePerformance: 81.5,
      totalSessions: 2,
    },
  };

  const mockCoachNotes: CoachNote[] = [
    {
      id: '1',
      title: 'Matematik Performansı',
      content: 'Öğrenci matematik konularında iyi ilerleme kaydediyor. Türev konusunda başarılı.',
      type: 'GENERAL',
      priority: 'NORMAL',
      createdAt: '2024-01-20T10:00:00Z',
      coachStudent: {
        coach: {
          name: 'Dr. Mehmet Koç',
          email: 'mehmet@example.com',
        },
      },
    },
  ];

  useEffect(() => {
    loadStudents();
  }, [page, rowsPerPage, gradeFilter, fieldFilter, coachFilter, hasParentFilter, debouncedSearch]);

  // Debounce search
  useEffect(() => {
    if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = window.setTimeout(() => {
      setPage(0);
      loadStudents();
    }, 0);
    return () => {
      if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await studentManagementApi.getStudents(
        page + 1,
        rowsPerPage,
        debouncedSearch || undefined,
        {
          grade: gradeFilter || undefined,
          field: fieldFilter || undefined,
          hasParent: hasParentFilter,
        }
      );
      if (res.success && (res.data as any)?.data) {
        const payload = res.data as any;
        // Map backend Student shape to panel Student
        const mapped = (payload.data || []).map((s: any) => ({
          id: String(s.id),
          user: {
            id: String(s.id),
            name: s.name || s.user?.name || '',
            email: s.email || s.user?.email || '',
            createdAt: s.createdAt || new Date().toISOString(),
            lastActiveAt: s.lastActiveAt || s.user?.lastActiveAt,
          },
          grade: Number(s.grade ?? 0),
          field: s.field || '—',
          school: s.school,
          coachStudents: s.coach ? [{ coach: s.coach }] : (s.coachStudents || []),
          familyMembers: s.parent ? [{ parent: s.parent }] : (s.familyMembers || []),
        }));
        setStudents(mapped);
        setTotalStudents(payload.pagination?.total ?? mapped.length);
      } else {
        if (process.env.NODE_ENV !== 'production') {
          setStudents(mockStudents);
          setTotalStudents(mockStudents.length);
        } else {
          setStudents([]);
          setTotalStudents(0);
        }
      }
    } catch (error) {
      console.error('Öğrenciler yüklenemedi:', error);
      if (process.env.NODE_ENV !== 'production') {
        setStudents(mockStudents);
        setTotalStudents(mockStudents.length);
      } else {
        setStudents([]);
        setTotalStudents(0);
      }
      showError('Öğrenciler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(student => student.id));
    }
  };

  const handleStudentDetails = async (student: Student) => {
    setSelectedStudent(student);
    setStudentDetailsOpen(true);
    setDetailsLoading(prev => ({ ...prev, academic: true, notes: true }));
    try {
      const [hist, notes] = await Promise.all([
        studentManagementApi.getStudentAcademicHistory(student.id, 1, 20),
        studentManagementApi.getCoachNotes(student.id, 1, 10),
      ]);
      if (hist.success && hist.data) setAcademicHistory(hist.data as any);
      if (notes.success && (notes.data as any)?.data) setCoachNotes((notes.data as any).data);
    } catch (e) {
      showError('Öğrenci detayları yüklenemedi');
    } finally {
      setDetailsLoading(prev => ({ ...prev, academic: false, notes: false }));
    }
  };

  type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

  const getFieldColor = (field: string): ChipColor => {
    switch (field) {
      case 'Sayısal': return 'primary';
      case 'Sözel': return 'success';
      case 'Eşit Ağırlık': return 'warning';
      default: return 'default';
    }
  };

  const getGradeColor = (grade: number): ChipColor => {
    if (grade >= 12) return 'error';
    if (grade >= 11) return 'warning';
    return 'success';
  };

  const getPerformanceColor = (performance: number): ChipColor => {
    if (performance >= 80) return 'success';
    if (performance >= 60) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Öğrenci Yönetimi
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadStudents}
            disabled={loading}
          >
            Yenile
          </Button>
          <Button
            aria-label="Yeni öğrenci ekle"
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => showInfo('Yeni öğrenci ekleme akışı yakında eklenecek')}
          >
            Yeni Öğrenci
          </Button>
        </Box>
      </Box>

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
                <InputLabel>Sınıf</InputLabel>
                <Select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  label="Sınıf"
                >
                  <MenuItem value="">Tümü</MenuItem>
                  <MenuItem value="9">9. Sınıf</MenuItem>
                  <MenuItem value="10">10. Sınıf</MenuItem>
                  <MenuItem value="11">11. Sınıf</MenuItem>
                  <MenuItem value="12">12. Sınıf</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: '1 1 15%', minWidth: '200px' }}>
              <FormControl fullWidth>
                <InputLabel>Alan</InputLabel>
                <Select
                  value={fieldFilter}
                  onChange={(e) => setFieldFilter(e.target.value)}
                  label="Alan"
                >
                  <MenuItem value="">Tümü</MenuItem>
                  <MenuItem value="Sayısal">Sayısal</MenuItem>
                  <MenuItem value="Sözel">Sözel</MenuItem>
                  <MenuItem value="Eşit Ağırlık">Eşit Ağırlık</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: '1 1 15%', minWidth: '200px' }}>
              <FormControl fullWidth>
                <InputLabel>Veli Durumu</InputLabel>
                <Select
                  value={hasParentFilter === undefined ? '' : hasParentFilter.toString()}
                  onChange={(e) => setHasParentFilter(e.target.value === '' ? undefined : e.target.value === 'true')}
                  label="Veli Durumu"
                >
                  <MenuItem value="">Tümü</MenuItem>
                  <MenuItem value="true">Veli Atanmış</MenuItem>
                  <MenuItem value="false">Veli Atanmamış</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: '1 1 20%', minWidth: '240px' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
            onClick={async () => {
              try {
                setExporting(true);
                const blob = await studentManagementApi.exportStudents('csv', {
                  grade: gradeFilter || undefined,
                  field: fieldFilter || undefined,
                  hasParent: hasParentFilter,
                  search: searchTerm || undefined,
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `students_${new Date().toISOString()}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                showSuccess('Liste CSV olarak indirildi');
              } catch (e) {
                showError('Dışa aktarma başarısız');
              } finally {
                setExporting(false);
              }
            }}
                >
                  Dışa Aktar
                </Button>
                <Button
                  aria-label="Öğrencileri içe aktar"
                  variant="outlined"
                  startIcon={<Upload />}
                  onClick={() => showInfo('İçe aktarma sihirbazı yakında eklenecek')}
                >
                  İçe Aktar
                </Button>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedStudents.length > 0 && (
        <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1">
                {selectedStudents.length} öğrenci seçildi
              </Typography>
              <Button
                aria-label="Toplu koç atama"
                variant="contained"
                color="secondary"
                onClick={() => showInfo('Toplu koç atama akışı yakında eklenecek')}
              >
                Koç Ata
              </Button>
              <Button
                aria-label="Toplu veli atama"
                variant="contained"
                color="secondary"
                onClick={() => showInfo('Toplu veli atama akışı yakında eklenecek')}
              >
                Veli Ata
              </Button>
              <Button
                aria-label="Toplu silme"
                variant="contained"
                color="error"
                onClick={() => showInfo('Toplu silme için onay/geri alma akışı eklenecek')}
              >
                Sil
              </Button>
              <Button
                variant="outlined"
                onClick={() => setSelectedStudents([])}
              >
                Seçimi Temizle
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Students Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedStudents.length > 0 && selectedStudents.length < students.length}
                    checked={selectedStudents.length === students.length && students.length > 0}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Öğrenci</TableCell>
                <TableCell>Sınıf</TableCell>
                <TableCell>Alan</TableCell>
                <TableCell>Koç</TableCell>
                <TableCell>Veli</TableCell>
                <TableCell>Son Aktivite</TableCell>
                <TableCell align="center">İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState title="Öğrenci yok" description="İlk öğrencinizi ekleyin veya filtreleri temizleyin." />
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <TableRow key={student.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => handleSelectStudent(student.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ width: 40, height: 40 }}>
                          {student.user.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {student.user.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {maybeAnonymize(student.user.email, { anonymizeEmail: true }, 'email')}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${student.grade}. Sınıf`}
                        color={getGradeColor(student.grade)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={student.field}
                        color={getFieldColor(student.field)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {student.coachStudents.length > 0 ? (
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {student.coachStudents[0].coach.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {maybeAnonymize(student.coachStudents[0].coach.email, { anonymizeEmail: true }, 'email')}
                          </Typography>
                        </Box>
                      ) : (
                        <Chip label="Atanmamış" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      {student.familyMembers.length > 0 ? (
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {student.familyMembers[0].parent.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {maybeAnonymize(student.familyMembers[0].parent.email, { anonymizeEmail: true }, 'email')}
                          </Typography>
                        </Box>
                      ) : (
                        <Chip label="Atanmamış" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {student.user.lastActiveAt 
                          ? format(new Date(student.user.lastActiveAt), 'dd.MM.yyyy HH:mm', { locale: tr })
                          : 'Hiç'
                        }
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setSelectedStudent(student);
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
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalStudents}
          rowsPerPage={rowsPerPage}
          page={page}
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
          if (selectedStudent) handleStudentDetails(selectedStudent);
        }}>
          <Visibility sx={{ mr: 1 }} />
          Detayları Gör
        </MenuItem>
        <MenuItem onClick={() => {
          setAnchorEl(null);
          showInfo('Öğrenci düzenleme formu yakında eklenecek');
        }}>
          <Edit sx={{ mr: 1 }} />
          Düzenle
        </MenuItem>
        <MenuItem onClick={() => {
          setAnchorEl(null);
          showInfo('Koç atama akışı backend desteği eklendiğinde etkinleşecek');
        }}>
          <Psychology sx={{ mr: 1 }} />
          Koç Ata
        </MenuItem>
        <MenuItem onClick={() => {
          setAnchorEl(null);
          setAssignParentId('');
          setAssignParentOpen(true);
        }}>
          <Person sx={{ mr: 1 }} />
          Veli Ata
        </MenuItem>
        <MenuItem onClick={() => {
          setAnchorEl(null);
          setConfirmDeleteOpen(true);
        }}>
          <Delete sx={{ mr: 1 }} />
          Sil
        </MenuItem>
      </Menu>

      {/* Student Details Dialog */}
      <Dialog
        open={studentDetailsOpen}
        onClose={() => setStudentDetailsOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 48, height: 48 }}>
              {selectedStudent?.user.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h6">{selectedStudent?.user.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedStudent?.user.email ? maybeAnonymize(selectedStudent.user.email, { anonymizeEmail: true }, 'email') : ''} • {selectedStudent?.grade}. Sınıf • {selectedStudent?.field}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
              <Tab label="Genel Bilgiler" />
              <Tab label="Akademik Geçmiş" />
              <Tab label="Veli Eşleştirme" />
              <Tab label="Koç Notları" />
            </Tabs>
          </Box>

          <TabPanel value={currentTab} index={0}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: '1 1 50%', minWidth: '300px' }}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Öğrenci Bilgileri
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon><Person /></ListItemIcon>
                      <ListItemText 
                        primary="Ad Soyad" 
                        secondary={selectedStudent?.user.name} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Email /></ListItemIcon>
                      <ListItemText 
                        primary="E-posta" 
                        secondary={selectedStudent?.user.email ? maybeAnonymize(selectedStudent.user.email, { anonymizeEmail: true }, 'email') : ''} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><School /></ListItemIcon>
                      <ListItemText 
                        primary="Sınıf" 
                        secondary={`${selectedStudent?.grade}. Sınıf`} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Assessment /></ListItemIcon>
                      <ListItemText 
                        primary="Alan" 
                        secondary={selectedStudent?.field} 
                      />
                    </ListItem>
                  </List>
                </Paper>
              </Box>
              <Box sx={{ flex: '1 1 50%', minWidth: '300px' }}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Performans Metrikleri
                  </Typography>
                  {academicHistory && (
                    <Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Toplam Çalışma Süresi
                        </Typography>
                        <Typography variant="h6">
                          {Math.floor(academicHistory.metrics.totalStudyTime / 60)} saat
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Ortalama Performans
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={academicHistory.metrics.averagePerformance} 
                            sx={{ flexGrow: 1 }}
                          />
                          <Typography variant="body2">
                            {academicHistory.metrics.averagePerformance.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Toplam Seans
                        </Typography>
                        <Typography variant="h6">
                          {academicHistory.metrics.totalSessions}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Paper>
              </Box>
            </Box>
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            <Typography variant="h6" gutterBottom>
              Akademik Geçmiş
            </Typography>
            {detailsLoading.academic ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
            ) : academicHistory && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: '1 1 64%', minWidth: '300px' }}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Son Çalışma Seansları
                    </Typography>
                    <List>
                      {academicHistory.studySessions.map((session) => (
                        <ListItem key={session.id}>
                          <ListItemIcon><Timeline /></ListItemIcon>
                          <ListItemText
                            primary={`${session.subject} - ${session.topic}`}
                            secondary={
                              <Box>
                                <Typography variant="body2">
                                  {Math.floor(session.duration / 60)} dakika • 
                                  {format(new Date(session.startTime), 'dd.MM.yyyy HH:mm', { locale: tr })}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={session.performance} 
                                    sx={{ flexGrow: 1 }}
                                  />
                                  <Typography variant="caption">
                                    {session.performance}%
                                  </Typography>
                                </Box>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Box>
                <Box sx={{ flex: '1 1 32%', minWidth: '280px' }}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Sınav Sonuçları
                    </Typography>
                    <List>
                      {academicHistory.examResults.map((exam) => (
                        <ListItem key={exam.id}>
                          <ListItemIcon><Assessment /></ListItemIcon>
                          <ListItemText
                            primary={`${exam.subject} - ${exam.examType}`}
                            secondary={`${exam.score}/${exam.totalScore} (${((exam.score/exam.totalScore)*100).toFixed(1)}%)`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Box>
              </Box>
            )}
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            <Typography variant="h6" gutterBottom>
              Veli Eşleştirme
            </Typography>
            {selectedStudent?.familyMembers && selectedStudent.familyMembers.length > 0 ? (
              <List>
                {selectedStudent.familyMembers.map((member, index) => (
                  <ListItem key={index}>
                    <ListItemIcon><Person /></ListItemIcon>
                    <ListItemText
                      primary={member.parent.name}
                      secondary={member.parent.email}
                    />
                    <Button
                      aria-label="Veliyi kaldır"
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => showInfo('Veli eşleştirme kaldırma akışı yakında eklenecek')}
                    >
                      Kaldır
                    </Button>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info">
                Bu öğrenciye henüz veli atanmamış.
              </Alert>
            )}
            <Button
              aria-label="Yeni veli ata"
              variant="contained"
              startIcon={<PersonAdd />}
              onClick={() => setAssignParentOpen(true)}
              sx={{ mt: 2 }}
            >
              Veli Ata
            </Button>
          </TabPanel>

          <TabPanel value={currentTab} index={3}>
            <Typography variant="h6" gutterBottom>
              Koç Notları
            </Typography>
            {detailsLoading.notes ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
            ) : coachNotes.length > 0 ? (
              <List>
                {coachNotes.map((note) => (
                  <ListItem key={note.id}>
                    <ListItemIcon><Psychology /></ListItemIcon>
                    <ListItemText
                      primary={note.title}
                      secondary={
                        <Box>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {note.content}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Chip label={note.type} size="small" />
                            <Chip label={note.priority} size="small" color="primary" />
                            <Typography variant="caption" color="text.secondary">
                              {note.coachStudent.coach.name} • 
                              {format(new Date(note.createdAt), 'dd.MM.yyyy HH:mm', { locale: tr })}
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info">
                Bu öğrenci için henüz koç notu bulunmuyor.
              </Alert>
            )}
            <Button
              aria-label="Koç notu ekle"
              variant="contained"
              startIcon={<Add />}
              onClick={() => showInfo('Koç notu ekleme akışı yakında eklenecek')}
              sx={{ mt: 2 }}
            >
              Koç Notu Ekle
            </Button>
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStudentDetailsOpen(false)}>
            Kapat
          </Button>
          <Button variant="contained" onClick={() => showInfo('Değişiklikleri kaydetme akışı henüz hazır değil')}>
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Öğrenciyi Sil"
        description="Bu işlem geri alınamaz. Emin misiniz?"
        confirmText="Sil"
        confirmColor="error"
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={async () => {
          try {
            if (!selectedStudent) return;
            const res = await studentManagementApi.deleteStudent(selectedStudent.id);
            if (res.success) {
              showSuccess('Öğrenci silindi');
              logEvent({ type: 'STUDENT_DELETED', targetId: selectedStudent.id });
              await loadStudents();
            } else {
              showError('Öğrenci silinemedi');
            }
          } catch (e) {
            showError('Silme sırasında hata');
          } finally {
            setConfirmDeleteOpen(false);
          }
        }}
      />

      {/* Assign Parent */}
      <Dialog open={assignParentOpen} onClose={() => setAssignParentOpen(false)}>
        <DialogTitle>Veli Ata</DialogTitle>
        <DialogContent>
          <TextField label="Veli ID" value={assignParentId} onChange={(e) => setAssignParentId(e.target.value)} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignParentOpen(false)}>İptal</Button>
          <Button variant="contained" disabled={!assignParentId || !selectedStudent} onClick={async () => {
            try {
              if (!selectedStudent) return;
              const res = await studentManagementApi.assignParent(selectedStudent.id, assignParentId);
              if (res.success) {
                showSuccess('Veli atandı');
                await loadStudents();
              } else {
                showError('Veli atanamadı');
              }
            } catch (e) {
              showError('Atama sırasında hata');
            } finally {
              setAssignParentOpen(false);
            }
          }}>Ata</Button>
        </DialogActions>
      </Dialog>

      <NotificationComponent />
    </Box>
  );
};

export default StudentManagementPanel;
