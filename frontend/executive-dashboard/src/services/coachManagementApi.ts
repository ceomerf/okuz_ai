import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Types
export interface Coach {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  lastActiveAt?: string;
  specialization?: string;
  experience?: number;
  bio?: string;
  isActive?: boolean;
  coachStudents: Array<{
    id: string;
    student: {
      id: string;
      grade: number;
      field: string;
      user: {
        name: string;
        email: string;
      };
    };
    assignedAt: string;
    isActive: boolean;
  }>;
}

export interface UnassignedStudent {
  id: string;
  user: {
    name: string;
    email: string;
  };
  grade: number;
  field: string;
}

export interface CoachPerformance {
  totalStudents: number;
  activeStudents: number;
  totalNotes: number;
  recentNotes: number;
  averageStudentPerformance: number;
  totalSessions: number;
  engagementRate: number;
  notesPerStudent: number;
}

export interface CoachNote {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  createdAt: string;
  coachStudent: {
    student: {
      user: {
        name: string;
        email: string;
      };
    };
  };
}

export interface AssignmentStats {
  totalCoaches: number;
  totalStudents: number;
  assignedStudents: number;
  unassignedStudents: number;
  totalAssignments: number;
  recentAssignments: number;
  assignmentRate: number;
  averageStudentsPerCoach: number;
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

class CoachManagementApiService {
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

  // Koçları getir
  async getCoaches(page: number = 1, limit: number = 10, search?: string): Promise<ApiResponse<PaginationResponse<Coach>>> {
    try {
      const response = await this.api.get('/coaching', {
        params: { page, limit, search }
      });
      return response.data;
    } catch (error) {
      console.error('Koçlar getirilemedi:', error);
      throw new Error('Koçlar yüklenirken hata oluştu');
    }
  }

  // Koç detaylarını getir
  async getCoachById(id: string): Promise<ApiResponse<Coach>> {
    try {
      const response = await this.api.get(`/coaching/${id}`);
      return response.data;
    } catch (error) {
      console.error('Koç detayları getirilemedi:', error);
      throw new Error('Koç detayları yüklenirken hata oluştu');
    }
  }

  // Koç performansını getir
  async getCoachPerformance(id: string): Promise<ApiResponse<CoachPerformance>> {
    try {
      // Backend: CoachingManagementController -> GET /coaching/:id/performance
      const response = await this.api.get(`/coaching/${id}/performance`);
      return response.data;
    } catch (error) {
      console.error('Koç performansı getirilemedi:', error);
      throw new Error('Koç performansı yüklenirken hata oluştu');
    }
  }

  // Koç notlarını getir
  async getCoachNotes(id: string, page: number = 1, limit: number = 10): Promise<ApiResponse<PaginationResponse<CoachNote>>> {
    try {
      // Backend: CoachingManagementController -> GET /coaching/:id/notes
      const response = await this.api.get(`/coaching/${id}/notes`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Koç notları getirilemedi:', error);
      throw new Error('Koç notları yüklenirken hata oluştu');
    }
  }

  // Atanmamış öğrencileri getir
  async getUnassignedStudents(): Promise<ApiResponse<UnassignedStudent[]>> {
    try {
      const response = await this.api.get('/coaching/unassigned-students');
      return response.data;
    } catch (error) {
      console.error('Atanmamış öğrenciler getirilemedi:', error);
      throw new Error('Atanmamış öğrenciler yüklenirken hata oluştu');
    }
  }

  // Atama istatistiklerini getir
  async getAssignmentStats(): Promise<ApiResponse<AssignmentStats>> {
    try {
      const response = await this.api.get('/coaching/assignment-stats');
      return response.data;
    } catch (error) {
      console.error('Atama istatistikleri getirilemedi:', error);
      throw new Error('Atama istatistikleri yüklenirken hata oluştu');
    }
  }

  // Öğrenci ata
  async assignStudents(coachId: string, studentIds: string[]): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/coaching/assign-students', {
        coachId,
        studentIds
      });
      return response.data;
    } catch (error) {
      console.error('Öğrenci ataması başarısız:', error);
      throw new Error('Öğrenci ataması yapılırken hata oluştu');
    }
  }

  // Öğrenci atamasını kaldır
  async unassignStudent(coachId: string, studentId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.delete(`/coaching/unassign-student`, {
        data: { coachId, studentId }
      });
      return response.data;
    } catch (error) {
      console.error('Öğrenci ataması kaldırılamadı:', error);
      throw new Error('Öğrenci ataması kaldırılırken hata oluştu');
    }
  }

  // Koç notu oluştur
  async createCoachNote(coachId: string, studentId: string, noteData: {
    title: string;
    content: string;
    type: string;
    priority: string;
  }): Promise<ApiResponse<CoachNote>> {
    try {
      const response = await this.api.post('/coaching/notes', {
        coachId,
        studentId,
        ...noteData
      });
      return response.data;
    } catch (error) {
      console.error('Koç notu oluşturulamadı:', error);
      throw new Error('Koç notu oluşturulurken hata oluştu');
    }
  }

  // Koç oluştur
  async createCoach(coachData: {
    userId: string;
    specialization: string;
    experience: number;
    bio?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<Coach>> {
    try {
      const response = await this.api.post('/coaching', coachData);
      return response.data;
    } catch (error) {
      console.error('Koç oluşturulamadı:', error);
      throw new Error('Koç oluşturulurken hata oluştu');
    }
  }

  // Koç güncelle
  async updateCoach(id: string, updateData: {
    specialization?: string;
    experience?: number;
    bio?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<Coach>> {
    try {
      const response = await this.api.put(`/coaching/${id}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Koç güncellenemedi:', error);
      throw new Error('Koç güncellenirken hata oluştu');
    }
  }

  // Koç sil
  async deleteCoach(id: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.delete(`/coaching/${id}`);
      return response.data;
    } catch (error) {
      console.error('Koç silinemedi:', error);
      throw new Error('Koç silinirken hata oluştu');
    }
  }
}

export const coachManagementApi = new CoachManagementApiService();
