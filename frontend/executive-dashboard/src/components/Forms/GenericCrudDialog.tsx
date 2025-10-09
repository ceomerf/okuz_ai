import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  Autocomplete,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';

export interface CrudField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'multiselect' | 'switch' | 'autocomplete';
  required?: boolean;
  options?: { value: string; label: string }[];
  multiline?: boolean;
  rows?: number;
  validation?: (value: any) => string | null;
}

interface GenericCrudDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  title: string;
  fields: CrudField[];
  initialData?: any;
  loading?: boolean;
  submitButtonText?: string;
  cancelButtonText?: string;
}

const GenericCrudDialog: React.FC<GenericCrudDialogProps> = ({
  open,
  onClose,
  onSubmit,
  title,
  fields,
  initialData = {},
  loading = false,
  submitButtonText = 'Kaydet',
  cancelButtonText = 'İptal',
}) => {
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form verilerini başlat
  useEffect(() => {
    if (open) {
      setFormData(initialData);
      setErrors({});
    }
  }, [open, initialData]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [fieldName]: value,
    }));

    // Hata temizle
    if (errors[fieldName]) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: '',
      }));
    }
  };

  const validateField = (field: CrudField, value: any): string | null => {
    if (field.required && (!value || (Array.isArray(value) && value.length === 0))) {
      return `${field.label} gereklidir`;
    }

    if (field.validation) {
      return field.validation(value);
    }

    return null;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      const error = validateField(field, formData[field.name]);
      if (error) {
        newErrors[field.name] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: CrudField) => {
    const value = formData[field.name] || '';
    const error = errors[field.name];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
        return (
          <TextField
            key={field.name}
            fullWidth
            label={field.label}
            type={field.type}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            error={!!error}
            helperText={error}
            required={field.required}
            multiline={field.multiline}
            rows={field.rows}
          />
        );

      case 'number':
        return (
          <TextField
            key={field.name}
            fullWidth
            label={field.label}
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.name, Number(e.target.value))}
            error={!!error}
            helperText={error}
            required={field.required}
          />
        );

      case 'select':
        return (
          <FormControl key={field.name} fullWidth error={!!error}>
            <InputLabel required={field.required}>{field.label}</InputLabel>
            <Select
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              label={field.label}
            >
              {field.options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {error && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                {error}
              </Typography>
            )}
          </FormControl>
        );

      case 'multiselect':
        return (
          <FormControl key={field.name} fullWidth error={!!error}>
            <InputLabel required={field.required}>{field.label}</InputLabel>
            <Select
              multiple
              value={value || []}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              label={field.label}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => {
                    const option = field.options?.find((opt) => opt.value === value);
                    return (
                      <Chip
                        key={value}
                        label={option?.label || value}
                        size="small"
                      />
                    );
                  })}
                </Box>
              )}
            >
              {field.options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {error && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                {error}
              </Typography>
            )}
          </FormControl>
        );

      case 'autocomplete':
        return (
          <Autocomplete
            key={field.name}
            multiple={field.name.includes('multiple')}
            options={field.options || []}
            getOptionLabel={(option) => option.label}
            value={
              field.name.includes('multiple')
                ? (value || []).map((v: string) => 
                    field.options?.find((opt) => opt.value === v) || { value: v, label: v }
                  )
                : field.options?.find((opt) => opt.value === value) || null
            }
            onChange={(_, newValue) => {
              if (field.name.includes('multiple')) {
                handleFieldChange(field.name, newValue.map((item: any) => item.value));
              } else {
                handleFieldChange(field.name, newValue?.value || '');
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={field.label}
                error={!!error}
                helperText={error}
                required={field.required}
              />
            )}
          />
        );

      case 'switch':
        return (
          <FormControlLabel
            key={field.name}
            control={
              <Switch
                checked={!!value}
                onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              />
            }
            label={field.label}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6">{title}</Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Grid container spacing={2}>
            {fields.map((field) => (
              <Grid item xs={12} sm={field.type === 'switch' ? 12 : 6} key={field.name}>
                {renderField(field)}
              </Grid>
            ))}
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          {cancelButtonText}
        </Button>
        <LoadingButton
          onClick={handleSubmit}
          loading={isSubmitting}
          variant="contained"
          disabled={loading}
        >
          {submitButtonText}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};

export default GenericCrudDialog;
