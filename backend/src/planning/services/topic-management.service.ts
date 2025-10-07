import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TopicManagementService {
  private readonly logger = new Logger(TopicManagementService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getTopicsBySubject(subject: string, grade: number): Promise<any[]> {
    try {
      return await this.prisma.mebTopic.findMany({
        where: {
          subject,
          grade,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to get topics for subject ${subject}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async getTopicById(topicId: string): Promise<any> {
    try {
      return await this.prisma.mebTopic.findUnique({
        where: { id: topicId },
      });
    } catch (error) {
      this.logger.error(`Failed to get topic ${topicId}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async getTopicPrerequisites(topicId: string): Promise<any[]> {
    try {
      return await this.prisma.topicPrerequisite.findMany({
        where: { topicId },
        include: { prerequisite: true },
      });
    } catch (error) {
      this.logger.error(`Failed to get prerequisites for topic ${topicId}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * MEB konularını getir
   */
  async getMebTopics(subject?: string, grade?: string): Promise<any[]> {
    try {
      const where: any = {};
      if (subject) where.subject = subject;
      if (grade) where.grade = parseInt(grade);

      return await this.prisma.mebTopic.findMany({
        where,
        orderBy: { grade: 'asc' }
      });
    } catch (error) {
      this.logger.error(`Failed to get MEB topics: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * YKS konu önerileri
   */
  async getYksSubjectRecommendations(track?: string): Promise<any[]> {
    try {
      const where: any = {};
      if (track) where.track = track;

      return await this.prisma.yksTopic.findMany({
        where,
        orderBy: { weight: 'desc' }
      });
    } catch (error) {
      this.logger.error(`Failed to get YKS recommendations: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * YKS dersleri ata
   */
  async assignYksSubjects(userId: string, data: { subjects: string[] }): Promise<any> {
    try {
      // Kullanıcının YKS derslerini güncelle
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          yksSubjects: data.subjects
        }
      });

      return {
        success: true,
        message: 'YKS subjects assigned successfully',
        user
      };
    } catch (error) {
      this.logger.error(`Failed to assign YKS subjects: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to assign YKS subjects');
    }
  }

  /**
   * Adaptif konu sırası
   */
  async getAdaptiveSequence(data: { userId: string; subjects: string[]; weeks: number }): Promise<any> {
    try {
      // Kullanıcının performans verilerini al
      const userPerformance = await this.prisma.studySession.findMany({
        where: {
          userId: data.userId,
          subject: { in: data.subjects }
        },
        select: {
          subject: true,
          performance: true,
          isCompleted: true
        }
      });

      // Performansa göre konu sırası oluştur
      const subjectPerformance = data.subjects.map(subject => {
        const sessions = userPerformance.filter(s => s.subject === subject);
        const avgPerformance = sessions.length > 0 
          ? sessions.reduce((sum, s) => sum + (s.performance || 0), 0) / sessions.length 
          : 0;
        
        return {
          subject,
          performance: avgPerformance,
          difficulty: avgPerformance < 5 ? 'hard' : avgPerformance < 7 ? 'medium' : 'easy'
        };
      });

      // Zor konuları önce, kolay konuları sonra sırala
      const sortedSubjects = subjectPerformance
        .sort((a, b) => a.performance - b.performance)
        .map(s => s.subject);

      return {
        success: true,
        sequence: sortedSubjects,
        performance: subjectPerformance
      };
    } catch (error) {
      this.logger.error(`Failed to get adaptive sequence: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to get adaptive sequence');
    }
  }
}
