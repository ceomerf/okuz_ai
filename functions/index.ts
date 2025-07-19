/**
 * ==================================================================
 * ANA FONKSİYON KONTROL PANELI - Veli Paneli Geliştirme Fazı
 * ==================================================================
 */

import {
  completeOnboardingProfile,
  createAdvancedProfile,
  generateInitialLongTermPlan,
  handleUserAction,
  getParentDashboardData,
  getWeeklyParentReport,
  updateStudentStatus,
  logStudySession,
} from './src/main';

// ==================================================================
//          AKTİF FONKSİYONLAR (Veli Paneli Testi İçin)
// ==================================================================
// Bu fonksiyonlar, veli ve öğrenci hesaplarının oluşturulması,
// planlarının yapılması ve velinin bu verileri çekebilmesi için gereklidir.

export { completeOnboardingProfile };
export { createAdvancedProfile };
export { generateInitialLongTermPlan };
export { handleUserAction };
export { getParentDashboardData };
export { getWeeklyParentReport };
export { updateStudentStatus };
export { logStudySession }; // Veli panelinin göreceği ilerleme verisi için gerekli

// Diğer tüm export'lar şimdilik yorum satırı olarak kalmalıdır. 