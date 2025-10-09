import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CoachingManagementService } from './coaching-management.service';

@Controller('coaching')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class CoachingManagementController {
  constructor(private readonly coachingService: CoachingManagementService) {}

  @Get()
  async getCoaches(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ) {
    return this.coachingService.getCoaches({
      page,
      limit,
      search,
    });
  }

  @Get(':id')
  async getCoachById(@Param('id') id: string) {
    return this.coachingService.getCoachById(id);
  }

  @Post()
  async createCoach(@Body() createData: {
    userId: string;
    specialization: string;
    experience: number;
    bio?: string;
    isActive?: boolean;
  }) {
    return this.coachingService.createCoach(createData);
  }

  @Put(':id')
  async updateCoach(
    @Param('id') id: string,
    @Body() updateData: {
      specialization?: string;
      experience?: number;
      bio?: string;
      isActive?: boolean;
    },
  ) {
    return this.coachingService.updateCoach(id, updateData);
  }

  @Delete(':id')
  async deleteCoach(@Param('id') id: string) {
    return this.coachingService.deleteCoach(id);
  }

  @Get(':id/students')
  async getCoachStudents(@Param('id') id: string) {
    return this.coachingService.getCoachById(id);
  }

  @Post(':id/students')
  async assignStudents(
    @Param('id') id: string,
    @Body() assignmentData: {
      studentIds: string[];
    },
  ) {
    return this.coachingService.assignStudents(id, assignmentData.studentIds);
  }

  @Delete(':id/students/:studentId')
  async unassignStudent(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
  ) {
    return this.coachingService.unassignStudent(id, studentId);
  }

  @Get(':id/performance')
  async getCoachPerformance(@Param('id') id: string) {
    return this.coachingService.getCoachPerformance(id);
  }

  @Post(':id/notes')
  async createCoachNote(
    @Param('id') id: string,
    @Body() noteData: {
      studentId: string;
      title: string;
      content: string;
      type: string;
      priority: string;
    },
  ) {
    return this.coachingService.createCoachNote(id, noteData.studentId, noteData);
  }

  @Get(':id/notes')
  async getCoachNotes(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.coachingService.getCoachNotes(id, { page, limit });
  }

  @Get('assignment-stats')
  async getAssignmentStats() {
    return this.coachingService.getAssignmentStats();
  }

  @Get('unassigned-students')
  async getUnassignedStudents() {
    return this.coachingService.getUnassignedStudents();
  }

  @Post('assign-students')
  async assignStudentsToCoach(@Body() assignmentData: {
    coachId: string;
    studentIds: string[];
  }) {
    return this.coachingService.assignStudents(assignmentData.coachId, assignmentData.studentIds);
  }

  @Delete('unassign-student')
  async unassignStudentFromCoach(@Body() unassignmentData: {
    coachId: string;
    studentId: string;
  }) {
    return this.coachingService.unassignStudent(unassignmentData.coachId, unassignmentData.studentId);
  }

  @Post('notes')
  async createCoachNoteGlobal(@Body() noteData: {
    coachId: string;
    studentId: string;
    title: string;
    content: string;
    type: string;
    priority: string;
  }) {
    return this.coachingService.createCoachNote(noteData.coachId, noteData.studentId, {
      title: noteData.title,
      content: noteData.content,
      type: noteData.type,
      priority: noteData.priority,
    });
  }
}