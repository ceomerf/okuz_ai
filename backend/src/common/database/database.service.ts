import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseService {
  private readonly writeClient: PrismaClient;
  private readonly readClients: PrismaClient[] = [];
  private currentReadIndex = 0;

  constructor(private configService: ConfigService) {
    // Write database (primary)
    this.writeClient = new PrismaClient({
      datasources: {
        db: {
          url: this.configService.get<string>('DATABASE_URL'),
        },
      },
    });

    // Read replicas
    const readReplicaUrls = this.configService.get<string>('DATABASE_READ_REPLICA_URLS')?.split(',') || [];
    
    readReplicaUrls.forEach(url => {
      if (url.trim()) {
        this.readClients.push(new PrismaClient({
          datasources: {
            db: {
              url: url.trim(),
            },
          },
        }));
      }
    });

    // If no read replicas configured, use write client for reads
    if (this.readClients.length === 0) {
      this.readClients.push(this.writeClient);
    }
  }

  /**
   * Get write database client for write operations
   */
  getWriteClient(): PrismaClient {
    return this.writeClient;
  }

  /**
   * Get read database client with round-robin load balancing
   */
  getReadClient(): PrismaClient {
    const client = this.readClients[this.currentReadIndex];
    this.currentReadIndex = (this.currentReadIndex + 1) % this.readClients.length;
    return client;
  }

  /**
   * Execute read operation on read replica
   */
  async executeRead<T>(operation: (client: PrismaClient) => Promise<T>): Promise<T> {
    const readClient = this.getReadClient();
    return operation(readClient);
  }

  /**
   * Execute write operation on primary database
   */
  async executeWrite<T>(operation: (client: PrismaClient) => Promise<T>): Promise<T> {
    return operation(this.writeClient);
  }

  /**
   * Health check for all database connections
   */
  async healthCheck(): Promise<{
    write: boolean;
    read: boolean[];
    totalReadReplicas: number;
  }> {
    const writeHealth = await this.checkConnection(this.writeClient);
    const readHealth = await Promise.all(
      this.readClients.map(client => this.checkConnection(client))
    );

    return {
      write: writeHealth,
      read: readHealth,
      totalReadReplicas: this.readClients.length,
    };
  }

  private async checkConnection(client: PrismaClient): Promise<boolean> {
    try {
      await client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      return false;
    }
  }

  async onModuleDestroy() {
    await this.writeClient.$disconnect();
    await Promise.all(this.readClients.map(client => client.$disconnect()));
  }
}
