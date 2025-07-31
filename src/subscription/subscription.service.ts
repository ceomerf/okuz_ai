import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SubscriptionStatus, SubscriptionPlan, PaymentStatus } from '@prisma/client';

export interface CreateSubscriptionDto {
  userId: string;
  planType: SubscriptionPlan;
  paymentMethod: string;
  amount: number;
  currency?: string;
}

export interface SubscriptionStatusResponse {
  status: SubscriptionStatus;
  isTrialActive: boolean;
  trialEndDate?: Date;
  subscriptionEndDate?: Date;
  planType?: SubscriptionPlan;
  features: string[];
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Yeni kullanıcı için trial başlat
  async startTrial(userId: string): Promise<void> {
    try {
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 3); // 3 günlük trial

      // Önce subscription oluştur
      await this.prisma.subscription.create({
        data: {
          userId: userId,
          planType: SubscriptionPlan.MONTHLY_PREMIUM,
          status: SubscriptionStatus.TRIAL,
          startDate: new Date(),
          endDate: trialEndDate,
          isActive: true,
          features: ['basic_features'],
        },
      });

      this.logger.log(`Trial started for user ${userId}, ends at ${trialEndDate}`);
    } catch (error) {
      this.logger.error(`Failed to start trial for user ${userId}:`, error);
      throw error;
    }
  }

  // Kullanıcının subscription durumunu kontrol et
  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatusResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscriptions: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const now = new Date();
      let isTrialActive = false;
      let trialEndDate: Date | undefined;
      let currentStatus: SubscriptionStatus = SubscriptionStatus.FREE;

      // En son aktif subscription'ı kontrol et
      const currentSubscription = user.subscriptions[0];
      
      if (currentSubscription) {
        currentStatus = currentSubscription.status;
        
        if (currentSubscription.status === SubscriptionStatus.TRIAL && currentSubscription.endDate) {
          isTrialActive = currentSubscription.endDate > now;
          trialEndDate = currentSubscription.endDate;
          
          // Trial süresi bittiyse subscription'ı deaktif et
          if (!isTrialActive) {
            await this.prisma.subscription.update({
              where: { id: currentSubscription.id },
              data: {
                isActive: false,
              },
            });
            currentStatus = SubscriptionStatus.FREE;
          }
        }
      }

      const features = this.getFeaturesForStatus(currentStatus);

      return {
        status: currentStatus,
        isTrialActive,
        trialEndDate,
        subscriptionEndDate: currentSubscription?.endDate,
        planType: currentSubscription?.planType,
        features,
      };
    } catch (error) {
      this.logger.error(`Failed to get subscription status for user ${userId}:`, error);
      throw error;
    }
  }

  // Premium subscription oluştur
  async createSubscription(data: CreateSubscriptionDto): Promise<any> {
    try {
      const { userId, planType, paymentMethod, amount, currency = 'TRY' } = data;

      // Kullanıcıyı kontrol et
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Subscription süresini hesapla
      const startDate = new Date();
      let endDate = new Date();
      
      switch (planType) {
        case SubscriptionPlan.MONTHLY_PREMIUM:
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case SubscriptionPlan.YEARLY_PREMIUM:
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        case SubscriptionPlan.FAMILY_PLAN:
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        default:
          throw new BadRequestException('Invalid plan type');
      }

      // Payment kaydı oluştur
      const payment = await this.prisma.payment.create({
        data: {
          userId,
          amount,
          currency,
          paymentMethod,
          status: PaymentStatus.PENDING,
        },
      });

      // Subscription kaydı oluştur
      const subscription = await this.prisma.subscription.create({
        data: {
          userId,
          planType,
          status: SubscriptionStatus.PREMIUM,
          startDate,
          endDate,
          features: this.getFeaturesForPlan(planType),
        },
      });

      // Payment'i subscription ile ilişkilendir
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { subscriptionId: subscription.id },
      });

      // Kullanıcının subscription durumunu güncelle - User modelinde bu field'lar yok, sadece subscription tablosunu kullan
      // await this.prisma.user.update({
      //   where: { id: userId },
      //   data: {
      //     subscriptionStatus: SubscriptionStatus.PREMIUM,
      //     subscriptionEndDate: endDate,
      //   },
      // });

      this.logger.log(`Subscription created for user ${userId}: ${planType}`);

      return {
        subscriptionId: subscription.id,
        paymentId: payment.id,
        status: 'success',
      };
    } catch (error) {
      this.logger.error(`Failed to create subscription:`, error);
      throw error;
    }
  }

  // Payment'i onayla (webhook için)
  async confirmPayment(paymentId: string, transactionId: string, gatewayResponse: any): Promise<void> {
    try {
      const payment = await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.COMPLETED,
          transactionId,
          gatewayResponse,
        },
        include: {
          subscription: true,
        },
      });

      if (payment.subscription) {
        // Subscription'ı aktif et
        await this.prisma.subscription.update({
          where: { id: payment.subscription.id },
          data: { isActive: true },
        });
      }

      this.logger.log(`Payment confirmed: ${paymentId}`);
    } catch (error) {
      this.logger.error(`Failed to confirm payment ${paymentId}:`, error);
      throw error;
    }
  }

  // Subscription'ı iptal et
  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          isActive: false,
          status: SubscriptionStatus.CANCELLED,
        },
      });

      // Kullanıcının durumunu FREE'e çevir - User modelinde bu field'lar yok
      // const subscription = await this.prisma.subscription.findUnique({
      //   where: { id: subscriptionId },
      //   include: { user: true },
      // });

      // if (subscription) {
      //   await this.prisma.user.update({
      //     where: { id: subscription.userId },
      //     data: {
      //       subscriptionStatus: SubscriptionStatus.FREE,
      //       subscriptionEndDate: null,
      //     },
      //   });
      // }

      this.logger.log(`Subscription cancelled: ${subscriptionId}`);
    } catch (error) {
      this.logger.error(`Failed to cancel subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  // Subscription'ı yenile
  async renewSubscription(subscriptionId: string): Promise<void> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      const newEndDate = new Date(subscription.endDate || new Date());
      
      switch (subscription.planType) {
        case SubscriptionPlan.MONTHLY_PREMIUM:
          newEndDate.setMonth(newEndDate.getMonth() + 1);
          break;
        case SubscriptionPlan.YEARLY_PREMIUM:
          newEndDate.setFullYear(newEndDate.getFullYear() + 1);
          break;
        case SubscriptionPlan.FAMILY_PLAN:
          newEndDate.setMonth(newEndDate.getMonth() + 1);
          break;
      }

      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          endDate: newEndDate,
          isActive: true,
        },
      });

      // Kullanıcının subscription end date'ini güncelle - User modelinde bu field yok
      // await this.prisma.user.update({
      //   where: { id: subscription.userId },
      //   data: {
      //     subscriptionEndDate: newEndDate,
      //   },
      // });

      this.logger.log(`Subscription renewed: ${subscriptionId}`);
    } catch (error) {
      this.logger.error(`Failed to renew subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  // Premium özellik kontrolü
  async checkPremiumAccess(userId: string, feature?: string): Promise<boolean> {
    try {
      const status = await this.getSubscriptionStatus(userId);
      
      // Trial veya Premium durumunda tüm özellikler açık
      if (status.status === SubscriptionStatus.TRIAL || 
          status.status === SubscriptionStatus.PREMIUM ||
          status.status === SubscriptionStatus.FAMILY) {
        return true;
      }

      // FREE durumunda sadece temel özellikler
      if (status.status === SubscriptionStatus.FREE) {
        const freeFeatures = ['basic_plan', 'limited_ai_tools', 'basic_analytics'];
        return !feature || freeFeatures.includes(feature);
      }

      return false;
    } catch (error) {
      this.logger.error(`Failed to check premium access for user ${userId}:`, error);
      return false;
    }
  }

  // Trial süresi kontrolü
  async isTrialExpired(userId: string): Promise<boolean> {
    try {
      const status = await this.getSubscriptionStatus(userId);
      return !status.isTrialActive && status.status === SubscriptionStatus.FREE;
    } catch (error) {
      this.logger.error(`Failed to check trial expiration for user ${userId}:`, error);
      return true;
    }
  }

  // Plan özelliklerini getir
  private getFeaturesForPlan(planType: SubscriptionPlan): string[] {
    switch (planType) {
      case SubscriptionPlan.MONTHLY_PREMIUM:
      case SubscriptionPlan.YEARLY_PREMIUM:
        return [
          'unlimited_ai_tools',
          'advanced_analytics',
          'detailed_reports',
          'priority_support',
          'custom_plans',
          'family_sharing',
        ];
      case SubscriptionPlan.FAMILY_PLAN:
        return [
          'unlimited_ai_tools',
          'advanced_analytics',
          'detailed_reports',
          'priority_support',
          'custom_plans',
          'family_sharing',
          'multiple_profiles',
          'parent_dashboard',
        ];
      default:
        return [];
    }
  }

  // Status için özelliklerini getir
  private getFeaturesForStatus(status: SubscriptionStatus): string[] {
    switch (status) {
      case SubscriptionStatus.TRIAL:
      case SubscriptionStatus.PREMIUM:
      case SubscriptionStatus.FAMILY:
        return [
          'unlimited_ai_tools',
          'advanced_analytics',
          'detailed_reports',
          'priority_support',
          'custom_plans',
          'family_sharing',
        ];
      case SubscriptionStatus.FREE:
        return [
          'basic_plan',
          'limited_ai_tools',
          'basic_analytics',
        ];
      default:
        return [];
    }
  }

  // Kullanıcının subscription geçmişini getir
  async getSubscriptionHistory(userId: string): Promise<any[]> {
    try {
      const subscriptions = await this.prisma.subscription.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return subscriptions;
    } catch (error) {
      this.logger.error(`Failed to get subscription history for user ${userId}:`, error);
      throw error;
    }
  }

  // Payment geçmişini getir
  async getPaymentHistory(userId: string): Promise<any[]> {
    try {
      const payments = await this.prisma.payment.findMany({
        where: { userId },
        include: {
          subscription: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return payments;
    } catch (error) {
      this.logger.error(`Failed to get payment history for user ${userId}:`, error);
      throw error;
    }
  }
}
