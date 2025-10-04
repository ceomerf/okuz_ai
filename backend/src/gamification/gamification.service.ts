import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
// import { GeminiService } from '../services/gemini.service'; // DEVRE DIŞI - OPENAI KULLANILIYOR
import { OpenAIService } from '../services/openai.service';

interface TaskCompletionData {
  taskId: string;
  taskType: string;
  performance: number;
  userId?: string;
  duration?: number;
  subject?: string;
  difficulty?: string;
}

interface LevelInfo {
  currentLevel: number;
  currentXP: number;
  nextLevelXP: number;
  progressToNext: number;
  totalXP: number;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: string;
  target: number;
  current: number;
  reward: {
    xp: number;
    coins: number;
    energy: number;
  };
  deadline: Date;
  isCompleted: boolean;
}

@Injectable()
export class GamificationService {
  constructor(
    private readonly prisma: PrismaService,
    // private readonly geminiService: GeminiService, // DEVRE DIŞI - OPENAI KULLANILIYOR
    private readonly openaiService: OpenAIService,
  ) {}

  // XP hesaplama algoritması - performansa ve zorluk seviyesine göre
  private calculateXP(taskType: string, performance: number, duration: number = 0, difficulty: string = 'medium'): number {
    const baseXP = {
      'study_session': 50,
      'quiz': 30,
      'exam': 100,
      'flashcard': 10,
      'concept_map': 80,
      'summary': 40,
      'question_solved': 25,
      'streak_day': 20,
      'goal_completion': 150,
      'habit_completion': 35,
    };

    const difficultyMultiplier = {
      'easy': 0.8,
      'medium': 1.0,
      'hard': 1.3,
      'expert': 1.6,
    };

    const performanceMultiplier = Math.max(0.5, performance / 100);
    const durationBonus = Math.min(20, Math.floor(duration / 30)); // Her 30 dakika için +20 XP
    
    const base = baseXP[taskType as keyof typeof baseXP] || 20;
    const multiplier = difficultyMultiplier[difficulty as keyof typeof difficultyMultiplier] || 1.0;
    
    return Math.floor((base * multiplier * performanceMultiplier) + durationBonus);
  }

  // Seviye hesaplama - Exponential growth
  private calculateLevel(totalXP: number): number {
    return Math.floor(Math.sqrt(totalXP / 100)) + 1;
  }

  private getXPForLevel(level: number): number {
    return Math.pow(level - 1, 2) * 100;
  }

  async completeTask(data: TaskCompletionData): Promise<any> {
    const userId = data.userId || 'user-id'; // JWT'den gelecek
    
    // Kullanıcının gamification profilini al veya oluştur
    let profile = await this.prisma.gamificationProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      profile = await this.prisma.gamificationProfile.create({
        data: {
          userId,
          level: 1,
          experience: 0,
          energy: 100,
          maxEnergy: 100,
          streak: 0,
          totalPoints: 0,
          coins: 0,
        },
      });
    }

    // XP hesapla
    const earnedXP = this.calculateXP(
      data.taskType,
      data.performance,
      data.duration,
      data.difficulty
    );

    // Bonus XP hesaplamaları
    let bonusXP = 0;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Streak bonus
    const lastSession = await this.prisma.studySession.findFirst({
      where: {
        userId,
        createdAt: {
          gte: new Date(today.getTime() - 24 * 60 * 60 * 1000), // Son 24 saat
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastSession || lastSession.createdAt < today) {
      // Streak devam ediyor
      profile.streak += 1;
      bonusXP += profile.streak * 5; // Her streak günü için +5 XP bonus
    }

    // Perfect performance bonus
    if (data.performance >= 95) {
      bonusXP += Math.floor(earnedXP * 0.5); // %50 bonus
    }

    const totalXP = earnedXP + bonusXP;
    const newTotalXP = profile.experience + totalXP;
    const newLevel = this.calculateLevel(newTotalXP);
    const leveledUp = newLevel > profile.level;

    // Coins hesapla
    const earnedCoins = Math.floor(totalXP / 10) + (leveledUp ? newLevel * 10 : 0);

    // Profili güncelle
    const updatedProfile = await this.prisma.gamificationProfile.update({
      where: { userId },
      data: {
        experience: newTotalXP,
        level: newLevel,
        totalPoints: profile.totalPoints + totalXP,
        coins: profile.coins + earnedCoins,
        streak: profile.streak,
      },
    });

    // Achievement kontrolü
    await this.checkAndUnlockAchievements(userId, {
      taskType: data.taskType,
      performance: data.performance,
      streak: profile.streak,
      level: newLevel,
      totalXP: newTotalXP,
    });

    // Günlük görev kontrolü
    await this.updateDailyChallenges(userId, data.taskType, data.performance);

    return {
      success: true,
      rewards: {
        xp: earnedXP,
        bonusXP,
        totalXP,
        coins: earnedCoins,
        leveledUp,
        newLevel,
        streak: profile.streak,
      },
      profile: updatedProfile,
      message: leveledUp ? `Tebrikler! Seviye ${newLevel}'e yükseldin!` : 'Görev tamamlandı!',
    };
  }

  async getLeaderboard(userId: string): Promise<any> {
    // Haftalık leaderboard
    const weeklyLeaderboard = await this.prisma.gamificationProfile.findMany({
      take: 50,
      orderBy: [
        { experience: 'desc' },
        { level: 'desc' },
      ],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            studentProfile: {
              select: {
                grade: true,
                field: true,
              },
            },
          },
        },
      },
    });

