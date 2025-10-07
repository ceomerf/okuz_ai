import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { MetricsService } from '../monitoring/metrics.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface ConnectionInfo {
  socketId: string;
  userId: string;
  userRole: string;
  connectedAt: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
  isAuthenticated: boolean;
  subscriptions: string[];
  metadata: Record<string, any>;
}

export interface ConnectionStats {
  totalConnections: number;
  authenticatedConnections: number;
  anonymousConnections: number;
  connectionsByRole: Record<string, number>;
  averageConnectionDuration: number;
  peakConnections: number;
  currentConnections: number;
}

@Injectable()
export class ConnectionManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConnectionManagerService.name);
  private readonly connections = new Map<string, ConnectionInfo>();
  private readonly userConnections = new Map<string, Set<string>>();
  private readonly roomConnections = new Map<string, Set<string>>();
  private readonly connectionMetrics = {
    totalConnections: 0,
    peakConnections: 0,
    currentConnections: 0,
    totalConnectionTime: 0,
  };

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly metrics: MetricsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    this.logger.log('ConnectionManager initialized');
    this.setupMetrics();
  }

  async onModuleDestroy() {
    this.logger.log('ConnectionManager shutting down');
    await this.cleanupAllConnections();
  }

  /**
   * Yeni bağlantı kaydet
   */
  async handleConnection(socket: Socket): Promise<void> {
    try {
      const connectionInfo = await this.createConnectionInfo(socket);
      this.connections.set(socket.id, connectionInfo);
      
      // Kullanıcı bağlantılarını güncelle
      if (connectionInfo.userId) {
        if (!this.userConnections.has(connectionInfo.userId)) {
          this.userConnections.set(connectionInfo.userId, new Set());
        }
        this.userConnections.get(connectionInfo.userId)!.add(socket.id);
      }

      // Metrikleri güncelle
      this.updateConnectionMetrics();
      
      // Event emit
      this.eventEmitter.emit('connection.established', {
        socketId: socket.id,
        userId: connectionInfo.userId,
        userRole: connectionInfo.userRole,
        timestamp: new Date(),
      });

      this.logger.log(`Connection established: ${socket.id} (User: ${connectionInfo.userId})`);
    } catch (error) {
      this.logger.error(`Failed to handle connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
      socket.disconnect();
    }
  }

  /**
   * Bağlantı kapat
   */
  async handleDisconnection(socket: Socket): Promise<void> {
    try {
      const connectionInfo = this.connections.get(socket.id);
      if (!connectionInfo) return;

      // Kullanıcı bağlantılarını güncelle
      if (connectionInfo.userId) {
        const userSockets = this.userConnections.get(connectionInfo.userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            this.userConnections.delete(connectionInfo.userId);
          }
        }
      }

      // Room bağlantılarını temizle
      for (const [room, sockets] of this.roomConnections.entries()) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          this.roomConnections.delete(room);
        }
      }

      // Bağlantı süresini hesapla
      const connectionDuration = Date.now() - connectionInfo.connectedAt.getTime();
      this.connectionMetrics.totalConnectionTime += connectionDuration;

      // Bağlantıyı kaldır
      this.connections.delete(socket.id);
      
      // Metrikleri güncelle
      this.updateConnectionMetrics();

      // Event emit
      this.eventEmitter.emit('connection.closed', {
        socketId: socket.id,
        userId: connectionInfo.userId,
        userRole: connectionInfo.userRole,
        duration: connectionDuration,
        timestamp: new Date(),
      });

      this.logger.log(`Connection closed: ${socket.id} (Duration: ${connectionDuration}ms)`);
    } catch (error) {
      this.logger.error(`Failed to handle disconnection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Bağlantı bilgisi oluştur
   */
  private async createConnectionInfo(socket: Socket): Promise<ConnectionInfo> {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    let userId: string | null = null;
    let userRole: string | null = null;
    let isAuthenticated = false;

    // JWT token doğrula
    if (token) {
      try {
        const payload = this.jwtService.verify(token);
        userId = payload.sub;
        userRole = payload.role;
        isAuthenticated = true;
      } catch (error) {
        this.logger.warn(`Invalid token for socket ${socket.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      socketId: socket.id,
      userId: userId || 'anonymous',
      userRole: userRole || 'anonymous',
      connectedAt: new Date(),
      lastActivity: new Date(),
      ipAddress: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'] || 'unknown',
      isAuthenticated,
      subscriptions: [],
      metadata: {
        transport: socket.conn.transport.name,
        // protocol: socket.handshake.protocol, // Bu property kaldırıldı
        query: socket.handshake.query,
      },
    };
  }

  /**
   * Kullanıcıya mesaj gönder
   */
  async sendToUser(userId: string, event: string, data: any): Promise<boolean> {
    try {
      const userSockets = this.userConnections.get(userId);
      if (!userSockets || userSockets.size === 0) {
        this.logger.warn(`No active connections for user ${userId}`);
        return false;
      }

      let sentCount = 0;
      for (const socketId of userSockets) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit(event, data);
          sentCount++;
        }
      }

      this.logger.log(`Sent message to user ${userId}: ${event} (${sentCount} sockets)`);
      return sentCount > 0;
    } catch (error) {
      this.logger.error(`Failed to send message to user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Room'a mesaj gönder
   */
  async sendToRoom(room: string, event: string, data: any): Promise<boolean> {
    try {
      this.server.to(room).emit(event, data);
      this.logger.log(`Sent message to room ${room}: ${event}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send message to room ${room}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Tüm bağlı kullanıcılara mesaj gönder
   */
  async broadcast(event: string, data: any): Promise<boolean> {
    try {
      this.server.emit(event, data);
      this.logger.log(`Broadcasted message: ${event}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to broadcast message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Kullanıcıyı room'a ekle
   */
  async joinRoom(socketId: string, room: string): Promise<boolean> {
    try {
      const socket = this.server.sockets.sockets.get(socketId);
      if (!socket) {
        this.logger.warn(`Socket ${socketId} not found`);
        return false;
      }

      await socket.join(room);
      
      // Room bağlantılarını güncelle
      if (!this.roomConnections.has(room)) {
        this.roomConnections.set(room, new Set());
      }
      this.roomConnections.get(room)!.add(socketId);

      // Bağlantı bilgisini güncelle
      const connectionInfo = this.connections.get(socketId);
      if (connectionInfo) {
        connectionInfo.subscriptions.push(room);
        connectionInfo.lastActivity = new Date();
      }

      this.logger.log(`Socket ${socketId} joined room ${room}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to join room ${room}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Kullanıcıyı room'dan çıkar
   */
  async leaveRoom(socketId: string, room: string): Promise<boolean> {
    try {
      const socket = this.server.sockets.sockets.get(socketId);
      if (!socket) {
        this.logger.warn(`Socket ${socketId} not found`);
        return false;
      }

      await socket.leave(room);
      
      // Room bağlantılarını güncelle
      const roomSockets = this.roomConnections.get(room);
      if (roomSockets) {
        roomSockets.delete(socketId);
        if (roomSockets.size === 0) {
          this.roomConnections.delete(room);
        }
      }

      // Bağlantı bilgisini güncelle
      const connectionInfo = this.connections.get(socketId);
      if (connectionInfo) {
        connectionInfo.subscriptions = connectionInfo.subscriptions.filter(sub => sub !== room);
        connectionInfo.lastActivity = new Date();
      }

      this.logger.log(`Socket ${socketId} left room ${room}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to leave room ${room}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Bağlantı bilgisi getir
   */
  getConnectionInfo(socketId: string): ConnectionInfo | undefined {
    return this.connections.get(socketId);
  }

  /**
   * Kullanıcı bağlantıları getir
   */
  getUserConnections(userId: string): string[] {
    const userSockets = this.userConnections.get(userId);
    return userSockets ? Array.from(userSockets) : [];
  }

  /**
   * Room bağlantıları getir
   */
  getRoomConnections(room: string): string[] {
    const roomSockets = this.roomConnections.get(room);
    return roomSockets ? Array.from(roomSockets) : [];
  }

  /**
   * Bağlantı istatistikleri getir
   */
  getConnectionStats(): ConnectionStats {
    const connections = Array.from(this.connections.values());
    const authenticatedConnections = connections.filter(conn => conn.isAuthenticated);
    const anonymousConnections = connections.filter(conn => !conn.isAuthenticated);
    
    const connectionsByRole: Record<string, number> = {};
    connections.forEach(conn => {
      connectionsByRole[conn.userRole] = (connectionsByRole[conn.userRole] || 0) + 1;
    });

    const averageConnectionDuration = this.connectionMetrics.totalConnectionTime / 
      Math.max(this.connectionMetrics.totalConnections, 1);

    return {
      totalConnections: this.connectionMetrics.totalConnections,
      authenticatedConnections: authenticatedConnections.length,
      anonymousConnections: anonymousConnections.length,
      connectionsByRole,
      averageConnectionDuration,
      peakConnections: this.connectionMetrics.peakConnections,
      currentConnections: this.connections.size,
    };
  }

  /**
   * Bağlantı aktivitesini güncelle
   */
  updateActivity(socketId: string): void {
    const connectionInfo = this.connections.get(socketId);
    if (connectionInfo) {
      connectionInfo.lastActivity = new Date();
    }
  }

  /**
   * Inactive bağlantıları temizle
   */
  async cleanupInactiveConnections(maxInactiveTime: number = 30 * 60 * 1000): Promise<number> {
    const now = Date.now();
    const inactiveConnections: string[] = [];

    for (const [socketId, connectionInfo] of this.connections.entries()) {
      const inactiveTime = now - connectionInfo.lastActivity.getTime();
      if (inactiveTime > maxInactiveTime) {
        inactiveConnections.push(socketId);
      }
    }

    for (const socketId of inactiveConnections) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect();
      }
    }

    this.logger.log(`Cleaned up ${inactiveConnections.length} inactive connections`);
    return inactiveConnections.length;
  }

  /**
   * Tüm bağlantıları temizle
   */
  private async cleanupAllConnections(): Promise<void> {
    for (const [socketId] of this.connections.entries()) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect();
      }
    }
    
    this.connections.clear();
    this.userConnections.clear();
    this.roomConnections.clear();
  }

  /**
   * Bağlantı metriklerini güncelle
   */
  private updateConnectionMetrics(): void {
    this.connectionMetrics.currentConnections = this.connections.size;
    this.connectionMetrics.totalConnections++;
    
    if (this.connectionMetrics.currentConnections > this.connectionMetrics.peakConnections) {
      this.connectionMetrics.peakConnections = this.connectionMetrics.currentConnections;
    }
  }

  /**
   * Prometheus metrikleri kur
   */
  private setupMetrics(): void {
    // WebSocket bağlantı sayısı metrikleri
    // this.metrics.registerGauge('websocket_connections_total', 'Total WebSocket connections'); // Bu metod kaldırıldı
    // this.metrics.registerGauge('websocket_connections_active', 'Active WebSocket connections'); // Bu metod kaldırıldı
    // this.metrics.registerGauge('websocket_connections_authenticated', 'Authenticated WebSocket connections'); // Bu metod kaldırıldı
    // this.metrics.registerGauge('websocket_connections_anonymous', 'Anonymous WebSocket connections'); // Bu metod kaldırıldı
    // this.metrics.registerGauge('websocket_rooms_total', 'Total WebSocket rooms'); // Bu metod kaldırıldı
    // this.metrics.registerGauge('websocket_connection_duration_seconds', 'WebSocket connection duration'); // Bu metod kaldırıldı

    // Metrikleri güncelle
    setInterval(() => {
      const stats = this.getConnectionStats();
      
      // this.metrics.setGauge('websocket_connections_total', stats.totalConnections); // Bu metod kaldırıldı
      // this.metrics.setGauge('websocket_connections_active', stats.currentConnections); // Bu metod kaldırıldı
      // this.metrics.setGauge('websocket_connections_authenticated', stats.authenticatedConnections); // Bu metod kaldırıldı
      // this.metrics.setGauge('websocket_connections_anonymous', stats.anonymousConnections); // Bu metod kaldırıldı
      // this.metrics.setGauge('websocket_rooms_total', this.roomConnections.size); // Bu metod kaldırıldı
      // this.metrics.setGauge('websocket_connection_duration_seconds', stats.averageConnectionDuration / 1000); // Bu metod kaldırıldı
    }, 5000); // 5 saniyede bir güncelle
  }

  /**
   * Bağlantı durumu kontrol et
   */
  isConnected(socketId: string): boolean {
    return this.connections.has(socketId);
  }

  /**
   * Kullanıcı bağlı mı kontrol et
   */
  isUserConnected(userId: string): boolean {
    const userSockets = this.userConnections.get(userId);
    return userSockets ? userSockets.size > 0 : false;
  }

  /**
   * Room'da kullanıcı var mı kontrol et
   */
  isUserInRoom(userId: string, room: string): boolean {
    const userSockets = this.userConnections.get(userId);
    if (!userSockets) return false;

    for (const socketId of userSockets) {
      const connectionInfo = this.connections.get(socketId);
      if (connectionInfo && connectionInfo.subscriptions.includes(room)) {
        return true;
      }
    }
    return false;
  }
}
