import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export type OutboxEventInput = {
  userId: string;
  aggregateType: 'plan' | 'session';
  aggregateId: string;
  eventType: string; // e.g., PLAN_CREATED, SESSION_UPDATED
  eventVersion?: number;
  payload: Record<string, any>;
};

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(event: OutboxEventInput) {
    try {
      await this.prisma.outboxEvent.create({
        data: {
          userId: event.userId,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          eventType: event.eventType,
          eventVersion: event.eventVersion ?? 1,
          payload: event.payload as any,
          status: 'PENDING',
        },
      });
    } catch (e) {
      this.logger.error(`Failed to enqueue outbox event: ${(e as any)?.message || e}`);
    }
  }
}


