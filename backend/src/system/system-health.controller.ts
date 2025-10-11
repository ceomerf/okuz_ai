import { Controller, Get, UseGuards } from '@nestjs/common';
import { SystemHealthService, SystemHealth } from './system-health.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('api/system/health')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemHealthController {
  constructor(private readonly systemHealthService: SystemHealthService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async getSystemHealth(): Promise<SystemHealth> {
    return this.systemHealthService.getSystemHealth();
  }

  @Get('status')
  @Roles(UserRole.ADMIN)
  async getSystemStatus() {
    const health = await this.systemHealthService.getSystemHealth();
    return {
      status: health.status,
      timestamp: health.timestamp,
      database: health.database.status,
      services: health.services.length,
    };
  }
}
