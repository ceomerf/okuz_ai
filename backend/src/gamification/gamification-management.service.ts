import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class GamificationManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async getBadges(options: {
    page: number;
    limit: number;
    rarity?: string;
    isActive?: boolean;
    search?: string;
  }) {
    const { page, limit, rarity, isActive, search } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (rarity) {
      where.rarity = rarity;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    try {
      const badges = await this.prisma.badge.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      const total = await this.prisma.badge.count({ where });

      return {
        success: true,
        data: {
          badges,
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
      throw new BadRequestException('Rozetler getirilemedi');
    }
  }

  async getBadgeById(id: string) {
    try {
      const badge = await this.prisma.badge.findUnique({
        where: { id },
      });

      if (!badge) {
        throw new NotFoundException('Rozet bulunamadı');
      }

      return {
        success: true,
        data: badge,
      };
    } catch (error) {
      throw new BadRequestException('Rozet detayları getirilemedi');
    }
  }

  async createBadge(createData: {
    name: string;
    description: string;
    icon: string;
    rarity: string;
    points: number;
    isActive: boolean;
  }) {
    try {
      const badge = await this.prisma.badge.create({
        data: {
          name: createData.name,
          description: createData.description,
          icon: createData.icon,
          rarity: createData.rarity,
          points: createData.points,
          isActive: createData.isActive,
        },
      });

      return {
        success: true,
        message: 'Rozet başarıyla oluşturuldu',
        data: badge,
      };
    } catch (error) {
      throw new BadRequestException('Rozet oluşturulamadı');
    }
  }

  async updateBadge(id: string, updateData: {
    name?: string;
    description?: string;
    icon?: string;
    rarity?: string;
    points?: number;
    isActive?: boolean;
  }) {
    try {
      const badge = await this.prisma.badge.update({
        where: { id },
        data: updateData,
      });

      return {
        success: true,
        message: 'Rozet başarıyla güncellendi',
        data: badge,
      };
    } catch (error) {
      throw new BadRequestException('Rozet güncellenemedi');
    }
  }

  async deleteBadge(id: string) {
    try {
      await this.prisma.badge.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Rozet başarıyla silindi',
      };
    } catch (error) {
      throw new BadRequestException('Rozet silinemedi');
    }
  }

  async getBadgeRules(id: string) {
    try {
      const badge = await this.prisma.badge.findUnique({
        where: { id },
      });

      if (!badge) {
        throw new NotFoundException('Rozet bulunamadı');
      }

      // Mock rules data
      const rules = [
        {
          id: 'rule_1',
          badgeId: id,
          condition: 'complete_lessons',
          value: 10,
          description: '10 ders tamamla',
        },
        {
          id: 'rule_2',
          badgeId: id,
          condition: 'score_threshold',
          value: 85,
          description: '85 puan al',
        },
      ];

      return {
        success: true,
        data: rules,
      };
    } catch (error) {
      throw new BadRequestException('Rozet kuralları getirilemedi');
    }
  }

  async createBadgeRule(id: string, ruleData: {
    condition: string;
    value: number;
    description: string;
  }) {
    try {
      const badge = await this.prisma.badge.findUnique({
        where: { id },
      });

      if (!badge) {
        throw new NotFoundException('Rozet bulunamadı');
      }

      // Mock rule creation
      const rule = {
        id: `rule_${Date.now()}`,
        badgeId: id,
        condition: ruleData.condition,
        value: ruleData.value,
        description: ruleData.description,
        createdAt: new Date(),
      };

      return {
        success: true,
        message: 'Rozet kuralı başarıyla oluşturuldu',
        data: rule,
      };
    } catch (error) {
      throw new BadRequestException('Rozet kuralı oluşturulamadı');
    }
  }

  async activateBadge(id: string) {
    try {
      const badge = await this.prisma.badge.update({
        where: { id },
        data: { isActive: true },
      });

      return {
        success: true,
        message: 'Rozet başarıyla aktifleştirildi',
        data: badge,
      };
    } catch (error) {
      throw new BadRequestException('Rozet aktifleştirilemedi');
    }
  }

  async deactivateBadge(id: string) {
    try {
      const badge = await this.prisma.badge.update({
        where: { id },
        data: { isActive: false },
      });

      return {
        success: true,
        message: 'Rozet başarıyla deaktifleştirildi',
        data: badge,
      };
    } catch (error) {
      throw new BadRequestException('Rozet deaktifleştirilemedi');
    }
  }

  async getAchievements(options: {
    page: number;
    limit: number;
    type?: string;
    userId?: string;
    search?: string;
  }) {
    const { page, limit, type, userId, search } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (userId) {
      where.userId = userId;
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    try {
      const achievements = await this.prisma.achievement.findMany({
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
        },
      });

      const total = await this.prisma.achievement.count({ where });

      return {
        success: true,
        data: {
          achievements,
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
      throw new BadRequestException('Başarımlar getirilemedi');
    }
  }

  async getAchievementById(id: string) {
    try {
      const achievement = await this.prisma.achievement.findUnique({
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

      if (!achievement) {
        throw new NotFoundException('Başarım bulunamadı');
      }

      return {
        success: true,
        data: achievement,
      };
    } catch (error) {
      throw new BadRequestException('Başarım detayları getirilemedi');
    }
  }

  async createAchievement(createData: {
    userId: string;
    badgeId: string;
    type: string;
    points: number;
    description?: string;
  }) {
    try {
      const achievement = await this.prisma.achievement.create({
        data: {
          userId: createData.userId,
          title: `Başarım: ${createData.type}`,
          type: createData.type as any,
          points: createData.points,
          description: createData.description || '',
        },
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

      return {
        success: true,
        message: 'Başarım başarıyla oluşturuldu',
        data: achievement,
      };
    } catch (error) {
      throw new BadRequestException('Başarım oluşturulamadı');
    }
  }

  async updateAchievement(id: string, updateData: {
    type?: string;
    points?: number;
    description?: string;
  }) {
    try {
      const achievement = await this.prisma.achievement.update({
        where: { id },
        data: {
          ...updateData,
          type: updateData.type as any,
        },
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

      return {
        success: true,
        message: 'Başarım başarıyla güncellendi',
        data: achievement,
      };
    } catch (error) {
      throw new BadRequestException('Başarım güncellenemedi');
    }
  }

  async deleteAchievement(id: string) {
    try {
      await this.prisma.achievement.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Başarım başarıyla silindi',
      };
    } catch (error) {
      throw new BadRequestException('Başarım silinemedi');
    }
  }

  async awardAchievement(id: string) {
    try {
      const achievement = await this.prisma.achievement.update({
        where: { id },
        data: { unlockedAt: new Date() },
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

      return {
        success: true,
        message: 'Başarım başarıyla ödüllendirildi',
        data: achievement,
      };
    } catch (error) {
      throw new BadRequestException('Başarım ödüllendirilemedi');
    }
  }

  async getLeaderboard(options: {
    type?: string;
    period?: string;
    limit: number;
  }) {
    try {
      // Mock leaderboard data
      const leaderboard = [
        {
          rank: 1,
          user: { id: 'user_1', name: 'Ahmet Yılmaz', avatar: null },
          points: 1250,
          badges: 15,
          achievements: 8,
        },
        {
          rank: 2,
          user: { id: 'user_2', name: 'Ayşe Demir', avatar: null },
          points: 1100,
          badges: 12,
          achievements: 6,
        },
        {
          rank: 3,
          user: { id: 'user_3', name: 'Mehmet Kaya', avatar: null },
          points: 950,
          badges: 10,
          achievements: 5,
        },
      ];

      return {
        success: true,
        data: leaderboard,
      };
    } catch (error) {
      throw new BadRequestException('Liderlik tablosu getirilemedi');
    }
  }

  async getGamificationStatistics() {
    try {
      const stats = {
        totalBadges: await this.prisma.badge.count(),
        totalAchievements: await this.prisma.achievement.count(),
        activeBadges: await this.prisma.badge.count({ where: { isActive: true } }),
        awardedAchievements: await this.prisma.achievement.count({ where: { unlockedAt: { not: null as any } } }),
        averagePoints: 0,
        topBadge: null,
      };

      if (stats.totalAchievements > 0) {
        const avgResult = await this.prisma.achievement.aggregate({
          _avg: { points: true },
        });
        stats.averagePoints = avgResult._avg.points || 0;
      }

      const topBadge = await this.prisma.badge.findFirst({
        orderBy: { points: 'desc' },
        select: {
          id: true,
          name: true,
          icon: true,
          points: true,
        },
      });

      stats.topBadge = topBadge as any;

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      throw new BadRequestException('Gamifikasyon istatistikleri getirilemedi');
    }
  }

  async getBadgeCategories() {
    try {
      const categories = [
        { id: 'academic', name: 'Akademik', description: 'Akademik başarı rozetleri' },
        { id: 'social', name: 'Sosyal', description: 'Sosyal etkileşim rozetleri' },
        { id: 'creative', name: 'Yaratıcı', description: 'Yaratıcılık rozetleri' },
        { id: 'sports', name: 'Spor', description: 'Spor ve aktivite rozetleri' },
      ];

      return {
        success: true,
        data: categories,
      };
    } catch (error) {
      throw new BadRequestException('Rozet kategorileri getirilemedi');
    }
  }

  async getBadgeTemplates() {
    try {
      const templates = [
        {
          id: 'template_1',
          name: 'İlk Ders',
          description: 'İlk dersi tamamlayan öğrenciler için',
          icon: '🎓',
          rarity: 'common',
          points: 10,
        },
        {
          id: 'template_2',
          name: 'Mükemmel Skor',
          description: 'Mükemmel skor alan öğrenciler için',
          icon: '⭐',
          rarity: 'rare',
          points: 50,
        },
        {
          id: 'template_3',
          name: 'Haftalık Şampiyon',
          description: 'Haftalık en yüksek puan alan öğrenci için',
          icon: '🏆',
          rarity: 'epic',
          points: 100,
        },
      ];

      return {
        success: true,
        data: templates,
      };
    } catch (error) {
      throw new BadRequestException('Rozet şablonları getirilemedi');
    }
  }
}