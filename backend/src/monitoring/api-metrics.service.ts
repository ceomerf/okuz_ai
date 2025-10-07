import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { MetricsService } from './metrics.service';
import { SentryService } from './sentry.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as prometheus from 'prom-client';

export interface APIMetrics {
  // Request metrics
  totalRequests: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  
  // Error metrics
  totalErrors: number;
  errorRate: number;
  errors4xx: number;
  errors5xx: number;
  
  // Status code distribution
  statusCodes: Record<string, number>;
  
  // Endpoint metrics
  endpointMetrics: Record<string, {
    requests: number;
    errors: number;
    avgResponseTime: number;
    p95ResponseTime: number;
  }>;
  
  // User metrics
  activeUsers: number;
  requestsPerUser: number;
  
  // Performance metrics
  memoryUsage: number;
  cpuUsage: number;
  databaseConnections: number;
  cacheHitRate: number;
}

@Injectable()
export class APIMetricsService implements OnModuleInit {
  private readonly logger = new Logger(APIMetricsService.name);
  
  // Prometheus metrics
  private readonly httpRequestDuration: prometheus.Histogram<string>;
  private readonly httpRequestTotal: prometheus.Counter<string>;
  private readonly httpRequestErrors: prometheus.Counter<string>;
  private readonly httpRequestSize: prometheus.Histogram<string>;
  private readonly httpResponseSize: prometheus.Histogram<string>;
  private readonly databaseQueryDuration: prometheus.Histogram<string>;
  private readonly databaseQueryTotal: prometheus.Counter<string>;
  private readonly cacheOperations: prometheus.Counter<string>;
  private readonly cacheHitRate: prometheus.Gauge<string>;
  private readonly activeConnections: prometheus.Gauge<string>;
  private readonly memoryUsage: prometheus.Gauge<string>;
  private readonly cpuUsage: prometheus.Gauge<string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly metrics: MetricsService,
    private readonly sentry: SentryService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    // HTTP Request Duration Histogram
    this.httpRequestDuration = new prometheus.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code', 'service'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    });

