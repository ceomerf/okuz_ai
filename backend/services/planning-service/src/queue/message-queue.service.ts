import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// Kafka opsiyonel; paket yoksa no-op çalışır
let KafkaLib: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  KafkaLib = require('kafkajs');
} catch (_) {
  KafkaLib = null;
}
type Kafka = any; type Producer = any; type Consumer = any;

export interface QueueMessage {
  id: string;
  type: string;
  service: string;
  timestamp: Date;
  data: any;
  retryCount?: number;
  maxRetries?: number;
  priority?: number;
}

@Injectable()
export class MessageQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessageQueueService.name);
  private kafka!: Kafka;
  private producer!: Producer;
  private consumer!: Consumer;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      // Initialize Kafka
      if (!KafkaLib) {
        this.logger.warn('kafkajs not installed - MessageQueueService will run in no-op mode');
        return;
      }
      this.kafka = new KafkaLib.Kafka({
        clientId: 'planning-service-queue',
        brokers: [this.configService.get<string>('MESSAGE_QUEUE_URL') as string],
        retry: {
          initialRetryTime: 100,
          retries: 8,
        },
      });

      // Create producer
      this.producer = this.kafka.producer({
        maxInFlightRequests: 1,
        idempotent: true,
        transactionTimeout: 30000,
      });

      // Create consumer
      this.consumer = this.kafka.consumer({
        groupId: 'planning-service-queue-group',
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
      });

      // Connect
      await this.producer.connect();
      await this.consumer.connect();

      // Subscribe to topics
      await this.subscribeToTopics();

      this.logger.log('Message Queue Service initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize Message Queue Service: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.consumer?.disconnect();
      await this.producer?.disconnect();
      this.logger.log('Message Queue Service disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting Message Queue Service:', error);
    }
  }

  /**
   * Send message to queue
   */
  async sendMessage(message: QueueMessage): Promise<void> {
    try {
      if (!this.producer) {
        this.logger.debug('No-op sendMessage (producer not initialized)');
        return;
      }
      const topic = this.configService.get<string>('MESSAGE_QUEUE_TOPIC') as string;
      
      await this.producer.send({
        topic,
        messages: [
          {
            key: message.id,
            value: JSON.stringify(message),
            headers: {
              'message-type': message.type,
              'service': message.service,
              'timestamp': message.timestamp.toISOString(),
              'retry-count': message.retryCount?.toString() || '0',
              'max-retries': message.maxRetries?.toString() || '3',
              'priority': message.priority?.toString() || '0',
            },
          },
        ],
      });

      this.logger.log(`Message sent: ${message.type} (${message.id})`);
    } catch (error) {
      this.logger.error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * BullMQ benzeri arayüzle kuyruk ekleme uyumluluğu
   */
  async add(jobType: string, payload: any): Promise<void> {
    await this.sendMessage({
      id: `${jobType}-${Date.now()}`,
      type: jobType,
      service: 'planning-service',
      timestamp: new Date(),
      data: payload,
      maxRetries: 3,
    });
  }

  /**
   * Subscribe to queue topics
   */
  private async subscribeToTopics(): Promise<void> {
    const topics = [
      'planning-queue',
      'ai-queue',
      'gamification-queue',
      'notification-queue',
    ];

    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
    }

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }: any) => {
        try {
          const queueMessage = JSON.parse(message.value.toString());
          await this.handleMessage(queueMessage);
        } catch (error) {
          this.logger.error(`Error processing message from ${topic}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      },
    });
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(message: QueueMessage): Promise<void> {
    try {
      this.logger.log(`Handling message: ${message.type} from ${message.service}`);

      // Handle specific message types
      switch (message.type) {
        case 'planning.generate-plan':
          await this.handleGeneratePlan(message);
          break;
        case 'planning.optimize-plan':
          await this.handleOptimizePlan(message);
          break;
        case 'planning.validate-plan':
          await this.handleValidatePlan(message);
          break;
        case 'planning.analyze-progress':
          await this.handleAnalyzeProgress(message);
          break;
        case 'ai.process-request':
          await this.handleAIRequest(message);
          break;
        case 'gamification.update-points':
          await this.handleUpdatePoints(message);
          break;
        case 'notification.send':
          await this.handleSendNotification(message);
          break;
        default:
          this.logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      this.logger.error(`Error handling message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Retry logic
      if ((message.retryCount || 0) < (message.maxRetries || 3)) {
        await this.retryMessage(message);
      } else {
        await this.handleFailedMessage(message);
      }
    }
  }

  /**
   * Message handlers
   */
  private async handleGeneratePlan(message: QueueMessage): Promise<void> {
    this.logger.log(`Generating plan for user: ${message.data.userId}`);
    // Handle plan generation logic
  }

  private async handleOptimizePlan(message: QueueMessage): Promise<void> {
    this.logger.log(`Optimizing plan: ${message.data.planId}`);
    // Handle plan optimization logic
  }

  private async handleValidatePlan(message: QueueMessage): Promise<void> {
    this.logger.log(`Validating plan: ${message.data.planId}`);
    // Handle plan validation logic
  }

  private async handleAnalyzeProgress(message: QueueMessage): Promise<void> {
    this.logger.log(`Analyzing progress for user: ${message.data.userId}`);
    // Handle progress analysis logic
  }

  private async handleAIRequest(message: QueueMessage): Promise<void> {
    this.logger.log(`Processing AI request: ${message.data.requestId}`);
    // Handle AI request logic
  }

  private async handleUpdatePoints(message: QueueMessage): Promise<void> {
    this.logger.log(`Updating points for user: ${message.data.userId}`);
    // Handle points update logic
  }

  private async handleSendNotification(message: QueueMessage): Promise<void> {
    this.logger.log(`Sending notification: ${message.data.notificationId}`);
    // Handle notification logic
  }

  /**
   * Retry failed message
   */
  private async retryMessage(message: QueueMessage): Promise<void> {
    const retryMessage: QueueMessage = {
      ...message,
      retryCount: (message.retryCount || 0) + 1,
      timestamp: new Date(),
    };

    // Exponential backoff
    const delay = Math.pow(2, retryMessage.retryCount || 1) * 1000;
    setTimeout(async () => {
      await this.sendMessage(retryMessage);
    }, delay);

    this.logger.log(`Retrying message ${message.id} (attempt ${retryMessage.retryCount})`);
  }

  /**
   * Handle permanently failed message
   */
  private async handleFailedMessage(message: QueueMessage): Promise<void> {
    this.logger.error(`Message ${message.id} failed permanently after ${message.retryCount} retries`);
    
    // Send to dead letter queue or error handling service
    await this.sendToDeadLetterQueue(message);
  }

  /**
   * Send message to dead letter queue
   */
  private async sendToDeadLetterQueue(message: QueueMessage): Promise<void> {
    try {
      const deadLetterMessage: QueueMessage = {
        ...message,
        type: 'dead-letter',
        timestamp: new Date(),
      };

      await this.producer.send({
        topic: 'dead-letter-queue',
        messages: [
          {
            key: message.id,
            value: JSON.stringify(deadLetterMessage),
            headers: {
              'original-type': message.type,
              'failed-at': new Date().toISOString(),
            },
          },
        ],
      });

      this.logger.log(`Message ${message.id} sent to dead letter queue`);
    } catch (error) {
      this.logger.error('Failed to send message to dead letter queue:', error);
    }
  }

  /**
   * Create and send planning messages
   */
  async sendGeneratePlanRequest(userId: string, planData: any): Promise<void> {
    const message: QueueMessage = {
      id: `generate-plan-${userId}-${Date.now()}`,
      type: 'planning.generate-plan',
      service: 'planning-service',
      timestamp: new Date(),
      data: {
        userId,
        planData,
      },
      maxRetries: 3,
      priority: 1,
    };

    await this.sendMessage(message);
  }

  async sendOptimizePlanRequest(planId: string, optimizationData: any): Promise<void> {
    const message: QueueMessage = {
      id: `optimize-plan-${planId}-${Date.now()}`,
      type: 'planning.optimize-plan',
      service: 'planning-service',
      timestamp: new Date(),
      data: {
        planId,
        optimizationData,
      },
      maxRetries: 3,
      priority: 2,
    };

    await this.sendMessage(message);
  }

  async sendValidatePlanRequest(planId: string, validationData: any): Promise<void> {
    const message: QueueMessage = {
      id: `validate-plan-${planId}-${Date.now()}`,
      type: 'planning.validate-plan',
      service: 'planning-service',
      timestamp: new Date(),
      data: {
        planId,
        validationData,
      },
      maxRetries: 3,
      priority: 1,
    };

    await this.sendMessage(message);
  }
}