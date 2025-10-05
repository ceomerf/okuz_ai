import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getHealth() {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }

  getVersion() {
    return { 
      version: '1.0.0', 
      name: 'okuz-ai-backend',
      description: 'Okuz AI Backend Service'
    };
  }

  getSystemInfo() {
    const memUsage = process.memoryUsage();
    return {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal
      }
    };
  }
}
