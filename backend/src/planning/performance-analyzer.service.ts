import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class PerformanceAnalyzerService {
  constructor(private readonly prisma: PrismaService) {}

  // Konu/derse göre ustalık ve eksik alanları çıkar
  async analyzeUserPerformance(userId: string): Promise<{
    weakSubjects: string[];
    strongSubjects: string[];
    topicMastery: Record<string, number>;
  }> {
    const sessions = await (this.prisma as any).studySession.findMany({
      where: { userId },
      orderBy: { startTime: 'desc' },
      take: 200,
    });

    const subjectScores: Record<string, number[]> = {};
    const topicScores: Record<string, number[]> = {};
    const now = Date.now();
    const decay = (t: Date) => {
      const days = (now - t.getTime()) / (1000 * 60 * 60 * 24);
      const lambda = 0.05; // ~20 günde %37 ağırlık
      return Math.exp(-lambda * days);
    };
    for (const s of sessions) {
      if (s.performance == null) continue;
      const subj = s.subject || 'Genel';
      const topic = s.topic || `${subj}::Genel`;
      const w = decay(new Date(s.startTime));
      (subjectScores[subj] ||= []).push((s.performance as unknown as number) * w);
      (topicScores[topic] ||= []).push((s.performance as unknown as number) * w);
    }

    const avg = (arr: number[]) => arr.reduce((a,b)=>a+b,0) / (arr.length || 1);
    const weakSubjects: string[] = [];
    const strongSubjects: string[] = [];
    Object.entries(subjectScores).forEach(([k,v]) => {
      const a = avg(v);
      if (a < 70) weakSubjects.push(k);
      else if (a >= 85) strongSubjects.push(k);
    });

    const topicMastery: Record<string, number> = {};
    Object.entries(topicScores).forEach(([k,v]) => (topicMastery[k] = Math.max(0, Math.min(100, Math.round(avg(v))))));

    return { weakSubjects, strongSubjects, topicMastery };
  }
}


