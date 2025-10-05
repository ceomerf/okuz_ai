import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  UseGuards, 
  Request,
  HttpStatus,
  HttpException,
  Logger
} from '@nestjs/common';
import { SubscriptionService, CreateSubscriptionDto } from './subscription.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('subscription')
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  constructor(private readonly subscriptionService: SubscriptionService) {}

  // Kullanıcının subscription durumunu getir
  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getSubscriptionStatus(@Request() req: any) {
    try {
      const userId = req.user.id;
      const status = await this.subscriptionService.getSubscriptionStatus(userId);
      
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      this.logger.error(`Failed to get subscription status:`, error);
      throw new HttpException(
        'Failed to get subscription status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Eksik methodları ekleyelim
  @Get(':id')
  async getSubscription(@Param('id') id: string) {
    return this.subscriptionService.getSubscription(id);
  }

  @Get('user/:userId')
  async getUserSubscriptions(@Param('userId') userId: string) {
    return this.subscriptionService.getUserSubscriptions(userId);
  }

  @Put(':id')
  async updateSubscription(@Param('id') id: string, @Body() data: any) {
    return this.subscriptionService.updateSubscription(id, data);
  }

  @Post('process-payment')
  async processPayment(@Body() data: any) {
    return this.subscriptionService.processPayment(data);
  }

  @Get(':id/status')
  async checkStatus(@Param('id') id: string) {
    return this.subscriptionService.checkSubscriptionStatus(id);
  }

  // Trial başlat (yeni kullanıcılar için)
  @UseGuards(JwtAuthGuard)
  @Post('start-trial')
  async startTrial(@Request() req: any) {
    try {
      const userId = req.user.id;
      await this.subscriptionService.startTrial(userId);
      
      return {
        success: true,
        message: 'Trial started successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to start trial:`, error);
      throw new HttpException(
        'Failed to start trial',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Premium subscription oluştur
  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createSubscription(@Request() req: any, @Body() createSubscriptionDto: CreateSubscriptionDto) {
    try {
      const userId = req.user.id;
      const subscriptionData = {
        ...createSubscriptionDto,
        userId,
      };

      const result = await this.subscriptionService.createSubscription(subscriptionData);
      
      return {
        success: true,
        data: result,
        message: 'Subscription created successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to create subscription:`, error);
      throw new HttpException(
        'Failed to create subscription',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Payment'i onayla (webhook için)
  @Post('confirm-payment')
  async confirmPayment(
    @Body() body: {
      paymentId: string;
      transactionId: string;
      gatewayResponse: any;
    },
  ) {
    try {
      const { paymentId, transactionId, gatewayResponse } = body;
      
      await this.subscriptionService.confirmPayment(paymentId, transactionId, gatewayResponse);
      
      return {
        success: true,
        message: 'Payment confirmed successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to confirm payment:`, error);
      throw new HttpException(
        'Failed to confirm payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Subscription'ı iptal et
  @UseGuards(JwtAuthGuard)
  @Delete(':subscriptionId')
  async cancelSubscription(@Param('subscriptionId') subscriptionId: string) {
    try {
      await this.subscriptionService.cancelSubscription(subscriptionId);
      
      return {
        success: true,
        message: 'Subscription cancelled successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to cancel subscription:`, error);
      throw new HttpException(
        'Failed to cancel subscription',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Subscription'ı yenile
  @UseGuards(JwtAuthGuard)
  @Put(':subscriptionId/renew')
  async renewSubscription(@Param('subscriptionId') subscriptionId: string) {
    try {
      await this.subscriptionService.renewSubscription(subscriptionId);
      
      return {
        success: true,
        message: 'Subscription renewed successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to renew subscription:`, error);
      throw new HttpException(
        'Failed to renew subscription',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Premium erişim kontrolü
  @UseGuards(JwtAuthGuard)
  @Get('premium-access')
  async checkPremiumAccess(@Request() req: any, @Body() body?: { feature?: string }) {
    try {
      const userId = req.user.id;
      const feature = body?.feature;
      
      const hasAccess = await this.subscriptionService.checkPremiumAccess(userId, feature);
      
      return {
        success: true,
        hasAccess,
      };
    } catch (error) {
      this.logger.error(`Failed to check premium access:`, error);
      throw new HttpException(
        'Failed to check premium access',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Trial süresi kontrolü
  @UseGuards(JwtAuthGuard)
  @Get('trial-expired')
  async checkTrialExpired(@Request() req: any) {
    try {
      const userId = req.user.id;
      const isExpired = await this.subscriptionService.isTrialExpired(userId);
      
      return {
        success: true,
        isExpired,
      };
    } catch (error) {
      this.logger.error(`Failed to check trial expiration:`, error);
      throw new HttpException(
        'Failed to check trial expiration',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Subscription geçmişini getir
  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getSubscriptionHistory(@Request() req: any) {
    try {
      const userId = req.user.id;
      const history = await this.subscriptionService.getSubscriptionHistory(userId);
      
      return {
        success: true,
        data: history,
      };
    } catch (error) {
      this.logger.error(`Failed to get subscription history:`, error);
      throw new HttpException(
        'Failed to get subscription history',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Payment geçmişini getir
  @UseGuards(JwtAuthGuard)
  @Get('payment-history')
  async getPaymentHistory(@Request() req: any) {
    try {
      const userId = req.user.id;
      const history = await this.subscriptionService.getPaymentHistory(userId);
      
      return {
        success: true,
        data: history,
      };
    } catch (error) {
      this.logger.error(`Failed to get payment history:`, error);
      throw new HttpException(
        'Failed to get payment history',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Günlük kilit kontrolü (eski API uyumluluğu için)
  @UseGuards(JwtAuthGuard)
  @Get('day-locked')
  async checkDayLocked(@Request() req: any, @Body() body: { date: string }) {
    try {
      const userId = req.user.id;
      const status = await this.subscriptionService.getSubscriptionStatus(userId);
      
      // Trial veya Premium durumunda hiçbir gün kilitli değil
      if (status.status === 'TRIAL' || status.status === 'PREMIUM' || status.status === 'FAMILY') {
        return {
          success: true,
          isLocked: false,
        };
      }
      
      // FREE durumunda sadece ilk 3 gün açık
      const date = new Date(body.date);
      const now = new Date();
      const daysSinceStart = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        success: true,
        isLocked: daysSinceStart > 3,
      };
    } catch (error) {
      this.logger.error(`Failed to check day locked:`, error);
      throw new HttpException(
        'Failed to check day locked',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
