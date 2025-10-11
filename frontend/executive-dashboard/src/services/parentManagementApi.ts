import axios, { AxiosInstance } from 'axios';

// Types
export interface Parent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  createdAt: string;
  lastActiveAt?: string;
  isActive: boolean;
  children: Array<{
    id: string;
    name: string;
    grade: number;
    field: string;
    email: string;
  }>;
  subscription?: {
    plan: string;
    status: string;
    expiresAt: string;
  };
}

export interface ParentReport {
  id: string;
  parentId: string;
  studentId: string;
  weekStart: string;
  weekEnd: string;
  totalStudyTime: number;
  completedSessions: number;
  averagePerformance: number;
  attendanceRate: number;
  goals: string[];
  achievements: string[];
  recommendations: string[];
  createdAt: string;
  student: {
    name: string;
    grade: number;
    field: string;
  };
}

export interface ParentActivity {
  id: string;
  parentId: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export interface ParentStats {
  totalParents: number;
  activeParents: number;
  inactiveParents: number;
  totalChildren: number;
  averageChildrenPerParent: number;
  subscriptionStats: {
    premium: number;
    basic: number;
    free: number;
  };
  engagementRate: number;
  lastWeekActivity: number;
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

class ParentManagementApiService {
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

  // Veli listesini getir
  async getParents(page: number = 1, limit: number = 10, search?: string, filters?: {
    isActive?: boolean;
    subscription?: string;
    hasChildren?: boolean;
  }): Promise<ApiResponse<PaginationResponse<Parent>>> {
    try {
      const response = await this.api.get('/parents', {
        params: { page, limit, search, ...filters }
      });
      return response.data;
    } catch (error) {
      console.error('Veliler getirilemedi:', error);
      throw new Error('Veliler yüklenirken hata oluştu');
    }
  }

  // Veli detaylarını getir
  async getParentById(id: string): Promise<ApiResponse<Parent>> {
    try {
      const response = await this.api.get(`/parents/${id}`);
      return response.data;
    } catch (error) {
      console.error('Veli detayları getirilemedi:', error);
      throw new Error('Veli detayları yüklenirken hata oluştu');
    }
  }

  // Veli raporlarını getir
  async getParentReports(parentId: string, page: number = 1, limit: number = 10): Promise<ApiResponse<PaginationResponse<ParentReport>>> {
    try {
      const response = await this.api.get(`/parents/${parentId}/reports`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Veli raporları getirilemedi:', error);
      throw new Error('Veli raporları yüklenirken hata oluştu');
    }
  }

  // Veli aktivitelerini getir
  async getParentActivities(parentId: string, page: number = 1, limit: number = 10): Promise<ApiResponse<PaginationResponse<ParentActivity>>> {
    try {
      const response = await this.api.get(`/parents/${parentId}/activities`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Veli aktiviteleri getirilemedi:', error);
      throw new Error('Veli aktiviteleri yüklenirken hata oluştu');
    }
  }

  // Veli istatistiklerini getir
  async getParentStats(): Promise<ApiResponse<ParentStats>> {
    try {
      const response = await this.api.get('/parents/stats');
      return response.data;
    } catch (error) {
      console.error('Veli istatistikleri getirilemedi:', error);
      throw new Error('Veli istatistikleri yüklenirken hata oluştu');
    }
  }

  // Veli oluştur
  async createParent(parentData: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    children?: string[];
  }): Promise<ApiResponse<Parent>> {
    try {
      const response = await this.api.post('/parents', parentData);
      return response.data;
    } catch (error) {
      console.error('Veli oluşturulamadı:', error);
      throw new Error('Veli oluşturulurken hata oluştu');
    }
  }

  // Veli güncelle
  async updateParent(id: string, updateData: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<Parent>> {
    try {
      const response = await this.api.put(`/parents/${id}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Veli güncellenemedi:', error);
      throw new Error('Veli güncellenirken hata oluştu');
    }
  }

  // Veli sil
  async deleteParent(id: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.delete(`/parents/${id}`);
      return response.data;
    } catch (error) {
      console.error('Veli silinemedi:', error);
      throw new Error('Veli silinirken hata oluştu');
    }
  }

  // Çocuk ata
  async assignChild(parentId: string, childId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post(`/parents/${parentId}/children`, { childId });
      return response.data;
    } catch (error) {
      console.error('Çocuk ataması başarısız:', error);
      throw new Error('Çocuk ataması yapılırken hata oluştu');
    }
  }

  // Çocuk atamasını kaldır
  async unassignChild(parentId: string, childId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.delete(`/parents/${parentId}/children/${childId}`);
      return response.data;
    } catch (error) {
      console.error('Çocuk ataması kaldırılamadı:', error);
      throw new Error('Çocuk ataması kaldırılırken hata oluştu');
    }
  }

  // Rapor oluştur
  async generateReport(parentId: string, studentId: string, weekStart: string): Promise<ApiResponse<ParentReport>> {
    try {
      const response = await this.api.post(`/parents/${parentId}/reports`, {
        studentId,
        weekStart
      });
      return response.data;
    } catch (error) {
      console.error('Rapor oluşturulamadı:', error);
      throw new Error('Rapor oluşturulurken hata oluştu');
    }
  }

  // Toplu işlemler
  async bulkUpdateParents(parentIds: string[], updateData: {
    isActive?: boolean;
    subscription?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/parents/bulk-update', {
        parentIds,
        updateData
      });
      return response.data;
    } catch (error) {
      console.error('Toplu güncelleme başarısız:', error);
      throw new Error('Toplu güncelleme yapılırken hata oluştu');
    }
  }

  // Export data
  async exportParents(format: 'csv' | 'excel' | 'pdf', filters?: any): Promise<Blob> {
    try {
      const response = await this.api.get('/parents/export', {
        params: { format, ...filters },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Veri dışa aktarılamadı:', error);
      throw new Error('Veri dışa aktarılırken hata oluştu');
    }
  }
}

export const parentManagementApi = new ParentManagementApiService();
