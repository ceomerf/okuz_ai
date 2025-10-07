import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

interface StudySession {
  id: string;
  subject: string;
  topic: string;
  startTime: Date;
  duration: number;
  performance?: number | null;
}

@Injectable()
export class ProgressTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async trackProgress(userId: string, sessionId: string, performance: { score: number; timeSpent: number; notes?: string }) {
    const session = await this.prisma.studySession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    await this.prisma.studySession.update({
      where: { id: sessionId },
      data: {
        performance: performance.score,
        notes: performance.notes,
        isCompleted: true,
        endTime: new Date(),
      },
    });

    await this.updateUserPerformanceMetrics(userId, performance.score, performance.timeSpent);

    const adjustment = this.calculateDifficultyAdjustment(performance.score);
    const nextSteps = this.generateNextSteps(performance.score, session.subject);

    return {
      success: true,
      adjustment,
      nextSteps,
      message: 'Progress tracked successfully',
    };
  }

  private async updateUserPerformanceMetrics(userId: string, score: number, timeSpent: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });

    if (!user?.studentProfile) return;

    const currentMetrics = user.studentProfile.performanceMetrics as any || {};
    const totalSessions = (currentMetrics.totalSessions || 0) + 1;
    const averageScore = ((currentMetrics.averageScore || 0) * (totalSessions - 1) + score) / totalSessions;
    const totalTimeSpent = (currentMetrics.totalTimeSpent || 0) + timeSpent;

    await this.prisma.studentProfile.update({
      where: { userId },
      data: {
        performanceMetrics: {
          totalSessions,
          averageScore,
          totalTimeSpent,
          lastUpdated: new Date(),
        },
      },
    });
  }

  private calculateDifficultyAdjustment(score: number): { action: string; reason: string; newDifficulty?: string } {
    if (score >= 85) {
      return {
        action: 'increase_difficulty',
        reason: 'Excellent performance! Ready for more challenging content.',
        newDifficulty: 'hard',
      };
    } else if (score >= 70) {
      return {
        action: 'maintain_difficulty',
        reason: 'Good performance. Continue with current level.',
      };
    } else if (score >= 50) {
      return {
        action: 'decrease_difficulty',
        reason: 'Struggling with current level. Try easier content.',
        newDifficulty: 'easy',
      };
    } else {
      return {
        action: 'review_fundamentals',
        reason: 'Need to review basic concepts before proceeding.',
        newDifficulty: 'easy',
      };
    }
  }

  private generateNextSteps(score: number, subject: string): string[] {
    const steps: string[] = [];
    
    if (score >= 85) {
      steps.push(`Great job in ${subject}! Try advanced problems.`);
      steps.push('Consider helping peers with this topic.');
    } else if (score >= 70) {
      steps.push(`Good work in ${subject}. Practice more similar problems.`);
      steps.push('Review any mistakes made.');
    } else if (score >= 50) {
      steps.push(`Need more practice in ${subject}. Review the basics.`);
      steps.push('Consider getting help from teacher or tutor.');
    } else {
      steps.push(`Struggling with ${subject}. Focus on fundamental concepts.`);
      steps.push('Consider starting with easier topics in this subject.');
    }

    return steps;
  }

  async getProgressOverview(userId: string) {
    const sessions = await this.prisma.studySession.findMany({
      where: { userId, isCompleted: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const completionRate = sessions.length > 0 ? (sessions.filter(s => s.isCompleted).length / sessions.length) * 100 : 0;
    const averageScore = sessions.length > 0 ? 
      sessions.reduce((sum, s) => sum + (s.performance || 0), 0) / sessions.length : 0;

    const subjectPerformance = this.analyzeSubjectPerformance(sessions);
    const trends = this.calculateTrends(sessions);
    const recommendations = this.generateRecommendations(completionRate, averageScore, subjectPerformance);

    return {
      completionRate,
      averageScore,
      subjectPerformance,
      trends,
      recommendations,
      totalSessions: sessions.length,
      totalStudyTime: sessions.reduce((sum, s) => sum + s.duration, 0),
    };
  }

  private analyzeSubjectPerformance(sessions: StudySession[]) {
    const performance: Record<string, { count: number; averageScore: number; totalTime: number }> = {};
    
    sessions.forEach(session => {
      if (!performance[session.subject]) {
        performance[session.subject] = { count: 0, averageScore: 0, totalTime: 0 };
      }
      
      performance[session.subject].count++;
      performance[session.subject].totalTime += session.duration;
      
      if (session.performance !== null && session.performance !== undefined) {
        const currentAvg = performance[session.subject].averageScore;
        const newAvg = (currentAvg * (performance[session.subject].count - 1) + session.performance) / performance[session.subject].count;
        performance[session.subject].averageScore = newAvg;
      }
    });

    return Object.entries(performance).map(([subject, data]) => ({
      subject,
      ...data,
    }));
  }

  private calculateTrends(sessions: StudySession[]) {
    if (sessions.length < 3) return { direction: 'insufficient_data', confidence: 'low' };

    const recentScores = sessions.slice(0, 10).map(s => s.performance).filter(p => p !== null && p !== undefined) as number[];
    
    if (recentScores.length < 3) return { direction: 'insufficient_data', confidence: 'low' };

    const firstHalf = recentScores.slice(0, Math.floor(recentScores.length / 2));
    const secondHalf = recentScores.slice(Math.floor(recentScores.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
    
    const difference = secondAvg - firstAvg;
    
    if (difference > 5) return { direction: 'improving', confidence: 'high' };
    if (difference < -5) return { direction: 'declining', confidence: 'high' };
    return { direction: 'stable', confidence: 'medium' };
  }

  private generateRecommendations(completionRate: number, averageScore: number, subjectPerformance: any[]) {
    const recommendations: string[] = [];
    
    if (completionRate < 50) {
      recommendations.push('Try to maintain a more consistent study schedule.');
    }
    
    if (averageScore < 70) {
      recommendations.push('Focus on understanding concepts before moving to practice problems.');
    }
    
    const weakSubjects = subjectPerformance.filter(s => s.averageScore < 70);
    if (weakSubjects.length > 0) {
      recommendations.push(`Consider spending more time on: ${weakSubjects.map(s => s.subject).join(', ')}`);
    }
    
    return recommendations;
  }

  /**
   * Task progress güncelle
   */
  async updateTaskProgress(data: { userId: string; taskId: string; progress: number; notes?: string }): Promise<any> {
    try {
      // Task progress'i güncelle
      const updatedTask = await this.prisma.studySession.update({
        where: { id: data.taskId },
        data: {
          performance: data.progress,
          notes: data.notes,
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        message: 'Task progress updated successfully',
        task: updatedTask
      };
    } catch (error) {
      throw new Error('Failed to update task progress');
    }
  }

  /**
   * Task progress güncelle (minutes parametresi ile)
   */
  async updateTaskProgressWithMinutes(data: { userId: string; taskId: string; minutes: number; notes?: string }): Promise<any> {
    try {
      // Task progress'i güncelle
      const updatedTask = await this.prisma.studySession.update({
        where: { id: data.taskId },
        data: {
          duration: data.minutes,
          notes: data.notes,
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        message: 'Task progress updated successfully',
        task: updatedTask
      };
    } catch (error) {
      throw new Error('Failed to update task progress');
    }
  }
}
