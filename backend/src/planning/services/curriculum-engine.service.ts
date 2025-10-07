import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CurriculumEngineService {
  private readonly logger = new Logger(CurriculumEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCurriculumByGrade(grade: number): Promise<any[]> {
    try {
      return await this.prisma.mebTopic.findMany({
        where: { grade },
        orderBy: { month: 'asc' },
      });
    } catch (error) {
      this.logger.error(`Failed to get curriculum for grade ${grade}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async getCurriculumBySubject(subject: string, grade: number): Promise<any[]> {
    try {
      return await this.prisma.mebTopic.findMany({
        where: { subject, grade },
        orderBy: { month: 'asc' },
      });
    } catch (error) {
      this.logger.error(`Failed to get curriculum for subject ${subject}, grade ${grade}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async getTopicWeights(topicId: string): Promise<any[]> {
    try {
      return await this.prisma.topicWeight.findMany({
        where: { mebTopicId: topicId },
      });
    } catch (error) {
      this.logger.error(`Failed to get topic weights for ${topicId}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Önkoşul farkındalı konu sırası oluştur
   */
  async buildPrerequisiteAwareTopicOrder(subjects: string[], grade: number): Promise<any[]> {
    try {
      const topics = await this.prisma.mebTopic.findMany({
        where: {
          subject: { in: subjects },
          grade
        },
        include: {
          asTopicPrerequisites: {
            include: {
              prerequisite: true
            }
          }
        },
        orderBy: { month: 'asc' }
      });

      // Basit topological sort algoritması
      const sortedTopics: any[] = [];
      const visited = new Set();
      const visiting = new Set();

      const visit = (topic: any) => {
        if (visiting.has(topic.id)) {
          // Circular dependency detected
          return;
        }
        if (visited.has(topic.id)) {
          return;
        }

        visiting.add(topic.id);
        
            // Önce önkoşulları ziyaret et
            for (const prereq of topic.asTopicPrerequisites) {
              const prereqTopic = topics.find(t => t.id === prereq.prerequisiteId);
              if (prereqTopic) {
                visit(prereqTopic);
              }
            }

        visiting.delete(topic.id);
        visited.add(topic.id);
        sortedTopics.push(topic);
      };

      for (const topic of topics) {
        if (!visited.has(topic.id)) {
          visit(topic);
        }
      }

      return sortedTopics;
    } catch (error) {
      this.logger.error(`Failed to build prerequisite aware topic order: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
}
