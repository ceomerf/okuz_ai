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
import { BulkNotificationService } from './bulk-notification.service';

@ApiTags('Bulk Notification Management')
@Controller('api/bulk-notification')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEACHER')
@ApiBearerAuth()
export class BulkNotificationController {
  constructor(private readonly bulkNotificationService: BulkNotificationService) {}

  @Post('send')
  @ApiOperation({ summary: 'Toplu bildirim gönder' })
  @ApiResponse({ status: 201, description: 'Toplu bildirim başarıyla gönderildi' })
  async sendBulkNotification(@Body() sendData: {
    title: string;
    message: string;
    type: string;
    channels: string[];
    targetAudience: {
      userRoles?: string[];
      studentGrades?: number[];
      studentFields?: string[];
      subscriptionPlans?: string[];
      customFilters?: any;
    };
    scheduledAt?: Date;
    templateId?: string;
    variables?: any;
  }) {
    return this.bulkNotificationService.sendBulkNotification(sendData);
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Bildirim kampanyaları listesi' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Bildirim kampanyaları başarıyla getirildi' })
  async getCampaigns(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.bulkNotificationService.getCampaigns({
      page,
      limit,
      status,
      type,
    });
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Bildirim kampanyası detayları' })
  @ApiResponse({ status: 200, description: 'Bildirim kampanyası detayları' })
  @ApiResponse({ status: 404, description: 'Bildirim kampanyası bulunamadı' })
  async getCampaignById(@Param('id') id: string) {
    return this.bulkNotificationService.getCampaignById(id);
  }

  @Get('campaigns/:id/statistics')
  @ApiOperation({ summary: 'Kampanya istatistikleri' })
  @ApiResponse({ status: 200, description: 'Kampanya istatistikleri' })
  async getCampaignStatistics(@Param('id') id: string) {
    return this.bulkNotificationService.getCampaignStatistics(id);
  }

  @Get('campaigns/:id/recipients')
  @ApiOperation({ summary: 'Kampanya alıcıları' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Kampanya alıcıları' })
  async getCampaignRecipients(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
    @Query('status') status?: string,
  ) {
    return this.bulkNotificationService.getCampaignRecipients(id, {
      page,
      limit,
      status,
    });
  }

  @Post('campaigns/:id/cancel')
  @ApiOperation({ summary: 'Kampanyayı iptal et' })
  @ApiResponse({ status: 200, description: 'Kampanya başarıyla iptal edildi' })
  async cancelCampaign(@Param('id') id: string) {
    return this.bulkNotificationService.cancelCampaign(id);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Bildirim şablonları' })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Bildirim şablonları' })
  async getTemplates(@Query('category') category?: string) {
    return this.bulkNotificationService.getTemplates(category);
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Bildirim şablonı detayları' })
  @ApiResponse({ status: 200, description: 'Bildirim şablonı detayları' })
  async getTemplateById(@Param('id') id: string) {
    return this.bulkNotificationService.getTemplateById(id);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Yeni bildirim şablonı oluştur' })
  @ApiResponse({ status: 201, description: 'Bildirim şablonı başarıyla oluşturuldu' })
  async createTemplate(@Body() createData: {
    name: string;
    description: string;
    category: string;
    subject: string;
    content: string;
    variables: string[];
    channels: string[];
    isActive: boolean;
  }) {
    return this.bulkNotificationService.createTemplate(createData);
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Bildirim şablonı güncelle' })
  @ApiResponse({ status: 200, description: 'Bildirim şablonı başarıyla güncellendi' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() updateData: {
      name?: string;
      description?: string;
      subject?: string;
      content?: string;
      variables?: string[];
      channels?: string[];
      isActive?: boolean;
    },
  ) {
    return this.bulkNotificationService.updateTemplate(id, updateData);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Bildirim şablonı sil' })
  @ApiResponse({ status: 200, description: 'Bildirim şablonı başarıyla silindi' })
  async deleteTemplate(@Param('id') id: string) {
    return this.bulkNotificationService.deleteTemplate(id);
  }

  @Get('audience-segments')
  @ApiOperation({ summary: 'Hedef kitle segmentleri' })
  @ApiResponse({ status: 200, description: 'Hedef kitle segmentleri' })
  async getAudienceSegments() {
    return this.bulkNotificationService.getAudienceSegments();
  }

  @Get('channels')
  @ApiOperation({ summary: 'Bildirim kanalları' })
  @ApiResponse({ status: 200, description: 'Bildirim kanalları' })
  async getNotificationChannels() {
    return this.bulkNotificationService.getNotificationChannels();
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Bildirim istatistikleri' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Bildirim istatistikleri' })
  async getNotificationStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.bulkNotificationService.getNotificationStatistics({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Post('test')
  @ApiOperation({ summary: 'Test bildirimi gönder' })
  @ApiResponse({ status: 200, description: 'Test bildirimi başarıyla gönderildi' })
  async sendTestNotification(@Body() testData: {
    title: string;
    message: string;
    type: string;
    channels: string[];
    testEmails: string[];
    testPhones: string[];
  }) {
    return this.bulkNotificationService.sendTestNotification(testData);
  }
}
