import axios, { AxiosInstance } from 'axios';

export interface FeatureFlag {
  id: string;
  key: string;
  description?: string;
  env: 'development' | 'staging' | 'production';
  enabled: boolean;
  rolloutPercent?: number; // 0-100
  segments?: string[];
}

export interface RemoteConfigKey {
  key: string;
  value: string | number | boolean;
  description?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class FeatureFlagsApiService {
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

  async getFlags(env: string): Promise<ApiResponse<FeatureFlag[]>> {
    const res = await this.api.get('/api/flags', { params: { env } });
    return res.data;
  }

  async upsertFlag(flag: Partial<FeatureFlag>): Promise<ApiResponse<FeatureFlag>> {
    const res = await this.api.post('/api/flags', flag);
    return res.data;
  }

  async killSwitch(key: string, env: string): Promise<ApiResponse<any>> {
    const res = await this.api.post('/api/flags/kill', { key, env });
    return res.data;
  }

  async getConfigs(): Promise<ApiResponse<RemoteConfigKey[]>> {
    const res = await this.api.get('/api/remote-config');
    return res.data;
  }

  async upsertConfig(payload: RemoteConfigKey): Promise<ApiResponse<RemoteConfigKey>> {
    const res = await this.api.post('/api/remote-config', payload);
    return res.data;
  }
}

export const featureFlagsApi = new FeatureFlagsApiService();


