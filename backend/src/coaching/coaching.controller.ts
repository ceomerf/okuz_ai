import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CoachingService } from './coaching.service';

@Controller('coaching')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoachingController {
  constructor(private readonly coachingService: CoachingService) {}

  /**
   * Koçun öğrenci listesini getir
   */
  @Get('students')
  @Roles('TEACHER', 'ADMIN')
  async getCoachStudents(@Request() req: any) {
    return this.coachingService.getCoachStudents(req.user.id);
  }

  /**
   * Öğrenci detayını getir
   */
  @Get('students/:studentId')
  @Roles('TEACHER', 'ADMIN')
  async getStudentDetails(@Request() req: any, @Param('studentId') studentId: string) {
    return this.coachingService.getStudentDetails(req.user.id, studentId);
  }

  /**
   * Koç notu ekle
   */
  @Post('students/:studentId/notes')
  @Roles('TEACHER', 'ADMIN')
  async addCoachNote(
    @Request() req: any,
    @Param('studentId') studentId: string,
    @Body() noteData: {
      title: string;
      content: string;
      type?: string;
      priority?: string;
    }
  ) {
    return this.coachingService.addCoachNote(req.user.id, studentId, noteData);
  }

  /**
   * Öğrenci uyum skorunu güncelle
   */
  @Put('students/:studentId/compliance')
  @Roles('TEACHER', 'ADMIN')
  async updateStudentCompliance(
    @Request() req: any,
    @Param('studentId') studentId: string,
    @Body() complianceData: {
      date: string;
      planComplianceScore: number;
      sessionCompletionRate: number;
      timeSpentVsPlanned: number;
      coachRating?: number;
      coachComment?: string;
    }
  ) {
    return this.coachingService.updateStudentCompliance(req.user.id, studentId, {
      ...complianceData,
      date: new Date(complianceData.date),
    });
  }

  /**
   * Koç performans özeti
   */
  @Get('performance')
  @Roles('TEACHER', 'ADMIN')
  async getCoachPerformance(@Request() req: any) {
    return this.coachingService.getCoachPerformance(req.user.id);
  }
}
