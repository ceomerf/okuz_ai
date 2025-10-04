import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } = require('prom-client');

export interface MetricData {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp?: number;
}

@Injectable()
export class MetricsService {
  private metrics: Map<string, MetricData[]> = new Map();
  private registry: any;
  private openaiRequests: any;
  private openaiDuration: any;
  private queueSizeGauge: any;

  constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry });
    this.openaiRequests = new Counter({ name: 'openai_requests_total', help: 'Total OpenAI API requests', labelNames: ['status', 'endpoint', 'model_name'], registers: [this.registry] });
    this.openaiDuration = new Histogram({ name: 'openai_call_duration_seconds', help: 'OpenAI API call duration in seconds', labelNames: ['user_id', 'plan_type', 'model_name', 'endpoint', 'success'], buckets: [0.1, 0.5, 1, 2, 5, 10, 30], registers: [this.registry] });
    this.queueSizeGauge = new Gauge({ name: 'queue_size', help: 'Queue size by name', labelNames: ['queue_name'], registers: [this.registry] });
  }

  // HTTP endpoint metrikleri
  recordEndpointLatency(endpoint: string, method: string, duration: number, statusCode: number) {
    const metric: MetricData = {
      name: 'http_request_duration_seconds',
      value: duration / 1000, // ms to seconds
      labels: {
        endpoint,
        method,
        status_code: statusCode.toString(),
      },
      timestamp: Date.now(),
    };
    this.storeMetric(metric);
  }

  // Cron job metrikleri
  recordCronJobDuration(jobName: string, duration: number, success: boolean) {
    const metric: MetricData = {
      name: 'cron_job_duration_seconds',
      value: duration / 1000,
      labels: {
        job_name: jobName,
        success: success.toString(),
      },
      timestamp: Date.now(),
    };
    this.storeMetric(metric);
  }

  // Queue metrikleri
  recordQueueSize(queueName: string, size: number) {
    this.queueSizeGauge.labels(queueName).set(size);
  }

  recordQueueProcessingTime(queueName: string, duration: number, success: boolean) {
    const metric: MetricData = {
      name: 'queue_processing_duration_seconds',
      value: duration / 1000,
      labels: {
        queue_name: queueName,
        success: success.toString(),
      },
      timestamp: Date.now(),
    };
    this.storeMetric(metric);
  }

  // AI/OpenAI metrikleri
  recordAiApiCall(provider: string, duration: number, success: boolean, tokensUsed?: number) {
    const metric: MetricData = {
      name: 'ai_api_duration_seconds',
      value: duration / 1000,
      labels: {
        provider,
        success: success.toString(),
      },
      timestamp: Date.now(),
    };
    this.storeMetric(metric);

    if (tokensUsed) {
      const tokenMetric: MetricData = {
        name: 'ai_api_tokens_used',
        value: tokensUsed,
        labels: {
          provider,
        },
        timestamp: Date.now(),
      };
      this.storeMetric(tokenMetric);
    }
  }

  // OpenAI istek sayacı (success/error)
  recordGeminiRequest(status: 'success' | 'error', endpoint: string, modelName?: string) {
    this.openaiRequests.labels(status, endpoint, modelName || 'unknown').inc();
  }

  // OpenAI özel metrikleri (etiketli)
  recordGeminiUsage(userId: string | undefined, planType: string | undefined, modelName: string | undefined, endpoint: string | undefined, tokensUsed: number) {
    const metric: MetricData = {
      name: 'openai_tokens_used',
      value: Math.max(0, tokensUsed || 0),
      labels: {
        user_id: userId || 'unknown',
        plan_type: planType || 'unknown',
        model_name: modelName || 'unknown',
        endpoint: endpoint || 'unknown',
      },
      timestamp: Date.now(),
    };
    this.storeMetric(metric);
  }

  recordGeminiCallDuration(userId: string | undefined, planType: string | undefined, modelName: string | undefined, endpoint: string | undefined, durationMs: number, success: boolean) {
    this.openaiDuration.labels(userId || 'unknown', planType || 'unknown', modelName || 'unknown', endpoint || 'unknown', success.toString()).observe((durationMs || 0) / 1000);
  }

  // Plan üretim metrikleri
  recordPlanGenerationDuration(durationMs: number, success: boolean) {
    const metric: MetricData = {
      name: 'plan_generation_duration_seconds',
      value: durationMs / 1000,
      labels: { success: success.toString() },
      timestamp: Date.now(),
    };
    this.storeMetric(metric);
  }

  // Database metrikleri
  recordDatabaseQuery(table: string, duration: number, success: boolean) {
    const metric: MetricData = {
      name: 'database_query_duration_seconds',
      value: duration / 1000,
      labels: {
        table,
        success: success.toString(),
      },
      timestamp: Date.now(),
    };
    this.storeMetric(metric);
  }

  // Cache metrikleri
  recordCacheHit(key: string, hit: boolean) {
    const metric: MetricData = {
      name: 'cache_operation',
      value: hit ? 1 : 0,
      labels: {
        operation: hit ? 'hit' : 'miss',
        key_pattern: this.extractKeyPattern(key),
      },
      timestamp: Date.now(),
    };
    this.storeMetric(metric);
  }

  async getPrometheusMetrics(): Promise<string> {
    return await this.registry.metrics();
  }

  private storeMetric(metric: MetricData) {
    const key = metric.name;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    const data = this.metrics.get(key)!;
    data.push(metric);
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const filtered = data.filter(d => d.timestamp && d.timestamp > oneDayAgo);
    this.metrics.set(key, filtered);
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil(sortedValues.length * percentile) - 1;
    return sortedValues[Math.max(0, index)];
  }

  private extractKeyPattern(key: string): string {
    return key.replace(/:\d+$/, ':*').replace(/:\d+:/, ':*:');
  }
}
