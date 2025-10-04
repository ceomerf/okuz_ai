import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface UserInsights {
  userId: string;
  avgSessionDurationMin: number;
  preferredStudyHours: string[];
  subjectTimeShare: Record<string, number>;
  completionRate: number; // 0-1
  avgBreakMinutes: number;
  subjectAffinity: Record<string, number>; // -1..1 tahmini sevme/kaçınma skoru
  recentExamScores: Record<string, number>; // subject -> 0..100 ortalama
}

@Injectable()
export class AdaptiveInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async computeUserInsights(userId: string): Promise<UserInsights> {
    const [sessions, exams] = await Promise.all([
      this.prisma.studySession.findMany({
        where: { userId },
        select: { subject: true, duration: true, startTime: true, endTime: true, isCompleted: true, metadata: true },
        orderBy: { startTime: 'desc' },
        take: 500,
      }),
      this.prisma.examResult.findMany({
        where: { userId },
        select: { subject: true, score: true, totalScore: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    const totalDuration = sessions.reduce((s, x) => s + (x.duration || 0), 0);
    const avgSessionDurationMin = sessions.length ? Math.round(totalDuration / sessions.length) : 40;

    const hourBuckets: Record<string, number> = {};
    const subjectDurations: Record<string, number> = {};
    let completedCount = 0;
    let avgBreakMinutes = 10;

    for (const s of sessions) {
      const h = (s.startTime ? new Date(s.startTime).getHours() : 18);
      const bucket = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
      hourBuckets[bucket] = (hourBuckets[bucket] || 0) + 1;
      subjectDurations[s.subject] = (subjectDurations[s.subject] || 0) + (s.duration || 0);
      if (s.isCompleted) completedCount++;
      const md = (s.metadata as any) || {};
      if (typeof md.avgBreakMinutes === 'number') avgBreakMinutes = md.avgBreakMinutes;
    }

    const preferredStudyHours = Object.entries(hourBuckets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([k]) => k);

    const totalBySubject = Object.values(subjectDurations).reduce((a, b) => a + b, 0) || 1;
    const subjectTimeShare = Object.fromEntries(
      Object.entries(subjectDurations).map(([k, v]) => [k, Math.round((v / totalBySubject) * 100)])
    );

    const completionRate = sessions.length ? completedCount / sessions.length : 0.8;

    // Basit sevgi/kaçınma skoru: süre payı (+), tamamlanmayan seans oranı (-)
    const subjectAffinity: Record<string, number> = {};
    for (const [subj, share] of Object.entries(subjectTimeShare)) {
      const subjSessions = sessions.filter((s) => s.subject === subj);
      const notCompleted = subjSessions.filter((s) => !s.isCompleted).length;
      const fatigue = subjSessions.length ? notCompleted / subjSessions.length : 0;
      const score = (Number(share) / 100) - fatigue * 0.5;
      subjectAffinity[subj] = Math.max(-1, Math.min(1, Number(score.toFixed(2))));
    }

    const scoreBySubject: Record<string, number[]> = {};
    for (const e of exams) {
      const pct = e.totalScore ? (e.score / e.totalScore) * 100 : e.score;
      if (!scoreBySubject[e.subject]) scoreBySubject[e.subject] = [];
      scoreBySubject[e.subject].push(pct);
    }
    const recentExamScores: Record<string, number> = Object.fromEntries(
      Object.entries(scoreBySubject).map(([k, arr]) => [k, Math.round(arr.slice(0, 5).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(5, arr.length)))])
    );

    return {
      userId,
      avgSessionDurationMin,
      preferredStudyHours,
      subjectTimeShare,
      completionRate: Number(completionRate.toFixed(2)),
      avgBreakMinutes,
      subjectAffinity,
      recentExamScores,
    };
  }
}


