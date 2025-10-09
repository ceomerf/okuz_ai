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
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress,
  Avatar,
  Badge,
  Tabs,
  Tab,
  Box as Grid,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  FormControlLabel,
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
  Phone,
  LocationOn,
  CalendarToday,
  Group,
  School,
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
  Notifications,
  NotificationsActive,
  NotificationsOff,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale/tr';
import { parentManagementApi, Parent, ParentReport, ParentActivity, ParentStats } from '../../services/parentManagementApi';
import { useNotification } from './useNotificationShim';
import EmptyState from '../Shared/EmptyState';
import ConfirmDialog from '../Shared/ConfirmDialog';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { maybeAnonymize } from '../../utils/pii';
import { useEventLogger } from '../../hooks/useEventLogger';

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
      id={`parent-tabpanel-${index}`}
      aria-labelledby={`parent-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ParentManagementPanel: React.FC = () => {
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalParents, setTotalParents] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasChildrenFilter, setHasChildrenFilter] = useState<boolean | undefined>(undefined);
  const [selectedParents, setSelectedParents] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [parentDetailsOpen, setParentDetailsOpen] = useState(false);
  const [parentActivity, setParentActivity] = useState<ParentActivity[]>([]);
  const [parentReports, setParentReports] = useState<ParentReport[]>([]);
  const [currentTab, setCurrentTab] = useState(0);
  const searchDebounceRef = useRef<number | undefined>(undefined);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [assignChildOpen, setAssignChildOpen] = useState(false);
  const [assignChildId, setAssignChildId] = useState('');
  const [generateReportOpen, setGenerateReportOpen] = useState(false);
  const [reportStudentId, setReportStudentId] = useState('');
  const [reportWeekStart, setReportWeekStart] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<{ name: string; email: string; phone?: string; address?: string }>({ name: '', email: '', phone: '', address: '' });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  
  // Loading states for different operations
  const [loadingStates, setLoadingStates] = useState({
    parents: false,
    activity: false,
    reports: false,
    stats: false,
  });
  
  // Error states
  const [errors, setErrors] = useState({
    parents: null as string | null,
    activity: null as string | null,
    reports: null as string | null,
    stats: null as string | null,
  });

  // Notification hook
  const { showSuccess, showError, showWarning, showInfo, NotificationComponent } = useNotification();
  const debouncedSearch = useDebouncedValue(searchTerm, 400);
  const { logEvent } = useEventLogger();

  // API Functions
  const loadParents = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, parents: true }));
      setErrors(prev => ({ ...prev, parents: null }));
      
      const response = await parentManagementApi.getParents(page + 1, rowsPerPage, debouncedSearch, {
        hasChildren: hasChildrenFilter,
      });
      
      if (response.success && response.data) {
        setParents(response.data.data);
        setTotalParents(response.data.pagination.total);
      } else {
        throw new Error('Veliler yüklenemedi');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Veliler yüklenirken hata oluştu';
      setErrors(prev => ({ ...prev, parents: errorMessage }));
      showError(errorMessage);
    } finally {
      setLoadingStates(prev => ({ ...prev, parents: false }));
    }
  }, [page, rowsPerPage, searchTerm, hasChildrenFilter, showError]);

  const loadParentActivity = useCallback(async (parentId: string) => {
    try {
      setLoadingStates(prev => ({ ...prev, activity: true }));
      setErrors(prev => ({ ...prev, activity: null }));
      
      const response = await parentManagementApi.getParentActivities(parentId, 1, 10);
      
      if (response.success && response.data) {
        setParentActivity(response.data.data);
      } else {
        throw new Error('Veli aktiviteleri yüklenemedi');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Veli aktiviteleri yüklenirken hata oluştu';
      setErrors(prev => ({ ...prev, activity: errorMessage }));
      showError(errorMessage);
    } finally {
      setLoadingStates(prev => ({ ...prev, activity: false }));
    }
  }, [showError]);

  const loadParentReports = useCallback(async (parentId: string) => {
    try {
      setLoadingStates(prev => ({ ...prev, reports: true }));
      setErrors(prev => ({ ...prev, reports: null }));
      
      const response = await parentManagementApi.getParentReports(parentId, 1, 10);
      
      if (response.success && response.data) {
        setParentReports(response.data.data);
      } else {
        throw new Error('Veli raporları yüklenemedi');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Veli raporları yüklenirken hata oluştu';
      setErrors(prev => ({ ...prev, reports: errorMessage }));
      showError(errorMessage);
    } finally {
      setLoadingStates(prev => ({ ...prev, reports: false }));
    }
  }, [showError]);

  useEffect(() => {
    loadParents();
  }, [loadParents]);

  // Arama debounce ve sayfa sıfırlama
  useEffect(() => {
    setPage(0);
    loadParents();
  }, [debouncedSearch, loadParents]);

  // hasChildren filter değiştiğinde sayfayı sıfırla ve yükle
  useEffect(() => {
    setPage(0);
    loadParents();
  }, [hasChildrenFilter, loadParents]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSelectParent = (parentId: string) => {
    setSelectedParents(prev => 
      prev.includes(parentId) 
        ? prev.filter(id => id !== parentId)
        : [...prev, parentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedParents.length === parents.length) {
      setSelectedParents([]);
    } else {
      setSelectedParents(parents.map(parent => parent.id));
    }
  };

  const handleParentDetails = useCallback(async (parent: Parent) => {
    setSelectedParent(parent);
    setParentDetailsOpen(true);
    
    // Load activity and reports data
    await Promise.all([
      loadParentActivity(parent.id),
      loadParentReports(parent.id)
    ]);
  }, [loadParentActivity, loadParentReports]);

  const getChildrenCount = (parent: Parent) => {
    return parent.children?.length || 0;
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return 'success';
      case 'MEDIUM': return 'warning';
      case 'HIGH': return 'error';
      default: return 'default';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'IMPROVING': return <TrendingUp color="success" />;
      case 'DECLINING': return <TrendingDown color="error" />;
      case 'STABLE': return <TrendingUp color="info" />;
      default: return <TrendingUp color="info" />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Veli Yönetimi
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadParents}
            disabled={loadingStates.parents}
          >
            Yenile
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setCreateOpen(true)}
          >
            Yeni Veli
          </Button>
        </Box>
      </Box>

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
              <FormControl fullWidth>
                <InputLabel>Çocuk Durumu</InputLabel>
                <Select
                  value={hasChildrenFilter === undefined ? '' : hasChildrenFilter.toString()}
                  onChange={(e) => setHasChildrenFilter(e.target.value === '' ? undefined : e.target.value === 'true')}
                  label="Çocuk Durumu"
                >
                  <MenuItem value="">Tümü</MenuItem>
                  <MenuItem value="true">Çocuğu Olan</MenuItem>
                  <MenuItem value="false">Çocuğu Olmayan</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: '1 1 25%', minWidth: '200px' }}>
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => showInfo('Gelişmiş filtreler yakında eklenecek')}
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
                onClick={async () => {
                  try {
                    const blob = await parentManagementApi.exportParents('csv', { hasChildren: hasChildrenFilter, search: searchTerm });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `parents_${new Date().toISOString()}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                    showSuccess('Liste CSV olarak indirildi');
                  } catch (e) {
                    showError('Dışa aktarma başarısız');
                  }
                }}
              >
                Dışa Aktar
              </Button>
                <Button
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
      {selectedParents.length > 0 && (
        <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1">
                {selectedParents.length} veli seçildi
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => showInfo('Toplu bildirim akışı yakında eklenecek')}
              >
                Bildirim Gönder
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => showInfo('Toplu rapor gönderim akışı yakında eklenecek')}
              >
                Rapor Gönder
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={() => setBulkDeleteOpen(true)}
              >
                Sil
              </Button>
              <Button
                variant="outlined"
                onClick={() => setSelectedParents([])}
              >
                Seçimi Temizle
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Parents Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedParents.length > 0 && selectedParents.length < parents.length}
                    checked={selectedParents.length === parents.length && parents.length > 0}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Veli</TableCell>
                <TableCell>İletişim</TableCell>
                <TableCell>Çocuk Sayısı</TableCell>
                <TableCell>Çocuklar</TableCell>
                <TableCell>Son Aktivite</TableCell>
                <TableCell>Kayıt Tarihi</TableCell>
                <TableCell align="center">İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingStates.parents ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : errors.parents ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Alert severity="error">{errors.parents}</Alert>
                  </TableCell>
                </TableRow>
              ) : parents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState title="Veli bulunamadı" description="İlk velinizi oluşturun veya filtreleri temizleyin." />
                  </TableCell>
                </TableRow>
              ) : (
                parents.map((parent) => (
                  <TableRow key={parent.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedParents.includes(parent.id)}
                        onChange={() => handleSelectParent(parent.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ width: 40, height: 40 }}>
                          {parent.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {parent.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {maybeAnonymize(parent.email, { anonymizeEmail: true }, 'email')}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        {parent.phone && (
                          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Phone fontSize="small" />
                            {maybeAnonymize(parent.phone, { anonymizePhone: true }, 'phone')}
                          </Typography>
                        )}
                        {parent.address && (
                          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocationOn fontSize="small" />
                            {parent.address}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getChildrenCount(parent)}
                        color={getChildrenCount(parent) > 0 ? 'primary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {parent.children && parent.children.length > 0 ? (
                        <Box>
                          {parent.children.slice(0, 2).map((child, index) => (
                            <Typography key={index} variant="body2">
                              {child.name} ({child.grade}. Sınıf)
                            </Typography>
                          ))}
                          {parent.children.length > 2 && (
                            <Typography variant="caption" color="text.secondary">
                              +{parent.children.length - 2} daha
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Chip label="Çocuk yok" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {parent.lastActiveAt 
                          ? format(new Date(parent.lastActiveAt), 'dd.MM.yyyy HH:mm', { locale: tr })
                          : 'Hiç'
                        }
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {format(new Date(parent.createdAt), 'dd.MM.yyyy', { locale: tr })}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setSelectedParent(parent);
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
          count={totalParents}
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
          if (selectedParent) handleParentDetails(selectedParent);
        }}>
          <Visibility sx={{ mr: 1 }} />
          Detayları Gör
        </MenuItem>
        <MenuItem onClick={() => {
          setAnchorEl(null);
          showInfo('Düzenleme formu henüz hazır değil');
        }}>
          <Edit sx={{ mr: 1 }} />
          Düzenle
        </MenuItem>
        <MenuItem onClick={() => {
          setAnchorEl(null);
          setAssignChildId('');
          setAssignChildOpen(true);
        }}>
          <PersonAdd sx={{ mr: 1 }} />
          Çocuk Ata
        </MenuItem>
        <MenuItem onClick={() => {
          setAnchorEl(null);
          setReportStudentId('');
          setReportWeekStart('');
          setGenerateReportOpen(true);
        }}>
          <Assessment sx={{ mr: 1 }} />
          Rapor Gönder
        </MenuItem>
        <MenuItem onClick={() => {
          setAnchorEl(null);
          setConfirmDeleteOpen(true);
        }}>
          <Delete sx={{ mr: 1 }} />
          Sil
        </MenuItem>
      </Menu>

      {/* Parent Details Dialog */}
      <Dialog
        open={parentDetailsOpen}
        onClose={() => setParentDetailsOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 48, height: 48 }}>
              {selectedParent?.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h6">{selectedParent?.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedParent?.email ? maybeAnonymize(selectedParent.email, { anonymizeEmail: true }, 'email') : ''}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
              <Tab label="Genel Bilgiler" />
              <Tab label="Çocuklar" />
              <Tab label="Aktivite Geçmişi" />
              <Tab label="Raporlar" />
            </Tabs>
          </Box>

          <TabPanel value={currentTab} index={0}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: '1 1 50%', minWidth: '300px' }}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Veli Bilgileri
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon><Person /></ListItemIcon>
                      <ListItemText 
                        primary="Ad Soyad" 
                        secondary={selectedParent?.name} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Email /></ListItemIcon>
                      <ListItemText 
                        primary="E-posta" 
                        secondary={selectedParent?.email} 
                      />
                    </ListItem>
                    {selectedParent?.phone && (
                      <ListItem>
                        <ListItemIcon><Phone /></ListItemIcon>
                      <ListItemText 
                        primary="Telefon" 
                        secondary={maybeAnonymize(selectedParent.phone, { anonymizePhone: true }, 'phone')} 
                      />
                      </ListItem>
                    )}
                    {selectedParent?.address && (
                      <ListItem>
                        <ListItemIcon><LocationOn /></ListItemIcon>
                        <ListItemText 
                          primary="Adres" 
                          secondary={selectedParent.address} 
                        />
                      </ListItem>
                    )}
                  </List>
                </Paper>
              </Box>
              <Box sx={{ flex: '1 1 50%', minWidth: '300px' }}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Sistem Bilgileri
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon><CalendarToday /></ListItemIcon>
                      <ListItemText 
                        primary="Kayıt Tarihi" 
                        secondary={selectedParent?.createdAt 
                          ? format(new Date(selectedParent.createdAt), 'dd.MM.yyyy HH:mm', { locale: tr })
                          : '-'
                        } 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Timeline /></ListItemIcon>
                      <ListItemText 
                        primary="Son Aktivite" 
                        secondary={selectedParent?.lastActiveAt 
                          ? format(new Date(selectedParent.lastActiveAt), 'dd.MM.yyyy HH:mm', { locale: tr })
                          : 'Hiç'
                        } 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Group /></ListItemIcon>
                      <ListItemText 
                        primary="Çocuk Sayısı" 
                        secondary={selectedParent ? getChildrenCount(selectedParent) : 0} 
                      />
                    </ListItem>
                  </List>
                </Paper>
              </Box>
            </Box>
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            <Typography variant="h6" gutterBottom>
              Çocuklar
            </Typography>
            {selectedParent?.children && selectedParent.children.length > 0 ? (
              <List>
                {selectedParent.children.map((child, index) => (
                  <ListItem key={index} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                    <ListItemIcon><School /></ListItemIcon>
                    <ListItemText
                      primary={child.name}
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            {child.grade}. Sınıf • {child.field}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {maybeAnonymize(child.email, { anonymizeEmail: true }, 'email')}
                          </Typography>
                        </Box>
                      }
                    />
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={async () => {
                        try {
                          if (!selectedParent) return;
                          const res = await parentManagementApi.unassignChild(selectedParent.id, child.id);
                          if (res.success) {
                            showSuccess('Çocuk eşleştirmesi kaldırıldı');
                            // Listeyi tazele
                            await loadParents();
                            await loadParentReports(selectedParent.id);
                            await loadParentActivity(selectedParent.id);
                          } else {
                            showError('Kaldırılamadı');
                          }
                        } catch (e) {
                          showError('Kaldırma sırasında hata');
                        }
                      }}
                    >
                      Kaldır
                    </Button>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info">
                Bu veliye henüz çocuk atanmamış.
              </Alert>
            )}
            <Button
              variant="contained"
              startIcon={<PersonAdd />}
              onClick={() => { setAssignChildId(''); setAssignChildOpen(true); }}
              sx={{ mt: 2 }}
            >
              Çocuk Ata
            </Button>
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            <Typography variant="h6" gutterBottom>
              Aktivite Geçmişi
            </Typography>
            {loadingStates.activity ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : errors.activity ? (
              <Alert severity="error">{errors.activity}</Alert>
            ) : (
              <List>
                {parentActivity.map((activity) => (
                  <ListItem key={activity.id}>
                    <ListItemIcon><Timeline /></ListItemIcon>
                    <ListItemText
                      primary={activity.action}
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            {activity.resource} • {activity.ipAddress}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(activity.createdAt), 'dd.MM.yyyy HH:mm', { locale: tr })}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </TabPanel>

          <TabPanel value={currentTab} index={3}>
            <Typography variant="h6" gutterBottom>
              Veli Raporları
            </Typography>
            {loadingStates.reports ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : errors.reports ? (
              <Alert severity="error">{errors.reports}</Alert>
            ) : parentReports.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {parentReports.map((report) => (
                  <Box key={report.id}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6">
                            {report.student.name} - Haftalık Rapor
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                              label="Rapor" 
                              color="primary"
                              size="small"
                            />
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                          <Box sx={{ flex: '1 1 25%', minWidth: '200px' }}>
                            <Typography variant="body2" color="text.secondary">
                              Toplam Çalışma Süresi
                            </Typography>
                            <Typography variant="h6">
                              {Math.floor(report.totalStudyTime / 60)} saat
                            </Typography>
                          </Box>
                          <Box sx={{ flex: '1 1 25%', minWidth: '200px' }}>
                            <Typography variant="body2" color="text.secondary">
                              Tamamlanan Seanslar
                            </Typography>
                            <Typography variant="h6">
                              {report.completedSessions}
                            </Typography>
                          </Box>
                          <Box sx={{ flex: '1 1 25%', minWidth: '200px' }}>
                            <Typography variant="body2" color="text.secondary">
                              Katılım Oranı
                            </Typography>
                            <Typography variant="h6">
                              {report.attendanceRate}%
                            </Typography>
                          </Box>
                          <Box sx={{ flex: '1 1 25%', minWidth: '200px' }}>
                            <Typography variant="body2" color="text.secondary">
                              Hafta
                            </Typography>
                            <Typography variant="h6">
                              {format(new Date(report.weekStart), 'dd.MM', { locale: tr })} - {format(new Date(report.weekEnd), 'dd.MM', { locale: tr })}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Koç Değerlendirmesi
                          </Typography>
                          <Typography variant="body2">
                            Rapor detayları burada görüntülenecek.
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>
                ))}
              </Box>
            ) : (
              <Alert severity="info">
                Bu veli için henüz rapor bulunmuyor.
              </Alert>
            )}
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setParentDetailsOpen(false)}>
            Kapat
          </Button>
          <Button variant="contained" onClick={() => showInfo('Değişiklikleri kaydetme akışı henüz hazır değil')}>
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Veliyi Sil"
        description="Bu işlem geri alınamaz. Emin misiniz?"
        confirmText="Sil"
        confirmColor="error"
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={async () => {
          try {
            if (!selectedParent) return;
            const res = await parentManagementApi.deleteParent(selectedParent.id);
            if (res.success) {
              showSuccess('Veli silindi');
              logEvent({ type: 'PARENT_DELETED', targetId: selectedParent.id });
              await loadParents();
            } else {
              showError('Veli silinemedi');
            }
          } catch (e) {
            showError('Silme sırasında hata');
          } finally {
            setConfirmDeleteOpen(false);
          }
        }}
      />

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)}>
        <DialogTitle>Seçili Velileri Sil</DialogTitle>
        <DialogContent>
          <Typography>{selectedParents.length} veli silinecek. Emin misiniz?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteOpen(false)}>İptal</Button>
          <Button color="error" variant="contained" onClick={async () => {
            try {
              await Promise.all(selectedParents.map(id => parentManagementApi.deleteParent(id)));
              showSuccess('Seçili veliler silindi');
              setSelectedParents([]);
              await loadParents();
            } catch (e) {
              showError('Toplu silme sırasında hata');
            } finally {
              setBulkDeleteOpen(false);
            }
          }}>Sil</Button>
        </DialogActions>
      </Dialog>

      {/* Assign Child Dialog */}
      <Dialog open={assignChildOpen} onClose={() => setAssignChildOpen(false)}>
        <DialogTitle>Çocuk Ata</DialogTitle>
        <DialogContent>
          <TextField label="Çocuk ID" value={assignChildId} onChange={(e) => setAssignChildId(e.target.value)} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignChildOpen(false)}>İptal</Button>
          <Button variant="contained" disabled={!assignChildId || !selectedParent} onClick={async () => {
            try {
              if (!selectedParent) return;
              const res = await parentManagementApi.assignChild(selectedParent.id, assignChildId);
              if (res.success) {
                showSuccess('Çocuk atandı');
                await loadParents();
              } else {
                showError('Çocuk atanamadı');
              }
            } catch (e) {
              showError('Atama sırasında hata');
            } finally {
              setAssignChildOpen(false);
            }
          }}>Ata</Button>
        </DialogActions>
      </Dialog>

      {/* Generate Report Dialog */}
      <Dialog open={generateReportOpen} onClose={() => setGenerateReportOpen(false)}>
        <DialogTitle>Rapor Oluştur</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Öğrenci ID" value={reportStudentId} onChange={(e) => setReportStudentId(e.target.value)} fullWidth />
            <TextField label="Hafta Başlangıcı" type="date" value={reportWeekStart} onChange={(e) => setReportWeekStart(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateReportOpen(false)}>İptal</Button>
          <Button variant="contained" disabled={!reportStudentId || !reportWeekStart || !selectedParent} onClick={async () => {
            try {
              if (!selectedParent) return;
              const res = await parentManagementApi.generateReport(selectedParent.id, reportStudentId, reportWeekStart);
              if (res.success) {
                showSuccess('Rapor oluşturuldu');
                await loadParentReports(selectedParent.id);
              } else {
                showError('Rapor oluşturulamadı');
              }
            } catch (e) {
              showError('Rapor oluşturma sırasında hata');
            } finally {
              setGenerateReportOpen(false);
            }
          }}>Oluştur</Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification Component */}
      <NotificationComponent />

      {/* Create Parent Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
        <DialogTitle>Yeni Veli Oluştur</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 360 }}>
            <TextField label="Ad Soyad" value={createForm.name} onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))} fullWidth />
            <TextField label="E-posta" type="email" value={createForm.email} onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))} fullWidth />
            <TextField label="Telefon" value={createForm.phone} onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value }))} fullWidth />
            <TextField label="Adres" value={createForm.address} onChange={(e) => setCreateForm(prev => ({ ...prev, address: e.target.value }))} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>İptal</Button>
          <Button
            variant="contained"
            disabled={!createForm.name || !createForm.email || createSubmitting}
            onClick={async () => {
              try {
                setCreateSubmitting(true);
                const res = await parentManagementApi.createParent({
                  name: createForm.name,
                  email: createForm.email,
                  phone: createForm.phone,
                  address: createForm.address,
                });
                if (res.success) {
                  showSuccess('Veli oluşturuldu');
                  setCreateOpen(false);
                  setCreateForm({ name: '', email: '', phone: '', address: '' });
                  await loadParents();
                } else {
                  showError('Veli oluşturulamadı');
                }
              } catch (e) {
                showError('Veli oluşturma sırasında hata');
              } finally {
                setCreateSubmitting(false);
              }
            }}
          >
            {createSubmitting ? 'Kaydediliyor...' : 'Oluştur'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ParentManagementPanel;
