import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api.service';

interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  roles: string[];
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, role?: string) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Token'ı localStorage'dan kontrol et
  useEffect(() => {
    const checkAuth = async () => {
      // Önce tüm localStorage'ı temizle (geliştirme için)
      const urlParams = new URLSearchParams(window.location.search);
      const clearCache = urlParams.get('clear') === 'true';
      
      if (clearCache) {
        localStorage.clear();
        window.location.href = '/login';
        return;
      }

      // Eğer login sayfasındaysak, authentication kontrolü yapma
      if (window.location.pathname === '/login' || window.location.pathname === '/register') {
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem('admin_token');
      if (token) {
        try {
          // Token'ın geçerliliğini kontrol et
          const response = await apiService.getProfile();
          if (response.success && response.data) {
            setUser(response.data);
          } else {
            // Token geçersizse temizle
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          // Backend çalışmıyorsa localStorage'dan user bilgilerini al
          try {
            const userData = localStorage.getItem('admin_user');
            if (userData) {
              const user = JSON.parse(userData);
              setUser(user);
            } else {
              localStorage.removeItem('admin_token');
            }
          } catch (parseError) {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
          }
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await apiService.login(email, password);
      
      if (response.success && response.data) {
        const { accessToken, user: userData } = response.data;
        localStorage.setItem('admin_token', accessToken);
        localStorage.setItem('admin_user', JSON.stringify(userData));
        setUser(userData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      // Backend çalışmıyorsa mock login
      if (email === 'admin@okuz.ai' && password === 'admin123') {
        const mockUser = {
          id: '1',
          email: 'admin@okuz.ai',
          name: 'Admin User',
          role: 'admin',
          roles: ['admin'],
          permissions: ['admin:read', 'admin:write', 'users:read', 'users:write']
        };
        localStorage.setItem('admin_token', 'mock-token');
        localStorage.setItem('admin_user', JSON.stringify(mockUser));
        setUser(mockUser);
        return true;
      } else if (email === 'teacher@okuz.ai' && password === 'teacher123') {
        const mockUser = {
          id: '2',
          email: 'teacher@okuz.ai',
          name: 'Teacher User',
          role: 'teacher',
          roles: ['teacher'],
          permissions: ['teacher:read', 'teacher:write']
        };
        localStorage.setItem('admin_token', 'mock-token');
        localStorage.setItem('admin_user', JSON.stringify(mockUser));
        setUser(mockUser);
        return true;
      } else if (email === 'student@okuz.ai' && password === 'student123') {
        const mockUser = {
          id: '3',
          email: 'student@okuz.ai',
          name: 'Student User',
          role: 'student',
          roles: ['student'],
          permissions: ['student:read']
        };
        localStorage.setItem('admin_token', 'mock-token');
        localStorage.setItem('admin_user', JSON.stringify(mockUser));
        setUser(mockUser);
        return true;
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await apiService.register(name, email, password, role);
      
      if (response.success) {
        // Kayıt başarılı, otomatik giriş yap
        return await login(email, password);
      }
      return false;
    } catch (error) {
      console.error('Register failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setUser(null);
    // Backend'e logout isteği gönder (opsiyonel)
    apiService.logout().catch(console.error);
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) return false;

      const response = await apiService.refreshToken(refreshToken);
      if (response.success && response.data) {
        const { accessToken } = response.data;
        localStorage.setItem('admin_token', accessToken);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      return false;
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    // Eğer user.permissions yoksa veya boşsa, role bazlı izin ver
    if (!user.permissions || user.permissions.length === 0) {
      // Admin role'ü varsa tüm izinleri ver
      if (user.role?.toLowerCase() === 'admin') return true;
      return false;
    }
    return user.permissions.includes(permission);
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    // Eğer user.roles yoksa veya boşsa, user.role'den kontrol et
    if (!user.roles || user.roles.length === 0) {
      return user.role?.toLowerCase() === role.toLowerCase();
    }
    return user.roles.some(r => r.toLowerCase() === role.toLowerCase());
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
    hasPermission,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
