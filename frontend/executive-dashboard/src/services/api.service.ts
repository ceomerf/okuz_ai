// API Service - Gerçek backend verileriyle entegrasyon
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    roles: string[];
    permissions: string[];
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'PARENT' | 'TEACHER' | 'ADMIN';
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  lastActiveAt?: string;
  subscriptionStatus: 'TRIAL' | 'FREE' | 'PREMIUM' | 'FAMILY' | 'CANCELLED';
  grade?: number;
  performance?: number;
  avatar?: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  grade: number;
  subjects: string[];
  performance: number;
  attendance: number;
  lastActivity: string;
  parentEmail?: string;
  status: 'active' | 'inactive' | 'suspended';
  studySessions: number;
  achievements: number;
  streak: number;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  subjects: string[];
  experience: number;
  rating: number;
  students: number;
  status: 'active' | 'inactive';
  lastActiveAt: string;
}

export interface Course {
  id: string;
  title: string;
  subject: string;
  grade: number;
  students: number;
  progress: number;
  status: 'active' | 'inactive' | 'completed';
  startDate: string;
  endDate: string;
  teacherId: string;
  teacherName: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  monthlyRevenue: number;
  systemHealth: number;
  averagePerformance: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

export interface SystemHealth {
  status: 'excellent' | 'good' | 'warning' | 'critical';
  score: number;
  uptime: number;
  responseTime: number;
  errorRate: number;
  lastUpdated: string;
}

export interface Alert {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: string;
  autoFixable: boolean;
  createdAt: string;
}

class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
    this.token = localStorage.getItem('admin_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        data,
        success: true,
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        data: null as T,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data) {
      this.token = response.data.accessToken;
      localStorage.setItem('admin_token', response.data.accessToken);
      if (response.data.refreshToken) {
        localStorage.setItem('refresh_token', response.data.refreshToken);
      }
    }

    return response;
  }

  async register(name: string, email: string, password: string, role?: string): Promise<ApiResponse<any>> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    return this.request('/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async getProfile(): Promise<ApiResponse<any>> {
    return this.request('/auth/me');
  }

  async logout(): Promise<ApiResponse<any>> {
    const response = await this.request('/auth/logout', {
      method: 'POST',
    });
    
    this.token = null;
    localStorage.removeItem('admin_token');
    localStorage.removeItem('refresh_token');
    
    return response;
  }

  // Dashboard Data
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request<DashboardStats>('/executive/dashboard');
  }

  async getSystemHealth(): Promise<ApiResponse<SystemHealth>> {
    return this.request<SystemHealth>('/executive/health-check');
  }

  async getAlerts(): Promise<ApiResponse<Alert[]>> {
    return this.request<Alert[]>('/executive/alerts');
  }

  // Users Management
  async getUsers(page = 1, limit = 20): Promise<ApiResponse<{ users: User[]; total: number; page: number; limit: number }>> {
    return this.request<{ users: User[]; total: number; page: number; limit: number }>(`/api/users?page=${page}&limit=${limit}`);
  }

  async getUserById(id: string): Promise<ApiResponse<User>> {
    return this.request<User>(`/api/users/${id}`);
  }

  async createUser(userData: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Students Management
  async getStudents(page = 1, limit = 20): Promise<ApiResponse<{ students: Student[]; total: number; page: number; limit: number }>> {
    return this.request<{ students: Student[]; total: number; page: number; limit: number }>(`/students?page=${page}&limit=${limit}`);
  }

  async getStudentById(id: string): Promise<ApiResponse<Student>> {
    return this.request<Student>(`/students/${id}`);
  }

  async getStudentProgress(id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/students/${id}/progress`);
  }

  async getStudentDashboard(id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/students/${id}/dashboard`);
  }

  async createStudent(studentData: Partial<Student>): Promise<ApiResponse<Student>> {
    return this.request<Student>('/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
  }

  async updateStudent(id: string, studentData: Partial<Student>): Promise<ApiResponse<Student>> {
    return this.request<Student>(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(studentData),
    });
  }

  async deleteStudent(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/students/${id}`, {
      method: 'DELETE',
    });
  }

  // Teachers Management
  async getTeachers(page = 1, limit = 20): Promise<ApiResponse<{ teachers: Teacher[]; total: number; page: number; limit: number }>> {
    return this.request<{ teachers: Teacher[]; total: number; page: number; limit: number }>(`/teachers?page=${page}&limit=${limit}`);
  }

  async getTeacherById(id: string): Promise<ApiResponse<Teacher>> {
    return this.request<Teacher>(`/teachers/${id}`);
  }

  async createTeacher(teacherData: Partial<Teacher>): Promise<ApiResponse<Teacher>> {
    return this.request<Teacher>('/teachers', {
      method: 'POST',
      body: JSON.stringify(teacherData),
    });
  }

  async updateTeacher(id: string, teacherData: Partial<Teacher>): Promise<ApiResponse<Teacher>> {
    return this.request<Teacher>(`/teachers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(teacherData),
    });
  }

  async deleteTeacher(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/teachers/${id}`, {
      method: 'DELETE',
    });
  }

  // Courses Management
  async getCourses(page = 1, limit = 20): Promise<ApiResponse<{ courses: Course[]; total: number; page: number; limit: number }>> {
    return this.request<{ courses: Course[]; total: number; page: number; limit: number }>(`/courses?page=${page}&limit=${limit}`);
  }

  async getCourseById(id: string): Promise<ApiResponse<Course>> {
    return this.request<Course>(`/courses/${id}`);
  }

  async createCourse(courseData: Partial<Course>): Promise<ApiResponse<Course>> {
    return this.request<Course>('/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
  }

  async updateCourse(id: string, courseData: Partial<Course>): Promise<ApiResponse<Course>> {
    return this.request<Course>(`/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    });
  }

  async deleteCourse(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/courses/${id}`, {
      method: 'DELETE',
    });
  }

  // Analytics
  async getAnalytics(startDate?: string, endDate?: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    return this.request<any>(`/analytics?${params.toString()}`);
  }

  async getUserStats(): Promise<ApiResponse<any>> {
    return this.request<any>('/api/users/stats');
  }

  // System Actions
  async executeQuickAction(action: string, confirm = false): Promise<ApiResponse<any>> {
    return this.request<any>('/executive/quick-action', {
      method: 'POST',
      body: JSON.stringify({ action, confirm }),
    });
  }

  async getDailyReport(): Promise<ApiResponse<any>> {
    return this.request<any>('/executive/daily-report');
  }

  async getWeeklyReport(): Promise<ApiResponse<any>> {
    return this.request<any>('/executive/weekly-report');
  }
}

export const apiService = new ApiService();
export default apiService;
