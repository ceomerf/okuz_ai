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
  Family,
  ChildCare,
  TrendingDown,
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
      id={`parent-tabpanel-${index}`}
      aria-labelledby={`parent-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ParentDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // Mock data
  const parentStats = {
    totalChildren: 2,
    averageGrade: 87.5,
    attendanceRate: 96.2,
    completedAssignments: 45,
    pendingMeetings: 1,
    totalStudyHours: 120,
  };

  const children = [
    {
      id: 1,
      name: 'Ahmet Yılmaz',
      grade: '9. Sınıf',
      averageGrade: 85.2,
      attendance: 94.5,
      lastActivity: '2 saat önce',
      subjects: ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'],
    },
    {
      id: 2,
      name: 'Ayşe Yılmaz',
      grade: '7. Sınıf',
      averageGrade: 89.8,
      attendance: 98.1,
      lastActivity: '1 saat önce',
      subjects: ['Matematik', 'Türkçe', 'Fen Bilgisi', 'Sosyal Bilgiler'],
    },
  ];

  const recentActivities = [
    { id: 1, child: 'Ahmet Yılmaz', activity: 'Matematik ödevi tamamlandı', time: '2 saat önce', type: 'assignment' },
    { id: 2, child: 'Ayşe Yılmaz', activity: 'Fen Bilgisi sınavına girdi', time: '4 saat önce', type: 'exam' },
    { id: 3, child: 'Ahmet Yılmaz', activity: 'Fizik dersine katıldı', time: '6 saat önce', type: 'class' },
    { id: 4, child: 'Ayşe Yılmaz', activity: 'Türkçe ödevi teslim etti', time: '8 saat önce', type: 'assignment' },
  ];

  const upcomingEvents = [
    { id: 1, title: 'Veli Toplantısı', date: '2024-01-20', time: '14:00', child: 'Ahmet Yılmaz', type: 'meeting' },
    { id: 2, title: 'Matematik Sınavı', date: '2024-01-22', time: '09:00', child: 'Ahmet Yılmaz', type: 'exam' },
    { id: 3, title: 'Fen Bilgisi Projesi', date: '2024-01-25', time: '16:00', child: 'Ayşe Yılmaz', type: 'project' },
  ];

  const performanceData = [
    { subject: 'Matematik', grade: 88, trend: 'up' },
    { subject: 'Fizik', grade: 85, trend: 'up' },
    { subject: 'Kimya', grade: 92, trend: 'down' },
    { subject: 'Biyoloji', grade: 90, trend: 'up' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          👨‍👩‍👧‍👦 Veli Paneli
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Notifications />}>
            Bildirimler
          </Button>
          <Button variant="contained" startIcon={<CalendarToday />}>
            Randevu Al
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
                  <Family />
                </Avatar>
                <Box>
                  <Typography variant="h4">{parentStats.totalChildren}</Typography>
                  <Typography color="text.secondary">Çocuk Sayısı</Typography>
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
                  <Grade />
                </Avatar>
                <Box>
                  <Typography variant="h4">{parentStats.averageGrade}%</Typography>
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
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <Schedule />
                </Avatar>
                <Box>
                  <Typography variant="h4">{parentStats.attendanceRate}%</Typography>
                  <Typography color="text.secondary">Devam Oranı</Typography>
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
                  <Assignment />
                </Avatar>
                <Box>
                  <Typography variant="h4">{parentStats.completedAssignments}</Typography>
                  <Typography color="text.secondary">Tamamlanan Ödev</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange} aria-label="parent tabs">
            <Tab icon={<ChildCare />} label="Çocuklarım" />
            <Tab icon={<Schedule />} label="Etkinlikler" />
            <Tab icon={<Analytics />} label="Performans" />
            <Tab icon={<Notifications />} label="Bildirimler" />
          </Tabs>
        </Box>

        {/* Çocuklarım Tab */}
        <TabPanel value={currentTab} index={0}>
          <Typography variant="h6" gutterBottom>
            Çocuklarımın Durumu
          </Typography>
          <Grid container spacing={3}>
            {children.map((child) => (
              <Grid item xs={12} md={6} key={child.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                        <Person />
                      </Avatar>
                      <Box>
                        <Typography variant="h6">{child.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {child.grade}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Ortalama Not
                        </Typography>
                        <Typography variant="h6" color="primary">
                          {child.averageGrade}%
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Devam Oranı
                        </Typography>
                        <Typography variant="h6" color="success.main">
                          {child.attendance}%
                        </Typography>
                      </Grid>
                    </Grid>

                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Son aktivite: {child.lastActivity}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Dersler: {child.subjects.join(', ')}
                    </Typography>

                    <Button variant="outlined" fullWidth sx={{ mt: 2 }}>
                      Detaylı Rapor
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Etkinlikler Tab */}
        <TabPanel value={currentTab} index={1}>
          <Typography variant="h6" gutterBottom>
            Yaklaşan Etkinlikler
          </Typography>
          <List>
            {upcomingEvents.map((event) => (
              <ListItem key={event.id} divider>
                <ListItemIcon>
                  <Avatar sx={{ bgcolor: event.type === 'meeting' ? 'primary.main' : event.type === 'exam' ? 'warning.main' : 'info.main' }}>
                    {event.type === 'meeting' ? <CalendarToday /> : event.type === 'exam' ? <Quiz /> : <Assignment />}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={event.title}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {event.child} • {event.date} {event.time}
                      </Typography>
                    </Box>
                  }
                />
                <Chip
                  label={event.type === 'meeting' ? 'Toplantı' : event.type === 'exam' ? 'Sınav' : 'Proje'}
                  color={event.type === 'meeting' ? 'primary' : event.type === 'exam' ? 'warning' : 'info'}
                  size="small"
                />
              </ListItem>
            ))}
          </List>
        </TabPanel>

        {/* Performans Tab */}
        <TabPanel value={currentTab} index={2}>
          <Typography variant="h6" gutterBottom>
            Ders Bazında Performans
          </Typography>
          <Grid container spacing={2}>
            {performanceData.map((item, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">{item.subject}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {item.trend === 'up' ? (
                          <TrendingUp color="success" />
                        ) : (
                          <TrendingDown color="error" />
                        )}
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          {item.trend === 'up' ? 'Yükseliş' : 'Düşüş'}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="h4" color="primary" gutterBottom>
                      {item.grade}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={item.grade}
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Bu ay önceki aya göre %2.5 değişim
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Bildirimler Tab */}
        <TabPanel value={currentTab} index={3}>
          <Typography variant="h6" gutterBottom>
            Son Aktiviteler
          </Typography>
          <List>
            {recentActivities.map((activity) => (
              <ListItem key={activity.id} divider>
                <ListItemIcon>
                  <Avatar sx={{ bgcolor: activity.type === 'assignment' ? 'success.main' : activity.type === 'exam' ? 'warning.main' : 'info.main' }}>
                    {activity.type === 'assignment' ? <Assignment /> : activity.type === 'exam' ? <Quiz /> : <School />}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={activity.activity}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {activity.child} • {activity.time}
                      </Typography>
                    </Box>
                  }
                />
                <Chip
                  label={activity.type === 'assignment' ? 'Ödev' : activity.type === 'exam' ? 'Sınav' : 'Ders'}
                  color={activity.type === 'assignment' ? 'success' : activity.type === 'exam' ? 'warning' : 'info'}
                  size="small"
                />
              </ListItem>
            ))}
          </List>
        </TabPanel>
      </Card>
    </Box>
  );
};

export default ParentDashboard;
