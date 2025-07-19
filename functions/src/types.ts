// src/types.ts
export interface Topic {
    konuAdi: string;
    islenmeHaftasi: number;
    importance?: 'high' | 'medium' | 'low';
    examRelevance?: { [key: string]: 'high' | 'medium' | 'low' };
    difficulty?: 'high' | 'medium' | 'low';
    estimatedHours?: number;
    academicTrackWeight?: { [track: string]: number };
}

export interface Unit {
    uniteAdi: string;
    konular: Topic[];
}

export interface Subject {
    dersAdi: string;
    uniteVeTemalar: Unit[];
}

export interface ClassData {
    sinifDuzeyi: string;
    aciklama: string;
    dersler: Subject[];
}

export interface TopicPoolItem {
    ders: string;
    unite: string;
    konu: string;
    onem: string;
    sinavIlgisi: string;
    zorluk: string;
    sure: number; // dakika
    trackWeight?: number;
}

export interface ConfidenceTopicPoolItem extends TopicPoolItem {
    confidenceWeight: number;
}

// Çalışma seansı kayıtları için yeni interface'ler
export interface StudySessionInput {
    durationInMinutes: number;
    subject: string;
    topic: string;
    isManualEntry: boolean;
    date: string; // 'YYYY-MM-DD' format
}

export interface StudySessionLog {
    subject: string;
    topic: string;
    durationInMinutes: number;
    xpGained: number;
    timestamp: number;
    isManualEntry: boolean;
    date: string;
    userId: string;
}

export interface PerformanceStats {
    totalStudyTimeMinutes: number;
    weeklyStudyTimeMinutes: number;
    monthlyStudyTimeMinutes: number;
    lastUpdated: number;
    subjectBreakdown: { [subject: string]: number };
}

export interface XPCalculationResult {
    xpToAdd: number;
    multiplier: number;
    baseXP: number;
}

// AI analizi için detaylı performans verileri
export interface PerformanceAnalytics {
    totalMinutesStudied: number;
    totalManualMinutes: number;
    totalFocusMinutes: number;
    sessionsBySubject: { [subject: string]: number };
    timeBySubject: { [subject: string]: number };
    totalSessions: number;
    averageSessionDuration: number;
    lastUpdated: number;
    lastSessionDuration?: number;
    lastSessionSubject?: string;
    lastSessionType?: 'manual' | 'focus';
}

// AI için zorlanma sinyali analizi
export interface DifficultySignal {
    subject: string;
    averageSessionDuration: number;
    totalSessions: number;
    isAboveGeneralAverage: boolean;
    difficultyScore: number; // 0-1 arasında, 1 = en zor
}

// Dinamik tema sistemi için yeni tipler
export interface UserMoodData {
    energyLevel: 'low' | 'medium' | 'high'; // Çalışma enerjisi seviyesi
    stressLevel: 'low' | 'medium' | 'high'; // Stres seviyesi
    motivationLevel: 'low' | 'medium' | 'high'; // Motivasyon seviyesi
    burnoutRisk: 'low' | 'medium' | 'high'; // Tükenmişlik riski
    consistencyScore: number; // 0-100 arası, süreklilik skoru
    recentPerformanceTrend: 'improving' | 'stable' | 'declining'; // Son performans trendi
    lastMoodUpdate: number; // Timestamp
}

export interface AdaptiveThemeConfig {
    primaryColor: string;
    accentColor: string;
    backgroundColor: string;
    cardColor: string;
    textColor: string;
    buttonColor: string;
    energyEffectIntensity: number; // 0-1 arası, enerji efekti yoğunluğu
    animationSpeed: number; // 0.5-2.0 arası, animasyon hızı
    gradientIntensity: number; // 0-1 arası, gradient yoğunluğu
    themeType: 'energetic' | 'calm' | 'motivated' | 'focused' | 'recovery';
    effectsEnabled: boolean;
}

export interface WeeklyStoryData {
    weekNumber: number;
    year: number;
    totalStudyMinutes: number;
    bestDay: {
        date: string;
        minutes: number;
        achievement: string;
    };
    worstDay: {
        date: string;
        minutes: number;
        challenge: string;
    };
    keyMoments: Array<{
        day: string;
        type: 'success' | 'challenge' | 'breakthrough' | 'streak';
        description: string;
        emoji: string;
    }>;
    weeklyStreak: number;
    improvementAreas: string[];
    celebrationMessage: string;
    nextWeekMotivation: string;
    xpEarned: number;
    totalXP: number;
}

export interface UserEmotionalState {
    mood: UserMoodData;
    theme: AdaptiveThemeConfig;
    lastAnalysis: number;
    weeklyStory?: WeeklyStoryData;
}

// Subscription ve Trial tipleri
export interface SubscriptionData {
  subscriptionTier: 'free' | 'ai_pro' | 'mentor_plus' | 'founder';
  trialStartDate?: any; // Firebase Timestamp
  trialEndDate?: any; // Firebase Timestamp
  isTrialActive: boolean;
  subscriptionStartDate?: any; // Firebase Timestamp
  subscriptionEndDate?: any; // Firebase Timestamp
  lastPaymentDate?: any; // Firebase Timestamp
  paymentMethod?: string;
  autoRenew: boolean;
  isFounderMember?: boolean; // Kurucu üye mi?
  founderDiscountRate?: number; // Kurucu üye indirim oranı
  founderExpiryDate?: any; // Kurucu üye ayrıcalığı bitiş tarihi
}

