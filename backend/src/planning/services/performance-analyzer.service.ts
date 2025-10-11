import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PerformanceAnalyzerService {
  private readonly logger = new Logger(PerformanceAnalyzerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async analyzeUserPerformance(userId: string): Promise<any> {
    try {
      const sessions = await (this.prisma as any).studySession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      const totalSessions = sessions.length;
      const completedSessions = sessions.filter((s: any) => s.isCompleted).length;
      const averagePerformance = sessions.reduce((sum: number, s: any) => sum + (s.performance || 0), 0) / totalSessions;

      return {
        totalSessions,
        completedSessions,
        completionRate: totalSessions > 0 ? completedSessions / totalSessions : 0,
        averagePerformance,
        recentTrend: this.calculateTrend(sessions),
      };
    } catch (error) {
      this.logger.error(`Failed to analyze performance for user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
      return {
        totalSessions: 0,
        completedSessions: 0,
        completionRate: 0,
        averagePerformance: 0,
        recentTrend: 'stable',
      };
    }
  }

  private calculateTrend(sessions: any[]): string {
    if (sessions.length < 2) return 'stable';
    
    const recent = sessions.slice(0, Math.floor(sessions.length / 2));
    const older = sessions.slice(Math.floor(sessions.length / 2));
    
    const recentAvg = recent.reduce((sum, s) => sum + (s.performance || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + (s.performance || 0), 0) / older.length;
    
    if (recentAvg > olderAvg + 5) return 'improving';
    if (recentAvg < olderAvg - 5) return 'declining';
    return 'stable';
  }
}
