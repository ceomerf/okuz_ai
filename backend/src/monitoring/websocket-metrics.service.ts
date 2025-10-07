import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { ConnectionManagerService, ConnectionStats } from '../realtime/connection-manager.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface WebSocketMetrics {
  // Bağlantı metrikleri
  totalConnections: number;
  activeConnections: number;
  authenticatedConnections: number;
  anonymousConnections: number;
  
  // Kullanıcı metrikleri
  uniqueUsers: number;
  usersByRole: Record<string, number>;
  
  // Room metrikleri
  totalRooms: number;
  activeRooms: number;
  averageUsersPerRoom: number;
  
  // Performans metrikleri
  averageConnectionDuration: number;
  peakConnections: number;
  connectionRate: number; // dakikada yeni bağlantı
  disconnectionRate: number; // dakikada bağlantı kopma
  
  // Hata metrikleri
  connectionErrors: number;
  authenticationErrors: number;
  messageErrors: number;
  
  // Mesaj metrikleri
  messagesSent: number;
  messagesReceived: number;
  averageMessageSize: number;
  
  // Sistem metrikleri
  memoryUsage: number;
  cpuUsage: number;
  uptime: number;
}

@Injectable()
export class WebSocketMetricsService implements OnModuleInit {
  private readonly logger = new Logger(WebSocketMetricsService.name);
  private readonly metrics: WebSocketMetrics;
  private readonly startTime: number;
  private readonly connectionHistory: Array<{ timestamp: number; connections: number }> = [];
  private readonly messageHistory: Array<{ timestamp: number; sent: number; received: number }> = [];

  constructor(
    private readonly metricsService: MetricsService,
    private readonly connectionManager: ConnectionManagerService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.startTime = Date.now();
    this.metrics = this.initializeMetrics();
    this.setupEventListeners();
  }

  async onModuleInit() {
    this.logger.log('WebSocketMetricsService initialized');
    this.setupPrometheusMetrics();
    this.startMetricsCollection();
  }

  /**
   * Metrikleri başlat
   */
  private initializeMetrics(): WebSocketMetrics {
    return {
      totalConnections: 0,
      activeConnections: 0,
      authenticatedConnections: 0,
      anonymousConnections: 0,
      uniqueUsers: 0,
      usersByRole: {},
      totalRooms: 0,
      activeRooms: 0,
      averageUsersPerRoom: 0,
      averageConnectionDuration: 0,
      peakConnections: 0,
      connectionRate: 0,
      disconnectionRate: 0,
      connectionErrors: 0,
      authenticationErrors: 0,
      messageErrors: 0,
      messagesSent: 0,
      messagesReceived: 0,
      averageMessageSize: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      uptime: 0,
    };
  }

  /**
   * Event listener'ları kur
   */
  private setupEventListeners(): void {
    // Bağlantı eventleri
    this.eventEmitter.on('connection.established', (data) => {
      this.handleConnectionEstablished(data);
    });

    this.eventEmitter.on('connection.closed', (data) => {
      this.handleConnectionClosed(data);
    });

    // Mesaj eventleri
    this.eventEmitter.on('message.sent', (data) => {
      this.handleMessageSent(data);
    });

    this.eventEmitter.on('message.received', (data) => {
      this.handleMessageReceived(data);
    });

    // Hata eventleri
    this.eventEmitter.on('connection.error', (data) => {
      this.handleConnectionError(data);
    });

    this.eventEmitter.on('authentication.error', (data) => {
      this.handleAuthenticationError(data);
    });

    this.eventEmitter.on('message.error', (data) => {
      this.handleMessageError(data);
    });
  }

