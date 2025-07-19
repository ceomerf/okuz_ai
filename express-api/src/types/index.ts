import { Timestamp } from 'firebase-admin/firestore';
import { Request } from 'express';

// Student Profile Interface
export interface StudentProfile {
  profileId: string;
  profileName: string;
  grade: string;
  academicTrack: 'sayisal' | 'sozel' | 'esitagirlik' | 'dil';
  targetUniversity: string;
  targetExam: string;
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
  confidenceLevels: Record<string, 'low' | 'medium' | 'high'>;
  preferredStudyTimes: string[];
  studyDays: string[];
  dailyHours: number;
  preferredSessionDuration: number;
  isActive: boolean;
  createdAt: Timestamp | any;
  updatedAt?: Timestamp | any;
}

// Subscription Data Interface
export interface SubscriptionData {
  subscriptionTier: 'free' | 'premium' | 'founder';
  trialStartDate?: Timestamp | any;
  trialEndDate?: Timestamp | any;
  isTrialActive: boolean;
  autoRenew: boolean;
  purchaseDate?: Timestamp | any;
  expiryDate?: Timestamp | any;
}

// Study Session Interfaces
export interface StudySessionInput {
  subject: string;
  topic?: string;
  durationInMinutes: number;
  rating: number; // 1-5
  notes?: string;
  studyMethod?: 'reading' | 'practice' | 'video' | 'flashcards' | 'other';
  profileId?: string; // Aile hesabı için
}

export interface StudySessionLog extends StudySessionInput {
  sessionId: string;
  userId: string;
  timestamp: Timestamp | any;
  date: string; // YYYY-MM-DD format
  xpEarned: number;
  streakContribution: boolean;
}

// Performance Stats Interface
export interface PerformanceStats {
  totalStudyTimeMinutes: number;
  weeklyStudyTimeMinutes: number;
  monthlyStudyTimeMinutes: number;
  totalSessions: number;
  averageSessionDuration: number;
  subjectBreakdown: Record<string, {
    totalTime: number;
    sessionCount: number;
    averageRating: number;
  }>;
  lastUpdated: Timestamp | any;
}

// Topic Pool Item Interface
export interface TopicPoolItem {
  sinif: string;
  ders: string;
  unite: string;
  konu: string;
  alt_konular: string[];
  onem_derecesi: number;
  zorluk_seviyesi: number;
  tahmini_sure: number;
  confidence?: 'low' | 'medium' | 'high';
  completed?: boolean;
  lastStudied?: Timestamp | any;
}

// Class Data Interface
export interface ClassData {
  sinif: string;
  dersler: {
    [dersAdi: string]: {
      uniteler: {
        [uniteAdi: string]: {
          konular: {
            [konuAdi: string]: {
              alt_konular: string[];
              onem_derecesi: number;
              zorluk_seviyesi: number;
              tahmini_sure: number;
            };
          };
        };
      };
    };
  };
}

// Plan Generation Queue Interface
export interface PlanGenerationQueueItem {
  userId: string;
  profileId?: string; // Aile hesabı için
  requestTimestamp: Timestamp | any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  planType: string;
  estimatedCompletionTime?: Timestamp | any;
  errorMessage?: string;
  metadata?: any;
}

// User Document Interface
export interface UserDocument {
  accountType: 'single' | 'family';
  familyAccountId?: string;
  selectedProfileId?: string;
  profiles?: Record<string, StudentProfile>;
  subscription?: SubscriptionData;
  isPremium: boolean;
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;
}

// XP Calculation Result Interface
export interface XPCalculationResult {
  baseXP: number;
  bonusXP: number;
  totalXP: number;
  multiplier: number;
  reasons: string[];
}

// Plan Ready Notification Data Interface
export interface PlanReadyNotificationData {
  title: string;
  body: string;
  planId: string;
  userId: string;
  profileId?: string;
  }

// Request interfaces for API endpoints
export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    [key: string]: any;
  };
}

// API Response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

// Validation schemas interfaces
export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiRequest {
  body: any;
  query: any;
  params: any;
  headers: any;
} 