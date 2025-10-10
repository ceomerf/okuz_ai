import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
  subject?: string;
  content: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationCampaign {
  id: string;
  name: string;
  description: string;
  templateId: string;
  targetUsers: string[];
  targetCriteria: any;
  scheduledAt?: string;
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'cancelled';
  sentCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  unsubscribeRate: number;
  byType: {
    email: { sent: number; delivered: number; failed: number };
    sms: { sent: number; delivered: number; failed: number };
    push: { sent: number; delivered: number; failed: number };
    in_app: { sent: number; delivered: number; failed: number };
  };
  byTimeframe: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
  };
}

export interface NotificationManagementData {
  templates: NotificationTemplate[];
  campaigns: NotificationCampaign[];
  stats: NotificationStats;
  recentNotifications: any[];
  topTemplates: { templateId: string; name: string; sentCount: number }[];
  userSegments: { segment: string; userCount: number }[];
}

@Injectable()
export class NotificationManagementService {
  private readonly logger = new Logger(NotificationManagementService.name);

  constructor(private prisma: PrismaService) {}

  async getManagementData(): Promise<NotificationManagementData> {
    try {
      const [templates, campaigns, stats, recentNotifications, topTemplates, userSegments] = await Promise.all([
        this.getTemplates(),
        this.getCampaigns(),
        this.getNotificationStats(),
        this.getRecentNotifications(),
        this.getTopTemplates(),
        this.getUserSegments(),
      ]);

      return {
        templates,
        campaigns,
        stats,
        recentNotifications,
        topTemplates,
        userSegments,
      };
    } catch (error) {
      this.logger.error('Failed to get notification management data:', error);
      throw error;
    }
  }

  private async getTemplates(): Promise<NotificationTemplate[]> {
    try {
      const templates = await this.prisma.notificationTemplate.findMany({
        orderBy: { updatedAt: 'desc' },
      });

      return templates.map(template => ({
        id: template.id,
        name: template.name,
        type: template.type as any,
        subject: template.subject,
        content: template.content,
        variables: template.variables || [],
        isActive: template.isActive,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      }));
    } catch (error) {
      this.logger.warn('Could not get templates:', error);
      return [];
    }
  }

