import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api.service';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
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
      const token = localStorage.getItem('admin_token');
      if (token) {
        try {
          const response = await apiService.getProfile();
          if (response.success && response.data) {
            setUser(response.data);
          } else {
            localStorage.removeItem('admin_token');
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('admin_token');
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
        setUser(userData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
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
    return user.permissions.includes(permission);
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.roles.includes(role);
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
