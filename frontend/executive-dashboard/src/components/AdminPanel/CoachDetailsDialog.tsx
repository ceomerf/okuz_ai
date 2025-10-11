import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Avatar,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  CircularProgress,
  LinearProgress,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  Person,
  Email,
  CalendarToday,
  School,
  Psychology,
  PersonAdd,
  Add,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale/tr';
import { Coach, CoachPerformance, CoachNote } from '../../services/coachManagementApi';

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

interface CoachDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  coach: Coach | null;
  performance: CoachPerformance | null;
  notes: CoachNote[];
  loadingPerformance: boolean;
  loadingNotes: boolean;
  errorPerformance: string | null;
  errorNotes: string | null;
  onUnassignStudent: (coachId: string, studentId: string) => void;
  onCreateNote: (coachId: string, studentId: string, noteData: {
    title: string;
    content: string;
    type: string;
    priority: string;
  }) => void;
}

const CoachDetailsDialog: React.FC<CoachDetailsDialogProps> = ({
  open,
  onClose,
  coach,
  performance,
  notes,
  loadingPerformance,
  loadingNotes,
  errorPerformance,
  errorNotes,
  onUnassignStudent,
  onCreateNote,
}) => {
  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    if (open) {
      setCurrentTab(0);
    }
  }, [open]);

  if (!coach) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 48, height: 48 }}>
            {coach.name.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="h6">{coach.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {coach.email}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
            <Tab label="Genel Bilgiler" />
            <Tab label="Öğrenciler" />
            <Tab label="Performans" />
            <Tab label="Notlar" />
          </Tabs>
        </Box>

        <TabPanel value={currentTab} index={0}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: '1 1 50%', minWidth: '300px' }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Koç Bilgileri
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon><Person /></ListItemIcon>
                    <ListItemText 
                      primary="Ad Soyad" 
                      secondary={coach.name} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Email /></ListItemIcon>
                    <ListItemText 
                      primary="E-posta" 
                      secondary={coach.email} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CalendarToday /></ListItemIcon>
                    <ListItemText 
                      primary="Kayıt Tarihi" 
                      secondary={coach.createdAt 
                        ? format(new Date(coach.createdAt), 'dd.MM.yyyy HH:mm', { locale: tr })
                        : '-'
                      } 
                    />
                  </ListItem>
                </List>
              </Paper>
            </Box>
            <Box sx={{ flex: '1 1 50%', minWidth: '300px' }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  İstatistikler
                </Typography>
                {loadingPerformance ? (
                  <CircularProgress />
                ) : errorPerformance ? (
                  <Alert severity="error">{errorPerformance}</Alert>
                ) : performance ? (
                  <Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Toplam Öğrenci
                      </Typography>
                      <Typography variant="h6">
                        {performance.totalStudents}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Aktif Öğrenci
                      </Typography>
                      <Typography variant="h6">
                        {performance.activeStudents}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Toplam Not
                      </Typography>
                      <Typography variant="h6">
                        {performance.totalNotes}
                      </Typography>
                    </Box>
                  </Box>
                ) : null}
              </Paper>
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <Typography variant="h6" gutterBottom>
            Öğrenciler
          </Typography>
          {coach.coachStudents && coach.coachStudents.length > 0 ? (
            <List>
              {coach.coachStudents.map((assignment) => (
                <ListItem key={assignment.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                  <ListItemIcon><School /></ListItemIcon>
                  <ListItemText
                    primary={assignment.student.user.name}
                    secondary={
                      <Box>
                        <Typography variant="body2">
                          {assignment.student.grade}. Sınıf • {assignment.student.field}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {assignment.student.user.email}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Atanma: {format(new Date(assignment.assignedAt), 'dd.MM.yyyy', { locale: tr })}
                        </Typography>
                      </Box>
                    }
                  />
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => onUnassignStudent(coach.id, assignment.student.id)}
                  >
                    Kaldır
                  </Button>
                </ListItem>
              ))}
            </List>
          ) : (
            <Alert severity="info">
              Bu koça henüz öğrenci atanmamış.
            </Alert>
          )}
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => console.log('Yeni öğrenci ata')}
            sx={{ mt: 2 }}
          >
            Öğrenci Ata
          </Button>
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <Typography variant="h6" gutterBottom>
            Performans Metrikleri
          </Typography>
          {loadingPerformance ? (
            <CircularProgress />
          ) : errorPerformance ? (
            <Alert severity="error">{errorPerformance}</Alert>
          ) : performance ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: '1 1 50%', minWidth: '300px' }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Öğrenci Performansı
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Ortalama Performans
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={performance.averageStudentPerformance} 
                          sx={{ flexGrow: 1 }}
                        />
                        <Typography variant="body2">
                          {performance.averageStudentPerformance}%
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Katılım Oranı
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={performance.engagementRate} 
                          sx={{ flexGrow: 1 }}
                        />
                        <Typography variant="body2">
                          {performance.engagementRate}%
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: '1 1 50%', minWidth: '300px' }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Aktivite Metrikleri
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Toplam Seans
                      </Typography>
                      <Typography variant="h6">
                        {performance.totalSessions}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Öğrenci Başına Not
                      </Typography>
                      <Typography variant="h6">
                        {performance.notesPerStudent.toFixed(1)}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          ) : null}
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <Typography variant="h6" gutterBottom>
            Koç Notları
          </Typography>
          {loadingNotes ? (
            <CircularProgress />
          ) : errorNotes ? (
            <Alert severity="error">{errorNotes}</Alert>
          ) : notes.length > 0 ? (
            <List>
              {notes.map((note) => (
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
                            {note.coachStudent.student.user.name} • 
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
              Bu koç için henüz not bulunmuyor.
            </Alert>
          )}
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => console.log('Yeni koç notu ekle')}
            sx={{ mt: 2 }}
          >
            Koç Notu Ekle
          </Button>
        </TabPanel>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          Kapat
        </Button>
        <Button variant="contained" onClick={() => console.log('Kaydet')}>
          Kaydet
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CoachDetailsDialog;
