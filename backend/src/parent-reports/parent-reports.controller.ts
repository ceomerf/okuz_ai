import { Controller, Get, Post, Query, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ParentReportsService } from './parent-reports.service';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller('parent-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParentReportsController {
  constructor(private readonly parentReportsService: ParentReportsService) {}

  /**
   * Veli dashboard - öğrenci listesi ve genel durum
   */
  @Get('dashboard')
  @Roles('PARENT')
  async getParentDashboard(@Request() req: AuthenticatedRequest) {
    return this.parentReportsService.getParentDashboard(req.user.id);
  }

  /**
   * Haftalık rapor oluştur veya getir
   */
  @Get('weekly-report/:studentId')
  @Roles('PARENT')
  async getWeeklyReport(
    @Request() req: AuthenticatedRequest,
    @Param('studentId') studentId: string,
    @Query('weekStart') weekStart?: string
  ) {
    const weekStartDate = weekStart ? new Date(weekStart) : this.getCurrentWeekStart();
    return this.parentReportsService.getWeeklyReport(req.user.id, studentId, weekStartDate);
  }

  /**
   * Öğrenci için günlük ısı haritası
   */
  @Get('heatmap/:studentId')
  @Roles('PARENT')
  async getStudentHeatmap(
    @Request() req: AuthenticatedRequest,
    @Param('studentId') studentId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.parentReportsService.getStudentHeatmap(
      req.user.id,
      studentId,
      new Date(startDate),
      new Date(endDate)
    );
  }

  /**
   * Öğrenci için ders bazlı ilerleme
   */
  @Get('subject-progress/:studentId')
  @Roles('PARENT')
  async getSubjectProgress(
    @Request() req: AuthenticatedRequest,
    @Param('studentId') studentId: string,
    @Query('weekStart') weekStart?: string
  ) {
    const weekStartDate = weekStart ? new Date(weekStart) : this.getCurrentWeekStart();
    return this.parentReportsService.getSubjectProgress(req.user.id, studentId, weekStartDate);
  }

  /**
   * Haftalık raporu yeniden oluştur
   */
  @Post('weekly-report/:studentId/regenerate')
  @Roles('PARENT')
  async regenerateWeeklyReport(
    @Request() req: AuthenticatedRequest,
    @Param('studentId') studentId: string,
    @Query('weekStart') weekStart?: string
  ) {
    const weekStartDate = weekStart ? new Date(weekStart) : this.getCurrentWeekStart();
    return this.parentReportsService.generateWeeklyReport(req.user.id, studentId, weekStartDate);
  }

  private getCurrentWeekStart(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  }
}
