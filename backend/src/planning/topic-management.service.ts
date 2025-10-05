import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TopicManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async getTopicsBySubjectAndGrade(subject: string, grade: number) {
    return this.prisma.topic.findMany({
      where: {
        subject,
        grade,
      },
      select: {
        id: true,
        topic: true,
        subject: true,
        grade: true,
        description: true,
        month: true,
        outcomes: true,
        tytWeight: true,
        aytWeight: true,
      },
    });
  }

  async buildTopicMetadataMap(): Promise<Map<string, { examWeight: number | null; difficultyDist: number[]; prerequisites: string[] }>> {
    const map = new Map();
    
    const topics = await this.prisma.topic.findMany({
      select: {
        id: true,
        topic: true,
        tytWeight: true,
        aytWeight: true,
        outcomes: true,
      },
    });

    topics.forEach(topic => {
      const examWeight = (topic.tytWeight || 0) + (topic.aytWeight || 0);
      const difficultyDist = [0.3, 0.4, 0.3]; // easy, medium, hard
      const prerequisites = topic.outcomes || [];
      
      map.set(topic.topic, {
        examWeight,
        difficultyDist,
        prerequisites,
      });
    });

    return map;
  }

  async buildCurriculumTopicPool(
    subjects: string[],
    grade: number,
    overrideTopics?: Record<string, string[]>,
    dateWindow?: { startDate?: Date; endDate?: Date }
  ): Promise<Record<string, string[]>> {
    const pool: Record<string, string[]> = {};
    
    for (const subject of subjects) {
      if (overrideTopics?.[subject]) {
        pool[subject] = overrideTopics[subject];
        continue;
      }

      const monthFilter: Record<string, unknown> = {};
      if (dateWindow?.startDate) {
        const startMonth = dateWindow.startDate.getMonth() + 1;
        const endMonth = (dateWindow.endDate?.getMonth() ?? -1) + 1 || startMonth;
        monthFilter.month = { gte: startMonth, lte: endMonth };
      }

      const where: Record<string, unknown> = {
        subject,
        grade,
        ...monthFilter,
      };

      const topics = await this.prisma.topic.findMany({
        where,
        select: { topic: true },
        orderBy: { month: 'asc' },
      });

      if (topics.length > 0) {
        pool[subject] = topics.map(t => t.topic);
      } else {
        // Fallback: tüm konuları al
        const relaxedWhere1 = { subject, grade };
        const relaxedWhere2 = { subject };
        
        const fallbackTopics = await this.prisma.topic.findMany({
          where: relaxedWhere1,
          select: { topic: true },
        });

        if (fallbackTopics.length === 0) {
          const allTopics = await this.prisma.topic.findMany({
            where: relaxedWhere2,
            select: { topic: true },
          });
          pool[subject] = allTopics.map(t => t.topic);
        } else {
          pool[subject] = fallbackTopics.map(t => t.topic);
        }
      }
    }

    return pool;
  }

  generateSyntheticTopics(
    subject: string,
    grade: number,
    dateWindow?: { startDate?: Date; endDate?: Date }
  ): string[] {
    const monthNames = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
    const start = dateWindow?.startDate;
    const months: number[] = (() => {
      if (!start) return [];
      const end = dateWindow?.endDate || new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000);
      const arr: number[] = [];
      const s = start.getMonth();
      const e = end.getMonth();
      for (let m = s; m <= e; m++) arr.push(((m % 12) + 12) % 12);
      return arr;
    })();

    const baseTemplates = [
      `${subject} - Temel Kavramlar (${grade}. Sınıf)`,
      `${subject} - Güncel Konu Tekrarı`,
      `${subject} - Çıkmış Sorulara Giriş`,
      `${subject} - Hata Analizi ve Pekiştirme`,
      `${subject} - Genel Tekrar ve Mini Quiz`,
    ];

    const monthTagged = months.map(m => `${subject} - ${monthNames[m]} Çalışma Planı`);
    const synthetic = [...baseTemplates, ...monthTagged];
    return synthetic.slice(0, 10);
  }

  calculateTopicDifficulty(topic: string, subject: string): number {
    const difficultyKeywords = {
      'temel': 1,
      'giriş': 1,
      'basit': 1,
      'kolay': 1,
      'orta': 2,
      'ileri': 3,
      'uzman': 3,
      'karmaşık': 3,
      'zor': 3,
    };

    const topicLower = topic.toLowerCase();
    for (const [keyword, difficulty] of Object.entries(difficultyKeywords)) {
      if (topicLower.includes(keyword)) {
        return difficulty;
      }
    }

    return 2; // Default medium difficulty
  }

  determineSubjectFromTopic(topic: string, subjects: string[]): string {
    const subjectKeywords: Record<string, string[]> = {
      'Matematik': ['matematik', 'mat', 'sayı', 'denklem', 'fonksiyon', 'geometri'],
      'Fizik': ['fizik', 'fiz', 'kuvvet', 'enerji', 'dalga', 'elektrik'],
      'Kimya': ['kimya', 'kim', 'molekül', 'reaksiyon', 'asit', 'baz'],
      'Biyoloji': ['biyoloji', 'bio', 'hücre', 'dna', 'genetik', 'evrim'],
      'Türkçe': ['türkçe', 'dil', 'edebiyat', 'şiir', 'roman', 'hikaye'],
      'Tarih': ['tarih', 'tarihi', 'savaş', 'devrim', 'medeniyet'],
      'Coğrafya': ['coğrafya', 'coğ', 'harita', 'iklim', 'nüfus'],
    };

    for (const [subject, keywords] of Object.entries(subjectKeywords)) {
      if (subjects.includes(subject)) {
        for (const keyword of keywords) {
          if (topic.toLowerCase().includes(keyword)) {
            return subject;
          }
        }
      }
    }

    return subjects[0] || 'Genel';
  }

  async getTopicsByGrade(grade: number) {
    try {
      const topics = await this.prisma.topic.findMany({
        where: { grade },
        orderBy: { month: 'asc' }
      });
      return { message: 'Topics found', topics };
    } catch (error) {
      throw new Error('Failed to get topics by grade');
    }
  }

  async getTopicsBySubject(subject: string) {
    try {
      const topics = await this.prisma.topic.findMany({
        where: { subject },
        orderBy: { month: 'asc' }
      });
      return { message: 'Topics found', topics };
    } catch (error) {
      throw new Error('Failed to get topics by subject');
    }
  }

  async createTopic(data: any) {
    try {
      const topic = await this.prisma.topic.create({
        data: {
          topic: data.topic,
          subject: data.subject,
          grade: data.grade,
          description: data.description,
          month: data.month,
          outcomes: data.outcomes || [],
          tytWeight: data.tytWeight,
          aytWeight: data.aytWeight
        }
      });
      return { message: 'Topic created', topic };
    } catch (error) {
      throw new Error('Failed to create topic');
    }
  }

  async updateTopic(id: string, data: any) {
    try {
      const topic = await this.prisma.topic.update({
        where: { id },
        data
      });
      return { message: 'Topic updated', topic };
    } catch (error) {
      throw new Error('Failed to update topic');
    }
  }

  async deleteTopic(id: string) {
    try {
      await this.prisma.topic.delete({
        where: { id }
      });
      return { message: 'Topic deleted' };
    } catch (error) {
      throw new Error('Failed to delete topic');
    }
  }

  async getCurriculum(grade: number) {
    try {
      const curriculum = await this.prisma.topic.findMany({
        where: { grade },
        orderBy: [
          { subject: 'asc' },
          { month: 'asc' }
        ]
      });
      return { message: 'Curriculum found', curriculum };
    } catch (error) {
      throw new Error('Failed to get curriculum');
    }
  }
}
