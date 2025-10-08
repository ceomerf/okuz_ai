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
} from '@mui/icons-material';
import { apiService, User, Student, Teacher, Course, DashboardStats, SystemHealth, Alert } from '../../services/api.service';

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

const RealDataAdminPanel: React.FC = () => {
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
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
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

  useEffect(() => {
    loadAllData();
  }, []);

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

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>, type: 'users' | 'students' | 'teachers' | 'courses') => {
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

  // Öğrenci işlemleri
  const handleAddStudent = () => {
    setEditingStudent(null);
    setStudentDialogOpen(true);
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setStudentDialogOpen(true);
  };

  const handleDeleteStudent = async (student: Student) => {
    try {
      const response = await apiService.deleteStudent(student.id);
      if (response.success) {
        setStudents(prev => prev.filter(s => s.id !== student.id));
        setSnackbar({ open: true, message: 'Öğrenci silindi', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: 'Öğrenci silinirken hata oluştu', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Öğrenci silinirken hata oluştu', severity: 'error' });
    }
  };

  // Öğretmen işlemleri
  const handleAddTeacher = () => {
    setEditingTeacher(null);
    setTeacherDialogOpen(true);
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setTeacherDialogOpen(true);
  };

  const handleDeleteTeacher = async (teacher: Teacher) => {
    try {
      const response = await apiService.deleteTeacher(teacher.id);
      if (response.success) {
        setTeachers(prev => prev.filter(t => t.id !== teacher.id));
        setSnackbar({ open: true, message: 'Öğretmen silindi', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: 'Öğretmen silinirken hata oluştu', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Öğretmen silinirken hata oluştu', severity: 'error' });
    }
  };

  // Kurs işlemleri
  const handleAddCourse = () => {
    setEditingCourse(null);
    setCourseDialogOpen(true);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseDialogOpen(true);
  };

  const handleDeleteCourse = async (course: Course) => {
    try {
      const response = await apiService.deleteCourse(course.id);
      if (response.success) {
        setCourses(prev => prev.filter(c => c.id !== course.id));
        setSnackbar({ open: true, message: 'Kurs silindi', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: 'Kurs silinirken hata oluştu', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Kurs silinirken hata oluştu', severity: 'error' });
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

  // Dashboard Overview Component
  const DashboardOverview = () => (
    <Grid container spacing={3}>
      {/* System Health */}
      <Grid item xs={12} md={6} lg={3}>
        <Card>
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
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Uptime: {systemHealth.uptime}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Response Time: {systemHealth.responseTime}ms
                </Typography>
              </>
            ) : (
              <CircularProgress size={24} />
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Total Users */}
      <Grid item xs={12} md={6} lg={3}>
        <Card>
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
                <Typography variant="body2" color="text.secondary">
                  Aktif: {dashboardStats.activeUsers.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Bugün: +{dashboardStats.newUsersToday}
                </Typography>
              </>
            ) : (
              <CircularProgress size={24} />
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Students */}
      <Grid item xs={12} md={6} lg={3}>
        <Card>
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
                <Typography variant="body2" color="text.secondary">
                  Ortalama Performans: {dashboardStats.averagePerformance}%
                </Typography>
              </>
            ) : (
              <CircularProgress size={24} />
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Revenue */}
      <Grid item xs={12} md={6} lg={3}>
        <Card>
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
                <Typography variant="body2" color="text.secondary">
                  MRR
                </Typography>
              </>
            ) : (
              <CircularProgress size={24} />
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🚨 Aktif Uyarılar ({alerts.length})
              </Typography>
              {alerts.slice(0, 3).map((alert) => (
                <Alert key={alert.id} severity={alert.severity === 'critical' ? 'error' : alert.severity === 'high' ? 'warning' : 'info'} sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">{alert.title}</Typography>
                  <Typography variant="body2">{alert.description}</Typography>
                </Alert>
              ))}
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );

  return (
    <Box>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h4" component="h1">
              🎯 Gerçek Verilerle Admin Paneli
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
                onClick={() => setSnackbar({ open: true, message: 'Veriler dışa aktarıldı', severity: 'success' })}
              >
                Dışa Aktar
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Dashboard Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            📊 Sistem Genel Bakış
          </Typography>
          <DashboardOverview />
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
            <Button variant="contained" startIcon={<Add />} onClick={handleAddUser}>
              Yeni Kullanıcı
            </Button>
          </Box>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
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
                  <TableRow key={user.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                          {user.name.charAt(0)}
                        </Avatar>
                        {user.name}
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip label={user.role} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <StatusChip status={user.status} />
                    </TableCell>
                    <TableCell>
                      <Chip label={user.subscriptionStatus} size="small" color="secondary" variant="outlined" />
                    </TableCell>
                    <TableCell>{user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString('tr-TR') : 'Hiç'}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleEditUser(user)} size="small">
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

        {/* Öğrenciler Tab */}
        <TabPanel value={currentTab} index={1}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5">Öğrenci Yönetimi</Typography>
            <Button variant="contained" startIcon={<Add />} onClick={handleAddStudent}>
              Yeni Öğrenci
            </Button>
          </Box>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ad Soyad</TableCell>
                  <TableCell>E-posta</TableCell>
                  <TableCell>Sınıf</TableCell>
                  <TableCell>Dersler</TableCell>
                  <TableCell>Performans</TableCell>
                  <TableCell>Devam</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell>İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                          {student.name.charAt(0)}
                        </Avatar>
                        {student.name}
                      </Box>
                    </TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.grade}</TableCell>
                    <TableCell>
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {student.subjects.slice(0, 2).map((subject, index) => (
                          <Chip key={index} label={subject} size="small" />
                        ))}
                        {student.subjects.length > 2 && (
                          <Chip label={`+${student.subjects.length - 2}`} size="small" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <LinearProgress 
                          variant="determinate" 
                          value={student.performance} 
                          sx={{ width: 60, mr: 1 }}
                        />
                        {student.performance}%
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <LinearProgress 
                          variant="determinate" 
                          value={student.attendance} 
                          sx={{ width: 60, mr: 1 }}
                        />
                        {student.attendance}%
                      </Box>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={student.status} />
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleEditStudent(student)} size="small">
                        <Edit />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteStudent(student)} size="small" color="error">
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
              count={students.length}
              rowsPerPage={studentsRowsPerPage}
              page={studentsPage}
              onPageChange={(event, newPage) => handleChangePage(event, newPage, 'students')}
              onRowsPerPageChange={(event) => handleChangeRowsPerPage(event, 'students')}
            />
          </TableContainer>
        </TabPanel>

        {/* Öğretmenler Tab */}
        <TabPanel value={currentTab} index={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5">Öğretmen Yönetimi</Typography>
            <Button variant="contained" startIcon={<Add />} onClick={handleAddTeacher}>
              Yeni Öğretmen
            </Button>
          </Box>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ad Soyad</TableCell>
                  <TableCell>E-posta</TableCell>
                  <TableCell>Dersler</TableCell>
                  <TableCell>Deneyim</TableCell>
                  <TableCell>Puan</TableCell>
                  <TableCell>Öğrenci Sayısı</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell>İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                          {teacher.name.charAt(0)}
                        </Avatar>
                        {teacher.name}
                      </Box>
                    </TableCell>
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell>
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {teacher.subjects.slice(0, 2).map((subject, index) => (
                          <Chip key={index} label={subject} size="small" />
                        ))}
                        {teacher.subjects.length > 2 && (
                          <Chip label={`+${teacher.subjects.length - 2}`} size="small" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{teacher.experience} yıl</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Star color="warning" sx={{ mr: 0.5 }} />
                        {teacher.rating}
                      </Box>
                    </TableCell>
                    <TableCell>{teacher.students}</TableCell>
                    <TableCell>
                      <StatusChip status={teacher.status} />
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleEditTeacher(teacher)} size="small">
                        <Edit />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteTeacher(teacher)} size="small" color="error">
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
              count={teachers.length}
              rowsPerPage={teachersRowsPerPage}
              page={teachersPage}
              onPageChange={(event, newPage) => handleChangePage(event, newPage, 'teachers')}
              onRowsPerPageChange={(event) => handleChangeRowsPerPage(event, 'teachers')}
            />
          </TableContainer>
        </TabPanel>

        {/* Kurslar Tab */}
        <TabPanel value={currentTab} index={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5">Kurs Yönetimi</Typography>
            <Button variant="contained" startIcon={<Add />} onClick={handleAddCourse}>
              Yeni Kurs
            </Button>
          </Box>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Kurs Adı</TableCell>
                  <TableCell>Ders</TableCell>
                  <TableCell>Sınıf</TableCell>
                  <TableCell>Öğretmen</TableCell>
                  <TableCell>Öğrenci Sayısı</TableCell>
                  <TableCell>İlerleme</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell>İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>{course.title}</TableCell>
                    <TableCell>{course.subject}</TableCell>
                    <TableCell>{course.grade}</TableCell>
                    <TableCell>{course.teacherName}</TableCell>
                    <TableCell>{course.students}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <LinearProgress 
                          variant="determinate" 
                          value={course.progress} 
                          sx={{ width: 60, mr: 1 }}
                        />
                        {course.progress}%
                      </Box>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={course.status} />
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleEditCourse(course)} size="small">
                        <Edit />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteCourse(course)} size="small" color="error">
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
              count={courses.length}
              rowsPerPage={coursesRowsPerPage}
              page={coursesPage}
              onPageChange={(event, newPage) => handleChangePage(event, newPage, 'courses')}
              onRowsPerPageChange={(event) => handleChangeRowsPerPage(event, 'courses')}
            />
          </TableContainer>
        </TabPanel>

        {/* Analitik Tab */}
        <TabPanel value={currentTab} index={4}>
          <Typography variant="h5" gutterBottom>
            📊 Sistem Analitikleri
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
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
            <Grid item xs={12} md={6}>
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

        {/* Ayarlar Tab */}
        <TabPanel value={currentTab} index={5}>
          <Typography variant="h5" gutterBottom>
            ⚙️ Sistem Ayarları
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
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
            <Grid item xs={12} md={6}>
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

export default RealDataAdminPanel;
