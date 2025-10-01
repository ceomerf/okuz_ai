import { Injectable } from '@nestjs/common';

export interface MetricData {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp?: number;
}

@Injectable()
export class MetricsService {
  private metrics: Map<string, MetricData[]> = new Map();

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
    const metric: MetricData = {
      name: 'queue_size',
      value: size,
      labels: {
        queue_name: queueName,
      },
      timestamp: Date.now(),
    };
    this.storeMetric(metric);
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

  // AI/Gemini metrikleri
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

  // Prometheus formatında metrikleri döndür
  getPrometheusMetrics(): string {
    let output = '';
    
    for (const [metricName, data] of this.metrics.entries()) {
      // Son 1 saatteki verileri al (basit filtreleme)
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const recentData = data.filter(d => d.timestamp && d.timestamp > oneHourAgo);
      
      if (recentData.length === 0) continue;

      // Histogram için percentiles hesapla
      if (metricName.includes('duration') || metricName.includes('latency')) {
        const values = recentData.map(d => d.value).sort((a, b) => a - b);
        const p50 = this.calculatePercentile(values, 0.5);
        const p95 = this.calculatePercentile(values, 0.95);
        const p99 = this.calculatePercentile(values, 0.99);
        
        output += `# HELP ${metricName} ${metricName}\n`;
        output += `# TYPE ${metricName} histogram\n`;
        output += `${metricName}_bucket{le="0.1"} ${values.filter(v => v <= 0.1).length}\n`;
        output += `${metricName}_bucket{le="0.5"} ${values.filter(v => v <= 0.5).length}\n`;
        output += `${metricName}_bucket{le="1.0"} ${values.filter(v => v <= 1.0).length}\n`;
        output += `${metricName}_bucket{le="+Inf"} ${values.length}\n`;
        output += `${metricName}_sum ${values.reduce((sum, v) => sum + v, 0)}\n`;
        output += `${metricName}_count ${values.length}\n`;
        output += `${metricName}_p50 ${p50}\n`;
        output += `${metricName}_p95 ${p95}\n`;
        output += `${metricName}_p99 ${p99}\n`;
      } else {
        // Counter veya Gauge
        const latestValue = recentData[recentData.length - 1];
        const labels = latestValue.labels ? 
          Object.entries(latestValue.labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',') : '';
        
        output += `# HELP ${metricName} ${metricName}\n`;
        output += `# TYPE ${metricName} gauge\n`;
        output += `${metricName}{${labels}} ${latestValue.value}\n`;
      }
    }
    
    return output;
  }

  private storeMetric(metric: MetricData) {
    const key = metric.name;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const data = this.metrics.get(key)!;
    data.push(metric);
    
    // Son 24 saatteki verileri tut (basit cleanup)
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
    // Cache key'lerinden pattern çıkar (örn: weekly:123 -> weekly:*)
    return key.replace(/:\d+$/, ':*').replace(/:\d+:/, ':*:');
  }
}
