import { Controller, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { TeacherDashboardService, TeacherDashboardData } from './teacher-dashboard.service';

@Controller('teachers')
export class TeacherDashboardController {
  constructor(private readonly teacherDashboardService: TeacherDashboardService) {}

  @Get(':teacherId/dashboard')
  async getDashboardData(@Param('teacherId') teacherId: string): Promise<TeacherDashboardData> {
    try {
      return await this.teacherDashboardService.getDashboardData(teacherId);
    } catch (error) {
      throw new HttpException(
        'Failed to get teacher dashboard data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
