import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { trace, Span, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { Prisma } from '@prisma/client';

export interface QueryTraceData {
  query: string;
  model: string;
  operation: string;
  duration: number;
  resultCount: number;
  spanId: string;
  traceId: string;
}

@Injectable()
export class QueryTracingService {
  private readonly logger = new Logger(QueryTracingService.name);
  private readonly tracer = trace.getTracer('prisma-query-tracer');
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isEnabled = this.configService.get<boolean>('QUERY_TRACING_ENABLED', true);
  }

  /**
   * Prisma middleware'i oluştur - OpenTelemetry ile
   */
  createTracingMiddleware() {
    return async (params: Prisma.MiddlewareParams, next: (params: Prisma.MiddlewareParams) => Promise<any>) => {
      if (!this.isEnabled) {
        return next(params);
      }

      const spanName = `prisma.${params.model}.${params.action}`;
      const span = this.tracer.startSpan(spanName, {
        kind: SpanKind.CLIENT,
        attributes: {
          'db.system': 'postgresql',
          'db.operation': params.action,
          'db.collection': params.model,
          'db.statement': this.formatQuery(params),
        },
      });

      try {
        const startTime = Date.now();
        const result = await next(params);
        const duration = Date.now() - startTime;

        // Span attributes güncelle
        span.setAttributes({
          'db.duration': duration,
          'db.result_count': Array.isArray(result) ? result.length : (result ? 1 : 0),
        });

        // Query trace data kaydet
        const traceData: QueryTraceData = {
          query: this.formatQuery(params),
          model: params.model || 'unknown',
          operation: params.action,
          duration,
          resultCount: Array.isArray(result) ? result.length : (result ? 1 : 0),
          spanId: span.spanContext().spanId,
          traceId: span.spanContext().traceId,
        };

        this.recordQueryTrace(traceData);

        // Yavaş sorguları logla
        if (duration > 100) {
          this.logger.warn(`Slow query detected: ${duration}ms`, {
            query: traceData.query,
            model: traceData.model,
            operation: traceData.operation,
            duration: traceData.duration,
            spanId: traceData.spanId,
            traceId: traceData.traceId,
          });
        }

        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        const duration = Date.now() - Date.now();
        
        span.setAttributes({
          'db.duration': duration,
          'error': true,
          'error.message': (error instanceof Error ? error.message : String(error)),
        });

        span.setStatus({ 
          code: SpanStatusCode.ERROR, 
          message: (error instanceof Error ? error.message : String(error))
        });

        this.logger.error(`Query failed: ${duration}ms`, {
          query: this.formatQuery(params),
          model: params.model,
          operation: params.action,
          error: (error instanceof Error ? error.message : String(error)),
          spanId: span.spanContext().spanId,
          traceId: span.spanContext().traceId,
        });

        throw error;
      } finally {
        span.end();
      }
    };
  }

  /**
   * Query'yi formatla
   */
  private formatQuery(params: Prisma.MiddlewareParams): string {
    const { model, action, args } = params;
    return `${model}.${action}(${JSON.stringify(args, null, 2)})`;
  }

  /**
   * Query trace data kaydet
   */
  private recordQueryTrace(traceData: QueryTraceData): void {
    // Burada trace data'yı kaydetmek için gerekli işlemler yapılabilir
    // Örneğin: database'e kaydet, metrics service'e gönder, vs.
    
    this.logger.debug(`Query traced: ${traceData.model}.${traceData.operation}`, {
      duration: traceData.duration,
      resultCount: traceData.resultCount,
      spanId: traceData.spanId,
      traceId: traceData.traceId,
    });
  }

  /**
   * N+1 query problemlerini tespit et
   */
  detectNPlusOneQueries(traceData: QueryTraceData[]): { detected: boolean; queries: string[] } {
    const nPlusOneQueries: string[] = [];
    const queryGroups = new Map<string, QueryTraceData[]>();

    // Query'leri grupla (model + operation)
    traceData.forEach(data => {
      const key = `${data.model}.${data.operation}`;
      if (!queryGroups.has(key)) {
        queryGroups.set(key, []);
      }
      queryGroups.get(key)!.push(data);
    });

    // Her grup için N+1 kontrolü
    queryGroups.forEach((queries, key) => {
      if (queries.length > 5) { // 5'ten fazla aynı query
        const timeSpan = queries[queries.length - 1].duration - queries[0].duration;
        if (timeSpan < 1000) { // 1 saniye içinde
          nPlusOneQueries.push(`${key} (${queries.length} queries in ${timeSpan}ms)`);
        }
      }
    });

    return {
      detected: nPlusOneQueries.length > 0,
      queries: nPlusOneQueries,
    };
  }

  /**
   * Query performance metrikleri
   */
  getQueryMetrics(traceData: QueryTraceData[]): {
    totalQueries: number;
    totalDuration: number;
    averageDuration: number;
    slowestQuery: QueryTraceData | null;
    queriesByModel: Record<string, number>;
    queriesByOperation: Record<string, number>;
    nPlusOneDetected: boolean;
    nPlusOneQueries: string[];
  } {
    if (traceData.length === 0) {
      return {
        totalQueries: 0,
        totalDuration: 0,
        averageDuration: 0,
        slowestQuery: null,
        queriesByModel: {},
        queriesByOperation: {},
        nPlusOneDetected: false,
        nPlusOneQueries: [],
      };
    }

    const totalDuration = traceData.reduce((sum, q) => sum + q.duration, 0);
    const averageDuration = totalDuration / traceData.length;
    
    const slowestQuery = traceData.reduce((slowest, current) => 
      current.duration > slowest.duration ? current : slowest
    );

    const queriesByModel: Record<string, number> = {};
    const queriesByOperation: Record<string, number> = {};

    traceData.forEach(data => {
      queriesByModel[data.model] = (queriesByModel[data.model] || 0) + 1;
      queriesByOperation[data.operation] = (queriesByOperation[data.operation] || 0) + 1;
    });

    const nPlusOne = this.detectNPlusOneQueries(traceData);

    return {
      totalQueries: traceData.length,
      totalDuration,
      averageDuration,
      slowestQuery,
      queriesByModel,
      queriesByOperation,
      nPlusOneDetected: nPlusOne.detected,
      nPlusOneQueries: nPlusOne.queries,
    };
  }

  /**
   * Query trace data'yı export et
   */
  exportTraceData(): QueryTraceData[] {
    // Burada trace data'yı export etmek için gerekli işlemler yapılabilir
    // Örneğin: JSON dosyasına kaydet, API'ye gönder, vs.
    return [];
  }

  /**
   * Query trace data'yı temizle
   */
  clearTraceData(): void {
    // Burada trace data'yı temizlemek için gerekli işlemler yapılabilir
    this.logger.debug('Query trace data cleared');
  }
}
