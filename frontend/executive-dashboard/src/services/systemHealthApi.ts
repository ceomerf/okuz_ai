import axios, { AxiosInstance } from 'axios';

// Types
export interface SystemHealth {
  database: 'OK' | 'ERROR' | 'WARNING';
  redis: 'OK' | 'ERROR' | 'WARNING';
  api: 'OK' | 'ERROR' | 'WARNING';
  storage: 'OK' | 'ERROR' | 'WARNING';
  overall: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  timestamp: string;
  uptime: number;
  version: string;
}

export interface SystemMetrics {
  activeUsers: number;
  requestsLastHour: number;
  errorRate: number;
  responseTime: number;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  timestamp: string;
}

export interface ServiceStatus {
  name: string;
  status: 'OK' | 'ERROR' | 'WARNING' | 'UNKNOWN';
  responseTime?: number;
  lastCheck: string;
  description?: string;
  dependencies?: string[];
}

export interface Alert {
  id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  service: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  metadata?: any;
}

export interface PerformanceData {
  timestamp: string;
  responseTime: number;
  requests: number;
  errors: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class SystemHealthApiService {
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

  // Sistem sağlığını getir
  async getSystemHealth(): Promise<ApiResponse<SystemHealth>> {
    try {
      const response = await this.api.get('/system/health');
      return response.data;
    } catch (error) {
      console.error('Sistem sağlığı getirilemedi:', error);
      throw new Error('Sistem sağlığı yüklenirken hata oluştu');
    }
  }

  // Sistem metriklerini getir
  async getSystemMetrics(): Promise<ApiResponse<SystemMetrics>> {
    try {
      const response = await this.api.get('/system/metrics');
      return response.data;
    } catch (error) {
      console.error('Sistem metrikleri getirilemedi:', error);
      throw new Error('Sistem metrikleri yüklenirken hata oluştu');
    }
  }

  // Servis durumlarını getir
  async getServiceStatus(): Promise<ApiResponse<ServiceStatus[]>> {
    try {
      const response = await this.api.get('/system/services');
      return response.data;
    } catch (error) {
      console.error('Servis durumları getirilemedi:', error);
      throw new Error('Servis durumları yüklenirken hata oluştu');
    }
  }

  // Aktif uyarıları getir
  async getActiveAlerts(): Promise<ApiResponse<Alert[]>> {
    try {
      const response = await this.api.get('/system/alerts');
      return response.data;
    } catch (error) {
      console.error('Aktif uyarılar getirilemedi:', error);
      throw new Error('Aktif uyarılar yüklenirken hata oluştu');
    }
  }

  // Performans verilerini getir
  async getPerformanceData(period: '1h' | '24h' | '7d' | '30d'): Promise<ApiResponse<PerformanceData[]>> {
    try {
      const response = await this.api.get('/system/performance', {
        params: { period }
      });
      return response.data;
    } catch (error) {
      console.error('Performans verileri getirilemedi:', error);
      throw new Error('Performans verileri yüklenirken hata oluştu');
    }
  }

  // Sistem loglarını getir
  async getSystemLogs(page: number = 1, limit: number = 50, filters?: {
    level?: string;
    service?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ApiResponse<{
    logs: Array<{
      id: string;
      level: string;
      message: string;
      service: string;
      timestamp: string;
      metadata?: any;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>> {
    try {
      const response = await this.api.get('/system/logs', {
        params: { page, limit, ...filters }
      });
      return response.data;
    } catch (error) {
      console.error('Sistem logları getirilemedi:', error);
      throw new Error('Sistem logları yüklenirken hata oluştu');
    }
  }

  // Uyarı oluştur
  async createAlert(alertData: {
    severity: string;
    title: string;
    description: string;
    service: string;
    metadata?: any;
  }): Promise<ApiResponse<Alert>> {
    try {
      const response = await this.api.post('/system/alerts', alertData);
      return response.data;
    } catch (error) {
      console.error('Uyarı oluşturulamadı:', error);
      throw new Error('Uyarı oluşturulurken hata oluştu');
    }
  }

  // Uyarı çöz
  async resolveAlert(alertId: string): Promise<ApiResponse<Alert>> {
    try {
      const response = await this.api.patch(`/system/alerts/${alertId}/resolve`);
      return response.data;
    } catch (error) {
      console.error('Uyarı çözülemedi:', error);
      throw new Error('Uyarı çözülürken hata oluştu');
    }
  }

  // Sistem yeniden başlat
  async restartSystem(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/system/restart');
      return response.data;
    } catch (error) {
      console.error('Sistem yeniden başlatılamadı:', error);
      throw new Error('Sistem yeniden başlatılırken hata oluştu');
    }
  }

  // Servis yeniden başlat
  async restartService(serviceName: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post(`/system/services/${serviceName}/restart`);
      return response.data;
    } catch (error) {
      console.error('Servis yeniden başlatılamadı:', error);
      throw new Error('Servis yeniden başlatılırken hata oluştu');
    }
  }

  // Sistem temizliği
  async performSystemCleanup(): Promise<ApiResponse<{
    cleanedFiles: number;
    freedSpace: number;
    cleanedLogs: number;
  }>> {
    try {
      const response = await this.api.post('/system/cleanup');
      return response.data;
    } catch (error) {
      console.error('Sistem temizliği yapılamadı:', error);
      throw new Error('Sistem temizliği yapılırken hata oluştu');
    }
  }

  // Backup oluştur
  async createBackup(backupData: {
    name: string;
    description?: string;
    includeLogs?: boolean;
    includeDatabase?: boolean;
    includeFiles?: boolean;
  }): Promise<ApiResponse<{
    backupId: string;
    downloadUrl: string;
    size: number;
    createdAt: string;
  }>> {
    try {
      const response = await this.api.post('/system/backup', backupData);
      return response.data;
    } catch (error) {
      console.error('Backup oluşturulamadı:', error);
      throw new Error('Backup oluşturulurken hata oluştu');
    }
  }

  // Backup listesi
  async getBackups(): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    size: number;
    createdAt: string;
    downloadUrl: string;
  }>>> {
    try {
      const response = await this.api.get('/system/backups');
      return response.data;
    } catch (error) {
      console.error('Backup listesi getirilemedi:', error);
      throw new Error('Backup listesi yüklenirken hata oluştu');
    }
  }

  // Sistem konfigürasyonu
  async getSystemConfig(): Promise<ApiResponse<{
    environment: string;
    version: string;
    nodeVersion: string;
    platform: string;
    uptime: number;
    memory: {
      total: number;
      free: number;
      used: number;
    };
    cpu: {
      cores: number;
      usage: number;
    };
  }>> {
    try {
      const response = await this.api.get('/system/config');
      return response.data;
    } catch (error) {
      console.error('Sistem konfigürasyonu getirilemedi:', error);
      throw new Error('Sistem konfigürasyonu yüklenirken hata oluştu');
    }
  }

  // Export data
  async exportSystemData(format: 'csv' | 'excel' | 'pdf', type: 'logs' | 'metrics' | 'alerts', filters?: any): Promise<Blob> {
    try {
      const response = await this.api.get('/system/export', {
        params: { format, type, ...filters },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Veri dışa aktarılamadı:', error);
      throw new Error('Veri dışa aktarılırken hata oluştu');
    }
  }
}

export const systemHealthApi = new SystemHealthApiService();
