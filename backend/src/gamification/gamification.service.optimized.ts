import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * N+1 problemi çözülmüş progress getirme
   * Tek sorgu ile tüm istatistikleri alır
   */
  async getProgressOptimized(userId: string): Promise<any> {
    const profile = await (this.prisma as any).gamificationProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const levelInfo = this.calculateLevelInfo(profile.level, profile.experience);
    
    // Bu hafta kazanılan XP için tarih hesaplama
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    // Tek sorgu ile tüm istatistikleri al
    const [
      weeklyStudyTime,
      totalStudyTime,
      completedQuizzes,
      solvedQuestions,
      createdFlashcards,
      badges
    ] = await Promise.all([
      // Bu hafta çalışma süresi
      (this.prisma as any).studySession.aggregate({
        where: {
          userId,
          createdAt: { gte: weekStart },
          isCompleted: true,
        },
        _sum: { duration: true },
      }),
      // Toplam çalışma süresi
      (this.prisma as any).studySession.aggregate({
        where: {
          userId,
          isCompleted: true,
        },
        _sum: { duration: true },
      }),
      // Tamamlanan quiz sayısı
      (this.prisma as any).quiz.count({
        where: { userId, isCompleted: true },
      }),
      // Çözülen soru sayısı
      (this.prisma as any).toolUsage.count({
        where: { userId, toolName: 'sos-question-solver' },
      }),
      // Oluşturulan flashcard sayısı
      (this.prisma as any).flashcard.count({
        where: { userId },
      }),
      // Kullanıcı rozetleri
      this.getUserBadges(userId)
    ]);

    return {
      level: levelInfo,
      stats: {
        totalStudyTime: totalStudyTime._sum.duration || 0,
        completedQuizzes,
        solvedQuestions,
        createdFlashcards,
        weeklyXP: (weeklyStudyTime._sum.duration || 0) * 2,
      },
      badges,
      nextMilestone: this.getNextMilestone(profile.experience),
    };
  }

  /**
   * Daha da optimize edilmiş versiyon - tek sorgu ile tüm veriler
   */
  async getProgressUltraOptimized(userId: string): Promise<any> {
    const profile = await (this.prisma as any).gamificationProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            studySessions: {
              where: { isCompleted: true },
              select: {
                duration: true,
                createdAt: true,
              }
            },
            quizzes: {
              where: { isCompleted: true },
              select: { id: true }
            },
            toolUsages: {
              where: { toolName: 'sos-question-solver' },
              select: { id: true }
            },
            flashcards: {
              select: { id: true }
            }
          }
        }
      }
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const levelInfo = this.calculateLevelInfo(profile.level, profile.experience);
    
    // Bu hafta kazanılan XP için tarih hesaplama
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    // Verileri işle
    const studySessions = profile.user.studySessions;
    const weeklySessions = studySessions.filter(s => s.createdAt >= weekStart);
    
    const totalStudyTime = studySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const weeklyStudyTime = weeklySessions.reduce((sum, s) => sum + (s.duration || 0), 0);

    return {
      level: levelInfo,
      stats: {
        totalStudyTime,
        completedQuizzes: profile.user.quizzes.length,
        solvedQuestions: profile.user.toolUsages.length,
        createdFlashcards: profile.user.flashcards.length,
        weeklyXP: weeklyStudyTime * 2,
      },
      badges: await this.getUserBadges(userId),
      nextMilestone: this.getNextMilestone(profile.experience),
    };
  }

  private calculateLevelInfo(level: number, experience: number): any {
    const currentLevelXP = this.getXPForLevel(level);
    const nextLevelXP = this.getXPForLevel(level + 1);
    const progress = nextLevelXP - currentLevelXP;
    const currentProgress = experience - currentLevelXP;
    
    return {
      level,
      experience,
      currentLevelXP,
      nextLevelXP,
      progress: progress > 0 ? (currentProgress / progress) * 100 : 0,
      currentProgress,
      totalToNext: progress,
    };
  }

  private getXPForLevel(level: number): number {
    // Level 1 = 0 XP, Level 2 = 100 XP, Level 3 = 250 XP, etc.
    if (level <= 1) return 0;
    return Math.floor(100 * Math.pow(level - 1, 1.5));
  }

  private getNextMilestone(experience: number): any {
    const milestones = [100, 250, 500, 1000, 2000, 5000, 10000];
    const nextMilestone = milestones.find(m => m > experience);
    
    if (!nextMilestone) {
      return { xp: 0, description: 'Maksimum seviyeye ulaştınız!' };
    }
    
    return {
      xp: nextMilestone - experience,
      description: `${nextMilestone} XP'ye ${nextMilestone - experience} XP kaldı`,
    };
  }

  private async getUserBadges(userId: string): Promise<any[]> {
    // Bu metod da optimize edilebilir
    return (this.prisma as any).achievement.findMany({
      where: { userId },
      include: {
        // Prisma modelinde yoksa tip hatasını önlemek için comment edildi
      } as any,
    });
  }
}
