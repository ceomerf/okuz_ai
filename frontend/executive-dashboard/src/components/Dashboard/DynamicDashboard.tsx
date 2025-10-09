import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  IconButton,
  Tooltip,
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
  Paper,
  Box,
  Fab,
  Menu,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { apiService } from '../../services/api.service';

const ResponsiveBoxLayout = WidthProvider(Responsive);

interface Widget {
  id: string;
  type: string;
  title: string;
  description?: string;
  position: any;
  config: any;
  query?: string;
  refreshRate?: number;
  data?: any;
}

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layout: any;
  settings: any;
  widgets: Widget[];
}

const DynamicDashboard: React.FC = () => {
  const { dashboardId } = useParams<{ dashboardId: string }>();
  const navigate = useNavigate();
  
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [widgetDialogOpen, setWidgetDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (dashboardId) {
      loadDashboard();
    }
  }, [dashboardId]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.request(`/api/analytics/dashboard/${dashboardId}`);
      if (response.success) {
        setDashboard(response.data);
      } else {
        setError('Dashboard yüklenemedi');
      }
    } catch (err) {
      setError('Dashboard yüklenirken hata oluştu');
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLayoutChange = useCallback((layout: any) => {
    if (!dashboard) return;
    
    // Layout değişikliklerini kaydet
    const updatedDashboard = {
      ...dashboard,
      layout: { lg: layout },
    };
    setDashboard(updatedDashboard);
  }, [dashboard]);

  const handleSaveLayout = async () => {
    if (!dashboard) return;
    
    try {
      setSaving(true);
      const response = await apiService.request(
        `/api/analytics/dashboard/${dashboardId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            layout: dashboard.layout,
          }),
        }
      );
      
      if (response.success) {
        setEditMode(false);
      } else {
        setError('Layout kaydedilemedi');
      }
    } catch (err) {
      setError('Layout kaydedilirken hata oluştu');
      console.error('Layout save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddWidget = () => {
    setSelectedWidget(null);
    setWidgetDialogOpen(true);
  };

  const handleEditWidget = (widget: Widget) => {
    setSelectedWidget(widget);
    setWidgetDialogOpen(true);
  };

  const handleDeleteWidget = async (widgetId: string) => {
    if (window.confirm('Bu widget\'ı silmek istediğinizden emin misiniz?')) {
      try {
        const response = await apiService.request(
          `/api/analytics/widget/${widgetId}`,
          { method: 'DELETE' }
        );
        
        if (response.success) {
          loadDashboard(); // Dashboard'ı yenile
        } else {
          setError('Widget silinemedi');
        }
      } catch (err) {
        setError('Widget silinirken hata oluştu');
        console.error('Widget delete error:', err);
      }
    }
  };

  const handleWidgetSubmit = async (widgetData: any) => {
    try {
      setSaving(true);
      let response;
      
      if (selectedWidget) {
        // Widget güncelleme
        response = await apiService.request(
          `/api/analytics/widget/${selectedWidget.id}`,
          {
            method: 'PUT',
            body: JSON.stringify(widgetData),
          }
        );
      } else {
        // Yeni widget oluşturma
        response = await apiService.request('/api/analytics/widget', {
          method: 'POST',
          body: JSON.stringify({
            ...widgetData,
            dashboardId,
          }),
        });
      }
      
      if (response.success) {
        setWidgetDialogOpen(false);
        setSelectedWidget(null);
        loadDashboard(); // Dashboard'ı yenile
      } else {
        setError(selectedWidget ? 'Widget güncellenemedi' : 'Widget oluşturulamadı');
      }
    } catch (err) {
      setError(selectedWidget ? 'Widget güncellenirken hata oluştu' : 'Widget oluşturulurken hata oluştu');
      console.error('Widget submit error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = () => {
    loadDashboard();
  };

  const renderWidget = (widget: Widget) => {
    // Widget tipine göre render et
    switch (widget.type) {
      case 'METRIC_CARD':
        return (
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              {widget.title}
            </Typography>
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="h3" color="primary">
                {widget.data?.total || 0}
              </Typography>
            </Box>
            {widget.description && (
              <Typography variant="body2" color="text.secondary">
                {widget.description}
              </Typography>
            )}
          </Paper>
        );
      
      case 'LINE_CHART':
        return (
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              {widget.title}
            </Typography>
            <Box sx={{ height: 'calc(100% - 40px)' }}>
              {/* Chart.js Line Chart burada render edilecek */}
              <Typography variant="body2" color="text.secondary">
                Line Chart - {widget.data?.length || 0} veri noktası
              </Typography>
            </Box>
          </Paper>
        );
      
      case 'BAR_CHART':
        return (
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              {widget.title}
            </Typography>
            <Box sx={{ height: 'calc(100% - 40px)' }}>
              {/* Chart.js Bar Chart burada render edilecek */}
              <Typography variant="body2" color="text.secondary">
                Bar Chart - {widget.data?.length || 0} veri noktası
              </Typography>
            </Box>
          </Paper>
        );
      
      case 'PIE_CHART':
        return (
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              {widget.title}
            </Typography>
            <Box sx={{ height: 'calc(100% - 40px)' }}>
              {/* Chart.js Pie Chart burada render edilecek */}
              <Typography variant="body2" color="text.secondary">
                Pie Chart - {widget.data?.length || 0} veri noktası
              </Typography>
            </Box>
          </Paper>
        );
      
      default:
        return (
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              {widget.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Widget tipi: {widget.type}
            </Typography>
          </Paper>
        );
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={loadDashboard} variant="outlined">
          Tekrar Dene
        </Button>
      </Container>
    );
  }

  if (!dashboard) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="warning">
          Dashboard bulunamadı
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            {dashboard.name}
          </Typography>
          {dashboard.description && (
            <Typography variant="body1" color="text.secondary">
              {dashboard.description}
            </Typography>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Yenile">
            <IconButton onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Ayarlar">
            <IconButton onClick={() => setSettingsDialogOpen(true)}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          
          <Button
            variant={editMode ? 'contained' : 'outlined'}
            onClick={() => setEditMode(!editMode)}
            startIcon={<EditIcon />}
          >
            {editMode ? 'Düzenleme Modu' : 'Düzenle'}
          </Button>
          
          {editMode && (
            <Button
              variant="contained"
              onClick={handleSaveLayout}
              startIcon={<SaveIcon />}
              disabled={saving}
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          )}
        </Box>
      </Box>

      {/* Dashboard Box */}
      <Box sx={{ position: 'relative' }}>
        <ResponsiveBoxLayout
          className="layout"
          layouts={dashboard.layout}
          onLayoutChange={handleLayoutChange}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={60}
          isDraggable={editMode}
          isResizable={editMode}
        >
          {dashboard.widgets.map((widget) => (
            <div key={widget.id} data-grid={widget.position}>
              <Box sx={{ position: 'relative', height: '100%' }}>
                {renderWidget(widget)}
                
                {editMode && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      display: 'flex',
                      gap: 0.5,
                    }}
                  >
                    <Tooltip title="Düzenle">
                      <IconButton
                        size="small"
                        onClick={() => handleEditWidget(widget)}
                        sx={{ backgroundColor: 'background.paper' }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Sil">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteWidget(widget.id)}
                        sx={{ backgroundColor: 'background.paper' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </Box>
            </div>
          ))}
        </ResponsiveBoxLayout>
        
        {/* Add Widget FAB */}
        {editMode && (
          <Fab
            color="primary"
            aria-label="add widget"
            onClick={handleAddWidget}
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
            }}
          >
            <AddIcon />
          </Fab>
        )}
      </Box>

      {/* Widget Dialog */}
      <WidgetDialog
        open={widgetDialogOpen}
        onClose={() => {
          setWidgetDialogOpen(false);
          setSelectedWidget(null);
        }}
        onSubmit={handleWidgetSubmit}
        widget={selectedWidget}
        loading={saving}
      />
    </Container>
  );
};

// Widget Dialog Component
interface WidgetDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  widget?: Widget | null;
  loading?: boolean;
}

const WidgetDialog: React.FC<WidgetDialogProps> = ({
  open,
  onClose,
  onSubmit,
  widget,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    type: 'METRIC_CARD',
    title: '',
    description: '',
    query: '',
    refreshRate: 300,
    config: {},
  });

  useEffect(() => {
    if (widget) {
      setFormData({
        type: widget.type,
        title: widget.title,
        description: widget.description || '',
        query: widget.query || '',
        refreshRate: widget.refreshRate || 300,
        config: widget.config || {},
      });
    } else {
      setFormData({
        type: 'METRIC_CARD',
        title: '',
        description: '',
        query: '',
        refreshRate: 300,
        config: {},
      });
    }
  }, [widget, open]);

  const handleSubmit = () => {
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {widget ? 'Widget Düzenle' : 'Yeni Widget'}
      </DialogTitle>
      <DialogContent>
        <Box container spacing={2} sx={{ mt: 1 }}>
          <Box xs={12} sm={6}>
            <TextField
              fullWidth
              label="Widget Başlığı"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </Box>
          
          <Box xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Widget Tipi</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                label="Widget Tipi"
              >
                <MenuItem value="METRIC_CARD">Metrik Kartı</MenuItem>
                <MenuItem value="LINE_CHART">Çizgi Grafik</MenuItem>
                <MenuItem value="BAR_CHART">Çubuk Grafik</MenuItem>
                <MenuItem value="PIE_CHART">Pasta Grafik</MenuItem>
                <MenuItem value="TABLE">Tablo</MenuItem>
                <MenuItem value="KPI_CARD">KPI Kartı</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box xs={12}>
            <TextField
              fullWidth
              label="Açıklama"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
            />
          </Box>
          
          <Box xs={12}>
            <TextField
              fullWidth
              label="SQL Sorgusu"
              value={formData.query}
              onChange={(e) => setFormData({ ...formData, query: e.target.value })}
              multiline
              rows={4}
              placeholder="SELECT COUNT(*) as total FROM users WHERE..."
            />
          </Box>
          
          <Box xs={12} sm={6}>
            <TextField
              fullWidth
              label="Yenileme Süresi (saniye)"
              type="number"
              value={formData.refreshRate}
              onChange={(e) => setFormData({ ...formData, refreshRate: Number(e.target.value) })}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          İptal
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.title}
        >
          {loading ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DynamicDashboard;
