import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiClientService {
  private readonly logger = new Logger(ApiClientService.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('API_BASE_URL') || 'http://localhost:3000';
  }

  /**
   * Frontend için API client oluştur
   */
  createApiClient() {
    return {
      // Koç paneli API'leri
      coaching: {
        getStudents: (token: string) => this.get('/coaching/students', token),
        getStudentDetails: (studentId: string, token: string) => 
          this.get(`/coaching/students/${studentId}`, token),
        addNote: (studentId: string, noteData: any, token: string) => 
          this.post(`/coaching/students/${studentId}/notes`, noteData, token),
        updateCompliance: (studentId: string, complianceData: any, token: string) => 
          this.put(`/coaching/students/${studentId}/compliance`, complianceData, token),
        getPerformance: (token: string) => this.get('/coaching/performance', token),
      },

      // Veli rapor API'leri
      parentReports: {
        getDashboard: (token: string) => this.get('/parent-reports/dashboard', token),
        getWeeklyReport: (studentId: string, weekStart: string, token: string) => 
          this.get(`/parent-reports/weekly-report/${studentId}?weekStart=${weekStart}`, token),
        getHeatmap: (studentId: string, startDate: string, endDate: string, token: string) => 
          this.get(`/parent-reports/heatmap/${studentId}?startDate=${startDate}&endDate=${endDate}`, token),
        getSubjectProgress: (studentId: string, weekStart: string, token: string) => 
          this.get(`/parent-reports/subject-progress/${studentId}?weekStart=${weekStart}`, token),
        regenerateReport: (studentId: string, weekStart: string, token: string) => 
          this.post(`/parent-reports/weekly-report/${studentId}/regenerate?weekStart=${weekStart}`, {}, token),
      },

      // AI Koç API'leri
      aiCoach: {
        getDailyRecommendation: (date: string, token: string) => 
          this.get(`/ai-coach/daily-recommendation?date=${date}`, token),
        generateDailyRecommendation: (date: string, token: string) => 
          this.post('/ai-coach/daily-recommendation', { date }, token),
        generateDailyScore: (scoreData: any, token: string) => 
          this.post('/ai-coach/daily-score', scoreData, token),
        getWeeklySummary: (weekStart: string, token: string) => 
          this.get(`/ai-coach/weekly-summary?weekStart=${weekStart}`, token),
        generateMotivationalMessage: (context: any, token: string) => 
          this.post('/ai-coach/motivational-message', context, token),
      },

      // Bildirim ayarları API'leri
      notificationSettings: {
        getSettings: (token: string) => this.get('/notification-settings', token),
        updateSettings: (settings: any, token: string) => 
          this.put('/notification-settings', settings, token),
        snoozeNotification: (notificationId: string, snoozeMinutes: number, token: string) => 
          this.post(`/notification-settings/snooze/${notificationId}`, { snoozeMinutes }, token),
        snoozeAll: (snoozeMinutes: number, token: string) => 
          this.post('/notification-settings/snooze-all', { snoozeMinutes }, token),
        getActiveSnoozes: (token: string) => this.get('/notification-settings/snoozes', token),
        cancelSnooze: (snoozeId: string, token: string) => 
          this.delete(`/notification-settings/snoozes/${snoozeId}`, token),
        getHistory: (limit: number, token: string) => 
          this.get(`/notification-settings/history?limit=${limit}`, token),
        getStats: (days: number, token: string) => 
          this.get(`/notification-settings/stats?days=${days}`, token),
      },

      // Referans sistemi API'leri
      referral: {
        createCode: (codeData: any, token: string) => 
          this.post('/referral/codes', codeData, token),
        getCodes: (token: string) => this.get('/referral/codes', token),
        useCode: (code: string, token: string) => 
          this.post('/referral/use', { code }, token),
        getStats: (token: string) => this.get('/referral/stats', token),
        deactivateCode: (codeId: string, token: string) => 
          this.delete(`/referral/codes/${codeId}`, token),
        searchCode: (code: string, token: string) => 
          this.get(`/referral/search/${code}`, token),
      },
    };
  }

  private async get(endpoint: string, token: string) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`GET ${endpoint} failed:`, error);
      throw error;
    }
  }

  private async post(endpoint: string, data: any, token: string) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`POST ${endpoint} failed:`, error);
      throw error;
    }
  }

  private async put(endpoint: string, data: any, token: string) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`PUT ${endpoint} failed:`, error);
      throw error;
    }
  }

  private async delete(endpoint: string, token: string) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`DELETE ${endpoint} failed:`, error);
      throw error;
    }
  }
}