  private async getCampaigns(): Promise<NotificationCampaign[]> {
    try {
      const campaigns = await this.prisma.notificationCampaign.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          template: {
            select: { name: true },
          },
        },
      });

      return campaigns.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        templateId: campaign.templateId,
        targetUsers: campaign.targetUsers || [],
        targetCriteria: campaign.targetCriteria,
        scheduledAt: campaign.scheduledAt?.toISOString(),
        status: campaign.status as any,
        sentCount: campaign.sentCount,
        failedCount: campaign.failedCount,
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
      }));
    } catch (error) {
      this.logger.warn('Could not get campaigns:', error);
      return [];
    }
  }

  private async getNotificationStats(): Promise<NotificationStats> {
    try {
      const [totalSent, totalDelivered, totalFailed, byType, byTimeframe] = await Promise.all([
        this.getTotalSent(),
        this.getTotalDelivered(),
        this.getTotalFailed(),
        this.getStatsByType(),
        this.getStatsByTimeframe(),
      ]);

      const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
      const openRate = 0; // Bu değer tracking'den alınabilir
      const clickRate = 0; // Bu değer tracking'den alınabilir
      const unsubscribeRate = 0; // Bu değer tracking'den alınabilir

      return {
        totalSent,
        totalDelivered,
        totalFailed,
        deliveryRate,
        openRate,
        clickRate,
        unsubscribeRate,
        byType,
        byTimeframe,
      };
    } catch (error) {
      this.logger.warn('Could not get notification stats:', error);
      return {
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0,
        unsubscribeRate: 0,
        byType: {
          email: { sent: 0, delivered: 0, failed: 0 },
          sms: { sent: 0, delivered: 0, failed: 0 },
          push: { sent: 0, delivered: 0, failed: 0 },
          in_app: { sent: 0, delivered: 0, failed: 0 },
        },
        byTimeframe: {
          today: 0,
          thisWeek: 0,
          thisMonth: 0,
          thisYear: 0,
        },
      };
    }
  }

  private async getTotalSent(): Promise<number> {
    try {
      return await this.prisma.notification.count();
    } catch (error) {
      this.logger.warn('Could not get total sent:', error);
      return 0;
    }
  }

  private async getTotalDelivered(): Promise<number> {
    try {
      return await this.prisma.notification.count({
        where: { status: 'delivered' },
      });
    } catch (error) {
      this.logger.warn('Could not get total delivered:', error);
      return 0;
    }
  }

  private async getTotalFailed(): Promise<number> {
    try {
      return await this.prisma.notification.count({
        where: { status: 'failed' },
      });
    } catch (error) {
      this.logger.warn('Could not get total failed:', error);
      return 0;
    }
  }

  private async getStatsByType() {
    try {
      const [email, sms, push, inApp] = await Promise.all([
        this.getTypeStats('email'),
        this.getTypeStats('sms'),
        this.getTypeStats('push'),
        this.getTypeStats('in_app'),
      ]);

      return { email, sms, push, in_app: inApp };
    } catch (error) {
      this.logger.warn('Could not get stats by type:', error);
      return {
        email: { sent: 0, delivered: 0, failed: 0 },
        sms: { sent: 0, delivered: 0, failed: 0 },
        push: { sent: 0, delivered: 0, failed: 0 },
        in_app: { sent: 0, delivered: 0, failed: 0 },
      };
    }
  }

  private async getTypeStats(type: string) {
    try {
      const [sent, delivered, failed] = await Promise.all([
        this.prisma.notification.count({ where: { type } }),
        this.prisma.notification.count({ where: { type, status: 'delivered' } }),
        this.prisma.notification.count({ where: { type, status: 'failed' } }),
      ]);

      return { sent, delivered, failed };
    } catch (error) {
      this.logger.warn(`Could not get ${type} stats:`, error);
      return { sent: 0, delivered: 0, failed: 0 };
    }
  }

  private async getStatsByTimeframe() {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisYear = new Date(now.getFullYear(), 0, 1);

      const [todayCount, thisWeekCount, thisMonthCount, thisYearCount] = await Promise.all([
        this.prisma.notification.count({ where: { createdAt: { gte: today } } }),
        this.prisma.notification.count({ where: { createdAt: { gte: thisWeek } } }),
        this.prisma.notification.count({ where: { createdAt: { gte: thisMonth } } }),
        this.prisma.notification.count({ where: { createdAt: { gte: thisYear } } } }),
      ]);

      return {
        today: todayCount,
        thisWeek: thisWeekCount,
        thisMonth: thisMonthCount,
        thisYear: thisYearCount,
      };
    } catch (error) {
      this.logger.warn('Could not get stats by timeframe:', error);
      return {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        thisYear: 0,
      };
    }
  }

  private async getRecentNotifications() {
    try {
      const notifications = await this.prisma.notification.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      });

      return notifications.map(notification => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        status: notification.status,
        userName: notification.user?.name || 'Unknown',
        userEmail: notification.user?.email || '',
        createdAt: notification.createdAt.toISOString(),
      }));
    } catch (error) {
      this.logger.warn('Could not get recent notifications:', error);
      return [];
    }
  }

  private async getTopTemplates() {
    try {
      const templates = await this.prisma.notificationTemplate.findMany({
        include: {
          _count: {
            select: { campaigns: true },
          },
        },
        orderBy: {
          campaigns: {
            _count: 'desc',
          },
        },
        take: 5,
      });

      return templates.map(template => ({
        templateId: template.id,
        name: template.name,
        sentCount: template._count.campaigns,
      }));
    } catch (error) {
      this.logger.warn('Could not get top templates:', error);
      return [];
    }
  }

  private async getUserSegments() {
    try {
      const segments = await this.prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      });

      return segments.map(segment => ({
        segment: segment.role,
        userCount: segment._count.id,
      }));
    } catch (error) {
      this.logger.warn('Could not get user segments:', error);
      return [];
    }
  }

  async createTemplate(templateData: {
    name: string;
    type: 'email' | 'sms' | 'push' | 'in_app';
    subject?: string;
    content: string;
    variables: string[];
  }): Promise<NotificationTemplate> {
    try {
      const template = await this.prisma.notificationTemplate.create({
        data: {
          name: templateData.name,
          type: templateData.type,
          subject: templateData.subject,
          content: templateData.content,
          variables: templateData.variables,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return {
        id: template.id,
        name: template.name,
        type: template.type as any,
        subject: template.subject,
        content: template.content,
        variables: template.variables || [],
        isActive: template.isActive,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to create template:', error);
      throw error;
    }
  }

  async updateTemplate(templateId: string, templateData: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    try {
      const template = await this.prisma.notificationTemplate.update({
        where: { id: templateId },
        data: {
          name: templateData.name,
          subject: templateData.subject,
          content: templateData.content,
          variables: templateData.variables,
          isActive: templateData.isActive,
          updatedAt: new Date(),
        },
      });

      return {
        id: template.id,
        name: template.name,
        type: template.type as any,
        subject: template.subject,
        content: template.content,
        variables: template.variables || [],
        isActive: template.isActive,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to update template:', error);
      throw error;
    }
  }

  async deleteTemplate(templateId: string): Promise<void> {
    try {
      await this.prisma.notificationTemplate.delete({
        where: { id: templateId },
      });
    } catch (error) {
      this.logger.error('Failed to delete template:', error);
      throw error;
    }
  }

  async createCampaign(campaignData: {
    name: string;
    description: string;
    templateId: string;
    targetUsers?: string[];
    targetCriteria?: any;
    scheduledAt?: string;
  }): Promise<NotificationCampaign> {
    try {
      const campaign = await this.prisma.notificationCampaign.create({
        data: {
          name: campaignData.name,
          description: campaignData.description,
          templateId: campaignData.templateId,
          targetUsers: campaignData.targetUsers || [],
          targetCriteria: campaignData.targetCriteria,
          scheduledAt: campaignData.scheduledAt ? new Date(campaignData.scheduledAt) : null,
          status: 'draft',
          sentCount: 0,
          failedCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        templateId: campaign.templateId,
        targetUsers: campaign.targetUsers || [],
        targetCriteria: campaign.targetCriteria,
        scheduledAt: campaign.scheduledAt?.toISOString(),
        status: campaign.status as any,
        sentCount: campaign.sentCount,
        failedCount: campaign.failedCount,
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to create campaign:', error);
      throw error;
    }
  }

  async updateCampaign(campaignId: string, campaignData: Partial<NotificationCampaign>): Promise<NotificationCampaign> {
    try {
      const campaign = await this.prisma.notificationCampaign.update({
        where: { id: campaignId },
        data: {
          name: campaignData.name,
          description: campaignData.description,
          targetUsers: campaignData.targetUsers,
          targetCriteria: campaignData.targetCriteria,
          scheduledAt: campaignData.scheduledAt ? new Date(campaignData.scheduledAt) : undefined,
          status: campaignData.status,
          updatedAt: new Date(),
        },
      });

      return {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        templateId: campaign.templateId,
        targetUsers: campaign.targetUsers || [],
        targetCriteria: campaign.targetCriteria,
        scheduledAt: campaign.scheduledAt?.toISOString(),
        status: campaign.status as any,
        sentCount: campaign.sentCount,
        failedCount: campaign.failedCount,
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to update campaign:', error);
      throw error;
    }
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    try {
      await this.prisma.notificationCampaign.delete({
        where: { id: campaignId },
      });
    } catch (error) {
      this.logger.error('Failed to delete campaign:', error);
      throw error;
    }
  }

  async startCampaign(campaignId: string): Promise<void> {
    try {
      await this.prisma.notificationCampaign.update({
        where: { id: campaignId },
        data: {
          status: 'running',
          updatedAt: new Date(),
        },
      });

      // Campaign'i arka planda işle
      this.processCampaign(campaignId);
    } catch (error) {
      this.logger.error('Failed to start campaign:', error);
      throw error;
    }
  }

  private async processCampaign(campaignId: string): Promise<void> {
    try {
      const campaign = await this.prisma.notificationCampaign.findUnique({
        where: { id: campaignId },
        include: {
          template: true,
        },
      });

      if (!campaign || !campaign.template) {
        throw new Error('Campaign or template not found');
      }

      // Target users'ı belirle
      let targetUsers: string[] = [];
      
      if (campaign.targetUsers && campaign.targetUsers.length > 0) {
        targetUsers = campaign.targetUsers;
      } else if (campaign.targetCriteria) {
        // Criteria'ya göre users'ı bul
        targetUsers = await this.getUsersByCriteria(campaign.targetCriteria);
      }

      // Her user için notification oluştur
      for (const userId of targetUsers) {
        try {
          await this.prisma.notification.create({
            data: {
              userId,
              type: campaign.template.type,
              title: campaign.template.subject || campaign.template.name,
              message: campaign.template.content,
              status: 'pending',
              createdAt: new Date(),
            },
          });

          // Sent count'u artır
          await this.prisma.notificationCampaign.update({
            where: { id: campaignId },
            data: {
              sentCount: { increment: 1 },
            },
          });
        } catch (error) {
          this.logger.error(`Failed to send notification to user ${userId}:`, error);
          
          // Failed count'u artır
          await this.prisma.notificationCampaign.update({
            where: { id: campaignId },
            data: {
              failedCount: { increment: 1 },
            },
          });
        }
      }

      // Campaign'i completed olarak işaretle
      await this.prisma.notificationCampaign.update({
        where: { id: campaignId },
        data: {
          status: 'completed',
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Campaign ${campaignId} processed successfully`);
    } catch (error) {
      this.logger.error(`Failed to process campaign ${campaignId}:`, error);
      
      // Campaign'i failed olarak işaretle
      await this.prisma.notificationCampaign.update({
        where: { id: campaignId },
        data: {
          status: 'cancelled',
          updatedAt: new Date(),
        },
      });
    }
  }

  private async getUsersByCriteria(criteria: any): Promise<string[]> {
    try {
      const where: any = {};

      if (criteria.role) {
        where.role = criteria.role;
      }

      if (criteria.isActive !== undefined) {
        where.isActive = criteria.isActive;
      }

      if (criteria.createdAfter) {
        where.createdAt = { gte: new Date(criteria.createdAfter) };
      }

      if (criteria.lastLoginAfter) {
        where.lastLoginAt = { gte: new Date(criteria.lastLoginAfter) };
      }

      const users = await this.prisma.user.findMany({
        where,
        select: { id: true },
      });

      return users.map(user => user.id);
    } catch (error) {
      this.logger.error('Failed to get users by criteria:', error);
      return [];
    }
  }
}
