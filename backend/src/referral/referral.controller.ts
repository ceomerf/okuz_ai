import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReferralService } from './referral.service';

@Controller('referral')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  /**
   * Yeni referans kodu oluştur
   */
  @Post('codes')
  @Roles('STUDENT', 'PARENT', 'TEACHER', 'ADMIN')
  async createReferralCode(
    @Request() req: any,
    @Body() body: {
      maxUses?: number;
      expiresAt?: string;
      bonusType?: string;
      bonusValue?: number;
    }
  ) {
    return this.referralService.createReferralCode(req.user.id, {
      maxUses: body.maxUses,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      bonusType: body.bonusType,
      bonusValue: body.bonusValue,
    });
  }

  /**
   * Kullanıcının referans kodlarını getir
   */
  @Get('codes')
  @Roles('STUDENT', 'PARENT', 'TEACHER', 'ADMIN')
  async getUserReferralCodes(@Request() req: any) {
    return this.referralService.getUserReferralCodes(req.user.id);
  }

  /**
   * Referans kodu kullan
   */
  @Post('use')
  @Roles('STUDENT', 'PARENT', 'TEACHER', 'ADMIN')
  async useReferralCode(
    @Request() req: any,
    @Body() body: { code: string }
  ) {
    return this.referralService.useReferralCode(req.user.id, body.code);
  }

  /**
   * Referans istatistikleri
   */
  @Get('stats')
  @Roles('STUDENT', 'PARENT', 'TEACHER', 'ADMIN')
  async getReferralStats(@Request() req: any) {
    return this.referralService.getReferralStats(req.user.id);
  }

  /**
   * Referans kodu deaktive et
   */
  @Delete('codes/:codeId')
  @Roles('STUDENT', 'PARENT', 'TEACHER', 'ADMIN')
  async deactivateReferralCode(
    @Request() req: any,
    @Param('codeId') codeId: string
  ) {
    return this.referralService.deactivateReferralCode(req.user.id, codeId);
  }

  /**
   * Referans kodu arama (genel)
   */
  @Get('search/:code')
  @Roles('STUDENT', 'PARENT', 'TEACHER', 'ADMIN')
  async searchReferralCode(@Param('code') code: string) {
    return this.referralService.searchReferralCode(code);
  }

  /**
   * Popüler referans kodları (admin)
   */
  @Get('popular')
  @Roles('ADMIN')
  async getPopularReferralCodes(
    @Query('limit') limit?: string
  ) {
    const limitNum = limit ? parseInt(limit) : 10;
    return this.referralService.getPopularReferralCodes(limitNum);
  }
}
