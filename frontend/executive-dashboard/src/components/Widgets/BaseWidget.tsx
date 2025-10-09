import React from 'react';
import { Paper, Typography, Box, IconButton, Tooltip, CircularProgress } from '@mui/material';
import { Refresh as RefreshIcon, Settings as SettingsIcon } from '@mui/icons-material';

interface BaseWidgetProps {
  title: string;
  description?: string;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onSettings?: () => void;
  children: React.ReactNode;
  height?: string | number;
}

const BaseWidget: React.FC<BaseWidgetProps> = ({
  title,
  description,
  loading = false,
  error,
  onRefresh,
  onSettings,
  children,
  height = '100%',
}) => {
  return (
    <Paper 
      sx={{ 
        p: 2, 
        height, 
        display: 'flex', 
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" component="h3" gutterBottom>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {onRefresh && (
            <Tooltip title="Yenile">
              <IconButton size="small" onClick={onRefresh} disabled={loading}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          {onSettings && (
            <Tooltip title="Ayarlar">
              <IconButton size="small" onClick={onSettings}>
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}
          >
            <CircularProgress size={40} />
          </Box>
        ) : error ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              color: 'error.main',
            }}
          >
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          </Box>
        ) : (
          children
        )}
      </Box>
    </Paper>
  );
};

export default BaseWidget;
