import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ScheduleAdjustmentService {
  constructor(private readonly prisma: PrismaService) {}

  async rescheduleSession(input: { userId: string; sessionId: string; newStartTime: Date; duration?: number }) {
    const session = await this.prisma.studySession.findFirst({ where: { id: input.sessionId, userId: input.userId } });
    if (!session) throw new NotFoundException('Session not found');
    if (input.newStartTime.getTime() < Date.now() - 24 * 60 * 60 * 1000) throw new BadRequestException('Backdating is not allowed');
    return this.prisma.studySession.update({
      where: { id: input.sessionId },
      data: {
        startTime: input.newStartTime,
        duration: typeof input.duration === 'number' ? Math.max(15, Math.min(input.duration, 240)) : session.duration,
        metadata: {
          ...(session.metadata as any || {}),
          rescheduledAt: new Date(),
        },
      },
    });
  }

  async completeSession(input: { userId: string; sessionId: string; performance?: number }) {
    const session = await this.prisma.studySession.findFirst({ where: { id: input.sessionId, userId: input.userId } });
    if (!session) throw new NotFoundException('Session not found');
    return this.prisma.studySession.update({
      where: { id: input.sessionId },
      data: {
        isCompleted: true,
        endTime: new Date(),
        performance: typeof input.performance === 'number' ? Math.max(0, Math.min(100, input.performance)) : session.performance,
        metadata: {
          ...(session.metadata as any || {}),
          completedAt: new Date(),
        },
      },
    });
  }

  async cancelSession(input: { userId: string; sessionId: string; reason?: string }) {
    const session = await this.prisma.studySession.findFirst({ where: { id: input.sessionId, userId: input.userId } });
    if (!session) throw new NotFoundException('Session not found');
    return this.prisma.studySession.update({
      where: { id: input.sessionId },
      data: {
        metadata: {
          ...(session.metadata as any || {}),
          cancelledAt: new Date(),
          cancelReason: input.reason || 'unspecified',
        },
      },
    });
  }

  async updateTaskProgress(input: { userId: string; taskId: string; minutes: number }) {
    if (!input.taskId || typeof input.minutes !== 'number') {
      throw new BadRequestException('Geçersiz parametreler');
    }
    const session = await this.prisma.studySession.findFirst({ select: { id: true, userId: true, duration: true, metadata: true }, where: { id: input.taskId, userId: input.userId } });
    if (!session) throw new NotFoundException('Session not found');
    const updated = await this.prisma.studySession.update({
      where: { id: input.taskId },
      data: {
        duration: Math.max(0, (session.duration || 0) + input.minutes),
        metadata: {
          ...(session.metadata as any || {}),
          progressUpdatedAt: new Date(),
          lastProgressDeltaMin: input.minutes,
        },
      },
      select: { id: true, userId: true, duration: true },
    });
    return updated;
  }
}


