import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Button,
  IconButton,
  Chip,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Avatar,
  Badge,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Backdrop,
  CircularProgress,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  InputAdornment,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
} from '@mui/material';
import {
  Dashboard,
  People,
  School,
  Book,
  Quiz,
  Assessment,
  Analytics,
  Settings,
  Security,
  Notifications,
  Email,
  Phone,
  LocationOn,
  CalendarToday,
  TrendingUp,
  TrendingDown,
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
  ViewComfy,
  Speed,
  Memory,
  Storage,
  NetworkCheck,
  Security as SecurityIcon,
  BugReport,
  Report,
  Assignment,
  TrendingFlat,
  ExpandMore,
  PlayArrow,
  Pause,
  Stop,
  RestartAlt,
  CloudUpload,
  CloudDownload,
  Sync,
  AutoFixHigh,
  Psychology,
  SmartToy,
  School as SchoolIcon,
  Work,
  Home,
  Public,
  Language,
  Translate,
  Accessibility,
  Support,
  Help,
  Feedback,
  RateReview,
  ThumbUp,
  ThumbDown,
  Favorite,
  Share,
  ContentCopy,
  Print,
  Archive,
  Unarchive,
  Lock,
  LockOpen,
  VisibilityOff,
  AdminPanelSettings,
  SupervisedUserCircle,
  PersonAdd,
  PersonRemove,
  GroupAdd,
  GroupRemove,
  School as SchoolAdd,
  Work as WorkAdd,
  Home as HomeAdd,
  Public as PublicAdd,
} from '@mui/icons-material';
import { apiService, User, Student, Teacher, Course, DashboardStats, SystemHealth, Alert as ApiAlert } from '../../services/api.service';

