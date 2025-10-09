import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurriculumManagementService } from './curriculum-management.service';

@Controller('curriculum')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class CurriculumManagementController {
  constructor(private readonly curriculumService: CurriculumManagementService) {}

  @Get()
  async getCurriculums(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('subject') subject?: string,
    @Query('grade') grade?: number,
    @Query('search') search?: string,
  ) {
    return this.curriculumService.getCurriculums({
      page,
      limit,
      subject,
      grade,
      search,
    });
  }

  @Get(':id')
  async getCurriculumById(@Param('id') id: string) {
    return this.curriculumService.getCurriculumById(id);
  }

  @Post()
  async createCurriculum(@Body() createData: {
    subject: string;
    topic: string;
    grade: number;
    description?: string;
    month?: number;
    outcomes?: string[];
    tytWeight?: number;
    aytWeight?: number;
  }) {
    return this.curriculumService.createCurriculum(createData);
  }

  @Put(':id')
  async updateCurriculum(
    @Param('id') id: string,
    @Body() updateData: {
      subject?: string;
      topic?: string;
      grade?: number;
      description?: string;
      month?: number;
      outcomes?: string[];
      tytWeight?: number;
      aytWeight?: number;
    },
  ) {
    return this.curriculumService.updateCurriculum(id, updateData);
  }

  @Delete(':id')
  async deleteCurriculum(@Param('id') id: string) {
    return this.curriculumService.deleteCurriculum(id);
  }

  @Get(':id/topics')
  async getCurriculumTopics(@Param('id') id: string) {
    return this.curriculumService.getCurriculumTree(id);
  }

  @Post(':id/topics')
  async createTopic(
    @Param('id') id: string,
    @Body() createData: {
      subject: string;
      topic: string;
      grade: number;
      description?: string;
      month?: number;
      outcomes?: string[];
      tytWeight?: number;
      aytWeight?: number;
    },
  ) {
    return this.curriculumService.createTopic(createData);
  }

  @Put(':id/topics/:topicId')
  async updateTopic(
    @Param('id') id: string,
    @Param('topicId') topicId: string,
    @Body() updateData: {
      subject?: string;
      topic?: string;
      grade?: number;
      description?: string;
      month?: number;
      outcomes?: string[];
      tytWeight?: number;
      aytWeight?: number;
    },
  ) {
    return this.curriculumService.updateTopic(topicId, updateData);
  }

  @Delete(':id/topics/:topicId')
  async deleteTopic(
    @Param('id') id: string,
    @Param('topicId') topicId: string,
  ) {
    return this.curriculumService.deleteTopic(topicId);
  }

  @Put(':id/topics/:topicId/move')
  async moveTopic(
    @Param('id') id: string,
    @Param('topicId') topicId: string,
    @Body() moveData: {
      newSubject?: string;
      newGrade?: number;
    },
  ) {
    return this.curriculumService.moveTopic(topicId, moveData);
  }

  @Get('templates')
  async getCurriculumTemplates() {
    return this.curriculumService.getCurriculumTemplates();
  }

  @Get('fields')
  async getFields() {
    return this.curriculumService.getFields();
  }
}