import React from 'react';
import { Box, Typography, Button } from '@mui/material';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, actionText, onAction, icon }) => {
  return (
    <Box sx={{ textAlign: 'center', p: 6, color: 'text.secondary' }}>
      <Box sx={{ fontSize: 64, mb: 2 }}>
        {icon}
      </Box>
      <Typography variant="h6" sx={{ mb: 1 }}>{title}</Typography>
      {description && (
        <Typography variant="body2" sx={{ mb: 2 }}>{description}</Typography>
      )}
      {actionText && onAction && (
        <Button variant="contained" onClick={onAction}>{actionText}</Button>
      )}
    </Box>
  );
};

export default EmptyState;


