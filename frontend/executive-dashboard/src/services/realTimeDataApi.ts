import React from 'react';

// Gerçek zamanlı veri API servisi
export interface RealTimeData {
  timestamp: string;
  activeUsers: number;
  requestsPerSecond: number;
  errorRate: number;
  responseTime: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
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
}

export interface PerformanceMetric {
  timestamp: string;
  metric: string;
  value: number;
  unit: string;
  threshold?: number;
  status: 'normal' | 'warning' | 'critical';
}

export interface UserActivity {
  userId: string;
  userName: string;
  action: string;
  resource: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
}

export interface SystemEvent {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  source: string;
  metadata?: Record<string, any>;
}

class RealTimeDataApi {
  private baseUrl: string;
  private wsConnection: WebSocket | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(baseUrl: string = process.env.REACT_APP_API_URL || 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  // WebSocket bağlantısı kurma
  connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.baseUrl.replace('http', 'ws') + '/ws/realtime';
        this.wsConnection = new WebSocket(wsUrl);

        this.wsConnection.onopen = () => {
          console.log('Real-time WebSocket bağlantısı kuruldu');
          resolve();
        };

        this.wsConnection.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.emit('data', data);
          } catch (error) {
            console.error('WebSocket mesajı işlenemedi:', error);
          }
        };

        this.wsConnection.onerror = (error) => {
          console.error('WebSocket hatası:', error);
          reject(error);
        };

        this.wsConnection.onclose = () => {
          console.log('WebSocket bağlantısı kapatıldı');
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

  // Gerçek zamanlı veri alma
  async getRealTimeData(): Promise<{ success: boolean; data?: RealTimeData; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/realtime/data`);
      const result = await response.json();
      
      if (response.ok) {
        return { success: true, data: result };
      } else {
        return { success: false, error: result.message || 'Veri alınamadı' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Bilinmeyen hata' 
      };
    }
  }

  // Sistem uyarıları alma
  async getSystemAlerts(): Promise<{ success: boolean; data?: SystemAlert[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/realtime/alerts`);
      const result = await response.json();
      
      if (response.ok) {
        return { success: true, data: result };
      } else {
        return { success: false, error: result.message || 'Uyarılar alınamadı' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Bilinmeyen hata' 
      };
    }
  }

  // Performans metrikleri alma
  async getPerformanceMetrics(
    timeRange: '1h' | '6h' | '24h' | '7d' = '24h'
  ): Promise<{ success: boolean; data?: PerformanceMetric[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/realtime/metrics?range=${timeRange}`);
      const result = await response.json();
      
      if (response.ok) {
        return { success: true, data: result };
      } else {
        return { success: false, error: result.message || 'Metrikler alınamadı' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Bilinmeyen hata' 
      };
    }
  }

  // Kullanıcı aktiviteleri alma
  async getUserActivities(
    page: number = 1,
    limit: number = 50,
    userId?: string
  ): Promise<{ success: boolean; data?: UserActivity[]; total?: number; error?: string }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(userId && { userId })
      });

      const response = await fetch(`${this.baseUrl}/api/realtime/activities?${params}`);
      const result = await response.json();
      
      if (response.ok) {
        return { success: true, data: result.data, total: result.total };
      } else {
        return { success: false, error: result.message || 'Aktiviteler alınamadı' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Bilinmeyen hata' 
      };
    }
  }

  // Sistem olayları alma
  async getSystemEvents(
    page: number = 1,
    limit: number = 50,
    severity?: string
  ): Promise<{ success: boolean; data?: SystemEvent[]; total?: number; error?: string }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(severity && { severity })
      });

      const response = await fetch(`${this.baseUrl}/api/realtime/events?${params}`);
      const result = await response.json();
      
      if (response.ok) {
        return { success: true, data: result.data, total: result.total };
      } else {
        return { success: false, error: result.message || 'Olaylar alınamadı' };
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
      const response = await fetch(`${this.baseUrl}/api/realtime/alerts/${alertId}/resolve`, {
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

  // Sistem komutları gönderme
  async executeSystemCommand(
    command: string,
    parameters?: Record<string, any>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/realtime/commands`, {
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

  // Sistem durumu kontrol etme
  async checkSystemHealth(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/realtime/health`);
      const result = await response.json();
      
      if (response.ok) {
        return { success: true, data: result };
      } else {
        return { success: false, error: result.message || 'Sistem durumu kontrol edilemedi' };
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
export const realTimeDataApi = new RealTimeDataApi();

// Hook for real-time data
export const useRealTimeData = () => {
  const [data, setData] = React.useState<RealTimeData | null>(null);
  const [connected, setConnected] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // WebSocket bağlantısı kurma
    realTimeDataApi.connectWebSocket()
      .then(() => setConnected(true))
      .catch((err) => {
        setError(err.message);
        setConnected(false);
      });

    // Veri güncellemelerini dinleme
    const handleData = (newData: RealTimeData) => {
      setData(newData);
      setError(null);
    };

    realTimeDataApi.on('data', handleData);

    return () => {
      realTimeDataApi.off('data', handleData);
      realTimeDataApi.disconnect();
    };
  }, []);

  return { data, connected, error };
};

export default realTimeDataApi;
