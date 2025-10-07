export interface StudyPlan {
  id: string;
  userId: string;
  title: string;
  description: string;
  subject: string;
  grade: number;
  difficulty: number; // 1-10 scale
  estimatedDuration: number; // minutes
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  sessions: StudySession[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudySession {
  id: string;
  planId: string;
  userId: string;
  title: string;
  description: string;
  subject: string;
  duration: number; // minutes
  difficulty: number; // 1-10 scale
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  score?: number; // 0-100
  notes?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanGenerationRequest {
  userId: string;
  subject: string;
  grade: number;
  difficulty: number;
  duration: number; // minutes
  preferences: {
    learningStyle: string;
    timeOfDay: string;
    focusAreas: string[];
    weakAreas: string[];
  };
  context: {
    recentPerformance: any;
    studyStreak: number;
    availableTime: number;
  };
}

export interface PlanGenerationResponse {
  plan: StudyPlan;
  confidence: number;
  reasoning: string;
  alternatives: StudyPlan[];
  recommendations: string[];
}

export interface SessionUpdateRequest {
  sessionId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  score?: number;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface PlanOptimizationRequest {
  planId: string;
  optimizationType: 'DIFFICULTY' | 'DURATION' | 'SCHEDULE' | 'CONTENT';
  parameters: Record<string, any>;
}

export interface PlanValidationRequest {
  planId: string;
  validationType: 'STRUCTURE' | 'CONTENT' | 'SCHEDULE' | 'DIFFICULTY';
  parameters: Record<string, any>;
}

export interface PerformanceMetrics {
  userId: string;
  period: string;
  studyTime: number;
  sessionsCompleted: number;
  averageScore: number;
  consistency: number;
  improvement: number;
  engagement: number;
  focus: number;
  retention: number;
}