  /**
   * Prometheus metrikleri kur
   */
  private setupPrometheusMetrics(): void {
    // Bağlantı metrikleri
    this.metricsService.registerGauge('websocket_connections_total', 'Total WebSocket connections');
    this.metricsService.registerGauge('websocket_connections_active', 'Active WebSocket connections');
    this.metricsService.registerGauge('websocket_connections_authenticated', 'Authenticated WebSocket connections');
    this.metricsService.registerGauge('websocket_connections_anonymous', 'Anonymous WebSocket connections');
    
    // Kullanıcı metrikleri
    this.metricsService.registerGauge('websocket_unique_users', 'Unique WebSocket users');
    this.metricsService.registerGauge('websocket_users_by_role', 'WebSocket users by role');
    
    // Room metrikleri
    this.metricsService.registerGauge('websocket_rooms_total', 'Total WebSocket rooms');
    this.metricsService.registerGauge('websocket_rooms_active', 'Active WebSocket rooms');
    this.metricsService.registerGauge('websocket_average_users_per_room', 'Average users per room');
    
    // Performans metrikleri
    this.metricsService.registerGauge('websocket_connection_duration_seconds', 'Average connection duration');
    this.metricsService.registerGauge('websocket_peak_connections', 'Peak WebSocket connections');
    this.metricsService.registerGauge('websocket_connection_rate_per_minute', 'Connection rate per minute');
    this.metricsService.registerGauge('websocket_disconnection_rate_per_minute', 'Disconnection rate per minute');
    
    // Hata metrikleri
    this.metricsService.registerCounter('websocket_connection_errors_total', 'Total connection errors');
    this.metricsService.registerCounter('websocket_authentication_errors_total', 'Total authentication errors');
    this.metricsService.registerCounter('websocket_message_errors_total', 'Total message errors');
    
    // Mesaj metrikleri
    this.metricsService.registerCounter('websocket_messages_sent_total', 'Total messages sent');
    this.metricsService.registerCounter('websocket_messages_received_total', 'Total messages received');
    this.metricsService.registerGauge('websocket_average_message_size_bytes', 'Average message size in bytes');
    
    // Sistem metrikleri
    this.metricsService.registerGauge('websocket_memory_usage_bytes', 'WebSocket memory usage');
    this.metricsService.registerGauge('websocket_cpu_usage_percent', 'WebSocket CPU usage');
    this.metricsService.registerGauge('websocket_uptime_seconds', 'WebSocket service uptime');
  }

  /**
   * Metrik toplama başlat
   */
  private startMetricsCollection(): void {
    // Her 5 saniyede bir metrikleri güncelle
    setInterval(() => {
      this.updateMetrics();
    }, 5000);

    // Her dakikada bir geçmiş verileri temizle
    setInterval(() => {
      this.cleanupHistory();
    }, 60000);
  }

