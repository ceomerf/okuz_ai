import axios, { AxiosInstance } from 'axios';

// Types
export interface Student {
  id: string;
  name: string;
  email: string;
  grade: number;
  field: string;
  school?: string;
  createdAt: string;
  lastActiveAt?: string;
  isActive: boolean;
  performance: {
    average: number;
    trend: 'up' | 'down' | 'stable';
  };
  attendance: {
    rate: number;
    totalDays: number;
    presentDays: number;
  };
  parent?: {
    id: string;
    name: string;
    email: string;
  };
  coach?: {
    id: string;
    name: string;
    email: string;
  };
  subjects: string[];
  goals: string[];
  strengths: string[];
  weaknesses: string[];
}

export interface StudentAcademicHistory {
  studySessions: Array<{
    id: string;
    subject: string;
    topic: string;
    duration: number;
    performance: number;
    startTime: string;
    isCompleted: boolean;
  }>;
  quizResults: Array<{
    id: string;
    subject: string;
    score: number;
    percentage: number;
    completedAt: string;
  }>;
  examResults: Array<{
    id: string;
    subject: string;
    examType: string;
    score: number;
    totalScore: number;
    createdAt: string;
  }>;
  metrics: {
    totalStudyTime: number;
    averagePerformance: number;
    totalSessions: number;
  };
}

export interface CoachNote {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  createdAt: string;
  coach: {
    name: string;
    email: string;
  };
}

export interface StudentStats {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  averagePerformance: number;
  totalStudyTime: number;
  gradeDistribution: Record<number, number>;
  fieldDistribution: Record<string, number>;
  coachAssignmentRate: number;
  parentConnectionRate: number;
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

class StudentManagementApiService {
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

