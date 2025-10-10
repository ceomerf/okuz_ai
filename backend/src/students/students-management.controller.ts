import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { StudentsManagementService } from './students-management.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentsManagementController {
  constructor(private readonly studentsService: StudentsManagementService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getStudents(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('grade') grade?: number,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.studentsService.getStudents({
      page,
      limit,
      search,
      grade,
      isActive,
    });
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getStudentStats() {
    return this.studentsService.getStudentStats();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getStudentById(@Param('id') id: string) {
    return this.studentsService.getStudentById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async createStudent(@Body() studentData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    name: string;
    studentProfile?: {
      field?: string;
      goals?: string[];
      learningStyle?: string;
      strengths?: string[];
      weaknesses?: string[];
      interests?: string[];
    };
  }) {
    return this.studentsService.createStudent(studentData);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async updateStudent(
    @Param('id') id: string,
    @Body() updateData: {
      firstName?: string;
      lastName?: string;
      name?: string;
      isActive?: boolean;
      studentProfile?: {
        field?: string;
        goals?: string[];
        learningStyle?: string;
        strengths?: string[];
        weaknesses?: string[];
        interests?: string[];
      };
    },
  ) {
    return this.studentsService.updateStudent(id, updateData);
  }
}
