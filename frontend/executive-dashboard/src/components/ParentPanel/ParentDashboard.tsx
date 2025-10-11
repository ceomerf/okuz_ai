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
  ListItemAvatar,
  Divider,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import {
  School,
  Grade,
  CalendarToday,
  CheckCircle,
  Warning,
  Info,
  FamilyRestroom,
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
  const [tabValue, setTabValue] = useState(0);
  const [parentStats, setParentStats] = useState({
    totalChildren: 2,
    averageGrade: 85,
    completedAssignments: 12,
    pendingAssignments: 3,
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const children = [
    {
      id: 1,
      name: 'Ahmet Yılmaz',
      grade: '9. Sınıf',
      school: 'Ankara Fen Lisesi',
      averageGrade: 88,
      lastActivity: '2 gün önce',
      status: 'active',
    },
    {
      id: 2,
      name: 'Elif Yılmaz',
      grade: '7. Sınıf',
      school: 'Ankara Ortaokulu',
      averageGrade: 82,
      lastActivity: '1 gün önce',
      status: 'active',
    },
  ];

  const recentActivities = [
    {
      id: 1,
      child: 'Ahmet Yılmaz',
      activity: 'Matematik ödevi tamamlandı',
      time: '2 saat önce',
      type: 'success',
    },
    {
      id: 2,
      child: 'Elif Yılmaz',
      activity: 'Fen bilgisi sınavına hazırlanıyor',
      time: '4 saat önce',
      type: 'info',
    },
    {
      id: 3,
      child: 'Ahmet Yılmaz',
      activity: 'İngilizce dersi başladı',
      time: '1 gün önce',
      type: 'success',
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Veli Paneli
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Çocuklarınızın eğitim durumunu takip edin
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3, mb: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                <FamilyRestroom />
              </Avatar>
              <Box>
                <Typography variant="h4">{parentStats.totalChildren}</Typography>
                <Typography color="text.secondary">Çocuk Sayısı</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

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

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                <CheckCircle />
              </Avatar>
              <Box>
                <Typography variant="h4">{parentStats.completedAssignments}</Typography>
                <Typography color="text.secondary">Tamamlanan Ödev</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                <Warning />
              </Avatar>
              <Box>
                <Typography variant="h4">{parentStats.pendingAssignments}</Typography>
                <Typography color="text.secondary">Bekleyen Ödev</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="parent tabs">
          <Tab label="Çocuklarım" />
          <Tab label="Son Aktiviteler" />
          <Tab label="Raporlar" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
            {children.map((child) => (
              <Card key={child.id}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                      <ChildCare />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{child.name}</Typography>
                      <Typography color="text.secondary">{child.grade}</Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Okul: {child.school}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ortalama: {child.averageGrade}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Son aktivite: {child.lastActivity}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      Genel Başarı
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={child.averageGrade} 
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>

                  <Chip 
                    label={child.status === 'active' ? 'Aktif' : 'Pasif'} 
                    color={child.status === 'active' ? 'success' : 'default'}
                    size="small"
                  />
                </CardContent>
              </Card>
            ))}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <List>
            {recentActivities.map((activity, index) => (
              <React.Fragment key={activity.id}>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: activity.type === 'success' ? 'success.main' : 'info.main' }}>
                      {activity.type === 'success' ? <CheckCircle /> : <Info />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={activity.activity}
                    secondary={`${activity.child} • ${activity.time}`}
                  />
                </ListItem>
                {index < recentActivities.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Haftalık Rapor
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Detaylı raporlar yakında eklenecek...
          </Typography>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default ParentDashboard;