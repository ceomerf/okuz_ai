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
import { ParentsManagementService } from './parents-management.service';

@ApiTags('Parents Management')
@Controller('api/parents-management')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEACHER')
@ApiBearerAuth()
export class ParentsManagementController {
  constructor(private readonly parentsManagementService: ParentsManagementService) {}

  @Get()
  @ApiOperation({ summary: 'Veli listesi - arama ve filtreleme' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Sayfa numarası' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Sayfa başına kayıt' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Arama terimi (ad, email, telefon)' })
  @ApiQuery({ name: 'hasChildren', required: false, type: Boolean, description: 'Çocuğu olan/olmayan veliler' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sıralama alanı' })
  @ApiQuery({ name: 'sortOrder', required: false, type: String, description: 'Sıralama yönü (asc/desc)' })
  @ApiResponse({ status: 200, description: 'Veli listesi başarıyla getirildi' })
  async getParents(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('search') search?: string,
    @Query('hasChildren') hasChildren?: boolean,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.parentsManagementService.getParentsWithFilters({
      page,
      limit,
      search,
      hasChildren,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Veli detayları' })
  @ApiResponse({ status: 200, description: 'Veli detayları' })
  @ApiResponse({ status: 404, description: 'Veli bulunamadı' })
  async getParentById(@Param('id') id: string) {
    return this.parentsManagementService.getParentById(id);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Velinin çocukları' })
  @ApiResponse({ status: 200, description: 'Velinin çocukları' })
  async getParentChildren(@Param('id') id: string) {
    return this.parentsManagementService.getParentChildren(id);
  }

  @Get(':id/activity')
  @ApiOperation({ summary: 'Veli aktivite geçmişi' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Veli aktivite geçmişi' })
  async getParentActivity(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    return this.parentsManagementService.getParentActivity(id, page, limit);
  }

  @Post()
  @ApiOperation({ summary: 'Yeni veli oluştur' })
  @ApiResponse({ status: 201, description: 'Veli başarıyla oluşturuldu' })
  async createParent(@Body() createData: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  }) {
    return this.parentsManagementService.createParent(createData);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Veli bilgilerini güncelle' })
  @ApiResponse({ status: 200, description: 'Veli başarıyla güncellendi' })
  async updateParent(
    @Param('id') id: string,
    @Body() updateData: {
      name?: string;
      phone?: string;
      address?: string;
    },
  ) {
    return this.parentsManagementService.updateParent(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Veli kaydını sil' })
  @ApiResponse({ status: 200, description: 'Veli başarıyla silindi' })
  async deleteParent(@Param('id') id: string) {
    return this.parentsManagementService.deleteParent(id);
  }

  @Get(':id/reports')
  @ApiOperation({ summary: 'Veli raporları' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Veli raporları' })
  async getParentReports(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.parentsManagementService.getParentReports(id, startDate, endDate);
  }
}
