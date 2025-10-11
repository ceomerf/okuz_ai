import axios, { AxiosInstance } from 'axios';

export interface Template {
  id: string;
  channel: 'email' | 'inapp' | 'push';
  name: string;
  subject?: string;
  content: string;
}

export interface AudienceSegment { id: string; name: string; query: Record<string, unknown> }

export interface SendResult { sent: number; delivered: number; opened?: number; clicked?: number; bounced?: number }

export interface ApiResponse<T> { success: boolean; data?: T; message?: string; error?: string }

class NotificationsApiService {
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

  async getTemplates(): Promise<ApiResponse<Template[]>> { const res = await this.api.get('/api/notifications/templates'); return res.data; }
  async upsertTemplate(payload: Partial<Template>): Promise<ApiResponse<Template>> { const res = await this.api.post('/api/notifications/templates', payload); return res.data; }
  async deleteTemplate(id: string): Promise<ApiResponse<any>> { const res = await this.api.delete(`/api/notifications/templates/${id}`); return res.data; }

  async getSegments(): Promise<ApiResponse<AudienceSegment[]>> { const res = await this.api.get('/api/notifications/segments'); return res.data; }
  async upsertSegment(payload: Partial<AudienceSegment>): Promise<ApiResponse<AudienceSegment>> { const res = await this.api.post('/api/notifications/segments', payload); return res.data; }
  async deleteSegment(id: string): Promise<ApiResponse<any>> { const res = await this.api.delete(`/api/notifications/segments/${id}`); return res.data; }

  async sendCampaign(payload: { templateIdA: string; templateIdB?: string; segmentId: string; splitPercent?: number }): Promise<ApiResponse<SendResult>> {
    const res = await this.api.post('/api/notifications/campaigns/send', payload); return res.data;
  }

  async getDeliveryReport(campaignId: string): Promise<ApiResponse<SendResult>> { const res = await this.api.get(`/api/notifications/campaigns/${campaignId}/report`); return res.data; }
}

export const notificationsApi = new NotificationsApiService();