  // Öğrenci listesini getir
  async getStudents(page: number = 1, limit: number = 10, search?: string, filters?: {
    grade?: string;
    field?: string;
    coachId?: string;
    hasParent?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<PaginationResponse<Student>>> {
    try {
      // Backend: StudentsManagementController -> GET /api/students-management
      const response = await this.api.get('/api/students-management', {
        params: { page, limit, search, ...filters }
      });
      return response.data;
    } catch (error) {
      console.error('Öğrenciler getirilemedi:', error);
      throw new Error('Öğrenciler yüklenirken hata oluştu');
    }
  }

  // Öğrenci detaylarını getir
  async getStudentById(id: string): Promise<ApiResponse<Student>> {
    try {
      const response = await this.api.get(`/api/students-management/${id}`);
      return response.data;
    } catch (error) {
      console.error('Öğrenci detayları getirilemedi:', error);
      throw new Error('Öğrenci detayları yüklenirken hata oluştu');
    }
  }

  // Öğrenci akademik geçmişini getir
  async getStudentAcademicHistory(studentId: string, page: number = 1, limit: number = 20): Promise<ApiResponse<StudentAcademicHistory>> {
    try {
      const response = await this.api.get(`/api/students-management/${studentId}/academic-history`, { params: { page, limit } });
      return response.data;
    } catch (error) {
      console.error('Öğrenci akademik geçmişi getirilemedi:', error);
      throw new Error('Öğrenci akademik geçmişi yüklenirken hata oluştu');
    }
  }

  // Koç notlarını getir
  async getCoachNotes(studentId: string, page: number = 1, limit: number = 10): Promise<ApiResponse<PaginationResponse<CoachNote>>> {
    try {
      const response = await this.api.get(`/api/students-management/${studentId}/coach-notes`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Koç notları getirilemedi:', error);
      throw new Error('Koç notları yüklenirken hata oluştu');
    }
  }

  // Öğrenci istatistiklerini getir
  async getStudentStats(): Promise<ApiResponse<StudentStats>> {
    try {
      // Not exposed in controller; leave as-is if backend supports different route, or implement later
      const response = await this.api.get('/students/stats');
      return response.data;
    } catch (error) {
      console.error('Öğrenci istatistikleri getirilemedi:', error);
      throw new Error('Öğrenci istatistikleri yüklenirken hata oluştu');
    }
  }

  // Öğrenci oluştur
  async createStudent(studentData: {
    name: string;
    email: string;
    grade: number;
    field: string;
    school?: string;
    parentId?: string;
    coachId?: string;
    subjects: string[];
    goals: string[];
  }): Promise<ApiResponse<Student>> {
    try {
      const response = await this.api.post('/students', studentData);
      return response.data;
    } catch (error) {
      console.error('Öğrenci oluşturulamadı:', error);
      throw new Error('Öğrenci oluşturulurken hata oluştu');
    }
  }

  // Öğrenci güncelle
  async updateStudent(id: string, updateData: {
    name?: string;
    email?: string;
    grade?: number;
    field?: string;
    school?: string;
    isActive?: boolean;
    subjects?: string[];
    goals?: string[];
    strengths?: string[];
    weaknesses?: string[];
  }): Promise<ApiResponse<Student>> {
    try {
      const response = await this.api.put(`/api/students-management/${id}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Öğrenci güncellenemedi:', error);
      throw new Error('Öğrenci güncellenirken hata oluştu');
    }
  }

  // Öğrenci sil
  async deleteStudent(id: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.delete(`/api/students-management/${id}`);
      return response.data;
    } catch (error) {
      console.error('Öğrenci silinemedi:', error);
      throw new Error('Öğrenci silinirken hata oluştu');
    }
  }

  // Veli ata
  async assignParent(studentId: string, parentId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post(`/api/students-management/${studentId}/parents/${parentId}`);
      return response.data;
    } catch (error) {
      console.error('Veli ataması başarısız:', error);
      throw new Error('Veli ataması yapılırken hata oluştu');
    }
  }

  // Koç ata
  async assignCoach(studentId: string, coachId: string): Promise<ApiResponse<any>> {
    try {
      // Not defined in controller; keep placeholder or implement when backend supports
      const response = await this.api.post(`/students/${studentId}/coach`, { coachId });
      return response.data;
    } catch (error) {
      console.error('Koç ataması başarısız:', error);
      throw new Error('Koç ataması yapılırken hata oluştu');
    }
  }

  // Koç notu oluştur
  async createCoachNote(studentId: string, noteData: {
    title: string;
    content: string;
    type: string;
    priority: string;
  }): Promise<ApiResponse<CoachNote>> {
    try {
      const response = await this.api.post(`/api/students-management/${studentId}/coach-notes`, noteData);
      return response.data;
    } catch (error) {
      console.error('Koç notu oluşturulamadı:', error);
      throw new Error('Koç notu oluşturulurken hata oluştu');
    }
  }

  // Performans güncelle
  async updatePerformance(studentId: string, performanceData: {
    subject: string;
    score: number;
    maxScore: number;
    examType?: string;
  }): Promise<ApiResponse<any>> {
    try {
      // Not exposed; postpone until backend route exists
      throw new Error('Performans güncelleme endpointi backend tarafında tanımlı değil');
    } catch (error) {
      console.error('Performans güncellenemedi:', error);
      throw new Error('Performans güncellenirken hata oluştu');
    }
  }

  // Toplu işlemler
  async bulkUpdateStudents(studentIds: string[], updateData: {
    isActive?: boolean;
    grade?: number;
    field?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/students/bulk-update', {
        studentIds,
        updateData
      });
      return response.data;
    } catch (error) {
      console.error('Toplu güncelleme başarısız:', error);
      throw new Error('Toplu güncelleme yapılırken hata oluştu');
    }
  }

  // Export data
  async exportStudents(format: 'csv' | 'excel' | 'pdf', filters?: any): Promise<Blob> {
    try {
      const response = await this.api.get('/students/export', {
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

export const studentManagementApi = new StudentManagementApiService();
