import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmText = 'Onayla',
  cancelText = 'İptal',
  confirmColor = 'error',
  isSubmitting = false,
  onClose,
  onConfirm,
}) => {
  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose}>
      <DialogTitle>{title}</DialogTitle>
      {description && (
        <DialogContent>
          <Typography>{description}</Typography>
        </DialogContent>
      )}
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>{cancelText}</Button>
        <Button
          color={confirmColor}
          variant="contained"
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;


