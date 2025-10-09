import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
  Chip,
  Slider,
  Checkbox,
  FormControlLabel,
  FormGroup,
} from '@mui/material';
import { FilterList, Clear } from '@mui/icons-material';

export interface CoachFilters {
  specialization?: string;
  experience?: { min?: number; max?: number };
  performance?: { min?: number; max?: number };
  studentCount?: { min?: number; max?: number };
  lastActive?: Date;
  isActive?: boolean;
  search?: string;
}

interface CoachFiltersProps {
  open: boolean;
  onClose: () => void;
  onApply: (filters: CoachFilters) => void;
  onClear: () => void;
  currentFilters: CoachFilters;
}

const CoachFiltersDialog: React.FC<CoachFiltersProps> = ({
  open,
  onClose,
  onApply,
  onClear,
  currentFilters,
}) => {
  const [filters, setFilters] = useState<CoachFilters>(currentFilters);

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleClear = () => {
    setFilters({});
    onClear();
    onClose();
  };

  const handleExperienceChange = (value: number[], field: 'min' | 'max') => {
    setFilters(prev => ({
      ...prev,
      experience: {
        ...prev.experience,
        [field]: value[field === 'min' ? 0 : 1],
      },
    }));
  };

  const handlePerformanceChange = (value: number[], field: 'min' | 'max') => {
    setFilters(prev => ({
      ...prev,
      performance: {
        ...prev.performance,
        [field]: value[field === 'min' ? 0 : 1],
      },
    }));
  };

  const handleStudentCountChange = (value: number[], field: 'min' | 'max') => {
    setFilters(prev => ({
      ...prev,
      studentCount: {
        ...prev.studentCount,
        [field]: value[field === 'min' ? 0 : 1],
      },
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterList />
          <Typography variant="h6">Gelişmiş Filtreler</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
          {/* Uzmanlık Alanı */}
          <FormControl fullWidth>
            <InputLabel>Uzmanlık Alanı</InputLabel>
            <Select
              value={filters.specialization || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, specialization: e.target.value }))}
            >
              <MenuItem value="">Tümü</MenuItem>
              <MenuItem value="matematik">Matematik</MenuItem>
              <MenuItem value="fizik">Fizik</MenuItem>
              <MenuItem value="kimya">Kimya</MenuItem>
              <MenuItem value="biyoloji">Biyoloji</MenuItem>
              <MenuItem value="turkce">Türkçe</MenuItem>
              <MenuItem value="tarih">Tarih</MenuItem>
              <MenuItem value="cografya">Coğrafya</MenuItem>
              <MenuItem value="felsefe">Felsefe</MenuItem>
            </Select>
          </FormControl>

          {/* Deneyim Yılı */}
          <Box>
            <Typography gutterBottom>Deneyim Yılı</Typography>
            <Slider
              value={[filters.experience?.min || 0, filters.experience?.max || 20]}
              onChange={(_, value) => {
                const [min, max] = value as number[];
                setFilters(prev => ({
                  ...prev,
                  experience: { min, max },
                }));
              }}
              valueLabelDisplay="auto"
              min={0}
              max={20}
              step={1}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption">{filters.experience?.min || 0} yıl</Typography>
              <Typography variant="caption">{filters.experience?.max || 20} yıl</Typography>
            </Box>
          </Box>

          {/* Performans Skoru */}
          <Box>
            <Typography gutterBottom>Performans Skoru</Typography>
            <Slider
              value={[filters.performance?.min || 0, filters.performance?.max || 100]}
              onChange={(_, value) => {
                const [min, max] = value as number[];
                setFilters(prev => ({
                  ...prev,
                  performance: { min, max },
                }));
              }}
              valueLabelDisplay="auto"
              min={0}
              max={100}
              step={5}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption">{filters.performance?.min || 0}%</Typography>
              <Typography variant="caption">{filters.performance?.max || 100}%</Typography>
            </Box>
          </Box>

          {/* Öğrenci Sayısı */}
          <Box>
            <Typography gutterBottom>Öğrenci Sayısı</Typography>
            <Slider
              value={[filters.studentCount?.min || 0, filters.studentCount?.max || 50]}
              onChange={(_, value) => {
                const [min, max] = value as number[];
                setFilters(prev => ({
                  ...prev,
                  studentCount: { min, max },
                }));
              }}
              valueLabelDisplay="auto"
              min={0}
              max={50}
              step={1}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption">{filters.studentCount?.min || 0} öğrenci</Typography>
              <Typography variant="caption">{filters.studentCount?.max || 50} öğrenci</Typography>
            </Box>
          </Box>

          {/* Son Aktivite */}
          <TextField
            label="Son Aktivite (Tarih)"
            type="date"
            value={filters.lastActive ? filters.lastActive.toISOString().split('T')[0] : ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              lastActive: e.target.value ? new Date(e.target.value) : undefined 
            }))}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          {/* Durum */}
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={filters.isActive === true}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    isActive: e.target.checked ? true : undefined 
                  }))}
                />
              }
              label="Sadece Aktif Koçlar"
            />
          </FormGroup>

          {/* Aktif Filtreler */}
          {Object.keys(filters).length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Aktif Filtreler:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {filters.specialization && (
                  <Chip
                    label={`Uzmanlık: ${filters.specialization}`}
                    onDelete={() => setFilters(prev => ({ ...prev, specialization: undefined }))}
                    size="small"
                  />
                )}
                {filters.experience && (
                  <Chip
                    label={`Deneyim: ${filters.experience.min}-${filters.experience.max} yıl`}
                    onDelete={() => setFilters(prev => ({ ...prev, experience: undefined }))}
                    size="small"
                  />
                )}
                {filters.performance && (
                  <Chip
                    label={`Performans: ${filters.performance.min}-${filters.performance.max}%`}
                    onDelete={() => setFilters(prev => ({ ...prev, performance: undefined }))}
                    size="small"
                  />
                )}
                {filters.studentCount && (
                  <Chip
                    label={`Öğrenci: ${filters.studentCount.min}-${filters.studentCount.max}`}
                    onDelete={() => setFilters(prev => ({ ...prev, studentCount: undefined }))}
                    size="small"
                  />
                )}
                {filters.isActive && (
                  <Chip
                    label="Aktif"
                    onDelete={() => setFilters(prev => ({ ...prev, isActive: undefined }))}
                    size="small"
                  />
                )}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button onClick={handleClear} startIcon={<Clear />}>
          Temizle
        </Button>
        <Button onClick={handleApply} variant="contained">
          Uygula
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CoachFiltersDialog;
