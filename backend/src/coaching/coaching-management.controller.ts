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
    specialty: string;
    isActive?: boolean;
  }) {
    return this.coachingService.createCoach(createData);
  }

  @Put(':id')
  async updateCoach(
    @Param('id') id: string,
    @Body() updateData: {
      specialty?: string;
      isActive?: boolean;
    },
  ) {
    return this.coachingService.updateCoach(id, updateData);
  }

  @Delete(':id')
  async deleteCoach(@Param('id') id: string) {
    return this.coachingService.deleteCoach(id);
  }

  @Post(':id/notes')
  async createCoachNote(
    @Param('id') coachId: string,
    @Body() noteData: {
      studentId: string;
      content: string;
    },
  ) {
    return this.coachingService.createCoachNote(coachId, noteData.studentId, noteData);
  }

  @Get(':id/notes')
  async getCoachNotes(
    @Param('id') coachId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.coachingService.getCoachNotes(coachId, { page, limit });
  }

  @Get('stats/assignments')
  async getAssignmentStats() {
    return this.coachingService.getAssignmentStats();
  }

  @Get('performance/:id')
  async getCoachPerformance(@Param('id') coachId: string) {
    return this.coachingService.getCoachPerformance(coachId);
  }
}