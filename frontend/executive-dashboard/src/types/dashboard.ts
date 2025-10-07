export interface DashboardData {
  overallHealth: {
    score: number;
    status: 'excellent' | 'good' | 'warning' | 'critical';
    trend: 'up' | 'down' | 'stable';
    lastUpdated: string;
  };
  criticalMetrics: {
    users: {
      total: number;
      active: number;
      growth: number;
      status: 'good' | 'warning' | 'critical';
    };
    revenue: {
      current: number;
      target: number;
      growth: number;
      status: 'good' | 'warning' | 'critical';
    };
    performance: {
      uptime: number;
      responseTime: number;
      errorRate: number;
      status: 'good' | 'warning' | 'critical';
    };
  };
  urgentIssues: Array<{
    type: 'error' | 'performance' | 'security' | 'business';
    title: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
    action: string;
    autoFixable: boolean;
  }>;
  goals: Array<{
    name: string;
    current: number;
    target: number;
    progress: number;
    status: 'on-track' | 'behind' | 'ahead';
    deadline: string;
  }>;
  activeExperiments: Array<{
    name: string;
    type: 'ab-test' | 'feature-flag';
    status: 'running' | 'completed' | 'paused';
    impact: 'positive' | 'negative' | 'neutral';
    recommendation: string;
  }>;
  trends: Array<{
    metric: string;
    change: number;
    direction: 'up' | 'down' | 'stable';
    significance: 'high' | 'medium' | 'low';
  }>;
  recommendations: Array<{
    action: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'low' | 'medium' | 'high';
    timeline: string;
    autoExecutable: boolean;
  }>;
  quickActions: Array<{
    action: string;
    description: string;
    buttonText: string;
    endpoint: string;
    requiresConfirmation: boolean;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface HealthCheck {
  status: string;
  score: number;
  message: string;
  urgentIssues: number;
  recommendations: number;
  lastUpdated: string;
  quickActions: Array<{
    name: string;
    button: string;
    endpoint: string;
  }>;
}
