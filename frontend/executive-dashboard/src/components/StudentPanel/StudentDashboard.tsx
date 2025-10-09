import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
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
  PlayArrow,
  Pause,
  Stop,
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
      id={`student-tabpanel-${index}`}
      aria-labelledby={`student-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const StudentDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // Mock data
  const studentStats = {
    averageGrade: 85.2,
    completedAssignments: 28,
    pendingAssignments: 5,
    attendanceRate: 94.5,
    studyHours: 45,
    streak: 7,
  };

  const recentGrades = [
    { id: 1, subject: 'Matematik', grade: 92, date: '2024-01-10', teacher: 'Ahmet Öğretmen' },
    { id: 2, subject: 'Fizik', grade: 88, date: '2024-01-08', teacher: 'Ayşe Öğretmen' },
    { id: 3, subject: 'Kimya', grade: 85, date: '2024-01-05', teacher: 'Mehmet Öğretmen' },
    { id: 4, subject: 'Biyoloji', grade: 90, date: '2024-01-03', teacher: 'Fatma Öğretmen' },
  ];

  const upcomingAssignments = [
    { id: 1, title: 'Trigonometri Ödevi', subject: 'Matematik', dueDate: '2024-01-15', priority: 'high' },
    { id: 2, title: 'Fizik Laboratuvarı', subject: 'Fizik', dueDate: '2024-01-18', priority: 'medium' },
    { id: 3, title: 'Kimya Deneyi', subject: 'Kimya', dueDate: '2024-01-20', priority: 'low' },
  ];

  const studyPlan = [
    { id: 1, subject: 'Matematik', topic: 'Trigonometri', duration: '2 saat', completed: false },
    { id: 2, subject: 'Fizik', topic: 'Mekanik', duration: '1.5 saat', completed: true },
    { id: 3, subject: 'Kimya', topic: 'Organik Kimya', duration: '1 saat', completed: false },
  ];

  const achievements = [
    { id: 1, title: '7 Günlük Çalışma Serisi', description: '7 gün üst üste çalıştın!', icon: '🔥', earned: true },
    { id: 2, title: 'Matematik Ustası', description: 'Matematik dersinde 90+ not aldın', icon: '📊', earned: true },
    { id: 3, title: 'Düzenli Öğrenci', description: '1 ay %95+ devam oranı', icon: '📅', earned: false },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          🎓 Öğrenci Paneli
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Notifications />}>
            Bildirimler
          </Button>
          <Button variant="contained" startIcon={<PlayArrow />}>
            Çalışmaya Başla
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <Grade />
                </Avatar>
                <Box>
                  <Typography variant="h4">{studentStats.averageGrade}%</Typography>
                  <Typography color="text.secondary">Ortalama Not</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <Assignment />
                </Avatar>
                <Box>
                  <Typography variant="h4">{studentStats.completedAssignments}</Typography>
                  <Typography color="text.secondary">Tamamlanan Ödev</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <Schedule />
                </Avatar>
                <Box>
                  <Typography variant="h4">{studentStats.studyHours}</Typography>
                  <Typography color="text.secondary">Çalışma Saati</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <TrendingUp />
                </Avatar>
                <Box>
                  <Typography variant="h4">{studentStats.streak}</Typography>
                  <Typography color="text.secondary">Günlük Seri</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange} aria-label="student tabs">
            <Tab icon={<Assignment />} label="Ödevler" />
            <Tab icon={<Grade />} label="Notlar" />
            <Tab icon={<Book />} label="Çalışma Planı" />
            <Tab icon={<Analytics />} label="İlerleme" />
          </Tabs>
        </Box>

        {/* Ödevler Tab */}
        <TabPanel value={currentTab} index={0}>
          <Typography variant="h6" gutterBottom>
            Yaklaşan Ödevler
          </Typography>
          <Grid container spacing={2}>
            {upcomingAssignments.map((assignment) => (
              <Grid item xs={12} md={4} key={assignment.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">{assignment.title}</Typography>
                      <Chip
                        label={assignment.priority === 'high' ? 'Yüksek' : assignment.priority === 'medium' ? 'Orta' : 'Düşük'}
                        color={assignment.priority === 'high' ? 'error' : assignment.priority === 'medium' ? 'warning' : 'success'}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {assignment.subject}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Teslim: {assignment.dueDate}
                    </Typography>
                    <Button
                      variant="contained"
                      fullWidth
                      sx={{ mt: 2 }}
                      startIcon={<PlayArrow />}
                    >
                      Çalışmaya Başla
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Notlar Tab */}
        <TabPanel value={currentTab} index={1}>
          <Typography variant="h6" gutterBottom>
            Son Notlar
          </Typography>
          <List>
            {recentGrades.map((grade) => (
              <ListItem key={grade.id} divider>
                <ListItemIcon>
                  <Avatar sx={{ bgcolor: grade.grade >= 90 ? 'success.main' : grade.grade >= 80 ? 'primary.main' : 'warning.main' }}>
                    <Grade />
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={grade.subject}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Öğretmen: {grade.teacher} • Tarih: {grade.date}
                      </Typography>
                    </Box>
                  }
                />
                <Typography variant="h6" color={grade.grade >= 90 ? 'success.main' : grade.grade >= 80 ? 'primary.main' : 'warning.main'}>
                  {grade.grade}
                </Typography>
              </ListItem>
            ))}
          </List>
        </TabPanel>

        {/* Çalışma Planı Tab */}
        <TabPanel value={currentTab} index={2}>
          <Typography variant="h6" gutterBottom>
            Günlük Çalışma Planı
          </Typography>
          <Grid container spacing={2}>
            {studyPlan.map((item) => (
              <Grid item xs={12} md={4} key={item.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">{item.subject}</Typography>
                      <Chip
                        label={item.completed ? 'Tamamlandı' : 'Bekliyor'}
                        color={item.completed ? 'success' : 'warning'}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {item.topic}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Süre: {item.duration}
                    </Typography>
                    <Button
                      variant={item.completed ? 'outlined' : 'contained'}
                      fullWidth
                      sx={{ mt: 2 }}
                      startIcon={item.completed ? <CheckCircle /> : <PlayArrow />}
                      disabled={item.completed}
                    >
                      {item.completed ? 'Tamamlandı' : 'Başla'}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* İlerleme Tab */}
        <TabPanel value={currentTab} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Genel İlerleme
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h4" sx={{ mr: 2 }}>
                      {studentStats.averageGrade}%
                    </Typography>
                    <Typography color="text.secondary">Ortalama Not</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={studentStats.averageGrade}
                    sx={{ mb: 2 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Bu ay önceki aya göre %5.2 artış
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Başarımlar
                  </Typography>
                  <List>
                    {achievements.map((achievement) => (
                      <ListItem key={achievement.id}>
                        <ListItemIcon>
                          <Avatar sx={{ bgcolor: achievement.earned ? 'success.main' : 'grey.300' }}>
                            {achievement.icon}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={achievement.title}
                          secondary={achievement.description}
                        />
                        {achievement.earned && <CheckCircle color="success" />}
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>
    </Box>
  );
};

export default StudentDashboard;
