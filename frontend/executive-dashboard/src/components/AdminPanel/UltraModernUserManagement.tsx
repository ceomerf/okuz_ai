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
  LinearProgress,
  Grid,
  InputAdornment,
  Switch,
  FormControlLabel,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ListItemAvatar,
  ListItemSecondaryAction,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  useTheme,
  useMediaQuery,
  alpha,
  styled,
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
  Analytics,
  Assessment,
  Psychology,
  School,
  Work,
  Home,
  Public,
  Phone,
  LocationOn,
  Star,
  StarBorder,
  Favorite,
  FavoriteBorder,
  ThumbUp,
  ThumbDown,
  ThumbUpOutlined,
  ThumbDownOutlined,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Speed,
  Memory,
  Storage,
  NetworkCheck,
  BugReport,
  Report,
  Assignment,
  Flag,
  Notifications,
  NotificationsActive,
  NotificationsOff,
  Email as EmailIcon,
  Code as CodeIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  BatteryChargingFull as BatteryChargingFullIcon,
  BatteryCharging60 as BatteryCharging60Icon,
  BatteryCharging80 as BatteryCharging80Icon,
  BatteryCharging90 as BatteryCharging90Icon,
  BatterySaver as BatterySaverIcon,
  AutoAwesome,
  FlashOn,
  Bolt,
  Thunderstorm,
  LocalFireDepartment,
  Whatshot,
  EmojiEvents,
  MilitaryTech,
  WorkspacePremium,
  Diamond,
  Grade,
  School as SchoolAdd,
  Work as WorkAdd,
  Home as HomeAdd,
  Public as PublicAdd,
  Dashboard,
  TableChart,
  FilterAlt,
  Tune,
  ViewList,
  ViewModule,
  ViewComfy,
  Sort,
  SortByAlpha,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, RadialBarChart, RadialBar, ComposedChart, Scatter, ScatterChart, Treemap, FunnelChart, Sankey } from 'recharts';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale/tr';
import { motion, AnimatePresence } from 'framer-motion';
import { userManagementApi } from '../../services/userManagementApi';
import { useNotification } from '../../hooks/useNotification';
import { useEventLogger } from '../../hooks/useEventLogger';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { maybeAnonymize } from '../../utils/pii';

// Styled Components
const StyledCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
  backdropFilter: 'blur(10px)',
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  borderRadius: 16,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: `0 20px 40px ${alpha(theme.palette.primary.main, 0.2)}`,
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
    transform: 'scale(1.01)',
  },
}));

const AnimatedCounter = ({ value, duration = 2000 }: { value: number; duration?: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{count}</span>;
};

// Veri tipleri
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  createdAt: string;
  lastLogin: string;
  avatar?: string;
  phone?: string;
  location?: string;
  department?: string;
  position?: string;
  performance: number;
  activity: {
    loginCount: number;
    lastActivity: string;
    totalTime: number;
  };
  preferences: {
    notifications: boolean;
    darkMode: boolean;
    language: string;
  };
  permissions: string[];
  tags: string[];
}

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  suspended: number;
  newThisMonth: number;
  growthRate: number;
}

interface UserActivity {
  timestamp: string;
  userId: string;
  action: string;
  details: string;
}