    // Kullanıcının pozisyonu
    const userPosition = await this.prisma.gamificationProfile.count({
      where: {
        experience: {
          gt: (await this.prisma.gamificationProfile.findUnique({
            where: { userId },
          }))?.experience || 0,
        },
      },
    }) + 1;

    // Arkadaş leaderboard'u (aynı sınıf/alan)
    const userProfile = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });

    let friendsLeaderboard: any[] = [];
    if (userProfile?.studentProfile) {
      friendsLeaderboard = await this.prisma.gamificationProfile.findMany({
        take: 20,
        orderBy: [{ experience: 'desc' }],
        include: {
          user: {
            select: {
              id: true,
              name: true,
              studentProfile: {
                select: {
                  grade: true,
                  field: true,
                },
              },
            },
          },
        },
        where: {
          user: {
            studentProfile: {
              grade: userProfile.studentProfile.grade,
              field: userProfile.studentProfile.field,
            },
          },
        },
      });
    }

    return {
      global: {
        rankings: weeklyLeaderboard.map((profile, index) => ({
          position: index + 1,
          userId: profile.user.id,
          name: profile.user.name,
          level: profile.level,
          experience: profile.experience,
          grade: profile.user.studentProfile?.grade,
          field: profile.user.studentProfile?.field,
          isCurrentUser: profile.user.id === userId,
        })),
        userPosition,
        totalUsers: await this.prisma.gamificationProfile.count(),
      },
      friends: {
        rankings: friendsLeaderboard.map((profile, index) => ({
          position: index + 1,
          userId: profile.user.id,
          name: profile.user.name,
          level: profile.level,
          experience: profile.experience,
          isCurrentUser: profile.user.id === userId,
        })),
      },
    };
  }

  async getAchievements(userId: string): Promise<any> {
    const userAchievements = await this.prisma.achievement.findMany({
      where: { userId },
      orderBy: { unlockedAt: 'desc' },
    });

    // Tüm mevcut achievement'lar
    const allAchievements = this.getAllPossibleAchievements();
    
    const unlockedIds = userAchievements.map(a => a.id);
    const lockedAchievements = allAchievements.filter(a => !unlockedIds.includes(a.id));

    return {
      unlocked: userAchievements,
      locked: lockedAchievements,
      stats: {
        total: allAchievements.length,
        unlocked: userAchievements.length,
        completionRate: Math.round((userAchievements.length / allAchievements.length) * 100),
        totalPoints: userAchievements.reduce((sum, a) => sum + a.points, 0),
      },
    };
  }

  private getAllPossibleAchievements() {
    return [
      { id: 'first_study', title: 'İlk Adım', description: 'İlk çalışma seansını tamamla', points: 50, icon: '🌟' },
      { id: 'streak_3', title: 'Kararlılık', description: '3 gün üst üste çalış', points: 100, icon: '🔥' },
      { id: 'streak_7', title: 'Haftalık Kahraman', description: '7 gün üst üste çalış', points: 200, icon: '⚡' },
      { id: 'streak_30', title: 'Aylık Efsane', description: '30 gün üst üste çalış', points: 500, icon: '👑' },
      { id: 'perfect_quiz', title: 'Mükemmellik', description: 'Quiz\'de %100 al', points: 75, icon: '🎯' },
      { id: 'level_5', title: 'Yükselen Yıldız', description: '5. seviyeye ulaş', points: 150, icon: '⭐' },
      { id: 'level_10', title: 'Uzman', description: '10. seviyeye ulaş', points: 300, icon: '🏆' },
      { id: 'level_25', title: 'Usta', description: '25. seviyeye ulaş', points: 750, icon: '🥇' },
      { id: 'study_marathon', title: 'Maraton Koşucusu', description: '5 saat çalış', points: 200, icon: '🏃' },
      { id: 'question_solver', title: 'Problem Çözücü', description: '100 soru çöz', points: 250, icon: '🧮' },
      { id: 'flashcard_master', title: 'Kart Ustası', description: '50 flashcard oluştur', points: 150, icon: '🗂️' },
      { id: 'concept_mapper', title: 'Kavram Mimarı', description: '10 kavram haritası oluştur', points: 300, icon: '🗺️' },
    ];
  }

  private async checkAndUnlockAchievements(userId: string, data: any) {
    const achievements = [];

    // Streak achievements
    if (data.streak === 3) achievements.push('streak_3');
    if (data.streak === 7) achievements.push('streak_7');
    if (data.streak === 30) achievements.push('streak_30');

    // Level achievements
    if (data.level === 5) achievements.push('level_5');
    if (data.level === 10) achievements.push('level_10');
    if (data.level === 25) achievements.push('level_25');

    // Performance achievements
    if (data.performance === 100 && data.taskType === 'quiz') {
      achievements.push('perfect_quiz');
    }

    // İlk çalışma
    const studyCount = await this.prisma.studySession.count({
      where: { userId },
    });
    if (studyCount === 1) achievements.push('first_study');

    // Achievement'ları unlock et
    for (const achievementId of achievements) {
      const existing = await this.prisma.achievement.findFirst({
        where: { userId, title: achievementId },
      });

      if (!existing) {
        const achievementData = this.getAllPossibleAchievements().find(a => a.id === achievementId);
        if (achievementData) {
          await this.prisma.achievement.create({
            data: {
              userId,
              title: achievementData.title,
              description: achievementData.description,
              type: 'MILESTONE',
              icon: achievementData.icon,
              points: achievementData.points,
            },
          });
        }
      }
    }
  }

  async getDailyChallenges(userId: string): Promise<Challenge[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Kullanıcının profil bilgilerini al
    const userProfile = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
        gamificationProfile: true,
      },
    });

    // Günlük görevler - dinamik olarak oluştur
    const challenges: Challenge[] = [
      {
        id: 'daily_study',
        title: 'Günlük Çalışma',
        description: '60 dakika çalış',
        type: 'study_duration',
        target: 60,
        current: await this.getTodayStudyMinutes(userId),
        reward: { xp: 100, coins: 20, energy: 10 },
        deadline: tomorrow,
        isCompleted: false,
      },
      {
        id: 'daily_quiz',
        title: 'Quiz Ustası',
        description: '3 quiz tamamla',
        type: 'quiz_completion',
        target: 3,
        current: await this.getTodayQuizCount(userId),
        reward: { xp: 75, coins: 15, energy: 5 },
        deadline: tomorrow,
        isCompleted: false,
      },
      {
        id: 'daily_questions',
        title: 'Soru Avcısı',
        description: '10 soru çöz',
        type: 'question_solving',
        target: 10,
        current: await this.getTodayQuestionCount(userId),
        reward: { xp: 50, coins: 10, energy: 5 },
        deadline: tomorrow,
        isCompleted: false,
      },
      {
        id: 'daily_flashcards',
        title: 'Kart Sihirbazı',
        description: '20 flashcard incele',
        type: 'flashcard_review',
        target: 20,
        current: await this.getTodayFlashcardCount(userId),
        reward: { xp: 40, coins: 8, energy: 3 },
        deadline: tomorrow,
        isCompleted: false,
      },
    ];

    // Tamamlanma durumunu kontrol et
    challenges.forEach(challenge => {
      challenge.isCompleted = challenge.current >= challenge.target;
    });

    return challenges;
  }

  private async getTodayStudyMinutes(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sessions = await this.prisma.studySession.findMany({
      where: {
        userId,
        createdAt: { gte: today },
        isCompleted: true,
      },
    });

    return sessions.reduce((total, session) => total + session.duration, 0);
  }

  private async getTodayQuizCount(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return await this.prisma.quiz.count({
      where: {
        userId,
        createdAt: { gte: today },
        isCompleted: true,
      },
    });
  }

  private async getTodayQuestionCount(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return await this.prisma.toolUsage.count({
      where: {
        userId,
        toolName: 'sos-question-solver',
        createdAt: { gte: today },
      },
    });
  }

  private async getTodayFlashcardCount(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return await this.prisma.flashcard.count({
      where: {
        userId,
        lastReviewed: { gte: today },
      },
    });
  }

  async completeChallenge(data: { challengeId: string; performance: number; userId?: string }): Promise<any> {
    // Challenge tamamlandığında ödül ver
    const userId = data.userId || 'user-id'; // JWT'den gelecek
    const challenges = await this.getDailyChallenges(userId);
    const challenge = challenges.find(c => c.id === data.challengeId);

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    if (!challenge.isCompleted) {
      throw new BadRequestException('Challenge not completed yet');
    }

    // Ödül ver
    await this.prisma.gamificationProfile.update({
      where: { userId },
      data: {
        experience: { increment: challenge.reward.xp },
        coins: { increment: challenge.reward.coins },
        energy: { increment: challenge.reward.energy },
      },
    });

    return {
      success: true,
      reward: challenge.reward,
      message: `Tebrikler! ${challenge.title} görevini tamamladın!`,
    };
  }

  async getStreaks(userId: string): Promise<any> {
    const profile = await this.prisma.gamificationProfile.findUnique({
      where: { userId },
    });

    // Son 30 günün çalışma verilerini al
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const studySessions = await this.prisma.studySession.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
        isCompleted: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Günlük çalışma haritası oluştur
    const dailyStudy = new Map();
    studySessions.forEach(session => {
      const date = session.createdAt.toISOString().split('T')[0];
      if (!dailyStudy.has(date)) {
        dailyStudy.set(date, { duration: 0, sessions: 0 });
      }
      dailyStudy.get(date).duration += session.duration;
      dailyStudy.get(date).sessions += 1;
    });

    return {
      currentStreak: profile?.streak || 0,
      longestStreak: await this.calculateLongestStreak(userId),
      weeklyPattern: this.getWeeklyPattern(dailyStudy),
      monthlyCalendar: this.getMonthlyCalendar(dailyStudy),
      streakMilestones: [
        { days: 3, reward: '🔥 Alev Rozeti', unlocked: (profile?.streak || 0) >= 3 },
        { days: 7, reward: '⚡ Şimşek Rozeti', unlocked: (profile?.streak || 0) >= 7 },
        { days: 14, reward: '🌟 Yıldız Rozeti', unlocked: (profile?.streak || 0) >= 14 },
        { days: 30, reward: '👑 Kral Rozeti', unlocked: (profile?.streak || 0) >= 30 },
        { days: 100, reward: '🏆 Efsane Rozeti', unlocked: (profile?.streak || 0) >= 100 },
      ],
    };
  }

  private async calculateLongestStreak(userId: string): Promise<number> {
    // Tüm çalışma seanslarını al
    const sessions = await this.prisma.studySession.findMany({
      where: { userId, isCompleted: true },
      orderBy: { createdAt: 'asc' },
    });

    let longestStreak = 0;
    let currentStreak = 0;
    let lastDate: Date | null = null;

    sessions.forEach(session => {
      const currentDate = new Date(session.createdAt.toISOString().split('T')[0]);
      
      if (lastDate) {
        const dayDiff = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dayDiff === 1) {
          currentStreak++;
        } else if (dayDiff > 1) {
          longestStreak = Math.max(longestStreak, currentStreak);
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      
      lastDate = currentDate;
    });

    return Math.max(longestStreak, currentStreak);
  }

  private getWeeklyPattern(dailyStudy: Map<string, any>) {
    const pattern = Array(7).fill(0);
    
    dailyStudy.forEach((data, date) => {
      const dayOfWeek = new Date(date).getDay();
      pattern[dayOfWeek] += data.duration;
    });

    return pattern.map((minutes, index) => ({
      day: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][index],
      minutes,
      hours: Math.round(minutes / 60 * 10) / 10,
    }));
  }

  private getMonthlyCalendar(dailyStudy: Map<string, any>) {
    const calendar = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const data = dailyStudy.get(dateStr) || { duration: 0, sessions: 0 };
      
      calendar.push({
        date: dateStr,
        day: date.getDate(),
        duration: data.duration,
        sessions: data.sessions,
        hasStudied: data.duration > 0,
        intensity: Math.min(4, Math.floor(data.duration / 30)), // 0-4 yoğunluk seviyesi
      });
    }
    
    return calendar;
  }

  async getRewards(userId: string): Promise<any> {
    const profile = await this.prisma.gamificationProfile.findUnique({
      where: { userId },
    });

    const rewards = [
      {
        id: 'theme_dark',
        title: 'Karanlık Tema',
        description: 'Gözlerini koruyacak karanlık tema',
        cost: 100,
        type: 'theme',
        icon: '🌙',
        owned: false, // DB'den kontrol edilecek
      },
      {
        id: 'avatar_scientist',
        title: 'Bilim İnsanı Avatarı',
        description: 'Özel bilim insanı avatarı',
        cost: 250,
        type: 'avatar',
        icon: '👩‍🔬',
        owned: false,
      },
      {
        id: 'energy_boost',
        title: 'Enerji Takviyesi',
        description: '+50 enerji puanı',
        cost: 50,
        type: 'consumable',
        icon: '⚡',
        owned: false,
      },
      {
        id: 'xp_multiplier',
        title: 'XP Çarpanı',
        description: '1 saat boyunca 2x XP',
        cost: 150,
        type: 'consumable',
        icon: '✨',
        owned: false,
      },
      {
        id: 'custom_badge',
        title: 'Özel Rozet',
        description: 'Kendi rozetini tasarla',
        cost: 500,
        type: 'customization',
        icon: '🏅',
        owned: false,
      },
    ];

    return {
      available: rewards,
      userCoins: profile?.coins || 0,
      canAfford: rewards.map(reward => ({
        id: reward.id,
        canAfford: (profile?.coins || 0) >= reward.cost,
      })),
    };
  }

  async claimReward(data: { rewardId: string; userId?: string }): Promise<any> {
    const userId = data.userId || 'user-id'; // JWT'den gelecek
    const rewards = await this.getRewards(userId);
    const reward = rewards.available.find((r: any) => r.id === data.rewardId);

    if (!reward) {
      throw new NotFoundException('Reward not found');
    }

    const profile = await this.prisma.gamificationProfile.findUnique({
      where: { userId },
    });

    if (!profile || profile.coins < reward.cost) {
      throw new BadRequestException('Insufficient coins');
    }

    // Coin'leri düş
    await this.prisma.gamificationProfile.update({
      where: { userId },
      data: {
        coins: { decrement: reward.cost },
      },
    });

    // Ödülü kullanıcıya ver (inventory sistemi eklenebilir)
    // TODO: User inventory table'ı ekle

    return {
      success: true,
      reward,
      remainingCoins: profile.coins - reward.cost,
      message: `${reward.title} başarıyla satın alındı!`,
    };
  }

  async getProgress(userId: string): Promise<any> {
    const profile = await this.prisma.gamificationProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const levelInfo = this.calculateLevelInfo(profile.level, profile.experience);
    
    // Bu hafta kazanılan XP
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weeklyXP = await this.prisma.studySession.aggregate({
      where: {
        userId,
        createdAt: { gte: weekStart },
        isCompleted: true,
      },
      _sum: { duration: true },
    });

    return {
      level: levelInfo,
      stats: {
        totalStudyTime: await this.getTotalStudyTime(userId),
        completedQuizzes: await this.prisma.quiz.count({
          where: { userId, isCompleted: true },
        }),
        solvedQuestions: await this.prisma.toolUsage.count({
          where: { userId, toolName: 'sos-question-solver' },
        }),
        createdFlashcards: await this.prisma.flashcard.count({
          where: { userId },
        }),
        weeklyXP: (weeklyXP._sum.duration || 0) * 2, // Rough calculation
      },
      badges: await this.getUserBadges(userId),
      nextMilestone: this.getNextMilestone(profile.experience),
    };
  }

  private calculateLevelInfo(level: number, experience: number): any {
    const currentLevelXP = this.getXPForLevel(level);
    const nextLevelXP = this.getXPForLevel(level + 1);
    const progressXP = experience - currentLevelXP;
    const neededXP = nextLevelXP - currentLevelXP;
    
    return {
      currentLevel: level,
      currentXP: progressXP,
      nextLevelXP: neededXP,
      progressToNext: Math.round((progressXP / neededXP) * 100),
      totalXP: experience,
    };
  }

  async getLevelInfo(userId: string): Promise<any> {
    const profile = await this.prisma.gamificationProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return this.calculateLevelInfo(profile.level, profile.experience);
  }

  private async getTotalStudyTime(userId: string): Promise<number> {
    const result = await this.prisma.studySession.aggregate({
      where: { userId, isCompleted: true },
      _sum: { duration: true },
    });

    return result._sum.duration || 0;
  }

  private async getUserBadges(userId: string) {
    const achievements = await this.prisma.achievement.findMany({
      where: { userId },
      select: { title: true, icon: true, unlockedAt: true },
    });

    return achievements.map(a => ({
      title: a.title,
      icon: a.icon,
      unlockedAt: a.unlockedAt,
    }));
  }

  private getNextMilestone(experience: number) {
    const milestones = [1000, 2500, 5000, 10000, 25000, 50000, 100000];
    const nextMilestone = milestones.find(m => m > experience);
    
    return nextMilestone ? {
      target: nextMilestone,
      remaining: nextMilestone - experience,
      progress: Math.round((experience / nextMilestone) * 100),
    } : null;
  }

  async useEnergy(data: { activityType: string; energyCost: number; userId?: string }): Promise<any> {
    const userId = data.userId || 'user-id'; // JWT'den gelecek
    const profile = await this.prisma.gamificationProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    if (profile.energy < data.energyCost) {
      throw new BadRequestException('Insufficient energy');
    }

    const updatedProfile = await this.prisma.gamificationProfile.update({
      where: { userId },
      data: {
        energy: { decrement: data.energyCost },
      },
    });

    return {
      success: true,
      remainingEnergy: updatedProfile.energy,
      maxEnergy: updatedProfile.maxEnergy,
      energyPercentage: Math.round((updatedProfile.energy / updatedProfile.maxEnergy) * 100),
      nextRefillIn: this.getNextRefillTime(updatedProfile.lastEnergyRefill),
    };
  }

  async getEnergyStatus(userId: string): Promise<any> {
    const profile = await this.prisma.gamificationProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Enerji yenileme kontrolü (her 6 saatte bir tam yenileme)
    const now = new Date();
    const lastRefill = new Date(profile.lastEnergyRefill);
    const hoursSinceRefill = Math.floor((now.getTime() - lastRefill.getTime()) / (1000 * 60 * 60));
    
    let currentEnergy = profile.energy;
    if (hoursSinceRefill >= 6) {
      currentEnergy = profile.maxEnergy;
      await this.prisma.gamificationProfile.update({
        where: { userId },
        data: {
          energy: profile.maxEnergy,
          lastEnergyRefill: now,
        },
      });
    }

    return {
      current: currentEnergy,
      max: profile.maxEnergy,
      percentage: Math.round((currentEnergy / profile.maxEnergy) * 100),
      nextRefillIn: this.getNextRefillTime(lastRefill),
      refillRate: '1 enerji / 10 dakika',
    };
  }

  private getNextRefillTime(lastRefill: Date): string {
    const nextRefill = new Date(lastRefill.getTime() + 6 * 60 * 60 * 1000); // 6 saat sonra
    const now = new Date();
    const diff = nextRefill.getTime() - now.getTime();
    
    if (diff <= 0) return 'Şimdi yenilenebilir';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}s ${minutes}d`;
  }

  private async updateDailyChallenges(userId: string, taskType: string, performance: number) {
    // Günlük görev ilerlemesini güncelle
    // Bu method daily challenge'ların ilerlemesini takip eder
    // Şimdilik basit implementation, gelecekte daha detaylandırılabilir
  }

  async unlockAchievement(data: { userId: string; achievementId: string }): Promise<any> {
    const achievementData = this.getAllPossibleAchievements().find(a => a.id === data.achievementId);
    
    if (!achievementData) {
      throw new NotFoundException('Achievement not found');
    }

    const existing = await this.prisma.achievement.findFirst({
      where: { userId: data.userId, title: achievementData.title },
    });

    if (existing) {
      return { success: false, message: 'Achievement already unlocked' };
    }

    await this.prisma.achievement.create({
      data: {
        userId: data.userId,
        title: achievementData.title,
        description: achievementData.description,
        type: 'MILESTONE',
        icon: achievementData.icon,
        points: achievementData.points,
      },
    });

    return {
      success: true,
      achievement: achievementData,
      message: `Tebrikler! ${achievementData.title} başarısını kazandın!`,
    };
  }
}
