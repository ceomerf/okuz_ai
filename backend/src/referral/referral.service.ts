import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * Yeni referans kodu oluştur
   */
  async createReferralCode(userId: string, options: {
    maxUses?: number;
    expiresAt?: Date;
    bonusType?: string;
    bonusValue?: number;
  } = {}) {
    const code = this.generateReferralCode();
    
    return this.prisma.referralCode.create({
      data: {
        referrerId: userId,
        code,
        maxUses: options.maxUses || 5,
        expiresAt: options.expiresAt,
        bonusType: options.bonusType || 'TRIAL_EXTENSION',
        bonusValue: options.bonusValue || 7,
      },
    });
  }

  /**
   * Kullanıcının referans kodlarını getir
   */
  async getUserReferralCodes(userId: string) {
    return this.prisma.referralCode.findMany({
      where: { referrerId: userId },
      include: {
        uses: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Referans kodu kullan
   */
  async useReferralCode(userId: string, code: string) {
    // Kodu bul
    const referralCode = await this.prisma.referralCode.findUnique({
      where: { code },
      include: {
        referrer: true,
      },
    });

    if (!referralCode) {
      throw new NotFoundException('Geçersiz referans kodu');
    }

    if (!referralCode.isActive) {
      throw new BadRequestException('Bu referans kodu aktif değil');
    }

    if (referralCode.usedCount >= referralCode.maxUses) {
      throw new BadRequestException('Bu referans kodu kullanım limitine ulaştı');
    }

    if (referralCode.expiresAt && referralCode.expiresAt < new Date()) {
      throw new BadRequestException('Bu referans kodu süresi dolmuş');
    }

    // Kendi kodunu kullanmaya çalışıyor mu?
    if (referralCode.referrerId === userId) {
      throw new BadRequestException('Kendi referans kodunuzu kullanamazsınız');
    }

    // Daha önce kullanmış mı?
    const existingUse = await this.prisma.referralUse.findUnique({
      where: {
        referralCodeId_userId: {
          referralCodeId: referralCode.id,
          userId,
        },
      },
    });

    if (existingUse) {
      throw new BadRequestException('Bu referans kodunu daha önce kullandınız');
    }

    // Referans kullanımını kaydet
    const referralUse = await this.prisma.referralUse.create({
      data: {
        referralCodeId: referralCode.id,
        userId,
      },
    });

    // Kullanım sayısını artır
    await this.prisma.referralCode.update({
      where: { id: referralCode.id },
      data: {
        usedCount: referralCode.usedCount + 1,
      },
    });

    // Bonus uygula
    await this.applyReferralBonus(userId, referralCode);

    this.logger.log(`Referral code ${code} used by user ${userId}`);

    return {
      success: true,
      bonusType: referralCode.bonusType,
      bonusValue: referralCode.bonusValue,
      message: this.getBonusMessage(referralCode.bonusType, referralCode.bonusValue),
    };
  }

  /**
   * Referans istatistikleri
   */
  async getReferralStats(userId: string) {
    const [codes, totalUses, recentUses] = await Promise.all([
      this.prisma.referralCode.findMany({
        where: { referrerId: userId },
        include: {
          uses: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.referralUse.count({
        where: {
          referralCode: { referrerId: userId },
        },
      }),
      this.prisma.referralUse.findMany({
        where: {
          referralCode: { referrerId: userId },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const activeCodes = codes.filter(c => c.isActive && (!c.expiresAt || c.expiresAt > new Date()));
    const totalBonusGiven = codes.reduce((sum, code) => {
      return sum + (code.uses.length * code.bonusValue);
    }, 0);

    return {
      totalCodes: codes.length,
      activeCodes: activeCodes.length,
      totalUses,
      totalBonusGiven,
      recentUses,
      codes: codes.map(code => ({
        id: code.id,
        code: code.code,
        isActive: code.isActive,
        usedCount: code.usedCount,
        maxUses: code.maxUses,
        bonusType: code.bonusType,
        bonusValue: code.bonusValue,
        expiresAt: code.expiresAt,
        createdAt: code.createdAt,
      })),
    };
  }

  /**
   * Referans kodu deaktive et
   */
  async deactivateReferralCode(userId: string, codeId: string) {
    const code = await this.prisma.referralCode.findFirst({
      where: {
        id: codeId,
        referrerId: userId,
      },
    });

    if (!code) {
      throw new NotFoundException('Referans kodu bulunamadı');
    }

    return this.prisma.referralCode.update({
      where: { id: codeId },
      data: { isActive: false },
    });
  }

  /**
   * Popüler referans kodları (admin)
   */
  async getPopularReferralCodes(limit: number = 10) {
    return this.prisma.referralCode.findMany({
      where: { isActive: true },
      include: {
        referrer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: { uses: true },
        },
      },
      orderBy: { usedCount: 'desc' },
      take: limit,
    });
  }

  /**
   * Referans kodu arama
   */
  async searchReferralCode(code: string) {
    const referralCode = await this.prisma.referralCode.findUnique({
      where: { code },
      include: {
        referrer: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: { uses: true },
        },
      },
    });

    if (!referralCode) {
      return null;
    }

    return {
      code: referralCode.code,
      referrerName: referralCode.referrer.name,
      bonusType: referralCode.bonusType,
      bonusValue: referralCode.bonusValue,
      isActive: referralCode.isActive,
      usedCount: referralCode.usedCount,
      maxUses: referralCode.maxUses,
      expiresAt: referralCode.expiresAt,
    };
  }

  // Yardımcı metodlar
  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async applyReferralBonus(userId: string, referralCode: any) {
    const { bonusType, bonusValue } = referralCode;

    switch (bonusType) {
      case 'TRIAL_EXTENSION':
        // await this.subscriptionService.extendTrial(userId, bonusValue); // Bu metod kaldırıldı
        break;
      case 'PREMIUM_DAYS':
        // await this.subscriptionService.addPremiumDays(userId, bonusValue); // Bu metod kaldırıldı
        break;
      case 'COINS':
        await this.addCoins(userId, bonusValue);
        break;
      default:
        this.logger.warn(`Unknown bonus type: ${bonusType}`);
    }

    // Referans kullanımını bonus uygulandı olarak işaretle
    await this.prisma.referralUse.updateMany({
      where: {
        referralCodeId: referralCode.id,
        userId,
      },
      data: {
        bonusApplied: true,
        bonusValue,
      },
    });
  }

  private async addCoins(userId: string, coins: number) {
    const gamificationProfile = await this.prisma.gamificationProfile.findUnique({
      where: { userId },
    });

    if (gamificationProfile) {
      await this.prisma.gamificationProfile.update({
        where: { userId },
        data: {
          coins: gamificationProfile.coins + coins,
        },
      });
    } else {
      await this.prisma.gamificationProfile.create({
        data: {
          userId,
          coins,
        },
      });
    }
  }

  private getBonusMessage(bonusType: string, bonusValue: number): string {
    switch (bonusType) {
      case 'TRIAL_EXTENSION':
        return `Deneme süreniz ${bonusValue} gün uzatıldı!`;
      case 'PREMIUM_DAYS':
        return `${bonusValue} günlük premium üyelik kazandınız!`;
      case 'COINS':
        return `${bonusValue} coin kazandınız!`;
      default:
        return 'Bonus uygulandı!';
    }
  }
}
