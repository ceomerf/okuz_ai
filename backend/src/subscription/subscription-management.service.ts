import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class SubscriptionManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlans(options: {
    page: number;
    limit: number;
    type?: string;
    isActive?: boolean;
  }) {
    const { page, limit, type, isActive } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    try {
      const [plans, total] = await Promise.all([
        this.prisma.plan.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
              },
            },
          },
        }),
        this.prisma.plan.count({ where }),
      ]);

      return {
        success: true,
        data: {
          plans,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException('Abonelik planları getirilemedi');
    }
  }

  async getPlanById(id: string) {
    try {
      const plan = await this.prisma.plan.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!plan) {
        throw new NotFoundException('Abonelik planı bulunamadı');
      }

      return {
        success: true,
        data: plan,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Abonelik planı detayları getirilemedi');
    }
  }

  async getPlanStatistics(planId: string) {
    try {
      const plan = await this.prisma.plan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        throw new NotFoundException('Abonelik planı bulunamadı');
      }

      const [
        totalSubscriptions,
        activeSubscriptions,
        cancelledSubscriptions,
        totalRevenue,
        monthlyRevenue,
        averageSubscriptionDuration,
      ] = await Promise.all([
        this.prisma.subscription.count({
          where: { planType: planId as any },
        }),
        this.prisma.subscription.count({
          where: { planType: planId as any, status: 'PREMIUM' },
        }),
        this.prisma.subscription.count({
          where: { planType: planId as any, status: 'CANCELLED' },
        }),
        this.prisma.payment.aggregate({
          where: {
            subscription: { planType: planId as any },
            status: 'COMPLETED',
          },
          _sum: { amount: true },
        }),
        this.prisma.payment.aggregate({
          where: {
            subscription: { planType: planId as any },
            status: 'COMPLETED',
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Son 30 gün
            },
          },
          _sum: { amount: true },
        }),
        this.prisma.subscription.aggregate({
          where: { planType: planId as any },
          _avg: {
            amount: true,
          },
        }),
      ]);

      return {
        success: true,
        data: {
          totalSubscriptions,
          activeSubscriptions,
          cancelledSubscriptions,
          totalRevenue: totalRevenue._sum?.amount || 0,
          monthlyRevenue: monthlyRevenue._sum?.amount || 0,
          averageSubscriptionDuration: averageSubscriptionDuration._avg?.amount || 0,
          conversionRate: totalSubscriptions > 0 ? (activeSubscriptions / totalSubscriptions) * 100 : 0,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Plan istatistikleri getirilemedi');
    }
  }

  async createPlan(createData: {
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
    try {
      const plan = await this.prisma.plan.create({
        data: {
          title: createData.name,
          description: createData.description,
          type: createData.type as any,
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 yıl sonra
          userId: 'system', // Sistem planı için
          isActive: createData.isActive,
        },
      });

      return {
        success: true,
        message: 'Abonelik planı başarıyla oluşturuldu',
        data: plan,
      };
    } catch (error) {
      throw new BadRequestException('Abonelik planı oluşturulamadı');
    }
  }

  async updatePlan(id: string, updateData: {
    name?: string;
    description?: string;
    price?: number;
    features?: string[];
    limits?: any;
    isActive?: boolean;
  }) {
    try {
      const plan = await this.prisma.plan.findUnique({
        where: { id },
      });

      if (!plan) {
        throw new NotFoundException('Abonelik planı bulunamadı');
      }

      const updatedPlan = await this.prisma.plan.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        message: 'Abonelik planı başarıyla güncellendi',
        data: updatedPlan,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Abonelik planı güncellenemedi');
    }
  }

  async deletePlan(id: string) {
    try {
      const plan = await this.prisma.plan.findUnique({
        where: { id },
      });

      if (!plan) {
        throw new NotFoundException('Abonelik planı bulunamadı');
      }

      // Aktif abonelikleri kontrol et
      const activeSubscriptions = await this.prisma.subscription.count({
        where: { planType: id as any, status: 'PREMIUM' },
      });

      if (activeSubscriptions > 0) {
        throw new BadRequestException('Bu plana ait aktif abonelikler bulunuyor. Önce abonelikleri iptal edin.');
      }

      await this.prisma.plan.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Abonelik planı başarıyla silindi',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Abonelik planı silinemedi');
    }
  }

  async getSubscriptions(options: {
    page: number;
    limit: number;
    status?: string;
    planId?: string;
    userId?: string;
  }) {
    const { page, limit, status, planId, userId } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (planId) {
      where.planId = planId;
    }

    if (userId) {
      where.userId = userId;
    }

    try {
      const [subscriptions, total] = await Promise.all([
        this.prisma.subscription.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            payments: {
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
        }),
        this.prisma.subscription.count({ where }),
      ]);

      return {
        success: true,
        data: {
          subscriptions,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException('Abonelik listesi getirilemedi');
    }
  }

  async getSubscriptionById(id: string) {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
            },
          },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!subscription) {
        throw new NotFoundException('Abonelik bulunamadı');
      }

      return {
        success: true,
        data: subscription,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Abonelik detayları getirilemedi');
    }
  }

  async getSubscriptionPayments(subscriptionId: string) {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw new NotFoundException('Abonelik bulunamadı');
      }

      const payments = await this.prisma.payment.findMany({
        where: { subscriptionId },
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: {
            select: {
              id: true,
            },
          },
        },
      });

      return {
        success: true,
        data: payments,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Abonelik ödemeleri getirilemedi');
    }
  }

  async cancelSubscription(id: string) {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id },
      });

      if (!subscription) {
        throw new NotFoundException('Abonelik bulunamadı');
      }

      if (subscription.status === 'CANCELLED') {
        throw new BadRequestException('Abonelik zaten iptal edilmiş');
      }

      const updatedSubscription = await this.prisma.subscription.update({
        where: { id },
        data: {
          status: 'CANCELLED',
        },
      });

      return {
        success: true,
        message: 'Abonelik başarıyla iptal edildi',
        data: updatedSubscription,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Abonelik iptal edilemedi');
    }
  }

  async renewSubscription(id: string) {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id },
      });

      if (!subscription) {
        throw new NotFoundException('Abonelik bulunamadı');
      }

      if (subscription.status === 'PREMIUM') {
        throw new BadRequestException('Abonelik zaten aktif');
      }

      const updatedSubscription = await this.prisma.subscription.update({
        where: { id },
        data: {
          status: 'PREMIUM',
        },
      });

      return {
        success: true,
        message: 'Abonelik başarıyla yenilendi',
        data: updatedSubscription,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Abonelik yenilenemedi');
    }
  }

  async getPayments(options: {
    page: number;
    limit: number;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    userId?: string;
  }) {
    const { page, limit, status, startDate, endDate, userId } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    if (userId) {
      where.subscription = {
        userId: userId,
      };
    }

    try {
      const [payments, total] = await Promise.all([
        this.prisma.payment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            subscription: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.payment.count({ where }),
      ]);

      return {
        success: true,
        data: {
          payments,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException('Ödeme geçmişi getirilemedi');
    }
  }

  async getPaymentById(id: string) {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id },
        include: {
          subscription: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        throw new NotFoundException('Ödeme bulunamadı');
      }

      return {
        success: true,
        data: payment,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Ödeme detayları getirilemedi');
    }
  }

  async generateInvoice(paymentId: string) {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          subscription: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        throw new NotFoundException('Ödeme bulunamadı');
      }

      // Fatura oluşturma simülasyonu
      const invoice = {
        id: `INV-${Date.now()}`,
        paymentId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        createdAt: payment.createdAt,
        subscription: payment.subscriptionId,
        invoiceNumber: `INV-${payment.id.slice(-8).toUpperCase()}`,
        dueDate: new Date(payment.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 gün sonra
      };

      return {
        success: true,
        data: invoice,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Fatura oluşturulamadı');
    }
  }

  async getSubscriptionStatistics(options: {
    startDate?: Date;
    endDate?: Date;
  }) {
    const { startDate, endDate } = options;

    try {
      const where: any = {};

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [
        totalSubscriptions,
        activeSubscriptions,
        cancelledSubscriptions,
        totalRevenue,
        monthlyRevenue,
        planBreakdown,
        statusBreakdown,
      ] = await Promise.all([
        this.prisma.subscription.count({ where }),
        this.prisma.subscription.count({
          where: { ...where, status: 'ACTIVE' },
        }),
        this.prisma.subscription.count({
          where: { ...where, status: 'CANCELLED' },
        }),
        this.prisma.payment.aggregate({
          where: {
            ...where,
            status: 'COMPLETED',
          },
          _sum: { amount: true },
        }),
        this.prisma.payment.aggregate({
          where: {
            ...where,
            status: 'COMPLETED',
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Son 30 gün
            },
          },
          _sum: { amount: true },
        }),
        this.prisma.subscription.groupBy({
          by: ['planType'],
          where,
          _count: { id: true },
          _sum: { amount: true },
        }),
        this.prisma.subscription.groupBy({
          by: ['status'],
          where,
          _count: { id: true },
        }),
      ]);

      return {
        success: true,
        data: {
          overview: {
            totalSubscriptions,
            activeSubscriptions,
            cancelledSubscriptions,
            totalRevenue: totalRevenue._sum.amount || 0,
            monthlyRevenue: monthlyRevenue._sum.amount || 0,
            conversionRate: totalSubscriptions > 0 ? (activeSubscriptions / totalSubscriptions) * 100 : 0,
          },
          planBreakdown: planBreakdown.map(plan => ({
            planType: plan.planType,
            count: plan._count.id,
            revenue: plan._sum.amount || 0,
          })),
          statusBreakdown: statusBreakdown.map(status => ({
            status: status.status,
            count: status._count.id,
          })),
        },
      };
    } catch (error) {
      throw new BadRequestException('Abonelik istatistikleri getirilemedi');
    }
  }

  async getRevenueAnalysis(options: {
    startDate?: Date;
    endDate?: Date;
  }) {
    const { startDate, endDate } = options;

    try {
      const where: any = { status: 'COMPLETED' };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [
        totalRevenue,
        dailyRevenue,
        monthlyRevenue,
        planRevenue,
        paymentMethodBreakdown,
      ] = await Promise.all([
        this.prisma.payment.aggregate({
          where,
          _sum: { amount: true },
        }),
        this.prisma.payment.groupBy({
          by: ['createdAt'],
          where,
          _sum: { amount: true },
          orderBy: { createdAt: 'desc' },
          take: 30,
        }),
        this.prisma.payment.groupBy({
          by: ['createdAt'],
          where,
          _sum: { amount: true },
          orderBy: { createdAt: 'desc' },
          take: 12,
        }),
        this.prisma.payment.groupBy({
          by: ['subscriptionId'],
          where,
          _sum: { amount: true },
          _count: { id: true },
        }),
        this.prisma.payment.groupBy({
          by: ['paymentMethod'],
          where,
          _sum: { amount: true },
          _count: { id: true },
        }),
      ]);

      return {
        success: true,
        data: {
          totalRevenue: totalRevenue._sum?.amount || 0,
          dailyRevenue: dailyRevenue.map(day => ({
            date: day.createdAt,
            revenue: day._sum?.amount || 0,
          })),
          monthlyRevenue: monthlyRevenue.map(month => ({
            date: month.createdAt,
            revenue: month._sum?.amount || 0,
          })),
          planRevenue: planRevenue.map(plan => ({
            subscriptionId: plan.subscriptionId,
            revenue: plan._sum?.amount || 0,
            payments: plan._count.id,
          })),
          paymentMethodBreakdown: paymentMethodBreakdown.map(method => ({
            method: method.paymentMethod,
            revenue: method._sum?.amount || 0,
            count: method._count.id,
          })),
        },
      };
    } catch (error) {
      throw new BadRequestException('Gelir analizi getirilemedi');
    }
  }

  async handleStripeWebhook(body: any) {
    try {
      // Stripe webhook işleme mantığı
      console.log('Stripe webhook received:', body);
      
      return {
        success: true,
        message: 'Stripe webhook işlendi',
      };
    } catch (error) {
      throw new BadRequestException('Stripe webhook işlenemedi');
    }
  }

  async handleIyzicoWebhook(body: any) {
    try {
      // Iyzico webhook işleme mantığı
      console.log('Iyzico webhook received:', body);
      
      return {
        success: true,
        message: 'Iyzico webhook işlendi',
      };
    } catch (error) {
      throw new BadRequestException('Iyzico webhook işlenemedi');
    }
  }
}
