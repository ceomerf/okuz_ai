// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  
  // Dashboard
  DASHBOARD: '/executive/dashboard',
  HEALTH_CHECK: '/executive/health-check',
  QUICK_SUMMARY: '/executive/quick-summary',
  DAILY_REPORT: '/executive/daily-report',
  WEEKLY_REPORT: '/executive/weekly-report',
  ALERTS: '/executive/alerts',
  QUICK_ACTION: '/executive/quick-action',
  
  // Users
  USERS: '/api/users',
  USER_STATS: '/api/users/stats',
  USER_PROFILE: '/api/users/profile',
  
  // Students
  STUDENTS: '/students',
  STUDENT_PROGRESS: '/students/:id/progress',
  STUDENT_DASHBOARD: '/students/:id/dashboard',
  STUDENT_RECOMMENDATIONS: '/students/:id/recommendations',
  
  // Teachers
  TEACHERS: '/teachers',
  TEACHER_STATS: '/teachers/stats',
  
  // Courses
  COURSES: '/courses',
  COURSE_STATS: '/courses/stats',
  
  // Analytics
  ANALYTICS: '/analytics',
  METRICS: '/metrics',
  REPORTS: '/reports',
  
  // System
  SYSTEM_STATUS: '/system/status',
  SYSTEM_HEALTH: '/system/health',
  SYSTEM_METRICS: '/system/metrics',
};

// Request Headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Ağ bağlantısı hatası',
  TIMEOUT_ERROR: 'İstek zaman aşımına uğradı',
  UNAUTHORIZED: 'Yetkisiz erişim',
  FORBIDDEN: 'Erişim reddedildi',
  NOT_FOUND: 'Kaynak bulunamadı',
  SERVER_ERROR: 'Sunucu hatası',
  UNKNOWN_ERROR: 'Bilinmeyen hata',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  USER_CREATED: 'Kullanıcı başarıyla oluşturuldu',
  USER_UPDATED: 'Kullanıcı başarıyla güncellendi',
  USER_DELETED: 'Kullanıcı başarıyla silindi',
  STUDENT_CREATED: 'Öğrenci başarıyla oluşturuldu',
  STUDENT_UPDATED: 'Öğrenci başarıyla güncellendi',
  STUDENT_DELETED: 'Öğrenci başarıyla silindi',
  TEACHER_CREATED: 'Öğretmen başarıyla oluşturuldu',
  TEACHER_UPDATED: 'Öğretmen başarıyla güncellendi',
  TEACHER_DELETED: 'Öğretmen başarıyla silindi',
  COURSE_CREATED: 'Kurs başarıyla oluşturuldu',
  COURSE_UPDATED: 'Kurs başarıyla güncellendi',
  COURSE_DELETED: 'Kurs başarıyla silindi',
  DATA_EXPORTED: 'Veriler başarıyla dışa aktarıldı',
  ACTION_COMPLETED: 'İşlem başarıyla tamamlandı',
};
