import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { DashboardData, HealthCheck, ApiResponse } from '../types/dashboard';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Backend API URL'ini buraya yaz
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - JWT token ekle
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
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
          // Token süresi dolmuş, login sayfasına yönlendir
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Dashboard verilerini al
  async getDashboard(): Promise<DashboardData> {
    try {
      const response: AxiosResponse<DashboardData> = await this.api.get('/api/executive/dashboard');
      return response.data;
    } catch (error) {
      console.error('Dashboard verileri alınamadı:', error);
      throw error;
    }
  }

  // Hızlı durum kontrolü
  async getHealthCheck(): Promise<HealthCheck> {
    try {
      const response: AxiosResponse<HealthCheck> = await this.api.get('/api/executive/health-check');
      return response.data;
    } catch (error) {
      console.error('Sağlık kontrolü yapılamadı:', error);
      throw error;
    }
  }

  // Hızlı aksiyon çalıştır
  async executeAction(action: string, confirm: boolean = false): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await this.api.post('/api/executive/action', {
        action,
        confirm,
      });
      return response.data;
    } catch (error) {
      console.error('Aksiyon çalıştırılamadı:', error);
      throw error;
    }
  }

  // Günlük rapor al
  async getDailyReport(): Promise<any> {
    try {
      const response = await this.api.get('/api/executive/daily-report');
      return response.data;
    } catch (error) {
      console.error('Günlük rapor alınamadı:', error);
      throw error;
    }
  }

  // Haftalık rapor al
  async getWeeklyReport(): Promise<any> {
    try {
      const response = await this.api.get('/api/executive/weekly-report');
      return response.data;
    } catch (error) {
      console.error('Haftalık rapor alınamadı:', error);
      throw error;
    }
  }

  // Otomatik yönetim kurallarını al
  async getAutoManagementRules(): Promise<any> {
    try {
      const response = await this.api.get('/api/executive/rules');
      return response.data;
    } catch (error) {
      console.error('Otomatik yönetim kuralları alınamadı:', error);
      throw error;
    }
  }

  // Kuralı etkinleştir/devre dışı bırak
  async toggleRule(ruleId: string, enabled: boolean): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await this.api.post('/api/executive/rules/toggle', {
        ruleId,
        enabled,
      });
      return response.data;
    } catch (error) {
      console.error('Kural değiştirilemedi:', error);
      throw error;
    }
  }

  // Alarmları al
  async getAlerts(): Promise<any> {
    try {
      const response = await this.api.get('/api/executive/alerts');
      return response.data;
    } catch (error) {
      console.error('Alarmlar alınamadı:', error);
      throw error;
    }
  }

  // KPI dashboard al
  async getKPIDashboard(): Promise<any> {
    try {
      const response = await this.api.get('/api/executive/kpi-dashboard');
      return response.data;
    } catch (error) {
      console.error('KPI dashboard alınamadı:', error);
      throw error;
    }
  }
}

// Singleton instance
export const apiService = new ApiService();
export default apiService;
