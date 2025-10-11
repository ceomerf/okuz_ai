import axios, { AxiosInstance } from 'axios';

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'COACH' | 'STUDENT' | 'PARENT' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  createdAt: string;
  lastLoginAt?: string;
  lastActiveAt?: string;
  profile?: {
    phone?: string;
    address?: string;
    avatar?: string;
    bio?: string;
  };
  permissions?: string[];
  subscription?: {
    plan: string;
    status: string;
    expiresAt: string;
  };
  activity?: {
    totalLogins: number;
    lastLoginIp: string;
    totalSessions: number;
  };
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  metadata?: any;
  createdAt: string;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  suspendedUsers: number;
  pendingUsers: number;
  roleDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  lastWeekRegistrations: number;
  lastWeekLogins: number;
  averageSessionDuration: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

class UserManagementApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - JWT token ekle
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken') || localStorage.getItem('admin_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - Hata yönetimi
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('admin_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Kullanıcı listesini getir
  async getUsers(page: number = 1, limit: number = 10, search?: string, filters?: {
    role?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<PaginationResponse<User>>> {
    try {
      // Backend: UsersManagementController -> GET /api/users-management
      const response = await this.api.get('/api/users-management', {
        params: { page, limit, search, ...filters }
      });
      return response.data;
    } catch (error) {
      console.error('Kullanıcılar getirilemedi:', error);
      throw new Error('Kullanıcılar yüklenirken hata oluştu');
    }
  }

  // Kullanıcı detaylarını getir
  async getUserById(id: string): Promise<ApiResponse<User>> {
    try {
      const response = await this.api.get(`/api/users-management/${id}`);
      return response.data;
    } catch (error) {
      console.error('Kullanıcı detayları getirilemedi:', error);
      throw new Error('Kullanıcı detayları yüklenirken hata oluştu');
    }
  }

  // Kullanıcı aktivitelerini getir
  async getUserActivities(userId: string, page: number = 1, limit: number = 10): Promise<ApiResponse<PaginationResponse<UserActivity>>> {
    try {
      const response = await this.api.get(`/api/users-management/${userId}/activity`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Kullanıcı aktiviteleri getirilemedi:', error);
      throw new Error('Kullanıcı aktiviteleri yüklenirken hata oluştu');
    }
  }

  // Kullanıcı istatistiklerini getir
  async getUserStats(): Promise<ApiResponse<UserStats>> {
    try {
      const response = await this.api.get('/users/stats');
      return response.data;
    } catch (error) {
      console.error('Kullanıcı istatistikleri getirilemedi:', error);
      throw new Error('Kullanıcı istatistikleri yüklenirken hata oluştu');
    }
  }

  // Kullanıcı oluştur
  async createUser(userData: {
    name: string;
    email: string;
    role: string;
    password?: string;
    profile?: {
      phone?: string;
      address?: string;
      bio?: string;
    };
    permissions?: string[];
  }): Promise<ApiResponse<User>> {
    try {
      const response = await this.api.post('/users', userData);
      return response.data;
    } catch (error) {
      console.error('Kullanıcı oluşturulamadı:', error);
      throw new Error('Kullanıcı oluşturulurken hata oluştu');
    }
  }

  // Kullanıcı güncelle
  async updateUser(id: string, updateData: {
    name?: string;
    email?: string;
    role?: string;
    status?: string;
    profile?: {
      phone?: string;
      address?: string;
      bio?: string;
    };
    permissions?: string[];
  }): Promise<ApiResponse<User>> {
    try {
      const response = await this.api.put(`/users/${id}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Kullanıcı güncellenemedi:', error);
      throw new Error('Kullanıcı güncellenirken hata oluştu');
    }
  }

  // Kullanıcı sil
  async deleteUser(id: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.delete(`/users/${id}`);
      return response.data;
    } catch (error) {
      console.error('Kullanıcı silinemedi:', error);
      throw new Error('Kullanıcı silinirken hata oluştu');
    }
  }

  // Kullanıcı durumunu değiştir
  async updateUserStatus(id: string, status: 'active' | 'inactive'): Promise<ApiResponse<User>> {
    try {
      const response = await this.api.put(`/api/users-management/${id}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Kullanıcı durumu güncellenemedi:', error);
      throw new Error('Kullanıcı durumu güncellenirken hata oluştu');
    }
  }

  // Kullanıcı rolünü değiştir
  async updateUserRole(id: string, role: string, permissions?: string[]): Promise<ApiResponse<User>> {
    try {
      // Backend exposes roles update as PUT /api/users-management/:id/roles with roles[]
      const response = await this.api.put(`/api/users-management/${id}/roles`, { roles: [role], permissions });
      return response.data;
    } catch (error) {
      console.error('Kullanıcı rolü güncellenemedi:', error);
      throw new Error('Kullanıcı rolü güncellenirken hata oluştu');
    }
  }

  // Şifre sıfırla
  async resetPassword(id: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post(`/users/${id}/reset-password`);
      return response.data;
    } catch (error) {
      console.error('Şifre sıfırlanamadı:', error);
      throw new Error('Şifre sıfırlanırken hata oluştu');
    }
  }

  // Kullanıcıyı askıya al
  async suspendUser(id: string, reason: string, duration?: number): Promise<ApiResponse<User>> {
    try {
      // Not defined in management controller; leaving as-is or implement later
      const response = await this.api.post(`/users/${id}/suspend`, { reason, duration });
      return response.data;
    } catch (error) {
      console.error('Kullanıcı askıya alınamadı:', error);
      throw new Error('Kullanıcı askıya alınırken hata oluştu');
    }
  }

  // Kullanıcı askıyı kaldır
  async unsuspendUser(id: string): Promise<ApiResponse<User>> {
    try {
      // Not defined in management controller; leaving as-is or implement later
      const response = await this.api.post(`/users/${id}/unsuspend`);
      return response.data;
    } catch (error) {
      console.error('Kullanıcı askısı kaldırılamadı:', error);
      throw new Error('Kullanıcı askısı kaldırılırken hata oluştu');
    }
  }

  // Toplu işlemler
  async bulkUpdateUsers(userIds: string[], updateData: {
    status?: 'active' | 'inactive';
    role?: string;
    permissions?: string[];
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/api/users-management/bulk-actions', {
        action: updateData.role ? 'assign-role' : (updateData.status === 'active' ? 'activate' : 'deactivate'),
        userIds,
        role: updateData.role,
      });
      return response.data;
    } catch (error) {
      console.error('Toplu güncelleme başarısız:', error);
      throw new Error('Toplu güncelleme yapılırken hata oluştu');
    }
  }

  // Toplu silme
  async bulkDeleteUsers(userIds: string[]): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/api/users-management/bulk-actions', { action: 'delete', userIds });
      return response.data;
    } catch (error) {
      console.error('Toplu silme başarısız:', error);
      throw new Error('Toplu silme yapılırken hata oluştu');
    }
  }

  // Export data
  async exportUsers(format: 'csv' | 'excel' | 'pdf', filters?: any): Promise<Blob> {
    try {
      const response = await this.api.get('/users/export', {
        params: { format, ...filters },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Veri dışa aktarılamadı:', error);
      throw new Error('Veri dışa aktarılırken hata oluştu');
    }
  }

  // Aktivite logları
  async getAvailableRoles(): Promise<ApiResponse<string[]>> {
    try {
      const response = await this.api.get('/api/users-management/roles/available');
      return response.data;
    } catch (error) {
      console.error('Roller getirilemedi:', error);
      throw new Error('Roller yüklenirken hata oluştu');
    }
  }
}

export const userManagementApi = new UserManagementApiService();