    // HTTP Request Total Counter
    this.httpRequestTotal = new prometheus.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'service'],
    });

    // HTTP Request Errors Counter
    this.httpRequestErrors = new prometheus.Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'status_code', 'error_type', 'service'],
    });

    // HTTP Request Size Histogram
    this.httpRequestSize = new prometheus.Histogram({
      name: 'http_request_size_bytes',
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route', 'service'],
      buckets: [100, 1000, 10000, 100000, 1000000],
    });

    // HTTP Response Size Histogram
    this.httpResponseSize = new prometheus.Histogram({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route', 'status_code', 'service'],
      buckets: [100, 1000, 10000, 100000, 1000000],
    });

    // Database Query Duration Histogram
    this.databaseQueryDuration = new prometheus.Histogram({
      name: 'database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table', 'service'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    });

    // Database Query Total Counter
    this.databaseQueryTotal = new prometheus.Counter({
      name: 'database_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'table', 'status', 'service'],
    });

    // Cache Operations Counter
    this.cacheOperations = new prometheus.Counter({
      name: 'cache_operations_total',
      help: 'Total number of cache operations',
      labelNames: ['operation', 'status', 'service'],
    });

    // Cache Hit Rate Gauge
    this.cacheHitRate = new prometheus.Gauge({
      name: 'cache_hit_rate',
      help: 'Cache hit rate percentage',
      labelNames: ['service'],
    });

    // Active Connections Gauge
    this.activeConnections = new prometheus.Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      labelNames: ['type', 'service'],
    });

    // Memory Usage Gauge
    this.memoryUsage = new prometheus.Gauge({
      name: 'memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['service'],
    });

    // CPU Usage Gauge
    this.cpuUsage = new prometheus.Gauge({
      name: 'cpu_usage_percent',
      help: 'CPU usage percentage',
      labelNames: ['service'],
    });
  }

  async onModuleInit() {
    this.logger.log('APIMetricsService initialized');
    this.setupEventListeners();
    this.startMetricsCollection();
  }

  /**
   * Event listener'ları kur
   */
  private setupEventListeners(): void {
    // HTTP request events
    this.eventEmitter.on('http.request.start', (data) => {
      this.recordRequestStart(data);
    });

    this.eventEmitter.on('http.request.end', (data) => {
      this.recordRequestEnd(data);
    });

    this.eventEmitter.on('http.request.error', (data) => {
      this.recordRequestError(data);
    });

    // Database events
    this.eventEmitter.on('database.query.start', (data) => {
      this.recordDatabaseQueryStart(data);
    });

    this.eventEmitter.on('database.query.end', (data) => {
      this.recordDatabaseQueryEnd(data);
    });

    this.eventEmitter.on('database.query.error', (data) => {
      this.recordDatabaseQueryError(data);
    });

    // Cache events
    this.eventEmitter.on('cache.operation', (data) => {
      this.recordCacheOperation(data);
    });

    // System events
    this.eventEmitter.on('system.metrics', (data) => {
      this.recordSystemMetrics(data);
    });
  }

  /**
   * Metrik toplama başlat
   */
  private startMetricsCollection(): void {
    // Her 5 saniyede bir sistem metriklerini topla
    setInterval(() => {
      this.collectSystemMetrics();
    }, 5000);

    // Her dakikada bir cache hit rate hesapla
    setInterval(() => {
      this.calculateCacheHitRate();
    }, 60000);
  }

  /**
   * HTTP request başlangıcını kaydet
   */
  recordRequestStart(data: {
    method: string;
    route: string;
    service: string;
    requestId: string;
    userId?: string;
    requestSize?: number;
  }): void {
    try {
      if (data.requestSize) {
        this.httpRequestSize
          .labels(data.method, data.route, data.service)
          .observe(data.requestSize);
      }

      // Sentry breadcrumb ekle
      this.sentry.addBreadcrumb(
        `HTTP ${data.method} ${data.route}`,
        'http',
        'info',
        {
          method: data.method,
          route: data.route,
          service: data.service,
          requestId: data.requestId,
          userId: data.userId,
        }
      );
    } catch (error) {
      this.logger.error(`Failed to record request start: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * HTTP request sonunu kaydet
   */
  recordRequestEnd(data: {
    method: string;
    route: string;
    statusCode: number;
    service: string;
    duration: number;
    responseSize?: number;
    requestId: string;
    userId?: string;
  }): void {
    try {
      // Duration histogram
      this.httpRequestDuration
        .labels(data.method, data.route, data.statusCode.toString(), data.service)
        .observe(data.duration / 1000); // Convert to seconds

      // Total counter
      this.httpRequestTotal
        .labels(data.method, data.route, data.statusCode.toString(), data.service)
        .inc();

      // Response size
      if (data.responseSize) {
        this.httpResponseSize
          .labels(data.method, data.route, data.statusCode.toString(), data.service)
          .observe(data.responseSize);
      }

      // Error tracking
      if (data.statusCode >= 400) {
        this.httpRequestErrors
          .labels(
            data.method,
            data.route,
            data.statusCode.toString(),
            data.statusCode >= 500 ? 'server_error' : 'client_error',
            data.service
          )
          .inc();
      }

      // Sentry breadcrumb ekle
      this.sentry.addBreadcrumb(
        `HTTP ${data.method} ${data.route} - ${data.statusCode}`,
        'http',
        data.statusCode >= 400 ? 'error' : 'info',
        {
          method: data.method,
          route: data.route,
          statusCode: data.statusCode,
          duration: data.duration,
          service: data.service,
          requestId: data.requestId,
          userId: data.userId,
        }
      );
    } catch (error) {
      this.logger.error(`Failed to record request end: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * HTTP request hatasını kaydet
   */
  recordRequestError(data: {
    method: string;
    route: string;
    statusCode: number;
    service: string;
    error: Error;
    requestId: string;
    userId?: string;
  }): void {
    try {
      // Error counter
      this.httpRequestErrors
        .labels(
          data.method,
          data.route,
          data.statusCode.toString(),
          'error',
          data.service
        )
        .inc();

      // Sentry'ye error gönder
      this.sentry.captureException(data.error, {
        userId: data.userId,
        requestId: data.requestId,
        operation: 'http_request',
        metadata: {
          method: data.method,
          route: data.route,
          statusCode: data.statusCode,
          service: data.service,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to record request error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Database query başlangıcını kaydet
   */
  recordDatabaseQueryStart(data: {
    operation: string;
    table: string;
    service: string;
    queryId: string;
  }): void {
    try {
      // Sentry breadcrumb ekle
      this.sentry.addBreadcrumb(
        `DB ${data.operation} ${data.table}`,
        'database',
        'info',
        {
          operation: data.operation,
          table: data.table,
          service: data.service,
          queryId: data.queryId,
        }
      );
    } catch (error) {
      this.logger.error(`Failed to record database query start: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Database query sonunu kaydet
   */
  recordDatabaseQueryEnd(data: {
    operation: string;
    table: string;
    service: string;
    duration: number;
    queryId: string;
    success: boolean;
  }): void {
    try {
      // Duration histogram
      this.databaseQueryDuration
        .labels(data.operation, data.table, data.service)
        .observe(data.duration / 1000); // Convert to seconds

      // Total counter
      this.databaseQueryTotal
        .labels(
          data.operation,
          data.table,
          data.success ? 'success' : 'error',
          data.service
        )
        .inc();

      // Sentry breadcrumb ekle
      this.sentry.addBreadcrumb(
        `DB ${data.operation} ${data.table} - ${data.success ? 'success' : 'error'}`,
        'database',
        data.success ? 'info' : 'error',
        {
          operation: data.operation,
          table: data.table,
          duration: data.duration,
          success: data.success,
          service: data.service,
          queryId: data.queryId,
        }
      );
    } catch (error) {
      this.logger.error(`Failed to record database query end: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Database query hatasını kaydet
   */
  recordDatabaseQueryError(data: {
    operation: string;
    table: string;
    service: string;
    error: Error;
    queryId: string;
  }): void {
    try {
      // Error counter
      this.databaseQueryTotal
        .labels(data.operation, data.table, 'error', data.service)
        .inc();

      // Sentry'ye error gönder
      this.sentry.captureException(data.error, {
        operation: 'database_query',
        metadata: {
          operation: data.operation,
          table: data.table,
          service: data.service,
          queryId: data.queryId,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to record database query error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Cache operasyonunu kaydet
   */
  recordCacheOperation(data: {
    operation: 'get' | 'set' | 'del' | 'exists';
    status: 'hit' | 'miss' | 'success' | 'error';
    service: string;
    key?: string;
    duration?: number;
  }): void {
    try {
      // Cache operations counter
      this.cacheOperations
        .labels(data.operation, data.status, data.service)
        .inc();

      // Sentry breadcrumb ekle
      this.sentry.addBreadcrumb(
        `Cache ${data.operation} - ${data.status}`,
        'cache',
        data.status === 'error' ? 'error' : 'info',
        {
          operation: data.operation,
          status: data.status,
          service: data.service,
          key: data.key,
          duration: data.duration,
        }
      );
    } catch (error) {
      this.logger.error(`Failed to record cache operation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Sistem metriklerini kaydet
   */
  recordSystemMetrics(data: {
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
    service: string;
  }): void {
    try {
      // Memory usage
      this.memoryUsage
        .labels(data.service)
        .set(data.memoryUsage);

      // CPU usage
      this.cpuUsage
        .labels(data.service)
        .set(data.cpuUsage);

      // Active connections
      this.activeConnections
        .labels('http', data.service)
        .set(data.activeConnections);
    } catch (error) {
      this.logger.error(`Failed to record system metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Sistem metriklerini topla
   */
  private async collectSystemMetrics(): Promise<void> {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      this.recordSystemMetrics({
        memoryUsage: memoryUsage.heapUsed,
        cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to percentage
        activeConnections: 0, // TODO: Get from connection manager
        service: 'okuz-api',
      });
    } catch (error) {
      this.logger.error(`Failed to collect system metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Cache hit rate hesapla
   */
  private async calculateCacheHitRate(): Promise<void> {
    try {
      // Cache hit rate hesaplama
      const hits = Number(await this.cache.get('cache_hits_total') || 0);
      const misses = Number(await this.cache.get('cache_misses_total') || 0);
      
      const total = hits + misses;
      const hitRate = total > 0 ? (hits / total) * 100 : 0;

      this.cacheHitRate
        .labels('okuz-api')
        .set(hitRate);
    } catch (error) {
      this.logger.error(`Failed to calculate cache hit rate: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * API metriklerini getir
   */
  async getAPIMetrics(): Promise<APIMetrics> {
    try {
      // Prometheus metriklerini al
      const register = prometheus.register;
      const metrics = await register.metrics();

      // Metrikleri parse et ve döndür
      return {
        totalRequests: 0, // TODO: Parse from metrics
        requestsPerSecond: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        totalErrors: 0,
        errorRate: 0,
        errors4xx: 0,
        errors5xx: 0,
        statusCodes: {},
        endpointMetrics: {},
        activeUsers: 0,
        requestsPerUser: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        databaseConnections: 0,
        cacheHitRate: 0,
      };
    } catch (error) {
      this.logger.error(`Failed to get API metrics: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Health check
   */
  getHealthStatus(): { status: 'healthy' | 'unhealthy'; metrics: any } {
    try {
      return {
        status: 'healthy',
        metrics: {
          httpRequestDuration: this.httpRequestDuration,
          httpRequestTotal: this.httpRequestTotal,
          httpRequestErrors: this.httpRequestErrors,
          databaseQueryDuration: this.databaseQueryDuration,
          cacheOperations: this.cacheOperations,
        },
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        status: 'unhealthy',
        metrics: {},
      };
    }
  }

  /**
   * Metrikleri sıfırla
   */
  async resetMetrics(): Promise<void> {
    try {
      const register = prometheus.register;
      await register.clear();
      this.logger.log('Metrics reset successfully');
    } catch (error) {
      this.logger.error(`Failed to reset metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
