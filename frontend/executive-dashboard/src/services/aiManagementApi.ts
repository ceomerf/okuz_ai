import axios, { AxiosInstance } from 'axios';

// Types
export interface AIStats {
  totalRequests: number;
  totalCost: number;
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  activeModels: number;
  totalTokens: number;
  costPerToken: number;
  requestsLast24h: number;
  requestsLast7d: number;
  topModels: Array<{
    name: string;
    requests: number;
    cost: number;
  }>;
}

export interface AILog {
  id: string;
  userId: string;
  model: string;
  prompt: string;
  response: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
  responseTime: number;
  status: 'SUCCESS' | 'ERROR' | 'TIMEOUT';
  error?: string;
  metadata?: any;
  createdAt: string;
}

export interface AIService {
  name: string;
  totalRequests: number;
  totalCost: number;
  averageResponseTime: number;
  successRate: number;
  lastUsed: string;
  isActive: boolean;
}

export interface AIModel {
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'DEPRECATED';
  lastUsed: string;
  successRate: number;
  averageResponseTime: number;
  totalRequests: number;
  totalCost: number;
  maxTokens: number;
  costPerToken: number;
  description?: string;
  version?: string;
}

export interface AIUsage {
  date: string;
  requests: number;
  cost: number;
  tokens: number;
  averageResponseTime: number;
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

class AIManagementApiService {
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

  // AI istatistiklerini getir
  async getAIStats(): Promise<ApiResponse<AIStats>> {
    try {
      // Backend: AIManagementController -> GET /ai/statistics
      const response = await this.api.get('/ai/statistics');
      return response.data;
    } catch (error) {
      console.error('AI istatistikleri getirilemedi:', error);
      throw new Error('AI istatistikleri yüklenirken hata oluştu');
    }
  }

  // AI loglarını getir
  async getAILogs(
    page: number = 1,
    limit: number = 10,
    filters?: {
      // frontend'den gelebilecek muhtemel alanlar
      model?: string;
      status?: string;
      userId?: string;
      dateFrom?: string;
      dateTo?: string;
      level?: string;
      service?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<ApiResponse<PaginationResponse<AILog>>> {
    try {
      // Backend: AIManagementController -> GET /ai/logs
      // Parametre uyarlaması
      const params: Record<string, any> = {
        page,
        limit,
      };
      if (filters?.level) params.level = filters.level;
      // frontend 'model' veya 'service' geçebilir; backend 'service' bekliyor
      if (filters?.service) params.service = filters.service;
      if (!filters?.service && filters?.model) params.service = filters.model;
      // tarih alanları uyumu
      if (filters?.startDate) params.startDate = filters.startDate;
      if (filters?.endDate) params.endDate = filters.endDate;
      if (filters?.dateFrom && !filters?.startDate) params.startDate = filters.dateFrom;
      if (filters?.dateTo && !filters?.endDate) params.endDate = filters.dateTo;

      const response = await this.api.get('/ai/logs', { params });
      return response.data;
    } catch (error) {
      console.error('AI logları getirilemedi:', error);
      throw new Error('AI logları yüklenirken hata oluştu');
    }
  }

  // AI servislerini getir
  async getAIServices(): Promise<ApiResponse<AIService[]>> {
    try {
      const response = await this.api.get('/ai/services');
      return response.data;
    } catch (error) {
      console.error('AI servisleri getirilemedi:', error);
      throw new Error('AI servisleri yüklenirken hata oluştu');
    }
  }

  // AI modellerini getir
  async getAIModels(): Promise<ApiResponse<AIModel[]>> {
    try {
      // Backend: AIManagementController -> GET /ai/model-status
      const response = await this.api.get('/ai/model-status');
      return response.data;
    } catch (error) {
      console.error('AI modelleri getirilemedi:', error);
      throw new Error('AI modelleri yüklenirken hata oluştu');
    }
  }

  // AI metrikleri (AIController -> GET /ai/metrics?timeRange=...)
  async getAIMetrics(timeRange: '24h' | '7d' | '30d' | '90d'): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/ai/metrics', { params: { timeRange } });
      return response.data;
    } catch (error) {
      console.error('AI metrikleri getirilemedi:', error);
      throw new Error('AI metrikleri yüklenirken hata oluştu');
    }
  }

