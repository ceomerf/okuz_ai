import { Controller, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { StudentDashboardService, StudentDashboardData } from './student-dashboard.service';

@Controller('students')
export class StudentDashboardController {
  constructor(private readonly studentDashboardService: StudentDashboardService) {}

  @Get(':studentId/dashboard')
  async getDashboardData(@Param('studentId') studentId: string): Promise<StudentDashboardData> {
    try {
      return await this.studentDashboardService.getDashboardData(studentId);
    } catch (error) {
      throw new HttpException(
        'Failed to get student dashboard data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
