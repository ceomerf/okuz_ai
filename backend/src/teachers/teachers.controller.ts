import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TeachersService } from './teachers.service';

@ApiTags('Teachers')
@Controller('api/teachers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEACHER')
@ApiBearerAuth()
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Öğretmen dashboard verileri' })
  @ApiResponse({ status: 200, description: 'Öğretmen dashboard verileri başarıyla getirildi' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getTeacherDashboard() {
    return this.teachersService.getTeacherDashboard();
  }

  @Get()
  @ApiOperation({ summary: 'Tüm öğretmenleri listele' })
  @ApiResponse({ status: 200, description: 'Öğretmen listesi başarıyla getirildi' })
  async getAllTeachers() {
    return this.teachersService.getAllTeachers();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Öğretmen detayları' })
  @ApiResponse({ status: 200, description: 'Öğretmen detayları başarıyla getirildi' })
  async getTeacher(@Param('id') id: string) {
    return this.teachersService.getTeacher(id);
  }

  @Post()
  @ApiOperation({ summary: 'Yeni öğretmen oluştur' })
  @ApiResponse({ status: 201, description: 'Öğretmen başarıyla oluşturuldu' })
  async createTeacher(@Body() data: any) {
    return this.teachersService.createTeacher(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Öğretmen güncelle' })
  @ApiResponse({ status: 200, description: 'Öğretmen başarıyla güncellendi' })
  async updateTeacher(@Param('id') id: string, @Body() data: any) {
    return this.teachersService.updateTeacher(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Öğretmen sil' })
  @ApiResponse({ status: 200, description: 'Öğretmen başarıyla silindi' })
  async deleteTeacher(@Param('id') id: string) {
    return this.teachersService.deleteTeacher(id);
  }

  @Get(':id/students')
  @ApiOperation({ summary: 'Öğretmenin öğrencilerini listele' })
  @ApiResponse({ status: 200, description: 'Öğrenci listesi başarıyla getirildi' })
  async getTeacherStudents(@Param('id') id: string) {
    return this.teachersService.getTeacherStudents(id);
  }

  @Get(':id/classes')
  @ApiOperation({ summary: 'Öğretmenin sınıflarını listele' })
  @ApiResponse({ status: 200, description: 'Sınıf listesi başarıyla getirildi' })
  async getTeacherClasses(@Param('id') id: string) {
    return this.teachersService.getTeacherClasses(id);
  }
}
