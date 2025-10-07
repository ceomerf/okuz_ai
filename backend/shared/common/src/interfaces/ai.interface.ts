export interface AIRequest {
  id: string;
  userId: string;
  promptType: string;
  model: string;
  prompt: string;
  parameters: {
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
  context: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface AIResponse {
  id: string;
  requestId: string;
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
  processingTime: number; // milliseconds
  cost: number;
  createdAt: Date;
}

export interface AIConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  timeout: number;
  retries: number;
}

export interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  description: string;
  template: string;
  variables: string[];
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIUsageAnalytics {
  userId: string;
  promptType: string;
  model: string;
  tokensUsed: number;
  cost: number;
  success: boolean;
  processingTime: number;
  timestamp: Date;
}

export interface CoachingRecommendation {
  id: string;
  userId: string;
  type: 'study_focus' | 'time_management' | 'difficulty_adjustment' | 'motivation' | 'break_reminder';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  actionItems: string[];
  estimatedImpact: number; // 1-10 scale
  confidence: number; // 0-1 scale
  context: Record<string, any>;
  expiresAt?: Date;
  isRead: boolean;
  isActedUpon: boolean;
  createdAt: Date;
}

export interface PerformanceAnalysis {
  id: string;
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  overallScore: number; // 1-10 scale
  strengths: string[];
  weaknesses: string[];
  recommendations: Record<string, any>;
  trends: Record<string, any>;
  insights: Record<string, any>;
  aiAnalysis: Record<string, any>;
  createdAt: Date;
}
