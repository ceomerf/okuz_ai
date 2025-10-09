import axios, { AxiosInstance } from 'axios';

export interface Role { id: string; name: string; description?: string }
export interface Permission { id: string; key: string; description?: string }

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class RbacManagementApiService {
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

  async getRoles(): Promise<ApiResponse<Role[]>> {
    const res = await this.api.get('/api/rbac/roles');
    return res.data;
  }

  async createRole(payload: { name: string; description?: string }): Promise<ApiResponse<Role>> {
    const res = await this.api.post('/api/rbac/roles', payload);
    return res.data;
  }

  async deleteRole(id: string): Promise<ApiResponse<any>> {
    const res = await this.api.delete(`/api/rbac/roles/${id}`);
    return res.data;
  }

  async getPermissions(): Promise<ApiResponse<Permission[]>> {
    const res = await this.api.get('/api/rbac/permissions');
    return res.data;
  }

  async assignRolePermissions(roleId: string, permissionIds: string[]): Promise<ApiResponse<any>> {
    const res = await this.api.post(`/api/rbac/roles/${roleId}/permissions`, { permissionIds });
    return res.data;
  }

  async getUserRoles(userId: string): Promise<ApiResponse<Role[]>> {
    const res = await this.api.get(`/api/rbac/users/${userId}/roles`);
    return res.data;
  }

  async assignUserRoles(userId: string, roleIds: string[]): Promise<ApiResponse<any>> {
    const res = await this.api.post(`/api/rbac/users/${userId}/roles`, { roleIds });
    return res.data;
  }

  async simulateAccess(roleIds: string[]): Promise<ApiResponse<{ visibleSections: string[] }>> {
    const res = await this.api.post('/api/rbac/simulate', { roleIds });
    return res.data;
  }

  async grantTemporaryAccess(userId: string, grant: { roleId?: string; permissionId?: string; expiresAt: string }): Promise<ApiResponse<any>> {
    const res = await this.api.post(`/api/rbac/users/${userId}/temporary-access`, grant);
    return res.data;
  }
}

export const rbacManagementApi = new RbacManagementApiService();