const UltraModernUserManagement: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [bulkAction, setBulkAction] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; count: number } | null>(null);

  // Hooks
  const { showSuccess, showError, showInfo, NotificationComponent } = useNotification();
  const { logEvent } = useEventLogger();
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  // Veri yükleme
  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await userManagementApi.getUsers(page + 1);

      if (response.success && response.data) {
        setUsers((response.data.data || []).map((user: any) => ({
          ...user,
          lastLogin: user.lastLogin || new Date().toISOString(),
          performance: user.performance || 0,
          preferences: user.preferences || { notifications: true, darkMode: false, language: 'tr' },
          tags: user.tags || []
        })));
        setUserStats({ total: (response.data as any).total || response.data.data?.length || 0, active: 0, inactive: 0, pending: 0, suspended: 0, newThisMonth: 0, growthRate: 0 });
        showSuccess('Kullanıcılar başarıyla yüklendi');
        logEvent({ type: 'USERS_LOADED' });
      } else {
        showError('Kullanıcılar yüklenemedi');
      }
    } catch (error) {
      console.error('Kullanıcı yükleme hatası:', error);
      showError('Kullanıcılar yüklenirken hata oluştu');
      logEvent({ type: 'USERS_LOAD_ERROR' });
    } finally {
      setLoading(false);
    }
  };

  // Kullanıcı aktivitelerini yükle
  const loadUserActivity = async (userId: string) => {
    try {
      const response = await userManagementApi.getUserActivities(userId);
      if (response.success && response.data) {
        setUserActivity((response.data as any).data || []);
        showSuccess('Kullanıcı aktiviteleri yüklendi');
      } else {
        showError('Kullanıcı aktiviteleri yüklenemedi');
      }
    } catch (error) {
      showError('Kullanıcı aktiviteleri yüklenirken hata oluştu');
    }
  };

  // Kullanıcı ekleme/düzenleme
  const handleSaveUser = async (userData: Partial<User>) => {
    try {
      let response;
      if (editingUser) {
        response = await userManagementApi.updateUser(editingUser.id, userData);
        if (response.success) {
          showSuccess('Kullanıcı başarıyla güncellendi');
          logEvent({ type: 'USER_UPDATED' });
        }
      } else {
        response = await userManagementApi.createUser({
          name: userData.name || '',
          email: userData.email || '',
          role: userData.role || 'student',
          password: 'defaultPassword123'
        });
        if (response.success) {
          showSuccess('Kullanıcı başarıyla oluşturuldu');
          logEvent({ type: 'USER_CREATED' });
        }
      }
      
      if (response.success) {
        setUserDialogOpen(false);
        setEditingUser(null);
        loadUsers();
      } else {
        showError(response.message || 'Kullanıcı kaydedilemedi');
      }
    } catch (error) {
      showError('Kullanıcı kaydedilirken hata oluştu');
    }
  };

  // Kullanıcı silme
  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await userManagementApi.deleteUser(userId);
      if (response.success) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        showSuccess('Kullanıcı başarıyla silindi');
        logEvent({ type: 'USER_DELETED' });
      } else {
        showError('Kullanıcı silinemedi');
      }
    } catch (error) {
      showError('Kullanıcı silinirken hata oluştu');
    }
  };

  // Toplu işlemler
  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.length === 0) return;

    try {
      const response = await userManagementApi.bulkUpdateUsers(selectedUsers, { status: bulkAction as 'active' | 'inactive' });
      if (response.success) {
        showSuccess(`${selectedUsers.length} kullanıcı için ${bulkAction} işlemi tamamlandı`);
        logEvent({ type: 'BULK_ACTION' });
        setSelectedUsers([]);
        setBulkAction('');
        loadUsers();
      } else {
        showError('Toplu işlem tamamlanamadı');
      }
    } catch (error) {
      showError('Toplu işlem sırasında hata oluştu');
    }
  };

  // Durum rengi
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'pending':
        return 'warning';
      case 'suspended':
        return 'error';
      default:
        return 'default';
    }
  };

  // Rol rengi
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'teacher':
        return 'primary';
      case 'student':
        return 'info';
      case 'parent':
        return 'secondary';
      default:
        return 'default';
    }
  };

  // Performans rengi
  const getPerformanceColor = (performance: number) => {
    if (performance >= 80) return 'success';
    if (performance >= 60) return 'warning';
    return 'error';
  };

  useEffect(() => {
    loadUsers();
  }, [page, rowsPerPage, debouncedSearchTerm, filterRole, filterStatus, sortBy, sortOrder]);

  return (
    <Box sx={{ p: 3, minHeight: '100vh', background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)` }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 4,
          p: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
          borderRadius: 3,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        }}>
          <Box>
            <Typography variant="h3" component="h1" sx={{ 
              fontWeight: 800,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1,
            }}>
              👥 Ultra Modern Kullanıcı Yönetimi
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Gelişmiş kullanıcı yönetimi ve analitik
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadUsers}
              disabled={loading}
              sx={{ borderRadius: 3 }}
            >
              Yenile
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                setEditingUser(null);
                setUserDialogOpen(true);
              }}
              sx={{ 
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                borderRadius: 3,
              }}
            >
              Yeni Kullanıcı
            </Button>
          </Box>
        </Box>
      </motion.div>

      {/* İstatistikler */}
      {userStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {[
              { title: 'Toplam Kullanıcı', value: userStats.total, color: theme.palette.primary.main, icon: <Group /> },
              { title: 'Aktif', value: userStats.active, color: theme.palette.success.main, icon: <CheckCircle /> },
              { title: 'Pasif', value: userStats.inactive, color: theme.palette.warning.main, icon: <Cancel /> },
              { title: 'Beklemede', value: userStats.pending, color: theme.palette.info.main, icon: <Warning /> },
              { title: 'Bu Ay Yeni', value: userStats.newThisMonth, color: theme.palette.secondary.main, icon: <PersonAdd /> },
            ].map((stat, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }} key={index}>
                <StyledCard>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ 
                        p: 1.5, 
                        borderRadius: 2, 
                        background: `linear-gradient(135deg, ${alpha(stat.color, 0.1)}, ${alpha(stat.color, 0.05)})`,
                        color: stat.color,
                      }}>
                        {stat.icon}
                      </Box>
                      <Typography variant="h4" fontWeight="bold" color={stat.color}>
                        <AnimatedCounter value={stat.value} />
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {stat.title}
                    </Typography>
                  </CardContent>
                </StyledCard>
              </Grid>
            ))}
          </Grid>
        </motion.div>
      )}

      {/* Filtreler ve Arama */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <StyledCard sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  placeholder="Kullanıcı ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ borderRadius: 3 }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Rol</InputLabel>
                  <Select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    label="Rol"
                  >
                    <MenuItem value="all">Tümü</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="teacher">Öğretmen</MenuItem>
                    <MenuItem value="student">Öğrenci</MenuItem>
                    <MenuItem value="parent">Veli</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Durum</InputLabel>
                  <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    label="Durum"
                  >
                    <MenuItem value="all">Tümü</MenuItem>
                    <MenuItem value="active">Aktif</MenuItem>
                    <MenuItem value="inactive">Pasif</MenuItem>
                    <MenuItem value="pending">Beklemede</MenuItem>
                    <MenuItem value="suspended">Askıya Alınmış</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Sırala</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    label="Sırala"
                  >
                    <MenuItem value="createdAt">Oluşturma Tarihi</MenuItem>
                    <MenuItem value="name">İsim</MenuItem>
                    <MenuItem value="email">E-posta</MenuItem>
                    <MenuItem value="lastLogin">Son Giriş</MenuItem>
                    <MenuItem value="performance">Performans</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  startIcon={sortOrder === 'asc' ? <TrendingUp /> : <TrendingDown />}
                  fullWidth
                >
                  {sortOrder === 'asc' ? 'Artan' : 'Azalan'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </StyledCard>
      </motion.div>

      {/* Kullanıcı Tablosu */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <StyledCard>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight="bold">
                Kullanıcılar ({users.length})
              </Typography>
              {selectedUsers.length > 0 && (
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {selectedUsers.length} seçili
                  </Typography>
                  <FormControl size="small">
                    <InputLabel>Toplu İşlem</InputLabel>
                    <Select
                      value={bulkAction}
                      onChange={(e) => setBulkAction(e.target.value)}
                      label="Toplu İşlem"
                    >
                      <MenuItem value="activate">Aktifleştir</MenuItem>
                      <MenuItem value="deactivate">Pasifleştir</MenuItem>
                      <MenuItem value="suspend">Askıya Al</MenuItem>
                      <MenuItem value="delete">Sil</MenuItem>
                    </Select>
                  </FormControl>
                  <Button
                    variant="contained"
                    onClick={handleBulkAction}
                    disabled={!bulkAction}
                    size="small"
                  >
                    Uygula
                  </Button>
                </Box>
              )}
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedUsers.length > 0 && selectedUsers.length < users.length}
                        checked={selectedUsers.length === users.length && users.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers(users.map(u => u.id));
                          } else {
                            setSelectedUsers([]);
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>Kullanıcı</TableCell>
                    <TableCell>Rol</TableCell>
                    <TableCell>Durum</TableCell>
                    <TableCell>Performans</TableCell>
                    <TableCell>Son Giriş</TableCell>
                    <TableCell align="right">İşlemler</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <StyledTableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers(prev => [...prev, user.id]);
                              } else {
                                setSelectedUsers(prev => prev.filter(id => id !== user.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar
                              src={user.avatar}
                              sx={{ 
                                width: 40, 
                                height: 40,
                                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                              }}
                            >
                              {user.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold">
                                {maybeAnonymize(user.name)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {maybeAnonymize(user.email)}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.role.toUpperCase()}
                            color={getRoleColor(user.role)}
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.status.toUpperCase()}
                            color={getStatusColor(user.status)}
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={user.performance}
                              color={getPerformanceColor(user.performance)}
                              sx={{ width: 60, height: 8, borderRadius: 4 }}
                            />
                            <Typography variant="body2" fontWeight="bold">
                              {user.performance}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {format(new Date(user.lastLogin), 'dd/MM/yyyy HH:mm', { locale: tr })}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Detaylar">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setUserDetailsOpen(true);
                                  loadUserActivity(user.id);
                                }}
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Düzenle">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setEditingUser(user);
                                  setUserDialogOpen(true);
                                }}
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Sil">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setConfirmAction({ type: 'delete', count: 1 });
                                  setConfirmDialogOpen(true);
                                }}
                                color="error"
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </StyledTableRow>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={userStats?.total || 0}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </CardContent>
        </StyledCard>
      </motion.div>

      {/* Kullanıcı Detay Dialog */}
      <Dialog open={userDetailsOpen} onClose={() => setUserDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            👤 Kullanıcı Detayları
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Avatar
                    src={selectedUser.avatar}
                    sx={{ 
                      width: 100, 
                      height: 100, 
                      mx: 'auto', 
                      mb: 2,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    }}
                  >
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="h6" fontWeight="bold">
                    {maybeAnonymize(selectedUser.name)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {maybeAnonymize(selectedUser.email)}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Rol
                    </Typography>
                    <Chip
                      label={selectedUser.role.toUpperCase()}
                      color={getRoleColor(selectedUser.role)}
                      size="small"
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Durum
                    </Typography>
                    <Chip
                      label={selectedUser.status.toUpperCase()}
                      color={getStatusColor(selectedUser.status)}
                      size="small"
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Performans
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={selectedUser.performance}
                        color={getPerformanceColor(selectedUser.performance)}
                        sx={{ width: 100, height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="body2" fontWeight="bold">
                        {selectedUser.performance}%
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Son Giriş
                    </Typography>
                    <Typography variant="body2">
                      {format(new Date(selectedUser.lastLogin), 'dd/MM/yyyy HH:mm', { locale: tr })}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDetailsOpen(false)}>Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* Onay Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>İşlemi Onayla</DialogTitle>
        <DialogContent>
          <Typography>
            {confirmAction?.type === 'delete' && `${confirmAction.count} kullanıcı silinecek. Bu işlem geri alınamaz.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>İptal</Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={() => {
              // Gerçek silme işlemi burada yapılacak
              setConfirmDialogOpen(false);
            }}
          >
            Onayla
          </Button>
        </DialogActions>
      </Dialog>

      {/* Loading Overlay */}
      {loading && (
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: alpha(theme.palette.background.paper, 0.8),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Kullanıcılar yükleniyor...
            </Typography>
          </Box>
        </Box>
      )}

      <NotificationComponent />
    </Box>
  );
};

export default UltraModernUserManagement;
