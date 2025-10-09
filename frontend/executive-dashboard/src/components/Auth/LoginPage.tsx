import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Link,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Login as LoginIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Geçersiz email veya şifre');
      }
    } catch (err) {
      setError('Giriş yapılırken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            borderRadius: 2,
          }}
        >
          {/* Logo ve Başlık */}
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography variant="h4" component="h1" gutterBottom>
              🚀 Okuz AI
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Yönetim Paneli
            </Typography>
          </Box>

          {/* Hata Mesajı */}
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Giriş Formu */}
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Adresi"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Şifre"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleShowPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : <LoginIcon />}
            >
              {isLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </Button>

            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Test Hesapları
              </Typography>
            </Divider>

            {/* Test Hesapları */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Demo hesapları ile giriş yapabilirsiniz:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setEmail('admin@okuz.ai');
                    setPassword('admin123');
                  }}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  👤 Admin: admin@okuz.ai / admin123
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setEmail('teacher@okuz.ai');
                    setPassword('teacher123');
                  }}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  👨‍🏫 Öğretmen: teacher@okuz.ai / teacher123
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setEmail('student@okuz.ai');
                    setPassword('student123');
                  }}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  👨‍🎓 Öğrenci: student@okuz.ai / student123
                </Button>
              </Box>
            </Box>

            {/* Kayıt Ol Linki */}
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2">
                Hesabınız yok mu?{' '}
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => navigate('/register')}
                  sx={{ textDecoration: 'none' }}
                >
                  Kayıt Ol
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;
