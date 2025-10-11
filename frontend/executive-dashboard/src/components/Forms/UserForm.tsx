import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Box,
  Typography,
  Alert,
  Chip,
  Avatar,
  IconButton,
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  Person,
  Email,
  Phone,
  LocationOn,
  CalendarToday,
  Star,
  Security,
  Settings,
  PhotoCamera,
  Delete,
} from '@mui/icons-material';

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (userData: any) => void;
  editingUser?: any;
  loading?: boolean;
}

const UserForm: React.FC<UserFormProps> = ({
  open,
  onClose,
  onSubmit,
  editingUser,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'student',
    status: 'active',
    grade: '',
    subscription: 'basic',
    phone: '',
    address: '',
    avatar: '',
    notes: '',
    isActive: true,
    permissions: {
      canEdit: false,
      canDelete: false,
      canView: true,
      canExport: false,
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  useEffect(() => {
    if (editingUser) {
      setFormData({
        name: editingUser.name || '',
        email: editingUser.email || '',
        role: editingUser.role || 'student',
        status: editingUser.status || 'active',
        grade: editingUser.grade || '',
        subscription: editingUser.subscription || 'basic',
        phone: editingUser.phone || '',
        address: editingUser.address || '',
        avatar: editingUser.avatar || '',
        notes: editingUser.notes || '',
        isActive: editingUser.isActive !== false,
        permissions: editingUser.permissions || {
          canEdit: false,
          canDelete: false,
          canView: true,
          canExport: false,
        },
      });
      setAvatarPreview(editingUser.avatar || '');
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'student',
        status: 'active',
        grade: '',
        subscription: 'basic',
        phone: '',
        address: '',
        avatar: '',
        notes: '',
        isActive: true,
        permissions: {
          canEdit: false,
          canDelete: false,
          canView: true,
          canExport: false,
        },
      });
      setAvatarPreview('');
    }
  }, [editingUser, open]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Hata temizleme
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handlePermissionChange = (permission: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: value,
      },
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Ad soyad gereklidir';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-posta gereklidir';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi giriniz';
    }

    if (formData.role === 'student' && !formData.grade) {
      newErrors.grade = 'Öğrenci için sınıf gereklidir';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setAvatarPreview(result);
        setFormData(prev => ({ ...prev, avatar: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview('');
    setFormData(prev => ({ ...prev, avatar: '' }));
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'teacher': return 'primary';
      case 'student': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Person />
          <Typography variant="h6">
            {editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {/* Avatar Section */}
          <Box display="flex" alignItems="center" gap={3} mb={3}>
            <Avatar
              src={avatarPreview}
              sx={{ width: 80, height: 80 }}
            >
              {!avatarPreview && <Person sx={{ fontSize: 40 }} />}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Profil Fotoğrafı
              </Typography>
              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  startIcon={<PhotoCamera />}
                  component="label"
                  size="small"
                >
                  Yükle
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                </Button>
                {avatarPreview && (
                  <Button
                    variant="outlined"
                    startIcon={<Delete />}
                    onClick={handleRemoveAvatar}
                    size="small"
                    color="error"
                  >
                    Kaldır
                  </Button>
                )}
              </Box>
            </Box>
          </Box>

          <Box display="flex" flexDirection="column" gap={3}>
            {/* Temel Bilgiler */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Temel Bilgiler
              </Typography>
            </Box>

            <Box display="flex" flexWrap="wrap" gap={2}>
              <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                <TextField
                  fullWidth
                  label="Ad Soyad"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  error={!!errors.name}
                  helperText={errors.name}
                  required
                />
              </Box>

              <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                <TextField
                  fullWidth
                  label="E-posta"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  error={!!errors.email}
                  helperText={errors.email}
                  required
                />
              </Box>

              <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                <TextField
                  fullWidth
                  label="Telefon"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </Box>

              <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                <FormControl fullWidth>
                  <InputLabel>Rol</InputLabel>
                  <Select
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    label="Rol"
                  >
                    <MenuItem value="student">Öğrenci</MenuItem>
                    <MenuItem value="teacher">Öğretmen</MenuItem>
                    <MenuItem value="admin">Yönetici</MenuItem>
                    <MenuItem value="parent">Veli</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {formData.role === 'student' && (
                <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                  <FormControl fullWidth>
                    <InputLabel>Sınıf</InputLabel>
                    <Select
                      value={formData.grade}
                      onChange={(e) => handleInputChange('grade', e.target.value)}
                      label="Sınıf"
                      error={!!errors.grade}
                    >
                      {[9, 10, 11, 12].map(grade => (
                        <MenuItem key={grade} value={grade}>
                          {grade}. Sınıf
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {errors.grade && (
                    <Typography variant="caption" color="error">
                      {errors.grade}
                    </Typography>
                  )}
                </Box>
              )}

              <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                <FormControl fullWidth>
                  <InputLabel>Durum</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    label="Durum"
                  >
                    <MenuItem value="active">Aktif</MenuItem>
                    <MenuItem value="inactive">Pasif</MenuItem>
                    <MenuItem value="pending">Beklemede</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                <FormControl fullWidth>
                  <InputLabel>Abonelik</InputLabel>
                  <Select
                    value={formData.subscription}
                    onChange={(e) => handleInputChange('subscription', e.target.value)}
                    label="Abonelik"
                  >
                    <MenuItem value="free">Ücretsiz</MenuItem>
                    <MenuItem value="basic">Temel</MenuItem>
                    <MenuItem value="premium">Premium</MenuItem>
                    <MenuItem value="enterprise">Kurumsal</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Box>
              <TextField
                fullWidth
                label="Adres"
                multiline
                rows={2}
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
              />
            </Box>

            <Box>
              <TextField
                fullWidth
                label="Notlar"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
              />
            </Box>

            {/* Yetkiler */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Yetkiler
              </Typography>
            </Box>

            <Box display="flex" flexWrap="wrap" gap={2}>
              <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.permissions.canView}
                      onChange={(e) => handlePermissionChange('canView', e.target.checked)}
                    />
                  }
                  label="Görüntüleme"
                />
              </Box>

              <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.permissions.canEdit}
                      onChange={(e) => handlePermissionChange('canEdit', e.target.checked)}
                    />
                  }
                  label="Düzenleme"
                />
              </Box>

              <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.permissions.canDelete}
                      onChange={(e) => handlePermissionChange('canDelete', e.target.checked)}
                    />
                  }
                  label="Silme"
                />
              </Box>

              <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.permissions.canExport}
                      onChange={(e) => handlePermissionChange('canExport', e.target.checked)}
                    />
                  }
                  label="Dışa Aktarma"
                />
              </Box>

              <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    />
                  }
                  label="Hesap Aktif"
                />
              </Box>
            </Box>
          </Box>

          {/* Önizleme */}
          {formData.name && (
            <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
              <Typography variant="subtitle1" gutterBottom>
                Önizleme:
              </Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar src={avatarPreview} sx={{ width: 40, height: 40 }}>
                  <Person />
                </Avatar>
                <Box>
                  <Typography variant="body1" fontWeight="bold">
                    {formData.name}
                  </Typography>
                  <Box display="flex" gap={1} mt={1}>
                    <Chip
                      label={formData.role}
                      color={getRoleColor(formData.role) as any}
                      size="small"
                    />
                    <Chip
                      label={formData.status}
                      color={getStatusColor(formData.status) as any}
                      size="small"
                    />
                    <Chip
                      label={formData.subscription}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          İptal
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <Box sx={{ width: 20, height: 20 }} /> : undefined}
        >
          {loading ? 'Kaydediliyor...' : editingUser ? 'Güncelle' : 'Ekle'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserForm;