// Öğrenci Profili - Aile hesabı sistemindeki her öğrenci için
export interface StudentProfile {
  profileId: string;
  profileName: string;
  grade: string;
  academicTrack: string;
  targetUniversity: string;
  targetExam: string;
  learningStyle: string;
  confidenceLevels: { [subject: string]: string };
  preferredStudyTimes: string[];
  preferredSessionDuration: number; // 🚀 YENİ: İdeal çalışma süresi (dakika)
  studyDays: string[];
  dailyHours: number;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: any; // Firebase Timestamp
  updatedAt: any; // Firebase Timestamp
  currentStatus: StudentCurrentStatus;
  // Öğrenci özel verileri artık alt koleksiyonlarda olacak:
  // - privateProfile: alt döküman
  // - gamification: alt döküman  
  // - plan: alt koleksiyon
  // - performance_analytics: alt döküman
}

// Veli Hesabı - Ana kullanıcı dokümanı
export interface ParentAccount {
  email: string;
  parentName: string;
  createdAt: any; // Firebase Timestamp
  subscription: SubscriptionData;
  maxStudentProfiles: number; // Abonelik planına göre maksimum öğrenci sayısı
  activeStudentCount: number;
  selectedProfileId?: string; // Şu anda aktif olan öğrenci profili
  // Alt koleksiyon: studentProfiles/{profileId}
}

// Kullanıcı dokümanı tipi (geriye uyumluluk için güncellenmiş)
export interface UserDocument {
  email: string;
  createdAt: any; // Firebase Timestamp
  onboardingCompleted: boolean;
  isPremium: boolean;
  subscription?: SubscriptionData;
  
  // Yeni aile hesabı alanları
  accountType?: 'single' | 'family'; // Hesap türü
  parentName?: string; // Veli adı (aile hesabı için)
  maxStudentProfiles?: number; // Maksimum öğrenci sayısı
  activeStudentCount?: number; // Aktif öğrenci sayısı
  selectedProfileId?: string; // Seçili öğrenci profili ID'si
  
  // Eski tek kullanıcı verileri (geriye uyumluluk için)
  fullName?: string;
  grade?: string;
  // ... existing fields ...
}

// Cloud Function işlemleri için profil seçimi
export interface ProfileContext {
  userId: string; // Veli ID'si
  profileId?: string; // Öğrenci profil ID'si (opsiyonel, yoksa tek kullanıcı modu)
}

// Çoklu profil destekli gamification verisi
export interface MultiProfileGamificationData {
  profileId: string;
  userId: string; // Veli ID'si
  xp: number;
  level: number;
  streak: number;
  badges: any[];
  lastCompletedDate?: any;
  subjectXP: { [subject: string]: number };
  achievements: any[];
}

// Öğrencinin anlık durumu
export interface StudentCurrentStatus {
  activity: 'inactive' | 'studying' | 'on_break'; // Öğrencinin şu anki durumu
  currentTopic?: string; // Şu anda çalıştığı konu
  lastSeen: any; // Firebase Timestamp - Son görülme zamanı
}

// Öğrenci profili - tam veri (currentStatus ile)
export interface StudentProfileWithStatus {
  profileId: string;
  profileName: string;
  grade: string;
  academicTrack: string; // sayisal, sozel, esit, dil, tyt
  targetUniversity: string;
  targetExam: string;
  learningStyle: string;
  confidenceLevels: { [subject: string]: string };
  preferredStudyTimes: string[];
  preferredSessionDuration: number; // 🚀 YENİ: İdeal çalışma süresi (dakika)
  studyDays: string[];
  dailyHours: number;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: any; // Firebase Timestamp
  updatedAt: any; // Firebase Timestamp
  currentStatus: StudentCurrentStatus;
  
  // Alt koleksiyonlar (ayrı path'lerde tutulur):
  // - gamification/data
  // - performance/
  // - plan/
  // - study_sessions/
}

// Profil seçim ve yönetim için yardımcı tipler
export interface StudentProfileSummary {
  profileId: string;
  profileName: string;
  grade: string;
  avatarUrl?: string;
  isActive: boolean;
  lastActivityDate?: any;
  currentXP?: number;
  currentLevel?: number;
  currentStatus?: StudentCurrentStatus;
}

// =================================================================
// ASENKRON PLAN OLUŞTURMA QUEUE SİSTEMİ TİPLERİ
// =================================================================

// Plan oluşturma durumları
export type PlanGenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Queue'daki plan oluşturma talebi
export interface PlanGenerationQueueItem {
  status: PlanGenerationStatus;
  userId: string;
  profileId?: string; // Aile hesabı için öğrenci profil ID'si
  requestTimestamp: any; // Firebase Timestamp - Talep zamanı
  queuePosition: number; // Sıradaki pozisyon
  estimatedCompletionTime?: any; // Firebase Timestamp - Tahmini bitiş zamanı
  errorMessage?: string; // Hata durumunda hata mesajı
  startingPoint?: 'current' | 'behind' | 'ahead'; // Onboarding'den gelen başlangıç noktası
  lastCompletedTopics?: { [subject: string]: string }; // En son tamamlanan konular
  planType?: string; // Plan türü (regular, holiday, etc.)
  processingStartTime?: any; // Firebase Timestamp - İşleme başlama zamanı
  processingEndTime?: any; // Firebase Timestamp - İşlemi bitiş zamanı
  retryCount?: number; // Yeniden deneme sayısı
}

// Plan hazır bildirimi için FCM verisi
export interface PlanReadyNotificationData {
  type: 'plan_ready';
  userId: string;
  profileId?: string;
  planType: string;
  title: string;
  body: string;
  data?: { [key: string]: string };
}

// Queue yönetimi için istatistikler
export interface QueueStatistics {
  totalPending: number;
  totalProcessing: number;
  totalCompleted: number;
  totalFailed: number;
  averageProcessingTime: number; // dakika cinsinden
  currentQueueLength: number;
  estimatedWaitTime: number; // dakika cinsinden
}