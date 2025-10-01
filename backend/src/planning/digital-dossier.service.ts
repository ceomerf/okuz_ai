import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class DigitalDossierService {
  constructor(private readonly prisma: PrismaService) {}

  async buildUserDossier(userId: string, lookbackDays = 60): Promise<string> {
    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    const [user, sessions, exams, plans] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          role: true,
          studentProfile: { select: { grade: true, field: true, learningStyle: true, goals: true, weaknesses: true, interests: true } },
        },
      }),
      this.prisma.studySession.findMany({
        where: { userId, startTime: { gte: since } },
        select: { startTime: true, endTime: true, subject: true, topic: true, duration: true, isCompleted: true, metadata: true },
        orderBy: { startTime: 'desc' },
        take: 2000,
      }),
      this.prisma.examResult.findMany({
        where: { userId, createdAt: { gte: since } },
        select: { createdAt: true, subject: true, examType: true, score: true, totalScore: true, analysis: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      this.prisma.plan.findMany({
        where: { userId },
        select: { id: true, createdAt: true, isActive: true, type: true, subjects: true, goals: true, metadata: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const header = `USER PROFILE\nname: ${user?.name || ''}\nrole: ${user?.role || ''}\ngrade: ${user?.studentProfile?.grade ?? ''}\nfield: ${user?.studentProfile?.field ?? ''}\nlearningStyle: ${user?.studentProfile?.learningStyle ?? ''}\ngoals: ${(user?.studentProfile?.goals || []).join(', ')}\nweaknesses: ${(user?.studentProfile?.weaknesses || []).join(', ')}\ninterests: ${(user?.studentProfile?.interests || []).join(', ')}\n`;

    const sessionsBlock = ['STUDY SESSIONS (last ' + lookbackDays + ' days):']
      .concat(
        sessions.map((s) => {
          const md: any = s.metadata || {};
          const feedback = md.feedback || md.selfReport || '';
          const planned = md.plannedDuration || '';
          const breakAvg = md.avgBreakMinutes || '';
          return `- ${s.startTime?.toISOString()} | subject:${s.subject} | topic:${s.topic} | plannedMin:${planned} | durationMin:${s.duration} | completed:${s.isCompleted} | feedback:${feedback} | avgBreakMin:${breakAvg}`;
        })
      )
      .join('\n');

    const examsBlock = ['EXAMS (last ' + lookbackDays + ' days):']
      .concat(
        exams.map((e) => {
          const analysis = JSON.stringify(e.analysis || {});
          return `- ${e.createdAt?.toISOString()} | type:${e.examType} | subject:${e.subject} | score:${e.score}/${e.totalScore} | analysis:${analysis}`;
        })
      )
      .join('\n');

    const plansBlock = ['PLANS (recent):']
      .concat(
        plans.map((p) => `- ${p.createdAt?.toISOString()} | active:${p.isActive} | type:${p.type} | subjects:${(p.subjects || []).join(', ')} | goals:${(p.goals || []).join(', ')} | meta:${JSON.stringify(p.metadata || {})}`)
      )
      .join('\n');

    const dossier = [header, sessionsBlock, examsBlock, plansBlock].join('\n\n');
    return dossier;
  }
}