  /**
   * Metrikleri güncelle
   */
  private updateMetrics(): void {
    try {
      const stats = this.connectionManager.getConnectionStats();
      
      // Bağlantı metrikleri
      this.metrics.totalConnections = stats.totalConnections;
      this.metrics.activeConnections = stats.currentConnections;
      this.metrics.authenticatedConnections = stats.authenticatedConnections;
      this.metrics.anonymousConnections = stats.anonymousConnections;
      this.metrics.peakConnections = stats.peakConnections;
      this.metrics.averageConnectionDuration = stats.averageConnectionDuration;
      
      // Kullanıcı metrikleri
      this.metrics.uniqueUsers = this.getUniqueUserCount();
      this.metrics.usersByRole = stats.connectionsByRole;
      
      // Room metrikleri
      this.metrics.totalRooms = this.getTotalRoomCount();
      this.metrics.activeRooms = this.getActiveRoomCount();
      this.metrics.averageUsersPerRoom = this.getAverageUsersPerRoom();
      
      // Performans metrikleri
      this.metrics.connectionRate = this.calculateConnectionRate();
      this.metrics.disconnectionRate = this.calculateDisconnectionRate();
      
      // Sistem metrikleri
      this.metrics.memoryUsage = process.memoryUsage().heapUsed;
      this.metrics.cpuUsage = this.getCpuUsage();
      this.metrics.uptime = Date.now() - this.startTime;
      
      // Prometheus metriklerini güncelle
      this.updatePrometheusMetrics();
      
    } catch (error) {
      this.logger.error(`Failed to update metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Prometheus metriklerini güncelle
   */
  private updatePrometheusMetrics(): void {
    this.metricsService.setGauge('websocket_connections_total', this.metrics.totalConnections);
    this.metricsService.setGauge('websocket_connections_active', this.metrics.activeConnections);
    this.metricsService.setGauge('websocket_connections_authenticated', this.metrics.authenticatedConnections);
    this.metricsService.setGauge('websocket_connections_anonymous', this.metrics.anonymousConnections);
    this.metricsService.setGauge('websocket_unique_users', this.metrics.uniqueUsers);
    this.metricsService.setGauge('websocket_rooms_total', this.metrics.totalRooms);
    this.metricsService.setGauge('websocket_rooms_active', this.metrics.activeRooms);
    this.metricsService.setGauge('websocket_average_users_per_room', this.metrics.averageUsersPerRoom);
    this.metricsService.setGauge('websocket_connection_duration_seconds', this.metrics.averageConnectionDuration / 1000);
    this.metricsService.setGauge('websocket_peak_connections', this.metrics.peakConnections);
    this.metricsService.setGauge('websocket_connection_rate_per_minute', this.metrics.connectionRate);
    this.metricsService.setGauge('websocket_disconnection_rate_per_minute', this.metrics.disconnectionRate);
    this.metricsService.setGauge('websocket_average_message_size_bytes', this.metrics.averageMessageSize);
    this.metricsService.setGauge('websocket_memory_usage_bytes', this.metrics.memoryUsage);
    this.metricsService.setGauge('websocket_cpu_usage_percent', this.metrics.cpuUsage);
    this.metricsService.setGauge('websocket_uptime_seconds', this.metrics.uptime / 1000);
  }

  /**
   * Bağlantı kuruldu event handler
   */
  private handleConnectionEstablished(data: any): void {
    this.metrics.totalConnections++;
    this.metrics.activeConnections++;
    
    if (data.userId && data.userId !== 'anonymous') {
      this.metrics.authenticatedConnections++;
    } else {
      this.metrics.anonymousConnections++;
    }
    
    // Geçmişe ekle
    this.connectionHistory.push({
      timestamp: Date.now(),
      connections: this.metrics.activeConnections,
    });
    
    this.metricsService.incrementCounter('websocket_connections_established_total');
  }

  /**
   * Bağlantı kapandı event handler
   */
  private handleConnectionClosed(data: any): void {
    this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1);
    
    if (data.userId && data.userId !== 'anonymous') {
      this.metrics.authenticatedConnections = Math.max(0, this.metrics.authenticatedConnections - 1);
    } else {
      this.metrics.anonymousConnections = Math.max(0, this.metrics.anonymousConnections - 1);
    }
    
    // Geçmişe ekle
    this.connectionHistory.push({
      timestamp: Date.now(),
      connections: this.metrics.activeConnections,
    });
    
    this.metricsService.incrementCounter('websocket_connections_closed_total');
  }

  /**
   * Mesaj gönderildi event handler
   */
  private handleMessageSent(data: any): void {
    this.metrics.messagesSent++;
    
    if (data.size) {
      this.updateAverageMessageSize(data.size);
    }
    
    this.metricsService.incrementCounter('websocket_messages_sent_total');
  }

  /**
   * Mesaj alındı event handler
   */
  private handleMessageReceived(data: any): void {
    this.metrics.messagesReceived++;
    
    if (data.size) {
      this.updateAverageMessageSize(data.size);
    }
    
    this.metricsService.incrementCounter('websocket_messages_received_total');
  }

  /**
   * Bağlantı hatası event handler
   */
  private handleConnectionError(data: any): void {
    this.metrics.connectionErrors++;
    this.metricsService.incrementCounter('websocket_connection_errors_total');
  }

  /**
   * Kimlik doğrulama hatası event handler
   */
  private handleAuthenticationError(data: any): void {
    this.metrics.authenticationErrors++;
    this.metricsService.incrementCounter('websocket_authentication_errors_total');
  }

  /**
   * Mesaj hatası event handler
   */
  private handleMessageError(data: any): void {
    this.metrics.messageErrors++;
    this.metricsService.incrementCounter('websocket_message_errors_total');
  }

  /**
   * Ortalama mesaj boyutunu güncelle
   */
  private updateAverageMessageSize(size: number): void {
    const totalMessages = this.metrics.messagesSent + this.metrics.messagesReceived;
    if (totalMessages > 0) {
      this.metrics.averageMessageSize = 
        (this.metrics.averageMessageSize * (totalMessages - 1) + size) / totalMessages;
    } else {
      this.metrics.averageMessageSize = size;
    }
  }

  /**
   * Bağlantı oranını hesapla
   */
  private calculateConnectionRate(): number {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const recentConnections = this.connectionHistory.filter(
      entry => entry.timestamp >= oneMinuteAgo
    );
    
    return recentConnections.length;
  }

  /**
   * Bağlantı kopma oranını hesapla
   */
  private calculateDisconnectionRate(): number {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Bu basit bir hesaplama, gerçek implementasyonda daha detaylı olabilir
    return this.metrics.connectionErrors;
  }

  /**
   * Benzersiz kullanıcı sayısını getir
   */
  private getUniqueUserCount(): number {
    // ConnectionManager'dan benzersiz kullanıcı sayısını al
    const stats = this.connectionManager.getConnectionStats();
    return Object.keys(stats.connectionsByRole).length;
  }

  /**
   * Toplam room sayısını getir
   */
  private getTotalRoomCount(): number {
    // ConnectionManager'dan room sayısını al
    return this.connectionManager.getConnectionStats().totalConnections; // Basit implementasyon
  }

  /**
   * Aktif room sayısını getir
   */
  private getActiveRoomCount(): number {
    // ConnectionManager'dan aktif room sayısını al
    return this.connectionManager.getConnectionStats().currentConnections; // Basit implementasyon
  }

  /**
   * Room başına ortalama kullanıcı sayısını getir
   */
  private getAverageUsersPerRoom(): number {
    const activeRooms = this.getActiveRoomCount();
    if (activeRooms === 0) return 0;
    
    return this.metrics.activeConnections / activeRooms;
  }

  /**
   * CPU kullanımını getir
   */
  private getCpuUsage(): number {
    // Basit CPU kullanım hesaplama
    const usage = process.cpuUsage();
    return usage.user + usage.system;
  }

  /**
   * Geçmiş verileri temizle
   */
  private cleanupHistory(): void {
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 saat
    
    // Bağlantı geçmişini temizle
    this.connectionHistory.splice(
      0,
      this.connectionHistory.findIndex(entry => entry.timestamp >= oneHourAgo)
    );
    
    // Mesaj geçmişini temizle
    this.messageHistory.splice(
      0,
      this.messageHistory.findIndex(entry => entry.timestamp >= oneHourAgo)
    );
  }

  /**
   * Metrikleri getir
   */
  getMetrics(): WebSocketMetrics {
    return { ...this.metrics };
  }

  /**
   * Detaylı metrikleri getir
   */
  getDetailedMetrics(): {
    metrics: WebSocketMetrics;
    history: {
      connections: Array<{ timestamp: number; connections: number }>;
      messages: Array<{ timestamp: number; sent: number; received: number }>;
    };
    alerts: string[];
  } {
    const alerts: string[] = [];
    
    // Uyarıları kontrol et
    if (this.metrics.connectionErrors > 100) {
      alerts.push('High connection error rate detected');
    }
    
    if (this.metrics.authenticationErrors > 50) {
      alerts.push('High authentication error rate detected');
    }
    
    if (this.metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
      alerts.push('High memory usage detected');
    }
    
    if (this.metrics.cpuUsage > 80) {
      alerts.push('High CPU usage detected');
    }
    
    return {
      metrics: this.getMetrics(),
      history: {
        connections: [...this.connectionHistory],
        messages: [...this.messageHistory],
      },
      alerts,
    };
  }

  /**
   * Metrikleri sıfırla
   */
  resetMetrics(): void {
    Object.assign(this.metrics, this.initializeMetrics());
    this.connectionHistory.length = 0;
    this.messageHistory.length = 0;
    
    this.logger.log('WebSocket metrics reset');
  }

  /**
   * Health check
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    metrics: WebSocketMetrics;
  } {
    const issues: string[] = [];
    
    // Health kontrolleri
    if (this.metrics.connectionErrors > 200) {
      issues.push('Too many connection errors');
    }
    
    if (this.metrics.authenticationErrors > 100) {
      issues.push('Too many authentication errors');
    }
    
    if (this.metrics.memoryUsage > 200 * 1024 * 1024) { // 200MB
      issues.push('Memory usage too high');
    }
    
    if (this.metrics.cpuUsage > 90) {
      issues.push('CPU usage too high');
    }
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (issues.length === 0) {
      status = 'healthy';
    } else if (issues.length <= 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }
    
    return {
      status,
      issues,
      metrics: this.getMetrics(),
    };
  }
}
