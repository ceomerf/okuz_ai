import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SystemService } from './system.service';

@ApiTags('System')
@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('status')
  @ApiOperation({ summary: 'Sistem durumunu kontrol et' })
  @ApiResponse({ status: 200, description: 'Sistem durumu başarıyla alındı' })
  async getSystemStatus() {
    return this.systemService.getSystemStatus();
  }

  @Post('start')
  @ApiOperation({ summary: 'Sistem servislerini başlat' })
  @ApiResponse({ status: 200, description: 'Servisler başlatıldı' })
  async startServices() {
    return this.systemService.startServices();
  }

  @Get('health')
  @ApiOperation({ summary: 'Sistem sağlık durumu' })
  @ApiResponse({ status: 200, description: 'Sağlık durumu alındı' })
  async getHealth() {
    return this.systemService.getHealth();
  }
}
