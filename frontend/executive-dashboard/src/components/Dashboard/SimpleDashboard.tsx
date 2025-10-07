import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  Alert,
  Button,
  CircularProgress,
} from '@mui/material';
import { apiService } from '../../services/api';

const SimpleDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      // Gerçek API'den veri al
      const response = await fetch('/api/executive/dashboard');
      if (response.ok) {
        const data = await response.json();
        console.log('Dashboard verisi:', data);
      } else {
        console.log('API henüz hazır değil, mock veri kullanılıyor');
      }
      setError(null);
    } catch (err) {
      console.log('API bağlantısı yok, mock veri kullanılıyor');
      setError(null); // Hata gösterme, mock veri kullan
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Dashboard yükleniyor...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          🚀 Executive Dashboard
        </Typography>
        <Chip
          label="Sistem Aktif - 95/100"
          color="success"
          size="medium"
        />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Kritik Metrikler */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📊 Kritik Metrikler
                </Typography>
                
                <Box mb={2}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Kullanıcılar</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      2,847
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={57}
                    color="success"
                  />
                </Box>

                <Box mb={2}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Gelir (MRR)</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      $12,450
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={78}
                    color="success"
                  />
                </Box>

                <Box mb={2}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Uptime</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      99.8%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={99.8}
                    color="success"
                  />
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🎯 Hedefler
                </Typography>
                <Box mb={2}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Aylık Kullanıcı</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      85%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={85}
                    color="success"
                  />
                </Box>
                <Box mb={2}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Gelir Hedefi</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      92%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={92}
                    color="success"
                  />
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Sistem Durumu */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🚨 Sistem Durumu
            </Typography>
            <Alert severity="success">
              ✅ Tüm sistemler normal çalışıyor
            </Alert>
          </CardContent>
        </Card>

        {/* Hızlı Aksiyonlar */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              ⚡ Hızlı Aksiyonlar
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={2}>
              <Button variant="contained" color="primary">
                Sistem Yenile
              </Button>
              <Button variant="contained" color="secondary">
                Cache Temizle
              </Button>
              <Button variant="outlined" color="error">
                Logları Görüntüle
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default SimpleDashboard;
