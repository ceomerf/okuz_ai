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
import { SubscriptionManagementService } from './subscription-management.service';

@ApiTags('Subscription Management')
@Controller('api/subscription-management')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEACHER')
@ApiBearerAuth()
export class SubscriptionManagementController {
  constructor(private readonly subscriptionManagementService: SubscriptionManagementService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Abonelik planları listesi' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Abonelik planları başarıyla getirildi' })
  async getPlans(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('type') type?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.subscriptionManagementService.getPlans({
      page,
      limit,
      type,
      isActive,
    });
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Abonelik planı detayları' })
  @ApiResponse({ status: 200, description: 'Abonelik planı detayları' })
  @ApiResponse({ status: 404, description: 'Abonelik planı bulunamadı' })
  async getPlanById(@Param('id') id: string) {
    return this.subscriptionManagementService.getPlanById(id);
  }

  @Get('plans/:id/statistics')
  @ApiOperation({ summary: 'Plan istatistikleri' })
  @ApiResponse({ status: 200, description: 'Plan istatistikleri' })
  async getPlanStatistics(@Param('id') id: string) {
    return this.subscriptionManagementService.getPlanStatistics(id);
  }

  @Post('plans')
  @ApiOperation({ summary: 'Yeni abonelik planı oluştur' })
  @ApiResponse({ status: 201, description: 'Abonelik planı başarıyla oluşturuldu' })
  async createPlan(@Body() createData: {
    name: string;
    description: string;
    type: string;
    price: number;
    currency: string;
    billingCycle: string;
    features: string[];
    limits: {
      students?: number;
      coaches?: number;
      storage?: number;
      aiRequests?: number;
    };
    isActive: boolean;
  }) {
    return this.subscriptionManagementService.createPlan(createData);
  }

  @Put('plans/:id')
  @ApiOperation({ summary: 'Abonelik planı güncelle' })
  @ApiResponse({ status: 200, description: 'Abonelik planı başarıyla güncellendi' })
  async updatePlan(
    @Param('id') id: string,
    @Body() updateData: {
      name?: string;
      description?: string;
      price?: number;
      features?: string[];
      limits?: any;
      isActive?: boolean;
    },
  ) {
    return this.subscriptionManagementService.updatePlan(id, updateData);
  }

  @Delete('plans/:id')
  @ApiOperation({ summary: 'Abonelik planı sil' })
  @ApiResponse({ status: 200, description: 'Abonelik planı başarıyla silindi' })
  async deletePlan(@Param('id') id: string) {
    return this.subscriptionManagementService.deletePlan(id);
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Abonelik listesi' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'planId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Abonelik listesi başarıyla getirildi' })
  async getSubscriptions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('status') status?: string,
    @Query('planId') planId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.subscriptionManagementService.getSubscriptions({
      page,
      limit,
      status,
      planId,
      userId,
    });
  }

  @Get('subscriptions/:id')
  @ApiOperation({ summary: 'Abonelik detayları' })
  @ApiResponse({ status: 200, description: 'Abonelik detayları' })
  @ApiResponse({ status: 404, description: 'Abonelik bulunamadı' })
  async getSubscriptionById(@Param('id') id: string) {
    return this.subscriptionManagementService.getSubscriptionById(id);
  }

  @Get('subscriptions/:id/payments')
  @ApiOperation({ summary: 'Abonelik ödemeleri' })
  @ApiResponse({ status: 200, description: 'Abonelik ödemeleri' })
  async getSubscriptionPayments(@Param('id') id: string) {
    return this.subscriptionManagementService.getSubscriptionPayments(id);
  }

  @Post('subscriptions/:id/cancel')
  @ApiOperation({ summary: 'Aboneliği iptal et' })
  @ApiResponse({ status: 200, description: 'Abonelik başarıyla iptal edildi' })
  async cancelSubscription(@Param('id') id: string) {
    return this.subscriptionManagementService.cancelSubscription(id);
  }

  @Post('subscriptions/:id/renew')
  @ApiOperation({ summary: 'Aboneliği yenile' })
  @ApiResponse({ status: 200, description: 'Abonelik başarıyla yenilendi' })
  async renewSubscription(@Param('id') id: string) {
    return this.subscriptionManagementService.renewSubscription(id);
  }

  @Get('payments')
  @ApiOperation({ summary: 'Ödeme geçmişi' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Ödeme geçmişi başarıyla getirildi' })
  async getPayments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
  ) {
    return this.subscriptionManagementService.getPayments({
      page,
      limit,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      userId,
    });
  }

  @Get('payments/:id')
  @ApiOperation({ summary: 'Ödeme detayları' })
  @ApiResponse({ status: 200, description: 'Ödeme detayları' })
  @ApiResponse({ status: 404, description: 'Ödeme bulunamadı' })
  async getPaymentById(@Param('id') id: string) {
    return this.subscriptionManagementService.getPaymentById(id);
  }

  @Get('payments/:id/invoice')
  @ApiOperation({ summary: 'Fatura oluştur' })
  @ApiResponse({ status: 200, description: 'Fatura başarıyla oluşturuldu' })
  async generateInvoice(@Param('id') id: string) {
    return this.subscriptionManagementService.generateInvoice(id);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Abonelik istatistikleri' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Abonelik istatistikleri' })
  async getSubscriptionStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.subscriptionManagementService.getSubscriptionStatistics({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Gelir analizi' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Gelir analizi' })
  async getRevenueAnalysis(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.subscriptionManagementService.getRevenueAnalysis({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Post('webhooks/stripe')
  @ApiOperation({ summary: 'Stripe webhook' })
  @ApiResponse({ status: 200, description: 'Webhook işlendi' })
  async handleStripeWebhook(@Body() body: any) {
    return this.subscriptionManagementService.handleStripeWebhook(body);
  }

  @Post('webhooks/iyzico')
  @ApiOperation({ summary: 'Iyzico webhook' })
  @ApiResponse({ status: 200, description: 'Webhook işlendi' })
  async handleIyzicoWebhook(@Body() body: any) {
    return this.subscriptionManagementService.handleIyzicoWebhook(body);
  }
}
