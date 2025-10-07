import { Injectable } from '@nestjs/common';
import { UserInsights } from './adaptive-insights.service';

export interface AdaptiveHints {
  sessionDuration: number;
  breakMinutes: number;
  preferredHours: string[];
  subjectBoosts: Record<string, number>; // 0..1 ek ağırlık
  subjectAvoid: string[];
}

@Injectable()
export class AdaptiveStrategyService {
  deriveHints(insights: UserInsights): AdaptiveHints {
    const baseDuration = Math.max(25, Math.min(90, insights.avgSessionDurationMin || 40));
    const breakMinutes = Math.max(5, Math.min(20, Math.round((insights.avgBreakMinutes || 10))));
    const preferredHours = insights.preferredStudyHours?.length ? insights.preferredStudyHours : ['evening'];

    const subjectBoosts: Record<string, number> = {};
    const subjectAvoid: string[] = [];

    for (const [subject, affinity] of Object.entries(insights.subjectAffinity || {})) {
      if (affinity >= 0.25) {
        subjectBoosts[subject] = Math.min(1, 0.1 + affinity * 0.3);
      }
      if (affinity <= -0.4) {
        subjectAvoid.push(subject);
      }
    }

    // Düşük sınav skorları olan derslere de hafif boost ver
    for (const [subject, score] of Object.entries(insights.recentExamScores || {})) {
      if (score < 55) {
        subjectBoosts[subject] = Math.max(subjectBoosts[subject] || 0, 0.2);
      }
    }

    return { sessionDuration: baseDuration, breakMinutes, preferredHours, subjectBoosts, subjectAvoid };
  }

  // Eksik methodları ekleyelim
  async analyzeLearningPattern(userId: string) {
    try {
      // Mock implementation
      return {
        success: true,
        pattern: {
          preferredTime: 'evening',
          sessionDuration: 45,
          breakFrequency: 2,
          difficultyPreference: 'medium'
        }
      };
    } catch (error) {
      throw new Error('Failed to analyze learning pattern');
    }
  }

  async adjustPlanStrategy(userId: string, planId: string, performance: any) {
    try {
      // Mock implementation
      const score = performance.averageScore || performance.score || 0;
      return {
        success: true,
        adjustments: {
          difficulty: 'medium',
          duration: 45,
          frequency: 'daily'
        },
        difficultyAdjustment: score > 0.8 ? 'increase' : 'decrease',
        newStrategy: score > 0.8 ? 'advanced' : 'remedial'
      };
    } catch (error) {
      throw new Error('Failed to adjust plan strategy');
    }
  }

  async getPersonalizedRecommendations(userId: string, learningPattern: any) {
    try {
      // Mock implementation
      return {
        success: true,
        recommendations: [
          'Study in the evening for better focus',
          'Take breaks every 45 minutes',
          'Focus on weak subjects first'
        ],
        studySchedule: {
          optimalDuration: 45,
          bestTime: 'afternoon'
        },
        focusAreas: ['Math', 'Science'],
        learningMethods: ['Visual', 'Auditory']
      };
    } catch (error) {
      throw new Error('Failed to get personalized recommendations');
    }
  }

  async trackProgress(userId: string, sessionData: any) {
    try {
      // Mock implementation
      return {
        success: true,
        progress: {
          completionRate: 0.75,
          improvement: 0.1,
          nextSteps: ['Continue current study plan']
        },
        sessionId: 'session123',
        strategyUpdate: 'Updated strategy based on progress'
      };
    } catch (error) {
      throw new Error('Failed to track progress');
    }
  }
}


