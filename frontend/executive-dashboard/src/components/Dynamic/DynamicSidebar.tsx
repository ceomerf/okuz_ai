import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  Collapse,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Analytics as AnalyticsIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { apiService } from '../../services/api.service';

interface EntitySchema {
  id: string;
  entityName: string;
  displayName: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder: number;
}

interface DynamicSidebarProps {
  open: boolean;
  onClose: () => void;
  width?: number;
}

const DynamicSidebar: React.FC<DynamicSidebarProps> = ({
  open,
  onClose,
  width = 280,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [schemas, setSchemas] = useState<EntitySchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    entities: true,
    system: true,
  });

  useEffect(() => {
    loadSchemas();
  }, []);

  const loadSchemas = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.request('/api/schemas');
      if (response.success) {
        setSchemas(response.data);
      } else {
        setError('Schema listesi yüklenemedi');
      }
    } catch (err) {
      setError('Schema listesi yüklenirken hata oluştu');
      console.error('Schema load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEntityClick = (entityName: string) => {
    navigate(`/dynamic/${entityName}`);
    onClose();
  };

  const handleSectionToggle = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isEntityActive = (entityName: string) => {
    return location.pathname === `/dynamic/${entityName}`;
  };

  const renderEntityItem = (schema: EntitySchema) => (
    <ListItem key={schema.id} disablePadding>
      <ListItemButton
        onClick={() => handleEntityClick(schema.entityName)}
        selected={isEntityActive(schema.entityName)}
        sx={{
          pl: 3,
          '&.Mui-selected': {
            backgroundColor: `${schema.color || '#3b82f6'}20`,
            borderRight: `3px solid ${schema.color || '#3b82f6'}`,
          },
        }}
      >
        <ListItemIcon
          sx={{
            color: isEntityActive(schema.entityName) 
              ? schema.color || '#3b82f6' 
              : 'text.secondary',
            minWidth: 40,
          }}
        >
          <Box
            sx={{
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {schema.icon || '📋'}
          </Box>
        </ListItemIcon>
        <ListItemText
          primary={schema.displayName}
          secondary={schema.description}
          primaryTypographyProps={{
            fontSize: '0.9rem',
            fontWeight: isEntityActive(schema.entityName) ? 600 : 400,
          }}
          secondaryTypographyProps={{
            fontSize: '0.75rem',
          }}
        />
      </ListItemButton>
    </ListItem>
  );

  const renderSystemItems = () => (
    <>
      <ListItem disablePadding>
        <ListItemButton
          onClick={() => navigate('/dashboard')}
          selected={isActive('/dashboard')}
          sx={{
            pl: 2,
            '&.Mui-selected': {
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
            },
          }}
        >
          <ListItemIcon
            sx={{
              color: isActive('/dashboard') ? 'inherit' : 'text.secondary',
              minWidth: 40,
            }}
          >
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText
            primary="Dashboard"
            primaryTypographyProps={{
              fontSize: '0.9rem',
              fontWeight: isActive('/dashboard') ? 600 : 400,
            }}
          />
        </ListItemButton>
      </ListItem>

      <ListItem disablePadding>
        <ListItemButton
          onClick={() => navigate('/analytics')}
          selected={isActive('/analytics')}
          sx={{
            pl: 2,
            '&.Mui-selected': {
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
            },
          }}
        >
          <ListItemIcon
            sx={{
              color: isActive('/analytics') ? 'inherit' : 'text.secondary',
              minWidth: 40,
            }}
          >
            <AnalyticsIcon />
          </ListItemIcon>
          <ListItemText
            primary="Analytics"
            primaryTypographyProps={{
              fontSize: '0.9rem',
              fontWeight: isActive('/analytics') ? 600 : 400,
            }}
          />
        </ListItemButton>
      </ListItem>

      <ListItem disablePadding>
        <ListItemButton
          onClick={() => navigate('/settings')}
          selected={isActive('/settings')}
          sx={{
            pl: 2,
            '&.Mui-selected': {
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
            },
          }}
        >
          <ListItemIcon
            sx={{
              color: isActive('/settings') ? 'inherit' : 'text.secondary',
              minWidth: 40,
            }}
          >
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText
            primary="Ayarlar"
            primaryTypographyProps={{
              fontSize: '0.9rem',
              fontWeight: isActive('/settings') ? 600 : 400,
            }}
          />
        </ListItemButton>
      </ListItem>
    </>
  );

  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          backgroundColor: 'background.paper',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            🚀 Okuz AI
          </Typography>
          <Tooltip title="Yenile">
            <IconButton size="small" onClick={loadSchemas} disabled={loading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : (
          <List>
            {/* System Section */}
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleSectionToggle('system')}
                sx={{ pl: 1 }}
              >
                <ListItemText
                  primary="Sistem"
                  primaryTypographyProps={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                />
                {expandedSections.system ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>
            <Collapse in={expandedSections.system} timeout="auto" unmountOnExit>
              {renderSystemItems()}
            </Collapse>

            <Divider sx={{ my: 1 }} />

            {/* Entities Section */}
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleSectionToggle('entities')}
                sx={{ pl: 1 }}
              >
                <ListItemText
                  primary="Yönetim"
                  primaryTypographyProps={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                />
                {expandedSections.entities ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>
            <Collapse in={expandedSections.entities} timeout="auto" unmountOnExit>
              {schemas.length > 0 ? (
                schemas.map(renderEntityItem)
              ) : (
                <ListItem>
                  <ListItemText
                    primary="Henüz yönetilebilir varlık yok"
                    primaryTypographyProps={{
                      fontSize: '0.8rem',
                      color: 'text.secondary',
                      fontStyle: 'italic',
                    }}
                  />
                </ListItem>
              )}
            </Collapse>

            {/* Schema Count */}
            {schemas.length > 0 && (
              <Box sx={{ px: 2, py: 1 }}>
                <Chip
                  label={`${schemas.length} varlık`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
            )}
          </List>
        )}
      </Box>
    </Drawer>
  );
};

export default DynamicSidebar;
