import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Body, 
  Query, 
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { StudentsManagementService } from './students-management.service';

@ApiTags('Students Management')
@Controller('api/students-management')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEACHER')
@ApiBearerAuth()
export class StudentsManagementController {
  constructor(private readonly studentsManagementService: StudentsManagementService) {}

  @Get()
  @ApiOperation({ summary: 'Gelişmiş öğrenci listesi - eğitime özel filtreler' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Sayfa numarası' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Sayfa başına kayıt' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Arama terimi (ad, email)' })
  @ApiQuery({ name: 'grade', required: false, type: String, description: 'Sınıf filtresi' })
  @ApiQuery({ name: 'field', required: false, type: String, description: 'Alan filtresi (Sayısal, Sözel, Eşit Ağırlık)' })
  @ApiQuery({ name: 'coachId', required: false, type: String, description: 'Koç ID filtresi' })
  @ApiQuery({ name: 'hasParent', required: false, type: Boolean, description: 'Veli atanmış/atanmamış' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sıralama alanı' })
  @ApiQuery({ name: 'sortOrder', required: false, type: String, description: 'Sıralama yönü (asc/desc)' })
  @ApiResponse({ status: 200, description: 'Öğrenci listesi başarıyla getirildi' })
  async getStudents(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('search') search?: string,
    @Query('grade') grade?: string,
    @Query('field') field?: string,
    @Query('coachId') coachId?: string,
    @Query('hasParent') hasParent?: boolean,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.studentsManagementService.getStudentsWithFilters({
      page,
      limit,
      search,
      grade,
      field,
      coachId,
      hasParent,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Öğrenci detayları' })
  @ApiResponse({ status: 200, description: 'Öğrenci detayları' })
  @ApiResponse({ status: 404, description: 'Öğrenci bulunamadı' })
  async getStudentById(@Param('id') id: string) {
    return this.studentsManagementService.getStudentById(id);
  }

  @Get(':id/academic-history')
  @ApiOperation({ summary: 'Öğrenci akademik geçmişi' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Öğrenci akademik geçmişi' })
  async getStudentAcademicHistory(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    return this.studentsManagementService.getStudentAcademicHistory(id, page, limit);
  }

  @Get(':id/coach-notes')
  @ApiOperation({ summary: 'Öğrenci koç notları' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Öğrenci koç notları' })
  async getStudentCoachNotes(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    return this.studentsManagementService.getStudentCoachNotes(id, page, limit);
  }

  @Get(':id/parents')
  @ApiOperation({ summary: 'Öğrenci velileri' })
  @ApiResponse({ status: 200, description: 'Öğrenci velileri' })
  async getStudentParents(@Param('id') id: string) {
    return this.studentsManagementService.getStudentParents(id);
  }

  @Post(':studentId/parents/:parentId')
  @ApiOperation({ summary: 'Öğrenci-veli eşleştirmesi' })
  @ApiResponse({ status: 201, description: 'Eşleştirme başarıyla oluşturuldu' })
  async assignParentToStudent(
    @Param('studentId') studentId: string,
    @Param('parentId') parentId: string,
  ) {
    return this.studentsManagementService.assignParentToStudent(studentId, parentId);
  }

  @Delete(':studentId/parents/:parentId')
  @ApiOperation({ summary: 'Öğrenci-veli eşleştirmesini kaldır' })
  @ApiResponse({ status: 200, description: 'Eşleştirme başarıyla kaldırıldı' })
  async removeParentFromStudent(
    @Param('studentId') studentId: string,
    @Param('parentId') parentId: string,
  ) {
    return this.studentsManagementService.removeParentFromStudent(studentId, parentId);
  }

  @Get(':id/performance-metrics')
  @ApiOperation({ summary: 'Öğrenci performans metrikleri' })
  @ApiResponse({ status: 200, description: 'Öğrenci performans metrikleri' })
  async getStudentPerformanceMetrics(@Param('id') id: string) {
    return this.studentsManagementService.getStudentPerformanceMetrics(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Öğrenci bilgilerini güncelle' })
  @ApiResponse({ status: 200, description: 'Öğrenci başarıyla güncellendi' })
  async updateStudent(
    @Param('id') id: string,
    @Body() updateData: {
      grade?: number;
      field?: string;
      school?: string;
      learningStyle?: string;
      goals?: string[];
      strengths?: string[];
      weaknesses?: string[];
      interests?: string[];
    },
  ) {
    return this.studentsManagementService.updateStudent(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Öğrenci kaydını sil' })
  @ApiResponse({ status: 200, description: 'Öğrenci başarıyla silindi' })
  async deleteStudent(@Param('id') id: string) {
    return this.studentsManagementService.deleteStudent(id);
  }
}