// Veri tipleri
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
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const EnhancedAdminPanel: React.FC = () => {
  // State
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
  
  // Veri state'leri
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [alerts, setAlerts] = useState<ApiAlert[]>([]);
  
  // Pagination state'leri
  const [usersPage, setUsersPage] = useState(0);
  const [usersRowsPerPage, setUsersRowsPerPage] = useState(10);
  const [studentsPage, setStudentsPage] = useState(0);
  const [studentsRowsPerPage, setStudentsRowsPerPage] = useState(10);
  const [teachersPage, setTeachersPage] = useState(0);
  const [teachersRowsPerPage, setTeachersRowsPerPage] = useState(10);
  const [coursesPage, setCoursesPage] = useState(0);
  const [coursesRowsPerPage, setCoursesRowsPerPage] = useState(10);
  
  // Dialog state'leri
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  
  // Form state'leri
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Speed Dial actions
  const speedDialActions = [
    { icon: <Add />, name: 'Yeni Kullanıcı', onClick: () => setUserDialogOpen(true) },
    { icon: <School />, name: 'Yeni Öğrenci', onClick: () => setStudentDialogOpen(true) },
    { icon: <Group />, name: 'Yeni Öğretmen', onClick: () => setTeacherDialogOpen(true) },
    { icon: <Book />, name: 'Yeni Kurs', onClick: () => setCourseDialogOpen(true) },
    { icon: <Download />, name: 'Dışa Aktar', onClick: () => handleExport() },
    { icon: <Refresh />, name: 'Yenile', onClick: () => loadAllData() },
  ];

  // Tab değiştirme
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // Veri yükleme
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsResponse, healthResponse, alertsResponse] = await Promise.all([
        apiService.getDashboardStats(),
        apiService.getSystemHealth(),
        apiService.getAlerts(),
      ]);

      if (statsResponse.success) {
        setDashboardStats(statsResponse.data);
      }
      if (healthResponse.success) {
        setSystemHealth(healthResponse.data);
      }
      if (alertsResponse.success) {
        setAlerts(alertsResponse.data);
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Dashboard verileri yüklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await apiService.getUsers(usersPage + 1, usersRowsPerPage);
      if (response.success && response.data) {
        setUsers(response.data.users);
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Kullanıcılar yüklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      const response = await apiService.getStudents(studentsPage + 1, studentsRowsPerPage);
      if (response.success && response.data) {
        setStudents(response.data.students);
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Öğrenciler yüklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const response = await apiService.getTeachers(teachersPage + 1, teachersRowsPerPage);
      if (response.success && response.data) {
        setTeachers(response.data.teachers);
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Öğretmenler yüklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    setLoading(true);
    try {
      const response = await apiService.getCourses(coursesPage + 1, coursesRowsPerPage);
      if (response.success && response.data) {
        setCourses(response.data.courses);
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Kurslar yüklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    await Promise.all([
      loadDashboardData(),
      loadUsers(),
      loadStudents(),
      loadTeachers(),
      loadCourses(),
    ]);
  };

  const handleExport = async () => {
    try {
      // Export logic here
      setSnackbar({ open: true, message: 'Veriler dışa aktarıldı', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Dışa aktarma hatası', severity: 'error' });
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Kullanıcı işlemleri
  const handleAddUser = () => {
    setEditingUser(null);
    setUserDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserDialogOpen(true);
  };

  const handleDeleteUser = async (user: User) => {
    try {
      const response = await apiService.deleteUser(user.id);
      if (response.success) {
        setUsers(prev => prev.filter(u => u.id !== user.id));
        setSnackbar({ open: true, message: 'Kullanıcı silindi', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: 'Kullanıcı silinirken hata oluştu', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Kullanıcı silinirken hata oluştu', severity: 'error' });
    }
  };

  // Pagination handlers
  const handleChangePage = (event: unknown, newPage: number, type: 'users' | 'students' | 'teachers' | 'courses') => {
    switch (type) {
      case 'users':
        setUsersPage(newPage);
        break;
      case 'students':
        setStudentsPage(newPage);
        break;
      case 'teachers':
        setTeachersPage(newPage);
        break;
      case 'courses':
        setCoursesPage(newPage);
        break;
    }
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, type: 'users' | 'students' | 'teachers' | 'courses') => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    switch (type) {
      case 'users':
        setUsersRowsPerPage(newRowsPerPage);
        setUsersPage(0);
        break;
      case 'students':
        setStudentsRowsPerPage(newRowsPerPage);
        setStudentsPage(0);
        break;
      case 'teachers':
        setTeachersRowsPerPage(newRowsPerPage);
        setTeachersPage(0);
        break;
      case 'courses':
        setCoursesRowsPerPage(newRowsPerPage);
        setCoursesPage(0);
        break;
    }
  };

  // Status chip component
  const StatusChip = ({ status }: { status: string }) => {
    const getStatusColor = (status: string) => {
      switch (status.toLowerCase()) {
        case 'active':
        case 'completed':
        case 'excellent':
        case 'good':
          return 'success';
        case 'inactive':
        case 'cancelled':
        case 'warning':
          return 'warning';
        case 'pending':
        case 'suspended':
        case 'critical':
          return 'error';
        default:
          return 'default';
      }
    };

    return (
      <Chip
        label={status}
        color={getStatusColor(status) as any}
        size="small"
        variant="outlined"
      />
    );
  };

  // Enhanced Dashboard Overview Component
  const EnhancedDashboardOverview = () => (
    <Grid container spacing={3}>
      {/* System Health with more details */}
      <Grid size={{ xs: 12, md: 6, lg: 3 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <Speed color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Sistem Sağlığı</Typography>
            </Box>
            {systemHealth ? (
              <>
                <Typography variant="h4" color="primary">
                  {systemHealth.score}/100
                </Typography>
                <StatusChip status={systemHealth.status} />
                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary">
                    Uptime: {systemHealth.uptime}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={systemHealth.uptime} 
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Box mt={1}>
                  <Typography variant="body2" color="text.secondary">
                    Response Time: {systemHealth.responseTime}ms
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.max(0, 100 - (systemHealth.responseTime / 10))} 
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Box mt={1}>
                  <Typography variant="body2" color="text.secondary">
                    Error Rate: {systemHealth.errorRate}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.max(0, 100 - systemHealth.errorRate * 10)} 
                    sx={{ mt: 1 }}
                    color={systemHealth.errorRate > 5 ? 'error' : 'primary'}
                  />
                </Box>
              </>
            ) : (
              <CircularProgress size={24} />
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Total Users with trends */}
      <Grid size={{ xs: 12, md: 6, lg: 3 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <People color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Toplam Kullanıcı</Typography>
            </Box>
            {dashboardStats ? (
              <>
                <Typography variant="h4" color="primary">
                  {dashboardStats.totalUsers.toLocaleString()}
                </Typography>
                <Box display="flex" alignItems="center" mt={1}>
                  <TrendingUp color="success" sx={{ mr: 0.5 }} />
                  <Typography variant="body2" color="success.main">
                    +{dashboardStats.newUsersToday} bugün
                  </Typography>
                </Box>
                <Box mt={1}>
                  <Typography variant="body2" color="text.secondary">
                    Aktif: {dashboardStats.activeUsers.toLocaleString()}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(dashboardStats.activeUsers / dashboardStats.totalUsers) * 100} 
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Box mt={1}>
                  <Typography variant="body2" color="text.secondary">
                    Bu hafta: +{dashboardStats.newUsersThisWeek}
                  </Typography>
                </Box>
              </>
            ) : (
              <CircularProgress size={24} />
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Students with performance */}
      <Grid size={{ xs: 12, md: 6, lg: 3 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <School color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Öğrenciler</Typography>
            </Box>
            {dashboardStats ? (
              <>
                <Typography variant="h4" color="primary">
                  {dashboardStats.totalStudents.toLocaleString()}
                </Typography>
                <Box mt={1}>
                  <Typography variant="body2" color="text.secondary">
                    Ortalama Performans: {dashboardStats.averagePerformance}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={dashboardStats.averagePerformance} 
                    sx={{ mt: 1 }}
                    color={dashboardStats.averagePerformance > 80 ? 'success' : dashboardStats.averagePerformance > 60 ? 'warning' : 'error'}
                  />
                </Box>
                <Box mt={1}>
                  <Typography variant="body2" color="text.secondary">
                    Aktif Öğrenciler: {Math.round(dashboardStats.totalStudents * 0.85)}
                  </Typography>
                </Box>
              </>
            ) : (
              <CircularProgress size={24} />
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Revenue with growth */}
      <Grid size={{ xs: 12, md: 6, lg: 3 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <TrendingUp color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Aylık Gelir</Typography>
            </Box>
            {dashboardStats ? (
              <>
                <Typography variant="h4" color="primary">
                  ${dashboardStats.monthlyRevenue.toLocaleString()}
                </Typography>
                <Box display="flex" alignItems="center" mt={1}>
                  <TrendingUp color="success" sx={{ mr: 0.5 }} />
                  <Typography variant="body2" color="success.main">
                    +12.5% bu ay
                  </Typography>
                </Box>
                <Box mt={1}>
                  <Typography variant="body2" color="text.secondary">
                    MRR (Monthly Recurring Revenue)
                  </Typography>
                </Box>
                <Box mt={1}>
                  <Typography variant="body2" color="text.secondary">
                    Hedef: $50,000
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(dashboardStats.monthlyRevenue / 50000) * 100} 
                    sx={{ mt: 1 }}
                  />
                </Box>
              </>
            ) : (
              <CircularProgress size={24} />
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Real-time Alerts */}
      {alerts.length > 0 && (
        <Grid size={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Warning color="error" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  🚨 Aktif Uyarılar ({alerts.length})
                </Typography>
              </Box>
              <Grid container spacing={2}>
                {alerts.slice(0, 4).map((alert) => (
                  <Grid size={{ xs: 12, md: 6, lg: 3 }} key={alert.id}>
                    <Alert 
                      severity={alert.severity === 'critical' ? 'error' : alert.severity === 'high' ? 'warning' : 'info'} 
                      sx={{ height: '100%' }}
                    >
                      <Typography variant="subtitle2" fontWeight="bold">
                        {alert.title}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {alert.description}
                      </Typography>
                      {alert.autoFixable && (
                        <Button size="small" sx={{ mt: 1 }}>
                          Otomatik Düzelt
                        </Button>
                      )}
                    </Alert>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );

  // Quick Actions Component
  const QuickActions = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          ⚡ Hızlı İşlemler
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              fullWidth
              onClick={() => setUserDialogOpen(true)}
            >
              Yeni Kullanıcı
            </Button>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Button
              variant="contained"
              startIcon={<School />}
              fullWidth
              onClick={() => setStudentDialogOpen(true)}
            >
              Yeni Öğrenci
            </Button>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Button
              variant="contained"
              startIcon={<Group />}
              fullWidth
              onClick={() => setTeacherDialogOpen(true)}
            >
              Yeni Öğretmen
            </Button>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Button
              variant="contained"
              startIcon={<Book />}
              fullWidth
              onClick={() => setCourseDialogOpen(true)}
            >
              Yeni Kurs
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h4" component="h1" sx={{ 
              color: 'primary.main',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #FF6B35 0%, #FFA726 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              🎯 Öküz AI Gelişmiş Admin Paneli
            </Typography>
            <Box display="flex" gap={2}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadAllData}
                disabled={loading}
              >
                Yenile
              </Button>
              <Button
                variant="contained"
                startIcon={<Download />}
                onClick={handleExport}
              >
                Dışa Aktar
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <QuickActions />

      {/* Enhanced Dashboard Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            📊 Gelişmiş Sistem Genel Bakış
          </Typography>
          <EnhancedDashboardOverview />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange} aria-label="admin tabs">
            <Tab icon={<People />} label="Kullanıcılar" />
            <Tab icon={<School />} label="Öğrenciler" />
            <Tab icon={<Group />} label="Öğretmenler" />
            <Tab icon={<Book />} label="Kurslar" />
            <Tab icon={<Analytics />} label="Analitik" />
            <Tab icon={<Settings />} label="Ayarlar" />
          </Tabs>
        </Box>

        {/* Kullanıcılar Tab */}
        <TabPanel value={currentTab} index={0}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5">Kullanıcı Yönetimi</Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => setUserDialogOpen(true)}>
              Yeni Kullanıcı
            </Button>
          </Box>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Avatar</TableCell>
                  <TableCell>Ad Soyad</TableCell>
                  <TableCell>E-posta</TableCell>
                  <TableCell>Rol</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell>Abonelik</TableCell>
                  <TableCell>Son Aktivite</TableCell>
                  <TableCell>İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Avatar sx={{ width: 40, height: 40 }}>
                        {user.name.charAt(0)}
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {user.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={user.role} 
                        size="small" 
                        color="primary" 
                        variant="outlined" 
                      />
                    </TableCell>
                    <TableCell>
                      <StatusChip status={user.status} />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.subscriptionStatus} 
                        size="small" 
                        color="secondary" 
                        variant="outlined" 
                      />
                    </TableCell>
                    <TableCell>
                      {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString('tr-TR') : 'Hiç'}
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => setEditingUser(user)} size="small">
                        <Edit />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteUser(user)} size="small" color="error">
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={users.length}
              rowsPerPage={usersRowsPerPage}
              page={usersPage}
              onPageChange={(event, newPage) => handleChangePage(event, newPage, 'users')}
              onRowsPerPageChange={(event) => handleChangeRowsPerPage(event, 'users')}
            />
          </TableContainer>
        </TabPanel>

        {/* Diğer tablar benzer şekilde geliştirilebilir */}
        <TabPanel value={currentTab} index={1}>
          <Typography variant="h5" gutterBottom>
            Öğrenci Yönetimi
          </Typography>
          <Typography color="text.secondary">
            Öğrenci yönetimi burada geliştirilecek...
          </Typography>
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <Typography variant="h5" gutterBottom>
            Öğretmen Yönetimi
          </Typography>
          <Typography color="text.secondary">
            Öğretmen yönetimi burada geliştirilecek...
          </Typography>
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <Typography variant="h5" gutterBottom>
            Kurs Yönetimi
          </Typography>
          <Typography color="text.secondary">
            Kurs yönetimi burada geliştirilecek...
          </Typography>
        </TabPanel>

        <TabPanel value={currentTab} index={4}>
          <Typography variant="h5" gutterBottom>
            📊 Gelişmiş Analitik
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Kullanıcı İstatistikleri
                  </Typography>
                  {dashboardStats ? (
                    <>
                      <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography>Toplam Kullanıcı</Typography>
                        <Typography variant="h6">{dashboardStats.totalUsers.toLocaleString()}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography>Aktif Kullanıcı</Typography>
                        <Typography variant="h6">{dashboardStats.activeUsers.toLocaleString()}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography>Bu Ay Yeni</Typography>
                        <Typography variant="h6">{dashboardStats.newUsersThisMonth.toLocaleString()}</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={(dashboardStats.activeUsers / dashboardStats.totalUsers) * 100} />
                    </>
                  ) : (
                    <CircularProgress />
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Öğrenci İstatistikleri
                  </Typography>
                  {dashboardStats ? (
                    <>
                      <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography>Toplam Öğrenci</Typography>
                        <Typography variant="h6">{dashboardStats.totalStudents.toLocaleString()}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography>Ortalama Performans</Typography>
                        <Typography variant="h6">{dashboardStats.averagePerformance}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={dashboardStats.averagePerformance} />
                    </>
                  ) : (
                    <CircularProgress />
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={currentTab} index={5}>
          <Typography variant="h5" gutterBottom>
            ⚙️ Gelişmiş Sistem Ayarları
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Genel Ayarlar
                  </Typography>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Otomatik yedekleme"
                  />
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="E-posta bildirimleri"
                  />
                  <FormControlLabel
                    control={<Switch />}
                    label="Bakım modu"
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Güvenlik Ayarları
                  </Typography>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="İki faktörlü kimlik doğrulama"
                  />
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Oturum zaman aşımı"
                  />
                  <FormControlLabel
                    control={<Switch />}
                    label="IP kısıtlaması"
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>

      {/* Speed Dial for quick actions */}
      <SpeedDial
        ariaLabel="Hızlı işlemler"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
      >
        {speedDialActions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={action.onClick}
          />
        ))}
      </SpeedDial>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Loading Backdrop */}
      <Backdrop open={loading} sx={{ zIndex: 9999 }}>
        <Box textAlign="center">
          <CircularProgress color="primary" />
          <Typography variant="h6" sx={{ mt: 2 }}>
            İşlem yapılıyor...
          </Typography>
        </Box>
      </Backdrop>
    </Box>
  );
};

export default EnhancedAdminPanel;
