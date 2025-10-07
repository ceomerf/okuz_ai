import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly prismaService: PrismaService, // Fallback for compatibility
  ) {}

  /**
   * Get user performance analytics using read replica
   */
  async getUserPerformanceAnalytics(userId: string, dateRange: { start: Date; end: Date }) {
    this.logger.log(`Getting performance analytics for user ${userId} using read replica`);
    
    return this.databaseService.executeRead(async (readClient) => {
      return readClient.analysis.findMany({
        where: {
          userId,
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  }

  /**
   * Get system-wide analytics using read replica
   */
  async getSystemAnalytics(dateRange: { start: Date; end: Date }) {
    this.logger.log('Getting system analytics using read replica');
    
    return this.databaseService.executeRead(async (readClient) => {
      const [
        totalUsers,
        activeUsers,
        totalPlans,
        completedSessions,
        averagePerformance,
      ] = await Promise.all([
        readClient.user.count({
          where: {
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
          },
        }),
        readClient.user.count({
          where: {
            lastActiveAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
        }),
        readClient.plan.count({
          where: {
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
          },
        }),
        readClient.studySession.count({
          where: {
            status: 'COMPLETED',
            completedAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
          },
        }),
        readClient.analysis.aggregate({
          where: {
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
          },
          _avg: {
            performance: true,
          },
        }),
      ]);

      return {
        totalUsers,
        activeUsers,
        totalPlans,
        completedSessions,
        averagePerformance: averagePerformance._avg.performance || 0,
        period: {
          start: dateRange.start,
          end: dateRange.end,
        },
      };
    });
  }

  /**
   * Get detailed performance breakdown using read replica
   */
  async getPerformanceBreakdown(userId: string, subject?: string) {
    this.logger.log(`Getting performance breakdown for user ${userId} using read replica`);
    
    return this.databaseService.executeRead(async (readClient) => {
      const whereClause: any = { userId };
      if (subject) {
        whereClause.subject = subject;
      }

      const breakdown = await readClient.analysis.groupBy({
        by: ['subject', 'difficulty'],
        where: whereClause,
        _avg: {
          performance: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          subject: 'asc',
        },
      });

      return breakdown.map(item => ({
        subject: item.subject,
        difficulty: item.difficulty,
        averagePerformance: item._avg.performance,
        totalAttempts: item._count.id,
      }));
    });
  }

  /**
   * Get learning insights using read replica
   */
  async getLearningInsights(userId: string) {
    this.logger.log(`Getting learning insights for user ${userId} using read replica`);
    
    return this.databaseService.executeRead(async (readClient) => {
      const [
        recentPerformance,
        strengths,
        weaknesses,
        studyPatterns,
      ] = await Promise.all([
        // Recent performance trend
        readClient.analysis.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            performance: true,
            createdAt: true,
            subject: true,
          },
        }),
        
        // Strong subjects
        readClient.analysis.groupBy({
          by: ['subject'],
          where: {
            userId,
            performance: { gte: 80 },
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 3,
        }),
        
        // Weak subjects
        readClient.analysis.groupBy({
          by: ['subject'],
          where: {
            userId,
            performance: { lt: 60 },
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 3,
        }),
        
        // Study patterns
        readClient.studySession.groupBy({
          by: ['dayOfWeek'],
          where: { userId },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
        }),
      ]);

      return {
        recentPerformance,
        strengths: strengths.map(s => ({ subject: s.subject, count: s._count.id })),
        weaknesses: weaknesses.map(w => ({ subject: w.subject, count: w._count.id })),
        studyPatterns: studyPatterns.map(p => ({ 
          dayOfWeek: p.dayOfWeek, 
          sessionCount: p._count.id 
        })),
      };
    });
  }

  /**
   * Get comparative analytics using read replica
   */
  async getComparativeAnalytics(userId: string) {
    this.logger.log(`Getting comparative analytics for user ${userId} using read replica`);
    
    return this.databaseService.executeRead(async (readClient) => {
      const [
        userStats,
        peerStats,
        globalStats,
      ] = await Promise.all([
        // User's own stats
        readClient.analysis.aggregate({
          where: { userId },
          _avg: { performance: true },
          _count: { id: true },
        }),
        
        // Peer group stats (same grade level)
        readClient.user.findFirst({
          where: { id: userId },
          select: { grade: true },
        }).then(user => {
          if (!user?.grade) return null;
          return readClient.analysis.aggregate({
            where: {
              user: { grade: user.grade },
            },
            _avg: { performance: true },
            _count: { id: true },
          });
        }),
        
        // Global stats
        readClient.analysis.aggregate({
          _avg: { performance: true },
          _count: { id: true },
        }),
      ]);

      return {
        user: {
          averagePerformance: userStats._avg.performance || 0,
          totalAttempts: userStats._count.id,
        },
        peers: peerStats ? {
          averagePerformance: peerStats._avg.performance || 0,
          totalAttempts: peerStats._count.id,
        } : null,
        global: {
          averagePerformance: globalStats._avg.performance || 0,
          totalAttempts: globalStats._count.id,
        },
      };
    });
  }
}