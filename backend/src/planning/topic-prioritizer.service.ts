import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TopicPrioritizerService {
  constructor(private readonly prisma: PrismaService) {}

  // YKS ağırlıkları ve performans eksiklerine göre konu önceliği skorla
  async prioritizeTopics(topicOrder: string[], examFocus: 'TYT' | 'AYT' | 'GENEL' = 'GENEL', topicMastery?: Record<string, number>): Promise<string[]> {
    const list = [...topicOrder];
    const mastery = topicMastery || {};
    const items = await this.prisma.mebTopic.findMany({
      where: {
        OR: list.map(t => {
          const [subject, topic] = t.split('::');
          return { subject, topic };
        })
      },
      select: { subject: true, topic: true, tytWeight: true, aytWeight: true },
    });
    const weightMap = new Map(items.map(i => [`${i.subject}::${i.topic}`, i] as const));

    const score = (key: string) => {
      const data = weightMap.get(key as any);
      const base = examFocus === 'TYT' ? (data?.tytWeight || 0) : examFocus === 'AYT' ? (data?.aytWeight || 0) : ((data?.tytWeight || 0) + (data?.aytWeight || 0));
      const masteryScore = mastery[key] != null ? (100 - mastery[key]) : 10; // düşük ustalık daha yüksek öncelik
      return base * 2 + masteryScore;
    };

    return list.sort((a,b) => score(b) - score(a));
  }
}


