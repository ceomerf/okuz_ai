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
} from '@mui/material';
import { Grid } from '@mui/material';
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
} from '@mui/icons-material';
import AdvancedDataTable from './AdvancedDataTable';
import { apiService } from '../../services/api.service';

// Veri tipleri
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  lastLogin: string;
  grade?: number;
  subscription: string;
  performance: number;
  avatar?: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  grade: number;
  subjects: string[];
  performance: number;
  attendance: number;
  lastActivity: string;
  parentEmail: string;
  status: 'active' | 'inactive' | 'suspended';
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  subjects: string[];
  experience: number;
  rating: number;
  students: number;
  status: 'active' | 'inactive';
}

interface Course {
  id: string;
  title: string;
  subject: string;
  grade: number;
  students: number;
  progress: number;
  status: 'active' | 'inactive' | 'completed';
  startDate: string;
  endDate: string;
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
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ComprehensiveAdminPanel: React.FC = () => {
  // State
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
  
  // Veri state'leri
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  
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
  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, studentsRes, teachersRes, coursesRes] = await Promise.all([
        apiService.getUsers(1, 50),
        apiService.getStudents(1, 50),
        apiService.getTeachers(1, 50),
        apiService.getCourses(1, 50),
      ]);

      if (usersRes.success && usersRes.data) setUsers(usersRes.data.users as any);
      if (studentsRes.success && studentsRes.data) setStudents(studentsRes.data.students as any);
      if (teachersRes.success && teachersRes.data) setTeachers(teachersRes.data.teachers as any);
      if (coursesRes.success && coursesRes.data) setCourses(coursesRes.data.courses as any);
    } catch (error) {
      setSnackbar({ open: true, message: 'Veri yüklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

  const handleDeleteUser = (user: User) => {
    setUsers(prev => prev.filter(u => u.id !== user.id));
    setSnackbar({ open: true, message: 'Kullanıcı silindi', severity: 'success' });
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

  const handleDeleteStudent = (student: Student) => {
    setStudents(prev => prev.filter(s => s.id !== student.id));
    setSnackbar({ open: true, message: 'Öğrenci silindi', severity: 'success' });
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

  const handleDeleteTeacher = (teacher: Teacher) => {
    setTeachers(prev => prev.filter(t => t.id !== teacher.id));
    setSnackbar({ open: true, message: 'Öğretmen silindi', severity: 'success' });
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

  const handleDeleteCourse = (course: Course) => {
    setCourses(prev => prev.filter(c => c.id !== course.id));
    setSnackbar({ open: true, message: 'Kurs silindi', severity: 'success' });
  };

  // Kullanıcı sütunları
  const userColumns = [
    { id: 'name', label: 'Ad Soyad', minWidth: 150, sortable: true, filterable: true },
    { id: 'email', label: 'E-posta', minWidth: 200, sortable: true, filterable: true },
    { id: 'role', label: 'Rol', minWidth: 100, sortable: true, filterable: true },
    { id: 'status', label: 'Durum', minWidth: 100, type: 'status' as const, sortable: true, filterable: true },
    { id: 'subscription', label: 'Abonelik', minWidth: 120, sortable: true, filterable: true },
    { id: 'performance', label: 'Performans', minWidth: 100, sortable: true, type: 'number' as const },
    { id: 'lastLogin', label: 'Son Giriş', minWidth: 120, sortable: true, type: 'date' as const },
  ];

  // Öğrenci sütunları
  const studentColumns = [
    { id: 'name', label: 'Ad Soyad', minWidth: 150, sortable: true, filterable: true },
    { id: 'email', label: 'E-posta', minWidth: 200, sortable: true, filterable: true },
    { id: 'grade', label: 'Sınıf', minWidth: 80, sortable: true, filterable: true },
    { id: 'subjects', label: 'Dersler', minWidth: 150, sortable: false, filterable: true },
    { id: 'performance', label: 'Performans', minWidth: 100, sortable: true, type: 'number' as const },
    { id: 'attendance', label: 'Devam', minWidth: 80, sortable: true, type: 'number' as const },
    { id: 'status', label: 'Durum', minWidth: 100, type: 'status' as const, sortable: true, filterable: true },
  ];

  // Öğretmen sütunları
  const teacherColumns = [
    { id: 'name', label: 'Ad Soyad', minWidth: 150, sortable: true, filterable: true },
    { id: 'email', label: 'E-posta', minWidth: 200, sortable: true, filterable: true },
    { id: 'subjects', label: 'Dersler', minWidth: 150, sortable: false, filterable: true },
    { id: 'experience', label: 'Deneyim (Yıl)', minWidth: 120, sortable: true, type: 'number' as const },
    { id: 'rating', label: 'Puan', minWidth: 80, sortable: true, type: 'number' as const },
    { id: 'students', label: 'Öğrenci Sayısı', minWidth: 120, sortable: true, type: 'number' as const },
    { id: 'status', label: 'Durum', minWidth: 100, type: 'status' as const, sortable: true, filterable: true },
  ];

  // Kurs sütunları
  const courseColumns = [
    { id: 'title', label: 'Kurs Adı', minWidth: 200, sortable: true, filterable: true },
    { id: 'subject', label: 'Ders', minWidth: 120, sortable: true, filterable: true },
    { id: 'grade', label: 'Sınıf', minWidth: 80, sortable: true, filterable: true },
    { id: 'students', label: 'Öğrenci Sayısı', minWidth: 120, sortable: true, type: 'number' as const },
    { id: 'progress', label: 'İlerleme', minWidth: 100, sortable: true, type: 'number' as const },
    { id: 'status', label: 'Durum', minWidth: 100, type: 'status' as const, sortable: true, filterable: true },
    { id: 'startDate', label: 'Başlangıç', minWidth: 120, sortable: true, type: 'date' as const },
    { id: 'endDate', label: 'Bitiş', minWidth: 120, sortable: true, type: 'date' as const },
  ];

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
              🎯 Öküz AI Admin Paneli
            </Typography>
            <Box display="flex" gap={2}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadData}
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
          <AdvancedDataTable
            title="Kullanıcı Yönetimi"
            data={users}
            columns={userColumns}
            onAdd={handleAddUser}
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
            onRefresh={loadData}
            loading={loading}
            searchable
            filterable
            sortable
            selectable
            bulkActions
          />
        </TabPanel>

        {/* Öğrenciler Tab */}
        <TabPanel value={currentTab} index={1}>
          <AdvancedDataTable
            title="Öğrenci Yönetimi"
            data={students}
            columns={studentColumns}
            onAdd={handleAddStudent}
            onEdit={handleEditStudent}
            onDelete={handleDeleteStudent}
            onRefresh={loadData}
            loading={loading}
            searchable
            filterable
            sortable
            selectable
            bulkActions
          />
        </TabPanel>

        {/* Öğretmenler Tab */}
        <TabPanel value={currentTab} index={2}>
          <AdvancedDataTable
            title="Öğretmen Yönetimi"
            data={teachers}
            columns={teacherColumns}
            onAdd={handleAddTeacher}
            onEdit={handleEditTeacher}
            onDelete={handleDeleteTeacher}
            onRefresh={loadData}
            loading={loading}
            searchable
            filterable
            sortable
            selectable
            bulkActions
          />
        </TabPanel>

        {/* Kurslar Tab */}
        <TabPanel value={currentTab} index={3}>
          <AdvancedDataTable
            title="Kurs Yönetimi"
            data={courses}
            columns={courseColumns}
            onAdd={handleAddCourse}
            onEdit={handleEditCourse}
            onDelete={handleDeleteCourse}
            onRefresh={loadData}
            loading={loading}
            searchable
            filterable
            sortable
            selectable
            bulkActions
          />
        </TabPanel>

        {/* Analitik Tab */}
        <TabPanel value={currentTab} index={4}>
          <Box>
            <Typography variant="h5" gutterBottom>
              📊 Sistem Analitikleri
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={3}>
              <Box sx={{ flex: 1, minWidth: 300 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Kullanıcı İstatistikleri
                    </Typography>
                    <Box display="flex" justifyContent="space-between" mb={2}>
                      <Typography>Toplam Kullanıcı</Typography>
                      <Typography variant="h6">{users.length}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={2}>
                      <Typography>Aktif Kullanıcı</Typography>
                      <Typography variant="h6">{users.filter(u => u.status === 'active').length}</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={75} />
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: 1, minWidth: 300 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Öğrenci İstatistikleri
                    </Typography>
                    <Box display="flex" justifyContent="space-between" mb={2}>
                      <Typography>Toplam Öğrenci</Typography>
                      <Typography variant="h6">{students.length}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={2}>
                      <Typography>Ortalama Performans</Typography>
                      <Typography variant="h6">
                        {students.length > 0 ? Math.round(students.reduce((sum, s) => sum + s.performance, 0) / students.length) : 0}%
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={85} />
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </Box>
        </TabPanel>

        {/* Ayarlar Tab */}
        <TabPanel value={currentTab} index={5}>
          <Box>
            <Typography variant="h5" gutterBottom>
              ⚙️ Sistem Ayarları
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={3}>
              <Box sx={{ flex: 1, minWidth: 300 }}>
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
              </Box>
              <Box sx={{ flex: 1, minWidth: 300 }}>
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
              </Box>
            </Box>
          </Box>
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

export default ComprehensiveAdminPanel;
