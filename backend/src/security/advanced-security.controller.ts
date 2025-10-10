import { Controller, Get, Post, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { AdvancedSecurityService, SecurityDashboard, SecurityEvent, SecurityThreat } from './advanced-security.service';

@Controller('security')
export class AdvancedSecurityController {
  constructor(private readonly advancedSecurityService: AdvancedSecurityService) {}

  @Get('dashboard')
  async getSecurityDashboard(): Promise<SecurityDashboard> {
    try {
      return await this.advancedSecurityService.getSecurityDashboard();
    } catch (error) {
      throw new HttpException(
        'Failed to get security dashboard',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('events')
  async logSecurityEvent(@Body() eventData: {
    type: 'login_attempt' | 'failed_login' | 'suspicious_activity' | 'data_breach' | 'unauthorized_access';
    severity: 'low' | 'medium' | 'high' | 'critical';
    ipAddress: string;
    description: string;
    userId?: string;
    userAgent?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await this.advancedSecurityService.logSecurityEvent(
        eventData.type,
        eventData.severity,
        eventData.ipAddress,
        eventData.description,
        eventData.userId,
        eventData.userAgent,
        eventData.metadata
      );
    } catch (error) {
      throw new HttpException(
        'Failed to log security event',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('threats')
  async detectThreat(@Body() threatData: {
    type: 'brute_force' | 'sql_injection' | 'xss' | 'csrf' | 'ddos' | 'malware';
    severity: 'low' | 'medium' | 'high' | 'critical';
    source: string;
    target: string;
    description: string;
    mitigationActions?: string[];
  }): Promise<void> {
    try {
      await this.advancedSecurityService.detectThreat(
        threatData.type,
        threatData.severity,
        threatData.source,
        threatData.target,
        threatData.description,
        threatData.mitigationActions || []
      );
    } catch (error) {
      throw new HttpException(
        'Failed to detect threat',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('brute-force/:ipAddress')
  async checkBruteForceAttack(
    @Param('ipAddress') ipAddress: string,
    @Query('userId') userId?: string
  ): Promise<{ isAttack: boolean }> {
    try {
      const isAttack = await this.advancedSecurityService.checkBruteForceAttack(ipAddress, userId);
      return { isAttack };
    } catch (error) {
      throw new HttpException(
        'Failed to check brute force attack',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('block-ip')
  async blockIPAddress(@Body() blockData: {
    ipAddress: string;
    reason: string;
    duration?: number;
  }): Promise<void> {
    try {
      await this.advancedSecurityService.blockIPAddress(
        blockData.ipAddress,
        blockData.reason,
        blockData.duration
      );
    } catch (error) {
      throw new HttpException(
        'Failed to block IP address',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('blocked/:ipAddress')
  async isIPBlocked(@Param('ipAddress') ipAddress: string): Promise<{ isBlocked: boolean }> {
    try {
      const isBlocked = await this.advancedSecurityService.isIPBlocked(ipAddress);
      return { isBlocked };
    } catch (error) {
      throw new HttpException(
        'Failed to check if IP is blocked',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('password/validate')
  async validatePasswordStrength(@Body() passwordData: {
    password: string;
  }): Promise<{
    isValid: boolean;
    score: number;
    feedback: string[];
  }> {
    try {
      return await this.advancedSecurityService.validatePasswordStrength(passwordData.password);
    } catch (error) {
      throw new HttpException(
        'Failed to validate password strength',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('2fa/enable/:userId')
  async enableTwoFactorAuth(@Param('userId') userId: string): Promise<{
    secret: string;
    qrCode: string;
  }> {
    try {
      return await this.advancedSecurityService.enableTwoFactorAuth(userId);
    } catch (error) {
      throw new HttpException(
        'Failed to enable two factor auth',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('2fa/verify/:userId')
  async verifyTwoFactorCode(
    @Param('userId') userId: string,
    @Body() codeData: { code: string }
  ): Promise<{ isValid: boolean }> {
    try {
      const isValid = await this.advancedSecurityService.verifyTwoFactorCode(userId, codeData.code);
      return { isValid };
    } catch (error) {
      throw new HttpException(
        'Failed to verify two factor code',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('audit')
  async auditUserAction(@Body() auditData: {
    userId: string;
    action: string;
    resource: string;
    ipAddress: string;
    userAgent?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await this.advancedSecurityService.auditUserAction(
        auditData.userId,
        auditData.action,
        auditData.resource,
        auditData.ipAddress,
        auditData.userAgent,
        auditData.metadata
      );
    } catch (error) {
      throw new HttpException(
        'Failed to audit user action',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('report')
  async getSecurityReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ): Promise<any> {
    try {
      return await this.advancedSecurityService.getSecurityReport(startDate, endDate);
    } catch (error) {
      throw new HttpException(
        'Failed to get security report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
