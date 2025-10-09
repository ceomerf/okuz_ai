import axios, { AxiosInstance } from 'axios';

export interface AuditLog {
  id: string;
  actorUserId: string;
  actionType: string;
  targetEntity: string;
  targetId?: string;
  timestamp: string;
  ipAddress?: string;
  prev?: Record<string, unknown>;
  next?: Record<string, unknown>;
  correlationId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface Pagination<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number };
}

class AuditLogApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
    this.api = axios.create({ baseURL: this.baseURL, timeout: 30000, headers: { 'Content-Type': 'application/json' } });
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('admin_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  async getLogs(page = 1, limit = 20, filters?: { actorUserId?: string; actionType?: string; targetEntity?: string; from?: string; to?: string }): Promise<ApiResponse<Pagination<AuditLog>>> {
    const res = await this.api.get('/api/audit/logs', { params: { page, limit, ...filters } });
    return res.data;
  }

  async exportLogs(format: 'csv' | 'json', filters?: any): Promise<Blob> {
    const res = await this.api.get('/api/audit/logs/export', { params: { format, ...filters }, responseType: 'blob' });
    return res.data;
  }

  async getRelated(correlationId: string): Promise<ApiResponse<AuditLog[]>> {
    const res = await this.api.get(`/api/audit/logs/related/${correlationId}`);
    return res.data;
  }
}

export const auditLogApi = new AuditLogApiService();


