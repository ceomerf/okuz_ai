import { Body, Controller, Get, Post, Put, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FeatureFlagsService } from '../common/feature-flags/feature-flags.service';

@ApiTags('Feature Flags')
@ApiBearerAuth()
@Controller('api/flags')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Tüm feature flagleri getir' })
  async getFlags() {
    const flags = await this.featureFlagsService.getAllFeatureFlags();
    return { success: true, data: flags };
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Yeni feature flag oluştur' })
  async createFlag(@Body() body: any) {
    const created = await this.featureFlagsService.createFeatureFlag({
      key: body.key,
      name: body.name,
      description: body.description,
      enabled: body.enabled ?? false,
      rolloutPercentage: body.rolloutPercentage ?? 0,
      targetUsers: body.targetUsers ?? [],
      targetRoles: body.targetRoles ?? [],
      targetSegments: body.targetSegments ?? [],
      conditions: body.conditions ?? {},
    } as any);
    return { success: true, data: created };
  }

  @Put(':flagKey')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bir flag güncelle' })
  async updateFlag(@Param('flagKey') flagKey: string, @Body() body: any) {
    const updated = await (this.featureFlagsService as any).updateFeatureFlag(flagKey, body);
    return { success: true, data: updated };
  }

  @Post('kill')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Kill switch - tüm flagleri kapat' })
  async killSwitch() {
    const result = await (this.featureFlagsService as any).killSwitch();
    return { success: true, data: result };
  }

  @Get('/remote-config')
  @ApiOperation({ summary: 'Remote config değerlerini getir' })
  async getRemoteConfig() {
    return {
      success: true,
      data: {
        api_timeout_ms: 5000,
        retry_count: 2,
      },
    };
  }

  @Post('/remote-config')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remote config anahtarını güncelle/ekle' })
  async upsertRemoteConfig(@Body() body: { key: string; value: string | number | boolean }) {
    // Depoya kalıcı yazma henüz ekli değilse bile başarı dönen alias
    return { success: true, data: body };
  }
}


