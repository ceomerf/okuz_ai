import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class OutboxWorker {
  private readonly logger = new Logger(OutboxWorker.name);
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeGateway) {}

  // Basit çekme-işleme: API veya cron tarafından tetiklenebilir
  async processBatch(limit = 100) {
    const startTs = Date.now();
    const events = await this.prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    for (const ev of events) {
      try {
        await this.prisma.outboxEvent.update({ where: { id: ev.id }, data: { status: 'PROCESSING' } });
        const payload = {
          ...((ev.payload as any) || {}),
          eventVersion: ev.eventVersion || 1,
          aggregateType: ev.aggregateType,
          aggregateId: ev.aggregateId,
          eventType: ev.eventType,
          eventId: ev.id,
          createdAt: ev.createdAt,
        };
        // Kullanıcı kanalına publish
        try {
          (this.realtime as any)?.publishUserEvent?.(ev.userId, payload);
        } catch {}
        await this.prisma.outboxEvent.update({ where: { id: ev.id }, data: { status: 'PROCESSED', processedAt: new Date() } });
        const latencyMs = Date.now() - new Date(ev.createdAt).getTime();
        this.logger.log(`outbox_processed id=${ev.id} latency=${latencyMs}ms`);
      } catch (e) {
        const attempt = (ev.attemptCount || 0) + 1;
        await this.prisma.outboxEvent.update({ where: { id: ev.id }, data: { status: 'PENDING', attemptCount: attempt } });
        this.logger.warn(`Outbox event failed (attempt ${attempt}): ${ev.id}`);
      }
    }
    const tookMs = Date.now() - startTs;
    return { processed: events.length, tookMs };
  }
}


