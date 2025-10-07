import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
// Kafka opsiyonel
let KafkaLib: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  KafkaLib = require('kafkajs');
} catch (_) {
  KafkaLib = null;
}
type Kafka = any; type Producer = any; type Consumer = any;

export interface PlanningEvent {
  id: string;
  type: string;
  service: string;
  timestamp: Date;
  data: any;
  metadata?: Record<string, any>;
}

@Injectable()
export class EventBusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventBusService.name);
  private kafka!: Kafka;
  private producer!: Producer;
  private consumer!: Consumer;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    try {
      // Initialize Kafka if available
      if (!KafkaLib) {
        this.logger.warn('kafkajs not installed - EventBusService will run in no-op mode');
        return;
      }
      this.kafka = new KafkaLib.Kafka({
        clientId: 'planning-service',
        brokers: [this.configService.get<string>('EVENT_BUS_URL') as string],
        retry: { initialRetryTime: 100, retries: 8 },
      });

      // Create producer
      this.producer = this.kafka.producer({
        maxInFlightRequests: 1,
        idempotent: true,
        transactionTimeout: 30000,
      });

      // Create consumer
      this.consumer = this.kafka.consumer({
        groupId: 'planning-service-group',
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
      });

      // Connect
      await this.producer.connect();
      await this.consumer.connect();

      // Subscribe to topics
      await this.subscribeToTopics();

      this.logger.log('Event Bus Service initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize Event Bus Service: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.consumer?.disconnect();
      await this.producer?.disconnect();
      this.logger.log('Event Bus Service disconnected');
    } catch (error) {
      this.logger.error(`Error disconnecting Event Bus Service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Publish event to event bus
   */
  async publishEvent(event: PlanningEvent): Promise<void> {
    try {
      if (!this.producer) {
        this.logger.debug('No-op publishEvent (producer not initialized)');
        return;
      }
      const topic = this.configService.get<string>('EVENT_BUS_TOPIC') as string;
      
      await this.producer.send({
        topic,
        messages: [
          {
            key: event.id,
            value: JSON.stringify(event),
            headers: {
              'event-type': event.type,
              'service': event.service,
              'timestamp': event.timestamp.toISOString(),
            },
          },
        ],
      });

      this.logger.log(`Event published: ${event.type} (${event.id})`);
    } catch (error) {
      this.logger.error(`Failed to publish event: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Subscribe to event bus topics
   */
  private async subscribeToTopics(): Promise<void> {
    const topics = [
      'user-events',
      'planning-events',
      'gamification-events',
      'notification-events',
    ];

    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
    }

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }: any) => {
        try {
          const event = JSON.parse(message.value.toString());
          await this.handleEvent(event);
        } catch (error) {
          this.logger.error(`Error processing message from ${topic}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      },
    });
  }

  /**
   * Handle incoming events
   */
  private async handleEvent(event: PlanningEvent): Promise<void> {
    try {
      this.logger.log(`Handling event: ${event.type} from ${event.service}`);

      // Emit local event
      this.eventEmitter.emit(event.type, event);

      // Handle specific event types
      switch (event.type) {
        case 'user.created':
          await this.handleUserCreated(event);
          break;
        case 'user.updated':
          await this.handleUserUpdated(event);
          break;
        case 'user.deleted':
          await this.handleUserDeleted(event);
          break;
        case 'planning.plan.created':
          await this.handlePlanCreated(event);
          break;
        case 'planning.plan.updated':
          await this.handlePlanUpdated(event);
          break;
        case 'planning.plan.deleted':
          await this.handlePlanDeleted(event);
          break;
        case 'planning.session.completed':
          await this.handleSessionCompleted(event);
          break;
        case 'gamification.achievement.earned':
          await this.handleAchievementEarned(event);
          break;
        default:
          this.logger.warn(`Unknown event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Error handling event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Event handlers
   */
  private async handleUserCreated(event: PlanningEvent): Promise<void> {
    this.logger.log(`User created: ${event.data.userId}`);
    // Handle user creation logic
  }

  private async handleUserUpdated(event: PlanningEvent): Promise<void> {
    this.logger.log(`User updated: ${event.data.userId}`);
    // Handle user update logic
  }

  private async handleUserDeleted(event: PlanningEvent): Promise<void> {
    this.logger.log(`User deleted: ${event.data.userId}`);
    // Handle user deletion logic
  }

  private async handlePlanCreated(event: PlanningEvent): Promise<void> {
    this.logger.log(`Plan created: ${event.data.planId}`);
    // Handle plan creation logic
  }

  private async handlePlanUpdated(event: PlanningEvent): Promise<void> {
    this.logger.log(`Plan updated: ${event.data.planId}`);
    // Handle plan update logic
  }

  private async handlePlanDeleted(event: PlanningEvent): Promise<void> {
    this.logger.log(`Plan deleted: ${event.data.planId}`);
    // Handle plan deletion logic
  }

  private async handleSessionCompleted(event: PlanningEvent): Promise<void> {
    this.logger.log(`Session completed: ${event.data.sessionId}`);
    // Handle session completion logic
  }

  private async handleAchievementEarned(event: PlanningEvent): Promise<void> {
    this.logger.log(`Achievement earned: ${event.data.achievementId}`);
    // Handle achievement logic
  }

  /**
   * Create and publish planning events
   */
  async publishPlanCreated(planId: string, userId: string, planData: any): Promise<void> {
    const event: PlanningEvent = {
      id: `plan-created-${planId}`,
      type: 'planning.plan.created',
      service: 'planning-service',
      timestamp: new Date(),
      data: {
        planId,
        userId,
        planData,
      },
    };

    await this.publishEvent(event);
  }

  async publishPlanUpdated(planId: string, userId: string, updateData: any): Promise<void> {
    const event: PlanningEvent = {
      id: `plan-updated-${planId}`,
      type: 'planning.plan.updated',
      service: 'planning-service',
      timestamp: new Date(),
      data: {
        planId,
        userId,
        updateData,
      },
    };

    await this.publishEvent(event);
  }

  async publishSessionCompleted(sessionId: string, userId: string, sessionData: any): Promise<void> {
    const event: PlanningEvent = {
      id: `session-completed-${sessionId}`,
      type: 'planning.session.completed',
      service: 'planning-service',
      timestamp: new Date(),
      data: {
        sessionId,
        userId,
        sessionData,
      },
    };

    await this.publishEvent(event);
  }
}