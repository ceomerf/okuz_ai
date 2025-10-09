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
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
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
  CalendarToday,
  Security,
  CheckCircle,
  Cancel,
  Warning,
  Refresh,
  Download,
  Upload,
  Add,
  Group,
  PersonAdd,
  Settings,
  Timeline,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale/tr';
import { userManagementApi } from '../../services/userManagementApi';
import EmptyState from '../Shared/EmptyState';
import ConfirmDialog from '../Shared/ConfirmDialog';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { maybeAnonymize } from '../../utils/pii';
import { useEventLogger } from '../../hooks/useEventLogger';
import { useNotification } from '../../hooks/useNotification';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  lastActiveAt?: string;
  subscriptionStatus: string;
  studentProfile?: {
    grade: number;
    field: string;
  };
  parentProfile?: {
    phone: string;
  };
  gamificationProfile?: {
    level: number;
    totalPoints: number;
  };
}

interface UserActivity {
  id: string;
  action: string;
  resource: string;
  ipAddress: string;
  createdAt: string;
  metadata?: any;
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
      id={`user-tabpanel-${index}`}
      aria-labelledby={`user-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const UserManagementPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [currentTab, setCurrentTab] = useState(0);

  const searchDebounceRef = useRef<number | undefined>(undefined);
  const { showSuccess, showError, showInfo, NotificationComponent } = useNotification();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(searchTerm, 400);
  const { logEvent } = useEventLogger();

  useEffect(() => {
    loadUsers();
  }, [page, rowsPerPage, roleFilter, statusFilter, debouncedSearch]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await userManagementApi.getUsers(page + 1, rowsPerPage, debouncedSearch || undefined, {
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      });
      if (res.success && (res.data as any)?.data) {
        const payload = res.data as any;
        const mapped: User[] = (payload.data || []).map((u: any) => ({
          id: String(u.id),
          name: u.name || u.user?.name || '',
          email: u.email || u.user?.email || '',
          role: (u.role || 'USER'),
          createdAt: u.createdAt || new Date().toISOString(),
          lastActiveAt: u.lastActiveAt || u.activity?.lastActiveAt,
          subscriptionStatus: u.subscription?.status || '—',
        }));
        setUsers(mapped);
        setTotalUsers(payload.pagination?.total ?? mapped.length);
      } else {
        setUsers([]);
        setTotalUsers(0);
      }
    } catch (error) {
      console.error('Kullanıcılar yüklenemedi:', error);
      showError('Kullanıcılar yüklenemedi');
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

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.id));
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    try {
      if (!selectedUsers.length) return;
      if (action === 'delete') {
        await userManagementApi.bulkDeleteUsers(selectedUsers);
      } else {
        await userManagementApi.bulkUpdateUsers(selectedUsers, { status: action === 'activate' ? 'active' : 'inactive' });
      }
      showSuccess('Toplu işlem başarıyla tamamlandı');
      setSelectedUsers([]);
      await loadUsers();
    } catch (e) {
      showError('Toplu işlem başarısız');
    }
  };

  const handleUserDetails = async (user: User) => {
    setSelectedUser(user);
    setUserDetailsOpen(true);
    try {
      const res = await userManagementApi.getUserActivities(user.id, 1, 20);
      if (res.success && (res.data as any)?.data) setUserActivity((res.data as any).data);
      else setUserActivity([]);
    } catch (e) {
      showError('Aktivite geçmişi yüklenemedi');
      setUserActivity([]);
    }
  };

  type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

  const getRoleColor = (role: string): ChipColor => {
    switch (role) {
      case 'ADMIN': return 'error';
      case 'TEACHER': return 'primary';
      case 'STUDENT': return 'success';
      case 'PARENT': return 'warning';
      default: return 'default';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Yönetici';
      case 'TEACHER': return 'Öğretmen';
      case 'STUDENT': return 'Öğrenci';
      case 'PARENT': return 'Veli';
      default: return role;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PREMIUM': return <CheckCircle color="success" />;
      case 'FREE': return <Warning color="warning" />;
      case 'TRIAL': return <Cancel color="error" />;
      default: return <Warning color="warning" />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Kullanıcı Yönetimi
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadUsers}
            disabled={loading}
          >
            Yenile
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => showInfo('Kullanıcı oluşturma akışı henüz hazır değil')}
          >
            Yeni Kullanıcı
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }} alignItems="center">
            <Box item sx={{ flex: '1 1 25%' }}>
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
            <Box sx={{ width: '100%' }} md={2}>
              <FormControl fullWidth>
                <InputLabel>Rol</InputLabel>
                <Select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  label="Rol"
                >
                  <MenuItem value="">Tümü</MenuItem>
                  <MenuItem value="ADMIN">Yönetici</MenuItem>
                  <MenuItem value="TEACHER">Öğretmen</MenuItem>
                  <MenuItem value="STUDENT">Öğrenci</MenuItem>
                  <MenuItem value="PARENT">Veli</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ width: '100%' }} md={2}>
              <FormControl fullWidth>
                <InputLabel>Durum</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Durum"
                >
                  <MenuItem value="">Tümü</MenuItem>
                  <MenuItem value="active">Aktif</MenuItem>
                  <MenuItem value="inactive">Pasif</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ width: '100%' }} md={2}>
                <Button
                  variant="outlined"
                  startIcon={<FilterList />}
                  onClick={() => showInfo('Gelişmiş filtreler yakında eklenecek')}
                  fullWidth
                >
                Filtreler
              </Button>
            </Box>
            <Box item sx={{ flex: '1 1 25%' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={async () => {
                    try {
                      const allowPii = window.confirm('E-postaları anonimleştirmeden indirmek ister misiniz? Hayır derseniz anonimleştirilecek.');
                      const blob = await userManagementApi.exportUsers('csv', { search: debouncedSearch || undefined, role: roleFilter || undefined, status: statusFilter || undefined, anonymizeEmail: !allowPii });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `users_${new Date().toISOString()}.csv`;
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
      {selectedUsers.length > 0 && (
        <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1">
                {selectedUsers.length} kullanıcı seçildi
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => handleBulkAction('activate')}
              >
                Aktifleştir
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => handleBulkAction('deactivate')}
              >
                Pasifleştir
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={() => handleBulkAction('delete')}
              >
                Sil
              </Button>
              <Button
                variant="outlined"
                onClick={() => setSelectedUsers([])}
              >
                Seçimi Temizle
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedUsers.length > 0 && selectedUsers.length < users.length}
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Kullanıcı</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell>Son Aktivite</TableCell>
                <TableCell>Kayıt Tarihi</TableCell>
                <TableCell align="center">İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState title="Kullanıcı yok" description="İlk kullanıcınızı oluşturun veya filtreleri temizleyin." />
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ width: 40, height: 40 }}>
                          {user.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {user.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {maybeAnonymize(user.email, { anonymizeEmail: true }, 'email')}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleLabel(user.role)}
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusIcon(user.subscriptionStatus)}
                        <Typography variant="body2">
                          {user.subscriptionStatus}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.lastActiveAt 
                          ? format(new Date(user.lastActiveAt), 'dd.MM.yyyy HH:mm', { locale: tr })
                          : 'Hiç'
                        }
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {format(new Date(user.createdAt), 'dd.MM.yyyy', { locale: tr })}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setSelectedUser(user);
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
          count={totalUsers}
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
          if (selectedUser) handleUserDetails(selectedUser);
        }}>
          <Visibility sx={{ mr: 1 }} />
          Detayları Gör
        </MenuItem>
        <MenuItem onClick={() => {
          setAnchorEl(null);
          showInfo('Kullanıcı düzenleme formu yakında eklenecek');
        }}>
          <Edit sx={{ mr: 1 }} />
          Düzenle
        </MenuItem>
        <MenuItem onClick={() => {
          setAnchorEl(null);
          (async () => {
            try {
              if (!selectedUser) return;
              const next = (statusFilter === 'inactive' ? 'active' : 'inactive') as 'active' | 'inactive';
              await userManagementApi.updateUserStatus(selectedUser.id, next);
              showSuccess('Kullanıcı durumu güncellendi');
              await loadUsers();
            } catch (e) {
              showError('Durum güncellenemedi');
            }
          })();
        }}>
          <Settings sx={{ mr: 1 }} />
          Durumu Değiştir
        </MenuItem>
        <MenuItem onClick={() => {
          setAnchorEl(null);
          setConfirmDeleteOpen(true);
        }}>
          <Delete sx={{ mr: 1 }} />
          Sil
        </MenuItem>
      </Menu>

      {/* User Details Dialog */}
      <Dialog
        open={userDetailsOpen}
        onClose={() => setUserDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 48, height: 48 }}>
              {selectedUser?.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h6">{selectedUser?.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedUser?.email}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
              <Tab label="Genel Bilgiler" />
              <Tab label="Aktivite Geçmişi" />
              <Tab label="Rol Yönetimi" />
            </Tabs>
          </Box>

          <TabPanel value={currentTab} index={0}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ width: '100%' }} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Profil Bilgileri
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon><Person /></ListItemIcon>
                      <ListItemText 
                        primary="Ad Soyad" 
                        secondary={selectedUser?.name} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Email /></ListItemIcon>
                      <ListItemText 
                        primary="E-posta" 
                        secondary={selectedUser?.email} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Security /></ListItemIcon>
                      <ListItemText 
                        primary="Rol" 
                        secondary={getRoleLabel(selectedUser?.role || '')} 
                      />
                    </ListItem>
                  </List>
                </Paper>
              </Box>
              <Box sx={{ width: '100%' }} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Sistem Bilgileri
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon><CalendarToday /></ListItemIcon>
                      <ListItemText 
                        primary="Kayıt Tarihi" 
                        secondary={selectedUser?.createdAt 
                          ? format(new Date(selectedUser.createdAt), 'dd.MM.yyyy HH:mm', { locale: tr })
                          : '-'
                        } 
                      />
                    </ListItem>
                    <ListItem>
                    <ListItemIcon><Timeline /></ListItemIcon>
                      <ListItemText 
                        primary="Son Aktivite" 
                        secondary={selectedUser?.lastActiveAt 
                          ? format(new Date(selectedUser.lastActiveAt), 'dd.MM.yyyy HH:mm', { locale: tr })
                          : 'Hiç'
                        } 
                      />
                    </ListItem>
                  </List>
                </Paper>
              </Box>
            </Box>
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            <Typography variant="h6" gutterBottom>
              Aktivite Geçmişi
            </Typography>
            <List>
              {userActivity.map((activity) => (
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
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            <Typography variant="h6" gutterBottom>
              Rol Yönetimi
            </Typography>
            <Alert severity="info">
              Rol yönetimi özelliği geliştirilme aşamasındadır.
            </Alert>
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDetailsOpen(false)}>
            Kapat
          </Button>
          <Button variant="contained" onClick={() => showInfo('Değişiklikleri kaydetme akışı henüz hazır değil')}>
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Kullanıcıyı Sil"
        description="Bu işlemi geri alamazsınız. Emin misiniz?"
        confirmText="Sil"
        confirmColor="error"
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={async () => {
          try {
            if (!selectedUser) return;
            const res = await userManagementApi.deleteUser(selectedUser.id);
            if (res.success) {
              showSuccess('Kullanıcı silindi');
              logEvent({ type: 'USER_DELETED', targetId: selectedUser.id });
              await loadUsers();
            } else {
              showError('Kullanıcı silinemedi');
            }
          } catch (e) {
            showError('Silme sırasında hata');
          } finally {
            setConfirmDeleteOpen(false);
          }
        }}
      />

      <NotificationComponent />
    </Box>
  );
};

export default UserManagementPanel;
