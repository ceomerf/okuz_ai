import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { SentryService } from './sentry.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as opentelemetry from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
// Resource tip-only olabilir; değer olarak kullanmak yerine factory kullan
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  baggage?: Record<string, string>;
}

export interface SpanOptions {
  name: string;
  kind?: 'internal' | 'server' | 'client' | 'producer' | 'consumer';
  attributes?: Record<string, any>;
  startTime?: number;
  endTime?: number;
}

@Injectable()
export class TracingService implements OnModuleInit {
  private readonly logger = new Logger(TracingService.name);
  private tracer!: opentelemetry.Tracer;
  private sdk!: NodeSDK;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly sentry: SentryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    await this.initializeTracing();
  }

  /**
   * Tracing'i başlat
   */
  private async initializeTracing(): Promise<void> {
    try {
      const serviceName = this.configService.get<string>('SERVICE_NAME', 'okuz-api');
      const serviceVersion = this.configService.get<string>('SERVICE_VERSION', '1.0.0');
      const environment = this.configService.get<string>('NODE_ENV', 'development');

      // Resource oluştur (constructor'a doğrudan değerler verilecek)

      // Jaeger exporter
      const jaegerExporter = new JaegerExporter({
        endpoint: this.configService.get<string>('JAEGER_ENDPOINT', 'http://localhost:14268/api/traces'),
      });

      // Zipkin exporter (alternatif)
      const zipkinExporter = new ZipkinExporter({
        url: this.configService.get<string>('ZIPKIN_ENDPOINT', 'http://localhost:9411/api/v2/spans'),
      });

      // SDK oluştur (minimal konfig, resource'suz)
      this.sdk = new NodeSDK({
        traceExporter: jaegerExporter,
        instrumentations: [
          getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-fs': {
              enabled: false,
            },
          }),
        ],
      });

      // SDK'yi başlat
      this.sdk.start();

      // Tracer'ı al
      this.tracer = opentelemetry.trace.getTracer(serviceName, serviceVersion);

      this.logger.log('Tracing initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize tracing: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Span oluştur
   */
  createSpan(name: string, options?: SpanOptions): opentelemetry.Span {
    try {
      const span = this.tracer.startSpan(name, {
        kind: options?.kind ? this.mapSpanKind(options.kind) : undefined,
        attributes: options?.attributes,
        startTime: options?.startTime,
      });

      return span;
    } catch (error) {
      this.logger.error(`Failed to create span: ${error instanceof Error ? error.message : String(error)}`);
      return this.tracer.startSpan(name);
    }
  }

  /**
   * Span'ı sonlandır
   */
  endSpan(span: opentelemetry.Span, status?: { code: number; message?: string }): void {
    try {
      if (status) {
        span.setStatus(status);
      }
      span.end();
    } catch (error) {
      this.logger.error(`Failed to end span: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Span'a attribute ekle
   */
  setSpanAttributes(span: opentelemetry.Span, attributes: Record<string, any>): void {
    try {
      span.setAttributes(attributes);
    } catch (error) {
      this.logger.error(`Failed to set span attributes: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Span'a event ekle
   */
  addSpanEvent(span: opentelemetry.Span, name: string, attributes?: Record<string, any>): void {
    try {
      span.addEvent(name, attributes);
    } catch (error) {
      this.logger.error(`Failed to add span event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Active span'ı al
   */
  getActiveSpan(): opentelemetry.Span | undefined {
    try {
      return opentelemetry.trace.getActiveSpan();
    } catch (error) {
      this.logger.error(`Failed to get active span: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }

  /**
   * Trace context'i al
   */
  getTraceContext(): TraceContext | undefined {
    try {
      const span = this.getActiveSpan();
      if (!span) return undefined;

      const spanContext = span.spanContext();
      return {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
        parentSpanId: spanContext.traceFlags.toString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get trace context: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }

  /**
   * HTTP request trace
   */
  traceHttpRequest(
    method: string,
    url: string,
    handler: () => Promise<any>
  ): Promise<any> {
    const span = this.createSpan(`HTTP ${method} ${url}`, {
      name: `HTTP ${method} ${url}`,
      kind: 'server',
      attributes: {
        'http.method': method,
        'http.url': url,
        'http.scheme': 'https',
      },
    });

    return this.traceOperation(span, handler);
  }

  /**
   * Database query trace
   */
  traceDatabaseQuery(
    operation: string,
    table: string,
    handler: () => Promise<any>
  ): Promise<any> {
    const span = this.createSpan(`DB ${operation} ${table}`, {
      name: `DB ${operation} ${table}`,
      kind: 'internal',
      attributes: {
        'db.operation': operation,
        'db.table': table,
        'db.system': 'postgresql',
      },
    });

    return this.traceOperation(span, handler);
  }

  /**
   * Cache operation trace
   */
  traceCacheOperation(
    operation: string,
    key: string,
    handler: () => Promise<any>
  ): Promise<any> {
    const span = this.createSpan(`Cache ${operation}`, {
      name: `Cache ${operation}`,
      kind: 'internal',
      attributes: {
        'cache.operation': operation,
        'cache.key': key,
        'cache.system': 'redis',
      },
    });

    return this.traceOperation(span, handler);
  }

  /**
   * AI request trace
   */
  traceAIRequest(
    promptType: string,
    model: string,
    handler: () => Promise<any>
  ): Promise<any> {
    const span = this.createSpan(`AI ${promptType}`, {
      name: `AI ${promptType}`,
      kind: 'client',
      attributes: {
        'ai.prompt_type': promptType,
        'ai.model': model,
        'ai.system': 'openai',
      },
    });

    return this.traceOperation(span, handler);
  }

  /**
   * Generic operation trace
   */
  private async traceOperation<T>(
    span: opentelemetry.Span,
    handler: () => Promise<T>
  ): Promise<T> {
    try {
      const result = await handler();
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (error) {
      span.setStatus({ code: 2, message: error instanceof Error ? error.message : String(error) }); // ERROR
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Span kind mapping
   */
  private mapSpanKind(kind: string): opentelemetry.SpanKind {
    const kindMap: Record<string, opentelemetry.SpanKind> = {
      internal: opentelemetry.SpanKind.INTERNAL,
      server: opentelemetry.SpanKind.SERVER,
      client: opentelemetry.SpanKind.CLIENT,
      producer: opentelemetry.SpanKind.PRODUCER,
      consumer: opentelemetry.SpanKind.CONSUMER,
    };

    return kindMap[kind] || opentelemetry.SpanKind.INTERNAL;
  }

  /**
   * Health check
   */
  getHealthStatus(): { status: 'healthy' | 'unhealthy'; tracer: boolean } {
    try {
      return {
        status: this.tracer ? 'healthy' : 'unhealthy',
        tracer: !!this.tracer,
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        status: 'unhealthy',
        tracer: false,
      };
    }
  }

  /**
   * Tracing'i kapat
   */
  async shutdown(): Promise<void> {
    try {
      if (this.sdk) {
        await this.sdk.shutdown();
        this.logger.log('Tracing shutdown successfully');
      }
    } catch (error) {
      this.logger.error(`Failed to shutdown tracing: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
