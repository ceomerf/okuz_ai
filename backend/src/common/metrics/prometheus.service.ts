import { Injectable } from '@nestjs/common';
import { register, Counter, Gauge, Histogram } from 'prom-client';

@Injectable()
export class PrometheusService {
  private readonly planGenerationSuccess = new Counter({
    name: 'plan_generation_success_total',
    help: 'Total number of successful plan generations',
    labelNames: ['planType', 'userId'],
  });

  private readonly planGenerationDuration = new Histogram({
    name: 'plan_generation_duration_seconds',
    help: 'Duration of plan generation in seconds',
    labelNames: ['planType'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  });

  private readonly activeSubscriptions = new Gauge({
    name: 'active_subscriptions_gauge',
    help: 'Number of active subscriptions',
  });

  private readonly smartToolUsage = new Counter({
    name: 'smart_tool_usage_total',
    help: 'Total number of smart tool usages',
    labelNames: ['tool', 'userId'],
  });

  constructor() {
    register.registerMetric(this.planGenerationSuccess);
    register.registerMetric(this.planGenerationDuration);
    register.registerMetric(this.activeSubscriptions);
    register.registerMetric(this.smartToolUsage);
  }

  incrementPlanGenerationSuccess(planType: string, userId: string) {
    this.planGenerationSuccess.inc({ planType, userId });
  }

  observePlanGenerationDuration(planType: string, duration: number) {
    this.planGenerationDuration.observe({ planType }, duration);
  }

  setActiveSubscriptions(count: number) {
    this.activeSubscriptions.set(count);
  }

  incrementSmartToolUsage(tool: string, userId: string) {
    this.smartToolUsage.inc({ tool, userId });
  }
}
