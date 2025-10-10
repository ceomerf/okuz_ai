import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper,
  IconButton,
  Badge,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  School,
  People,
  Assignment,
  Assessment,
  TrendingUp,
  Schedule,
  Notifications,
  Grade,
  Book,
  Quiz,
  Analytics,
  Person,
  Group,
  CalendarToday,
  CheckCircle,
  Warning,
  Info,
} from '@mui/icons-material';

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
      id={`teacher-tabpanel-${index}`}
      aria-labelledby={`teacher-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const TeacherDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [teacherStats, setTeacherStats] = useState({
    totalStudents: 0,
    activeClasses: 0,
    completedAssignments: 0,
    pendingGrading: 0,
    averageGrade: 0,
    attendanceRate: 0,
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // Gerçek veri çekme
  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        setLoading(true);
        
        // Backend'den öğretmen verilerini çek
        const response = await fetch('http://localhost:3002/api/teachers/dashboard', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setTeacherStats({
            totalStudents: data.totalStudents || 0,
            activeClasses: data.activeClasses || 0,
            completedAssignments: data.completedAssignments || 0,
            pendingGrading: data.pendingGrading || 0,
            averageGrade: data.averageGrade || 0,
            attendanceRate: data.attendanceRate || 0,
          });
        } else {
          // API başarısızsa sıfır değerler
          setTeacherStats({
            totalStudents: 0,
            activeClasses: 0,
            completedAssignments: 0,
            pendingGrading: 0,
            averageGrade: 0,
            attendanceRate: 0,
          });
        }
      } catch (error) {
        console.error('Öğretmen verileri yüklenemedi:', error);
        setTeacherStats({
          totalStudents: 0,
          activeClasses: 0,
          completedAssignments: 0,
          pendingGrading: 0,
          averageGrade: 0,
          attendanceRate: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, []);

  const recentStudents = [
    { id: 1, name: 'Ahmet Yılmaz', grade: 85, attendance: 95, lastActivity: '2 saat önce' },
    { id: 2, name: 'Ayşe Demir', grade: 92, attendance: 98, lastActivity: '1 saat önce' },
    { id: 3, name: 'Mehmet Kaya', grade: 78, attendance: 90, lastActivity: '3 saat önce' },
    { id: 4, name: 'Fatma Öz', grade: 88, attendance: 96, lastActivity: '4 saat önce' },
  ];

  const upcomingClasses = [
    { id: 1, subject: 'Matematik', time: '09:00', students: 15, room: 'A-101' },
    { id: 2, subject: 'Fizik', time: '11:00', students: 12, room: 'B-205' },
    { id: 3, subject: 'Kimya', time: '14:00', students: 18, room: 'C-301' },
  ];

  const assignments = [
    { id: 1, title: 'Trigonometri Ödevi', subject: 'Matematik', dueDate: '2024-01-15', submitted: 12, total: 15 },
    { id: 2, title: 'Fizik Laboratuvarı', subject: 'Fizik', dueDate: '2024-01-18', submitted: 8, total: 12 },
    { id: 3, title: 'Kimya Deneyi', subject: 'Kimya', dueDate: '2024-01-20', submitted: 15, total: 18 },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          🎓 Öğretmen Paneli
        </Typography>
        <Button variant="contained" startIcon={<Notifications />}>
          Bildirimler
        </Button>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3, mb: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                <People />
              </Avatar>
              <Box>
                <Typography variant="h4">{teacherStats.totalStudents}</Typography>
                <Typography color="text.secondary">Toplam Öğrenci</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                <School />
              </Avatar>
              <Box>
                <Typography variant="h4">{teacherStats.activeClasses}</Typography>
                <Typography color="text.secondary">Aktif Sınıf</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                <Assignment />
              </Avatar>
              <Box>
                <Typography variant="h4">{teacherStats.completedAssignments}</Typography>
                <Typography color="text.secondary">Tamamlanan Ödev</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                <Grade />
              </Avatar>
              <Box>
                <Typography variant="h4">{teacherStats.averageGrade}%</Typography>
                <Typography color="text.secondary">Ortalama Not</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange} aria-label="teacher tabs">
            <Tab icon={<People />} label="Öğrenciler" />
            <Tab icon={<Schedule />} label="Ders Programı" />
            <Tab icon={<Assignment />} label="Ödevler" />
            <Tab icon={<Analytics />} label="Analitik" />
          </Tabs>
        </Box>

        {/* Öğrenciler Tab */}
        <TabPanel value={currentTab} index={0}>
          <Typography variant="h6" gutterBottom>
            Son Aktif Öğrenciler
          </Typography>
          <List>
            {recentStudents.map((student) => (
              <ListItem key={student.id} divider>
                <ListItemIcon>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <Person />
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={student.name}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Not: {student.grade} | Devam: {student.attendance}% | Son aktivite: {student.lastActivity}
                      </Typography>
                    </Box>
                  }
                />
                <Chip
                  label={student.grade >= 80 ? 'İyi' : student.grade >= 60 ? 'Orta' : 'Düşük'}
                  color={student.grade >= 80 ? 'success' : student.grade >= 60 ? 'warning' : 'error'}
                  size="small"
                />
              </ListItem>
            ))}
          </List>
        </TabPanel>

        {/* Ders Programı Tab */}
        <TabPanel value={currentTab} index={1}>
          <Typography variant="h6" gutterBottom>
            Bugünkü Dersler
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
            {upcomingClasses.map((classItem) => (
              <Box key={classItem.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">{classItem.subject}</Typography>
                      <Chip label={classItem.time} color="primary" />
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Öğrenci Sayısı: {classItem.students}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sınıf: {classItem.room}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </TabPanel>

        {/* Ödevler Tab */}
        <TabPanel value={currentTab} index={2}>
          <Typography variant="h6" gutterBottom>
            Ödev Durumu
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
            {assignments.map((assignment) => (
              <Box key={assignment.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {assignment.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {assignment.subject} • Teslim: {assignment.dueDate}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Teslim Edilen</Typography>
                        <Typography variant="body2">{assignment.submitted}/{assignment.total}</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(assignment.submitted / assignment.total) * 100}
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {Math.round((assignment.submitted / assignment.total) * 100)}% tamamlandı
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </TabPanel>

        {/* Analitik Tab */}
        <TabPanel value={currentTab} index={3}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
            <Box>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Sınıf Performansı
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h4" sx={{ mr: 2 }}>
                      {teacherStats.averageGrade}%
                    </Typography>
                    <Typography color="text.secondary">Ortalama Not</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={teacherStats.averageGrade}
                    sx={{ mb: 2 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Bu ay önceki aya göre %5.2 artış
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            <Box>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Devam Durumu
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h4" sx={{ mr: 2 }}>
                      {teacherStats.attendanceRate}%
                    </Typography>
                    <Typography color="text.secondary">Devam Oranı</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={teacherStats.attendanceRate}
                    color="success"
                    sx={{ mb: 2 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Bu ay önceki aya göre %2.1 artış
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </TabPanel>
      </Card>
    </Box>
  );
};

export default TeacherDashboard;
