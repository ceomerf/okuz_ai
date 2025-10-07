import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

export interface StreamMessage {
  id: string;
  stream: string;
  fields: Record<string, string>;
  timestamp: number;
}

@Injectable()
export class RedisStreamsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisStreamsService.name);
  private redis!: Redis;
  private consumerGroup!: string;
  private consumerName!: string;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      // Initialize Redis
      const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://127.0.0.1:6379';
      this.redis = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      // Consumer configuration
      this.consumerGroup = 'planning-service-group';
      this.consumerName = `planning-consumer-${process.pid}`;

      // Connect to Redis
      await this.redis.connect();

      // Create consumer groups
      await this.createConsumerGroups();

      // Start consuming
      await this.startConsuming();

      this.logger.log('Redis Streams Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Redis Streams Service:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.redis?.disconnect();
      this.logger.log('Redis Streams Service disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting Redis Streams Service:', error);
    }
  }

  /**
   * Create consumer groups for all streams
   */
  private async createConsumerGroups(): Promise<void> {
    const streams = [
      'planning-events',
      'user-events',
      'gamification-events',
      'notification-events',
    ];

    for (const stream of streams) {
      try {
        await this.redis.xgroup('CREATE', stream, this.consumerGroup, '0', 'MKSTREAM');
        this.logger.log(`Consumer group created for stream: ${stream}`);
      } catch (error) {
        const msg = (error instanceof Error ? error.message : String(error));
        if (msg.includes('BUSYGROUP')) {
          this.logger.log(`Consumer group already exists for stream: ${stream}`);
        } else {
          this.logger.error(`Failed to create consumer group for stream ${stream}: ${msg}`);
        }
      }
    }
  }

  /**
   * Start consuming from streams
   */
  private async startConsuming(): Promise<void> {
    const streams = [
      'planning-events',
      'user-events',
      'gamification-events',
      'notification-events',
    ];

    // Start consuming from all streams
    setInterval(async () => {
      try {
        const messages = await this.redis.xreadgroup(
          'GROUP',
          this.consumerGroup,
          this.consumerName,
          'COUNT',
          '10',
          'BLOCK',
          '1000',
          'STREAMS',
          ...streams,
          ...streams.map(() => '>'),
        );

        if (Array.isArray(messages)) {
          for (const entry of messages as any[]) {
            const [streamName, streamMessages] = entry;
            for (const sm of streamMessages as any[]) {
              const [messageId, fields] = sm;
              await this.handleMessage(streamName, messageId, fields as Record<string, string>);
            }
          }
        }
      } catch (error) {
        this.logger.error(`Error consuming from streams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }, 1000);
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(stream: string, messageId: string, fields: Record<string, string>): Promise<void> {
    try {
      this.logger.log(`Handling message ${messageId} from stream ${stream}`);

      const message: StreamMessage = {
        id: messageId,
        stream,
        fields,
        timestamp: Date.now(),
      };

      // Handle specific stream messages
      switch (stream) {
        case 'planning-events':
          await this.handlePlanningEvent(message);
          break;
        case 'user-events':
          await this.handleUserEvent(message);
          break;
        case 'gamification-events':
          await this.handleGamificationEvent(message);
          break;
        case 'notification-events':
          await this.handleNotificationEvent(message);
          break;
        default:
          this.logger.warn(`Unknown stream: ${stream}`);
      }

      // Acknowledge message
      await this.redis.xack(stream, this.consumerGroup, messageId);
    } catch (error) {
      this.logger.error(`Error handling message ${messageId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stream message handlers
   */
  private async handlePlanningEvent(message: StreamMessage): Promise<void> {
    const eventType = message.fields['event-type'];
    this.logger.log(`Handling planning event: ${eventType}`);

    switch (eventType) {
      case 'plan.created':
        await this.handlePlanCreated(message);
        break;
      case 'plan.updated':
        await this.handlePlanUpdated(message);
        break;
      case 'plan.deleted':
        await this.handlePlanDeleted(message);
        break;
      case 'session.completed':
        await this.handleSessionCompleted(message);
        break;
      default:
        this.logger.warn(`Unknown planning event type: ${eventType}`);
    }
  }

  private async handleUserEvent(message: StreamMessage): Promise<void> {
    const eventType = message.fields['event-type'];
    this.logger.log(`Handling user event: ${eventType}`);

    switch (eventType) {
      case 'user.created':
        await this.handleUserCreated(message);
        break;
      case 'user.updated':
        await this.handleUserUpdated(message);
        break;
      case 'user.deleted':
        await this.handleUserDeleted(message);
        break;
      default:
        this.logger.warn(`Unknown user event type: ${eventType}`);
    }
  }

  private async handleGamificationEvent(message: StreamMessage): Promise<void> {
    const eventType = message.fields['event-type'];
    this.logger.log(`Handling gamification event: ${eventType}`);

    switch (eventType) {
      case 'achievement.earned':
        await this.handleAchievementEarned(message);
        break;
      case 'points.updated':
        await this.handlePointsUpdated(message);
        break;
      default:
        this.logger.warn(`Unknown gamification event type: ${eventType}`);
    }
  }

  private async handleNotificationEvent(message: StreamMessage): Promise<void> {
    const eventType = message.fields['event-type'];
    this.logger.log(`Handling notification event: ${eventType}`);

    switch (eventType) {
      case 'notification.sent':
        await this.handleNotificationSent(message);
        break;
      case 'notification.failed':
        await this.handleNotificationFailed(message);
        break;
      default:
        this.logger.warn(`Unknown notification event type: ${eventType}`);
    }
  }

  /**
   * Event handlers
   */
  private async handlePlanCreated(message: StreamMessage): Promise<void> {
    this.logger.log(`Plan created: ${message.fields['plan-id']}`);
    // Handle plan creation logic
  }

  private async handlePlanUpdated(message: StreamMessage): Promise<void> {
    this.logger.log(`Plan updated: ${message.fields['plan-id']}`);
    // Handle plan update logic
  }

  private async handlePlanDeleted(message: StreamMessage): Promise<void> {
    this.logger.log(`Plan deleted: ${message.fields['plan-id']}`);
    // Handle plan deletion logic
  }

  private async handleSessionCompleted(message: StreamMessage): Promise<void> {
    this.logger.log(`Session completed: ${message.fields['session-id']}`);
    // Handle session completion logic
  }

  private async handleUserCreated(message: StreamMessage): Promise<void> {
    this.logger.log(`User created: ${message.fields['user-id']}`);
    // Handle user creation logic
  }

  private async handleUserUpdated(message: StreamMessage): Promise<void> {
    this.logger.log(`User updated: ${message.fields['user-id']}`);
    // Handle user update logic
  }

  private async handleUserDeleted(message: StreamMessage): Promise<void> {
    this.logger.log(`User deleted: ${message.fields['user-id']}`);
    // Handle user deletion logic
  }

  private async handleAchievementEarned(message: StreamMessage): Promise<void> {
    this.logger.log(`Achievement earned: ${message.fields['achievement-id']}`);
    // Handle achievement logic
  }

  private async handlePointsUpdated(message: StreamMessage): Promise<void> {
    this.logger.log(`Points updated: ${message.fields['user-id']}`);
    // Handle points update logic
  }

  private async handleNotificationSent(message: StreamMessage): Promise<void> {
    this.logger.log(`Notification sent: ${message.fields['notification-id']}`);
    // Handle notification sent logic
  }

  private async handleNotificationFailed(message: StreamMessage): Promise<void> {
    this.logger.log(`Notification failed: ${message.fields['notification-id']}`);
    // Handle notification failure logic
  }

  /**
   * Publish message to stream
   */
  async publishMessage(stream: string, fields: Record<string, string>): Promise<string> {
    try {
      const messageId = await this.redis.xadd(stream, '*', ...Object.entries(fields).flat());
      this.logger.log(`Message published to stream ${stream}: ${messageId}`);
      return messageId;
    } catch (error) {
      this.logger.error(`Failed to publish message to stream ${stream}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Publish planning events
   */
  async publishPlanCreated(planId: string, userId: string, planData: any): Promise<string> {
    return this.publishMessage('planning-events', {
      'event-type': 'plan.created',
      'plan-id': planId,
      'user-id': userId,
      'plan-data': JSON.stringify(planData),
      'timestamp': new Date().toISOString(),
    });
  }

  async publishPlanUpdated(planId: string, userId: string, updateData: any): Promise<string> {
    return this.publishMessage('planning-events', {
      'event-type': 'plan.updated',
      'plan-id': planId,
      'user-id': userId,
      'update-data': JSON.stringify(updateData),
      'timestamp': new Date().toISOString(),
    });
  }

  async publishSessionCompleted(sessionId: string, userId: string, sessionData: any): Promise<string> {
    return this.publishMessage('planning-events', {
      'event-type': 'session.completed',
      'session-id': sessionId,
      'user-id': userId,
      'session-data': JSON.stringify(sessionData),
      'timestamp': new Date().toISOString(),
    });
  }
}
