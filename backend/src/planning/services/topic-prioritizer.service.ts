import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TopicPrioritizerService {
  private readonly logger = new Logger(TopicPrioritizerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async prioritizeTopics(userId: string, subject: string, grade: number): Promise<any[]> {
    try {
      // Get user's performance data
      const userSessions = await this.prisma.studySession.findMany({
        where: { userId, subject },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      // Get curriculum topics
      const topics = await this.prisma.mebTopic.findMany({
        where: { subject, grade },
        include: { weights: true },
      });

      // Calculate priority scores
      const prioritizedTopics = topics.map(topic => {
        const userPerformance = this.getUserPerformanceForTopic(userSessions, topic.topic);
        const examWeight = this.getExamWeight(topic.weights);
        const priority = this.calculatePriority(userPerformance, examWeight);
        
        return {
          ...topic,
          priority,
          userPerformance,
          examWeight,
        };
      });

      return prioritizedTopics.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      this.logger.error(`Failed to prioritize topics for user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  private getUserPerformanceForTopic(sessions: any[], topic: string): number {
    const topicSessions = sessions.filter(s => s.topic === topic);
    if (topicSessions.length === 0) return 0.5; // Default if no data
    
    const avgPerformance = topicSessions.reduce((sum, s) => sum + (s.performance || 0), 0) / topicSessions.length;
    return avgPerformance / 100; // Normalize to 0-1
  }

  private getExamWeight(weights: any[]): number {
    if (!weights || weights.length === 0) return 0.5;
    
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    return Math.min(totalWeight / 10, 1); // Normalize to 0-1
  }

  private calculatePriority(userPerformance: number, examWeight: number): number {
    // Lower performance + higher exam weight = higher priority
    return (1 - userPerformance) * 0.6 + examWeight * 0.4;
  }
}
