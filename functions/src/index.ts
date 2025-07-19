import * as admin from 'firebase-admin';

// Initialize Firebase
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// ==================================================================
// SADECE VELİ PANELİ GELİŞTİRME FAZINDA GEREKLİ FONKSİYONLAR
// ==================================================================

// Profil ve Onboarding
export { 
  completeOnboardingProfile,
  createAdvancedProfile 
} from './profile';

// Planlama Motoru
export { 
  generateInitialLongTermPlan,
  generateWeeklyPremiumPlan,
  checkHolidayStatus,
  getTopicsForGradeAndSubjects,
  // processPlanGenerationQueue, // ❌ CPU QUOTA: Geçici olarak devre dışı
  suggestTaskReschedule,
  applyTaskReschedule
} from './planning';

// Kullanıcı Etkileşimi ve Zaman Takibi
export { 
  // handleUserAction, // ❌ CPU QUOTA: Geçici olarak devre dışı
  logStudySession 
} from './interaction';

// Oyunlaştırma ve Sıralama
export { 
  getGlobalLeaderboard 
} from './gamification';

// Veli Paneli Fonksiyonları
export { 
  // getParentDashboardData, // ❌ CPU QUOTA: Geçici olarak devre dışı
  // updateStudentStatus, // ❌ CPU QUOTA: Geçici olarak devre dışı
  getWeeklyParentReport
} from './interaction';

// Bildirim Sistemi
export {
  sendPlanReadyNotification, // 🚀 YENİ: Plan hazır olduğunda FCM bildirimi
  getPlanGenerationStatus    // 🚀 YENİ: Queue durumu sorgulama API'si
} from './notifications';

// ==================================================================
// 🚀 SEÇİCİ "ÇOK YAKINDA!" STRATEJİSİ - CPU OPTİMİZASYONU
// ==================================================================

// ✅ AKTİF KALAN ÖZELLİKLER (Temel değer sağlayanlar):
// Temel Analiz ve İçerik Araçları - SADECE TEXT PROCESSING
export { processAndStructureText } from './analysis';

// Abonelik Sistemi (Kritik özellikler)
export { startUserTrial, checkSubscriptionStatus, upgradeToPremium, joinFounderMembership } from './subscription';

// Plan Kurulum Sistemi (Bölüm 3'te eklendi)  
export { savePlacedTasks } from './planning';

// ❌ GEÇİCİ OLARAK DEVRE DIŞI - CPU QUOTA:
// - generateTopicMap (Çok fazla CPU kullanıyor)
// - generateTopicConnection (Çok fazla CPU kullanıyor)

// ❌ GEÇİCİ OLARAK DEVRE DIŞI BIRAKILAN ÖZELLİKLER:
// Bu özellikler en yoğun CPU kullananlar - "Wow" deneyimler
// Frontend'de "Coming Soon" dialog'u ile profesyonelce sunulacak

// - startSocraticDialogue (AI Sokrates - İnteraktif Sohbet)
// - getPersonalizedPath (Kişisel Öğrenme Rotası)  
// - analyzeExamResult (Gelişmiş Sınav Analizi)
// - analyzeRecentExams (Detaylı Deneme Analizi)
// - getPreExamStrategy (AI Sınav Stratejisti)
// - generateWeeklyStory (Motivasyon Hikayesi Generator)
// - updateUserFocusProfile (Derinlemesine Odak Analizi)