import React from 'react';
import { Box, Typography, Chip, LinearProgress } from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';
import BaseWidget from './BaseWidget';

interface MetricCardWidgetProps {
  title: string;
  description?: string;
  data: any;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onSettings?: () => void;
}

const MetricCardWidget: React.FC<MetricCardWidgetProps> = ({
  title,
  description,
  data,
  loading = false,
  error,
  onRefresh,
  onSettings,
}) => {
  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp color="success" />;
    if (trend < 0) return <TrendingDown color="error" />;
    return <TrendingFlat color="action" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'success';
    if (trend < 0) return 'error';
    return 'default';
  };

  const formatValue = (value: any) => {
    if (typeof value === 'number') {
      return value.toLocaleString('tr-TR');
    }
    return String(value);
  };

  return (
    <BaseWidget
      title={title}
      description={description}
      loading={loading}
      error={error}
      onRefresh={onRefresh}
      onSettings={onSettings}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Main Value */}
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="h3" component="div" color="primary" fontWeight="bold">
            {data?.value ? formatValue(data.value) : '0'}
          </Typography>
        </Box>

        {/* Trend and Additional Info */}
        {data?.trend !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 1 }}>
            {getTrendIcon(data.trend)}
            <Chip
              label={`${data.trend > 0 ? '+' : ''}${data.trend}%`}
              color={getTrendColor(data.trend)}
              size="small"
            />
          </Box>
        )}

        {/* Progress Bar */}
        {data?.progress !== undefined && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(Math.max(data.progress, 0), 100)}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              %{Math.round(data.progress || 0)} tamamlandı
            </Typography>
          </Box>
        )}

        {/* Additional Metrics */}
        {data?.additional && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            {Object.entries(data.additional).map(([key, value]) => (
              <Box key={key} sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  {key}
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {formatValue(value)}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* Status */}
        {data?.status && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Chip
              label={data.status}
              color={data.status === 'Aktif' ? 'success' : 'default'}
              size="small"
            />
          </Box>
        )}
      </Box>
    </BaseWidget>
  );
};

export default MetricCardWidget;