  // AI kullanım istatistikleri (AIController -> GET /ai/usage/statistics)
  async getAIUsage(timeRange: '24h' | '7d' | '30d' | '90d'): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/ai/usage/statistics', { params: { timeRange } });
      return response.data;
    } catch (error) {
      console.error('AI kullanım istatistikleri getirilemedi:', error);
      throw new Error('AI kullanım istatistikleri yüklenirken hata oluştu');
    }
  }

  // Model durumunu güncelle
  async updateModelStatus(modelName: string, status: string): Promise<ApiResponse<AIModel>> {
    try {
      // Backend'de model durumu güncelleme endpoint'i mevcut değil
      throw new Error('Model güncelleme endpointi backend tarafında tanımlı değil');
    } catch (error) {
      console.error('Model durumu güncellenemedi:', error);
      throw new Error('Model durumu güncellenirken hata oluştu');
    }
  }

  // Model ekle
  async addModel(modelData: {
    name: string;
    description?: string;
    version?: string;
    maxTokens: number;
    costPerToken: number;
  }): Promise<ApiResponse<AIModel>> {
    try {
      const response = await this.api.post('/ai/models', modelData);
      return response.data;
    } catch (error) {
      console.error('Model eklenemedi:', error);
      throw new Error('Model eklenirken hata oluştu');
    }
  }

  // Model sil
  async deleteModel(modelName: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.delete(`/ai/models/${modelName}`);
      return response.data;
    } catch (error) {
      console.error('Model silinemedi:', error);
      throw new Error('Model silinirken hata oluştu');
    }
  }

  // Servis durumunu güncelle
  async updateServiceStatus(serviceName: string, isActive: boolean): Promise<ApiResponse<AIService>> {
    try {
      const response = await this.api.patch(`/ai/services/${serviceName}/status`, { isActive });
      return response.data;
    } catch (error) {
      console.error('Servis durumu güncellenemedi:', error);
      throw new Error('Servis durumu güncellenirken hata oluştu');
    }
  }

  // AI isteği gönder
  async sendAIRequest(requestData: {
    model: string;
    prompt: string;
    maxTokens?: number;
    temperature?: number;
    userId?: string;
  }): Promise<ApiResponse<{
    response: string;
    tokens: number;
    cost: number;
    responseTime: number;
  }>> {
    try {
      // Backend: AIController -> POST /ai/generate
      const response = await this.api.post('/ai/generate', requestData);
      return response.data;
    } catch (error) {
      console.error('AI isteği gönderilemedi:', error);
      throw new Error('AI isteği gönderilirken hata oluştu');
    }
  }

  // Log detaylarını getir
  async getLogDetails(logId: string): Promise<ApiResponse<AILog>> {
    try {
      const response = await this.api.get(`/ai/logs/${logId}`);
      return response.data;
    } catch (error) {
      console.error('Log detayları getirilemedi:', error);
      throw new Error('Log detayları yüklenirken hata oluştu');
    }
  }

  // Hata analizi
  async getErrorAnalysis(period: '24h' | '7d' | '30d'): Promise<ApiResponse<{
    totalErrors: number;
    errorRate: number;
    topErrors: Array<{
      error: string;
      count: number;
      percentage: number;
    }>;
    errorTrend: Array<{
      date: string;
      errors: number;
    }>;
  }>> {
    try {
      // Backend: AIManagementController -> GET /ai/errors
      const response = await this.api.get('/ai/errors', {
        params: { period }
      });
      return response.data;
    } catch (error) {
      console.error('Hata analizi getirilemedi:', error);
      throw new Error('Hata analizi yüklenirken hata oluştu');
    }
  }

  // Performans analizi
  async getPerformanceAnalysis(period: '24h' | '7d' | '30d'): Promise<ApiResponse<{
    averageResponseTime: number;
    responseTimeTrend: Array<{
      date: string;
      averageTime: number;
    }>;
    throughput: Array<{
      date: string;
      requests: number;
    }>;
    costAnalysis: Array<{
      model: string;
      cost: number;
      percentage: number;
    }>;
  }>> {
    try {
      // Backend: AIManagementController -> GET /ai/performance
      const response = await this.api.get('/ai/performance', { params: { period } });
      return response.data;
    } catch (error) {
      console.error('Performans analizi getirilemedi:', error);
      throw new Error('Performans analizi yüklenirken hata oluştu');
    }
  }

  // Export data
  async exportAIData(format: 'csv' | 'excel' | 'pdf', type: 'logs' | 'usage' | 'stats', filters?: any): Promise<Blob> {
    try {
      const response = await this.api.get('/ai/export', {
        params: { format, type, ...filters },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Veri dışa aktarılamadı:', error);
      throw new Error('Veri dışa aktarılırken hata oluştu');
    }
  }

  // Toplu işlemler
  async bulkUpdateModels(modelNames: string[], updateData: {
    status?: string;
    costPerToken?: number;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/ai/models/bulk-update', {
        modelNames,
        updateData
      });
      return response.data;
    } catch (error) {
      console.error('Toplu güncelleme başarısız:', error);
      throw new Error('Toplu güncelleme yapılırken hata oluştu');
    }
  }
}

export const aiManagementApi = new AIManagementApiService();
