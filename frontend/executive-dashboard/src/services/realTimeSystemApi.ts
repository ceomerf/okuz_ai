import React from 'react';

// Gerçek zamanlı sistem API servisi
export interface SystemHealth {
  database: string;
  redis: string;
  api: string;
  overall: string;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
}

export interface SystemMetrics {
  activeUsers: number;
  requestsLastHour: number;
  errorRate: number;
  responseTime: number;
  uptime: number;
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  databaseConnections: number;
  cacheHitRate: number;
  queueSize: number;
}

export interface ServiceStatus {
  name: string;
  status: string;
  uptime: number;
  responseTime: number;
  lastCheck: string;
  version: string;
  dependencies: string[];
  healthCheck: {
    endpoint: string;
    interval: number;
    timeout: number;
    retries: number;
  };
}

export interface SystemAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  category: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  source: string;
  metadata?: Record<string, any>;
}

export interface PerformanceData {
  timestamp: string;
  requests: number;
  errors: number;
  responseTime: number;
  cpuUsage: number;
  memoryUsage: number;
  activeUsers: number;
  databaseQueries: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface SystemCommand {
  id: string;
  name: string;
  description: string;
  category: string;
  parameters: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration?: number;
  output?: string;
  error?: string;
  executedBy: string;
}

class RealTimeSystemApi {
  private baseUrl: string;
  private wsConnection: WebSocket | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(baseUrl: string = process.env.REACT_APP_API_URL || 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  // WebSocket bağlantısı kurma
  async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.baseUrl.replace('http', 'ws') + '/ws/system';
        this.wsConnection = new WebSocket(wsUrl);

        this.wsConnection.onopen = () => {
          console.log('Sistem WebSocket bağlantısı kuruldu');
          resolve();
        };

        this.wsConnection.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.emit('system-data', data);
          } catch (error) {
            console.error('WebSocket mesajı işlenemedi:', error);
          }
        };

        this.wsConnection.onerror = (error) => {
          console.error('WebSocket hatası:', error);
          reject(error);
        };

        this.wsConnection.onclose = () => {
          console.log('Sistem WebSocket bağlantısı kapatıldı');
          // Otomatik yeniden bağlanma
          setTimeout(() => {
            this.connectWebSocket();
          }, 5000);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  // Event listener ekleme
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  // Event listener kaldırma
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Event emit etme
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Sistem sağlık durumu alma
  async getSystemHealth(): Promise<{ success: boolean; data?: SystemHealth; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/health`);
      const result = await response.json();
      
      if (response.ok) {
        return { success: true, data: result };
      } else {
        return { success: false, error: result.message || 'Sistem sağlık durumu alınamadı' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Bilinmeyen hata' 
      };
    }
  }

  // Sistem metrikleri alma
  async getSystemMetrics(): Promise<{ success: boolean; data?: SystemMetrics; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/metrics`);
      const result = await response.json();
      
      if (response.ok) {
        return { success: true, data: result };
      } else {
        return { success: false, error: result.message || 'Sistem metrikleri alınamadı' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Bilinmeyen hata' 
      };
    }
  }

  // Servis durumları alma
  async getServiceStatus(): Promise<{ success: boolean; data?: ServiceStatus[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/services`);
      const result = await response.json();
      
      if (response.ok) {
        return { success: true, data: result };
      } else {
        return { success: false, error: result.message || 'Servis durumları alınamadı' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Bilinmeyen hata' 
      };
    }
  }

  // Aktif uyarılar alma
  async getActiveAlerts(): Promise<{ success: boolean; data?: SystemAlert[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/alerts/active`);
      const result = await response.json();
      
      if (response.ok) {
        return { success: true, data: result };
      } else {
        return { success: false, error: result.message || 'Aktif uyarılar alınamadı' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Bilinmeyen hata' 
      };
    }
  }

