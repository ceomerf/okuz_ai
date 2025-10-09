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
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Autocomplete,
  Grid,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';

interface Field {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  multiline?: boolean;
  rows?: number;
}

interface Schema {
  fields: Field[];
}

interface DynamicFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  schema: Schema;
  initialData?: any;
  title: string;
}

const DynamicForm: React.FC<DynamicFormProps> = ({
  open,
  onClose,
  onSubmit,
  schema,
  initialData,
  title,
}) => {
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form verilerini başlat
  useEffect(() => {
    if (open) {
      setFormData(initialData || {});
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

  const validateField = (field: Field, value: any): string | null => {
    if (field.required && (!value || (Array.isArray(value) && value.length === 0))) {
      return `${field.label} gereklidir`;
    }

    // Type validation
    switch (field.type) {
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Geçerli bir email adresi giriniz';
        }
        break;
      case 'number':
        if (value && isNaN(Number(value))) {
          return 'Geçerli bir sayı giriniz';
        }
        break;
    }

    return null;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    schema.fields.forEach((field) => {
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

  const renderField = (field: Field) => {
    const value = formData[field.name] || '';
    const error = errors[field.name];

    switch (field.type) {
      case 'string':
      case 'text':
      case 'email':
        return (
          <TextField
            key={field.name}
            fullWidth
            label={field.label}
            type={field.type === 'email' ? 'email' : 'text'}
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

      case 'boolean':
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

      case 'date':
        return (
          <TextField
            key={field.name}
            fullWidth
            label={field.label}
            type="date"
            value={value ? new Date(value).toISOString().split('T')[0] : ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            error={!!error}
            helperText={error}
            required={field.required}
            InputLabelProps={{
              shrink: true,
            }}
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
            {schema.fields.map((field) => (
              <Grid item xs={12} sm={field.type === 'boolean' ? 12 : 6} key={field.name}>
                {renderField(field)}
              </Grid>
            ))}
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          İptal
        </Button>
        <LoadingButton
          onClick={handleSubmit}
          loading={isSubmitting}
          variant="contained"
        >
          Kaydet
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};

export default DynamicForm;
