import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class PlanningQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async buildTopicMetadataMap(): Promise<Map<string, { examWeight: number | null; difficultyDist: number[]; prerequisites: string[] }>> {
    const map = new Map<string, { examWeight: number | null; difficultyDist: number[]; prerequisites: string[] }>();
    const topics = await (this.prisma as any).mebTopic.findMany({
      include: { weights: true, asPrerequisiteOf: { include: { topic: true } } },
    });

    for (const t of topics) {
      const key = `${t.subject}::${t.topic}`;
      const examWeight = Array.isArray(t.weights) && t.weights.length > 0
        ? Math.max(...t.weights.map((w: any) => Number(w.weight || 0)))
        : null;
      let difficultyDist: number[] = [];
      if (Array.isArray(t.weights) && t.weights.length > 0) {
        const byMax = t.weights.reduce((acc: any, cur: any) => (Number(cur.weight || 0) > Number(acc.weight || 0) ? cur : acc), t.weights[0]);
        const dist = byMax?.difficultyDist;
        if (Array.isArray(dist)) difficultyDist = dist as number[];
      }
      const prerequisites: string[] = Array.isArray(t.asPrerequisiteOf)
        ? t.asPrerequisiteOf.map((edge: any) => `${edge.prerequisite.subject || t.subject}::${edge.prerequisite?.topic || ''}`).filter(Boolean)
        : [];
      map.set(key, { examWeight, difficultyDist, prerequisites });
    }
    return map;
  }
}