  // Performans verileri alma
  async getPerformanceData(
    timeRange: '1h' | '6h' | '24h' | '7d' = '24h'
  ): Promise<{ success: boolean; data?: PerformanceData[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/performance?range=${timeRange}`);
      const result = await response.json();
      
      if (response.ok) {
        return { success: true, data: result };
      } else {
        return { success: false, error: result.message || 'Performans verileri alınamadı' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Bilinmeyen hata' 
      };
    }
  }

  // Sistem komutları çalıştırma
  async executeCommand(
    command: string,
    parameters?: Record<string, any>
  ): Promise<{ success: boolean; data?: SystemCommand; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/commands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          parameters: parameters || {}
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        return { success: true, data: result };
      } else {
        return { success: false, error: result.message || 'Komut çalıştırılamadı' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Bilinmeyen hata' 
      };
    }
  }

  // Komut durumu sorgulama
  async getCommandStatus(commandId: string): Promise<{ success: boolean; data?: SystemCommand; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/commands/${commandId}`);
      const result = await response.json();
      
      if (response.ok) {
        return { success: true, data: result };
      } else {
        return { success: false, error: result.message || 'Komut durumu alınamadı' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Bilinmeyen hata' 
      };
    }
  }

  // Komut geçmişi alma
  async getCommandHistory(
    page: number = 1,
    limit: number = 50
  ): Promise<{ success: boolean; data?: SystemCommand[]; total?: number; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/commands/history?page=${page}&limit=${limit}`);
      const result = await response.json();
      
      if (response.ok) {
        return { success: true, data: result.data, total: result.total };
      } else {
        return { success: false, error: result.message || 'Komut geçmişi alınamadı' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Bilinmeyen hata' 
      };
    }
  }

  // Uyarı çözme
  async resolveAlert(alertId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        return { success: true };
      } else {
        const result = await response.json();
        return { success: false, error: result.message || 'Uyarı çözülemedi' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Bilinmeyen hata' 
      };
    }
  }

  // Sistem yeniden başlatma
  async restartSystem(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/restart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        return { success: true };
      } else {
        const result = await response.json();
        return { success: false, error: result.message || 'Sistem yeniden başlatılamadı' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Bilinmeyen hata' 
      };
    }
  }

  // Sistem güncelleme
  async updateSystem(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        return { success: true };
      } else {
        const result = await response.json();
        return { success: false, error: result.message || 'Sistem güncellenemedi' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Bilinmeyen hata' 
      };
    }
  }

  // Önbellek temizleme
  async clearCache(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/cache/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        return { success: true };
      } else {
        const result = await response.json();
        return { success: false, error: result.message || 'Önbellek temizlenemedi' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Bilinmeyen hata' 
      };
    }
  }

  // Veritabanı yedekleme
  async backupDatabase(
    backupType: 'full' | 'incremental' | 'differential' = 'full'
  ): Promise<{ success: boolean; data?: { backupId: string; downloadUrl: string }; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system/backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ backupType }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        return { success: true, data: result };
      } else {
        return { success: false, error: result.message || 'Veritabanı yedeklenemedi' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Bilinmeyen hata' 
      };
    }
  }

  // Bağlantıyı kapatma
  disconnect(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  // Bağlantı durumu
  isConnected(): boolean {
    return this.wsConnection?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const realTimeSystemApi = new RealTimeSystemApi();

// Hook for real-time system data
export const useRealTimeSystem = () => {
  const [systemHealth, setSystemHealth] = React.useState<SystemHealth | null>(null);
  const [systemMetrics, setSystemMetrics] = React.useState<SystemMetrics | null>(null);
  const [serviceStatus, setServiceStatus] = React.useState<ServiceStatus[]>([]);
  const [alerts, setAlerts] = React.useState<SystemAlert[]>([]);
  const [connected, setConnected] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // WebSocket bağlantısı kurma
    realTimeSystemApi.connectWebSocket()
      .then(() => setConnected(true))
      .catch((err) => {
        setError(err.message);
        setConnected(false);
      });

    // Sistem veri güncellemelerini dinleme
    const handleSystemData = (data: any) => {
      if (data.type === 'health') {
        setSystemHealth(data.data);
      } else if (data.type === 'metrics') {
        setSystemMetrics(data.data);
      } else if (data.type === 'services') {
        setServiceStatus(data.data);
      } else if (data.type === 'alerts') {
        setAlerts(data.data);
      }
      setError(null);
    };

    realTimeSystemApi.on('system-data', handleSystemData);

    return () => {
      realTimeSystemApi.off('system-data', handleSystemData);
      realTimeSystemApi.disconnect();
    };
  }, []);

  return { 
    systemHealth, 
    systemMetrics, 
    serviceStatus, 
    alerts, 
    connected, 
    error 
  };
};

export default realTimeSystemApi;
