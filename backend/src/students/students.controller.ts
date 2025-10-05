import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  async createStudent(@Body() data: any) {
    return this.studentsService.createStudent(data);
  }

  @Get(':id')
  async getStudent(@Param('id') id: string) {
    return this.studentsService.getStudent(id);
  }

  @Put(':id')
  async updateStudent(@Param('id') id: string, @Body() data: any) {
    return this.studentsService.updateStudent(id, data);
  }

  @Get(':id/progress')
  async getStudentProgress(@Param('id') id: string) {
    return this.studentsService.getStudentProgress(id);
  }

  @Post('session')
  async createStudySession(@Body() data: any) {
    return this.studentsService.createStudySession(data);
  }

  @Post('exam')
  async recordExamResult(@Body() data: any) {
    return this.studentsService.recordExamResult(data);
  }

  @Get(':id/dashboard')
  async getStudentDashboard(@Param('id') id: string) {
    return this.studentsService.getStudentDashboard(id);
  }

  @Get(':id/recommendations')
  async getStudyRecommendations(@Param('id') id: string) {
    return this.studentsService.getStudyRecommendations(id);
  }

  @Put(':id/learning-style')
  async updateLearningStyle(@Param('id') id: string, @Body() data: any) {
    return this.studentsService.updateLearningStyle(id, data.learningStyle);
  }
}
