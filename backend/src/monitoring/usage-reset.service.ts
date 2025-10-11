import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class UsageResetService {
  private readonly logger = new Logger(UsageResetService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Her ayın 1'i saat 00:10'da kota sıfırlama
  @Cron('0 10 0 1 * *')
  async resetMonthlyTokenUsage() {
    try {
      await (this.prisma as any).userUsageControl.updateMany({
        data: {
          monthlyTokenUsed: 0,
          lastResetAt: new Date(),
        },
      });
      this.logger.log('Monthly token usage counters have been reset.');
    } catch (e) {
      this.logger.error(`Monthly token usage reset failed: ${(e as any)?.message || e}`);
    }
  }

  async resetDailyUsage() {
    try {
      const users = await (this.prisma as any).user.findMany();
      for (const user of users) {
        await (this.prisma as any).user.update({
          where: { id: user.id },
          data: { 
            dailyUsage: 0,
            weeklyUsage: 0,
            monthlyUsage: 0,
          }
        });
      }
      return { message: 'Daily usage reset successfully' };
    } catch (error) {
      throw new Error('Failed to reset daily usage');
    }
  }

  async resetWeeklyUsage() {
    try {
      const users = await (this.prisma as any).user.findMany();
      for (const user of users) {
        await (this.prisma as any).user.update({
          where: { id: user.id },
          data: { 
            dailyUsage: 0,
            weeklyUsage: 0,
            monthlyUsage: 0,
          }
        });
      }
      return { message: 'Weekly usage reset successfully' };
    } catch (error) {
      throw new Error('Failed to reset weekly usage');
    }
  }

  async resetMonthlyUsage() {
    try {
      const users = await (this.prisma as any).user.findMany();
      for (const user of users) {
        await (this.prisma as any).user.update({
          where: { id: user.id },
          data: { 
            dailyUsage: 0,
            weeklyUsage: 0,
            monthlyUsage: 0,
          }
        });
      }
      return { message: 'Monthly usage reset successfully' };
    } catch (error) {
      throw new Error('Failed to reset monthly usage');
    }
  }

  async resetUserUsage(userId: string) {
    try {
      await (this.prisma as any).user.update({
        where: { id: userId },
        data: { 
          dailyUsage: 0,
          weeklyUsage: 0,
          monthlyUsage: 0,
        }
      });
      return { message: 'User usage reset successfully' };
    } catch (error) {
      throw new Error('Failed to reset user usage');
    }
  }

  async getUsageStats() {
    try {
      const stats = await (this.prisma as any).user.findMany({
        select: {
          id: true
        }
      });
      return { message: 'Usage stats retrieved', stats };
    } catch (error) {
      throw new Error('Failed to get usage stats');
    }
  }

  async scheduleUsageReset() {
    try {
      // Mock successful operations
      return { message: 'Usage reset scheduled successfully' };
    } catch (error) {
      throw new Error('Failed to schedule usage reset');
    }
  }

  async cleanupOldUsageData() {
    try {
      const oldUsage = await (this.prisma as any).usage.findMany({
        where: {
          createdAt: {
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
          }
        }
      });
      
      for (const usage of oldUsage) {
        await (this.prisma as any).usage.delete({
          where: { id: (usage as any).id }
        });
      }
      
      return { message: 'Old usage data cleaned up successfully' };
    } catch (error) {
      throw new Error('Failed to cleanup old usage data');
    }
  }

  async getUserUsageHistory(userId: string) {
    try {
      const history = await (this.prisma as any).usage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
      return history;
    } catch (error) {
      throw new Error('Failed to get user usage history');
    }
  }

  async updateUsageLimits(userId: string, limits: any) {
    try {
      const updatedUser = await (this.prisma as any).user.update({
        where: { id: userId },
        data: {
          dailyLimit: limits.dailyLimit,
          weeklyLimit: limits.weeklyLimit,
          monthlyLimit: limits.monthlyLimit
        }
      });
      return { id: userId, ...limits };
    } catch (error) {
      throw new Error('Failed to update usage limits');
    }
  }
}


