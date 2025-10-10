import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface StudentDashboardData {
  quickStats: {
    totalClasses: number;
    totalAssignments: number;
    completedAssignments: number;
    pendingAssignments: number;
    averageGrade: number;
    totalStudyHours: number;
    thisMonthStudyHours: number;
    streak: number;
  };
  recentGrades: {
    id: string;
    assignmentTitle: string;
    subject: string;
    grade: number;
    maxGrade: number;
    percentage: number;
    feedback: string;
    date: string;
  }[];
  upcomingAssignments: {
    id: string;
    title: string;
    subject: string;
    dueDate: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    estimatedTime: number;
  }[];
  studyPlan: {
    id: string;
    subject: string;
    topic: string;
    duration: number;
    completed: boolean;
    scheduledDate: string;
    priority: 'low' | 'medium' | 'high';
  }[];
  achievements: {
    id: string;
    title: string;
    description: string;
    icon: string;
    earnedDate: string;
    points: number;
    category: 'academic' | 'participation' | 'improvement' | 'streak';
  }[];
  performanceAnalytics: {
    daily: { date: string; studyHours: number; assignmentsCompleted: number }[];
    monthly: { month: string; studyHours: number; assignmentsCompleted: number }[];
    yearly: { year: string; studyHours: number; assignmentsCompleted: number }[];
  };
  classSchedule: {
    id: string;
    title: string;
    subject: string;
    teacher: string;
    startTime: string;
    endTime: string;
    room: string;
    status: 'upcoming' | 'ongoing' | 'completed';
  }[];
  notifications: {
    id: string;
    type: 'assignment_due' | 'grade_posted' | 'class_reminder' | 'achievement_unlocked';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
  }[];
}

@Injectable()
export class StudentDashboardService {
  private readonly logger = new Logger(StudentDashboardService.name);

  constructor(private prisma: PrismaService) {}

  async getDashboardData(studentId: string): Promise<StudentDashboardData> {
    try {
      const [
        quickStats,
        recentGrades,
        upcomingAssignments,
        studyPlan,
        achievements,
        performanceAnalytics,
        classSchedule,
        notifications,
      ] = await Promise.all([
        this.getQuickStats(studentId),
        this.getRecentGrades(studentId),
        this.getUpcomingAssignments(studentId),
        this.getStudyPlan(studentId),
        this.getAchievements(studentId),
        this.getPerformanceAnalytics(studentId),
        this.getClassSchedule(studentId),
        this.getNotifications(studentId),
      ]);

      return {
        quickStats,
        recentGrades,
        upcomingAssignments,
        studyPlan,
        achievements,
        performanceAnalytics,
        classSchedule,
        notifications,
      };
    } catch (error) {
      this.logger.error('Failed to get student dashboard data:', error);
      throw error;
    }
  }

  private async getQuickStats(studentId: string) {
    const [
      totalClasses,
      totalAssignments,
      completedAssignments,
      pendingAssignments,
      averageGrade,
      totalStudyHours,
      thisMonthStudyHours,
      streak,
    ] = await Promise.all([
      this.getTotalClasses(studentId),
      this.getTotalAssignments(studentId),
      this.getCompletedAssignments(studentId),
      this.getPendingAssignments(studentId),
      this.getAverageGrade(studentId),
      this.getTotalStudyHours(studentId),
      this.getThisMonthStudyHours(studentId),
      this.getStreak(studentId),
    ]);

    return {
      totalClasses,
      totalAssignments,
      completedAssignments,
      pendingAssignments,
      averageGrade,
      totalStudyHours,
      thisMonthStudyHours,
      streak,
    };
  }

  private async getTotalClasses(studentId: string): Promise<number> {
    try {
      return await this.prisma.class.count({
        where: {
          students: {
            some: { id: studentId },
          },
        },
      });
    } catch (error) {
      this.logger.warn('Could not get total classes:', error);
      return 0;
    }
  }

  private async getTotalAssignments(studentId: string): Promise<number> {
    try {
      return await this.prisma.assignment.count({
        where: {
          class: {
            students: {
              some: { id: studentId },
            },
          },
        },
      });
    } catch (error) {
      this.logger.warn('Could not get total assignments:', error);
      return 0;
    }
  }

  private async getCompletedAssignments(studentId: string): Promise<number> {
    try {
      return await this.prisma.submission.count({
        where: {
          studentId,
          status: 'SUBMITTED',
        },
      });
    } catch (error) {
      this.logger.warn('Could not get completed assignments:', error);
      return 0;
    }
  }

  private async getPendingAssignments(studentId: string): Promise<number> {
    try {
      const totalAssignments = await this.getTotalAssignments(studentId);
      const completedAssignments = await this.getCompletedAssignments(studentId);
      return totalAssignments - completedAssignments;
    } catch (error) {
      this.logger.warn('Could not get pending assignments:', error);
      return 0;
    }
  }

  private async getAverageGrade(studentId: string): Promise<number> {
    try {
      const result = await this.prisma.grade.aggregate({
        _avg: { score: true },
        where: { studentId },
      });
      return result._avg.score || 0;
    } catch (error) {
      this.logger.warn('Could not get average grade:', error);
      return 0;
    }
  }

  private async getTotalStudyHours(studentId: string): Promise<number> {
    try {
      const result = await this.prisma.studySession.aggregate({
        _sum: { duration: true },
        where: { studentId },
      });
      return result._sum.duration || 0;
    } catch (error) {
      this.logger.warn('Could not get total study hours:', error);
      return 0;
    }
  }

  private async getThisMonthStudyHours(studentId: string): Promise<number> {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const result = await this.prisma.studySession.aggregate({
        _sum: { duration: true },
        where: {
          studentId,
          createdAt: { gte: startOfMonth },
        },
      });
      return result._sum.duration || 0;
    } catch (error) {
      this.logger.warn('Could not get this month study hours:', error);
      return 0;
    }
  }

  private async getStreak(studentId: string): Promise<number> {
    try {
      // Bu değer study session'lardan hesaplanabilir
      // Şimdilik basit bir implementasyon
      return 0;
    } catch (error) {
      this.logger.warn('Could not get streak:', error);
      return 0;
    }
  }

  private async getRecentGrades(studentId: string) {
    try {
      const grades = await this.prisma.grade.findMany({
        where: { studentId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          assignment: {
            include: {
              subject: true,
            },
          },
        },
      });

      return grades.map(grade => ({
        id: grade.id,
        assignmentTitle: grade.assignment.title,
        subject: grade.assignment.subject?.name || 'Unknown',
        grade: grade.score,
        maxGrade: grade.maxScore,
        percentage: (grade.score / grade.maxScore) * 100,
        feedback: grade.feedback || '',
        date: grade.createdAt.toISOString(),
      }));
    } catch (error) {
      this.logger.warn('Could not get recent grades:', error);
      return [];
    }
  }

  private async getUpcomingAssignments(studentId: string) {
    try {
      const now = new Date();
      const assignments = await this.prisma.assignment.findMany({
        where: {
          class: {
            students: {
              some: { id: studentId },
            },
          },
          dueDate: { gte: now },
        },
        take: 10,
        orderBy: { dueDate: 'asc' },
        include: {
          subject: true,
        },
      });

      return assignments.map(assignment => {
        const daysUntilDue = Math.ceil(
          (new Date(assignment.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        let priority: 'low' | 'medium' | 'high' = 'low';
        if (daysUntilDue <= 1) priority = 'high';
        else if (daysUntilDue <= 3) priority = 'medium';

        return {
          id: assignment.id,
          title: assignment.title,
          subject: assignment.subject?.name || 'Unknown',
          dueDate: assignment.dueDate.toISOString(),
          description: assignment.description || '',
          priority,
          estimatedTime: 60, // Bu değer assignment'dan alınabilir
        };
      });
    } catch (error) {
      this.logger.warn('Could not get upcoming assignments:', error);
      return [];
    }
  }

  private async getStudyPlan(studentId: string) {
    try {
      const studyPlans = await this.prisma.studyPlan.findMany({
        where: { studentId },
        take: 10,
        orderBy: { scheduledDate: 'asc' },
        include: {
          subject: true,
        },
      });

      return studyPlans.map(plan => ({
        id: plan.id,
        subject: plan.subject?.name || 'Unknown',
        topic: plan.topic,
        duration: plan.duration,
        completed: plan.completed,
        scheduledDate: plan.scheduledDate.toISOString(),
        priority: plan.priority as any,
      }));
    } catch (error) {
      this.logger.warn('Could not get study plan:', error);
      return [];
    }
  }

  private async getAchievements(studentId: string) {
    try {
      const achievements = await this.prisma.achievement.findMany({
        where: { studentId },
        take: 10,
        orderBy: { earnedDate: 'desc' },
      });

      return achievements.map(achievement => ({
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        earnedDate: achievement.earnedDate.toISOString(),
        points: achievement.points,
        category: achievement.category as any,
      }));
    } catch (error) {
      this.logger.warn('Could not get achievements:', error);
      return [];
    }
  }

  private async getPerformanceAnalytics(studentId: string) {
    try {
      const [daily, monthly, yearly] = await Promise.all([
        this.getDailyPerformance(studentId),
        this.getMonthlyPerformance(studentId),
        this.getYearlyPerformance(studentId),
      ]);

      return { daily, monthly, yearly };
    } catch (error) {
      this.logger.warn('Could not get performance analytics:', error);
      return {
        daily: [],
        monthly: [],
        yearly: [],
      };
    }
  }

  private async getDailyPerformance(studentId: string) {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const [studySessions, submissions] = await Promise.all([
      this.prisma.studySession.findMany({
        where: {
          studentId,
          createdAt: { gte: last30Days },
        },
        select: { duration: true, createdAt: true },
      }),
      this.prisma.submission.findMany({
        where: {
          studentId,
          status: 'SUBMITTED',
          createdAt: { gte: last30Days },
        },
        select: { createdAt: true },
      }),
    ]);

    const dailyPerformance = new Map<string, { studyHours: number; assignmentsCompleted: number }>();
    
    studySessions.forEach(session => {
      const date = session.createdAt.toISOString().split('T')[0];
      const existing = dailyPerformance.get(date) || { studyHours: 0, assignmentsCompleted: 0 };
      dailyPerformance.set(date, {
        ...existing,
        studyHours: existing.studyHours + session.duration,
      });
    });

    submissions.forEach(submission => {
      const date = submission.createdAt.toISOString().split('T')[0];
      const existing = dailyPerformance.get(date) || { studyHours: 0, assignmentsCompleted: 0 };
      dailyPerformance.set(date, {
        ...existing,
        assignmentsCompleted: existing.assignmentsCompleted + 1,
      });
    });

    return Array.from(dailyPerformance.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getMonthlyPerformance(studentId: string) {
    const last12Months = new Date();
    last12Months.setMonth(last12Months.getMonth() - 12);

    const [studySessions, submissions] = await Promise.all([
      this.prisma.studySession.findMany({
        where: {
          studentId,
          createdAt: { gte: last12Months },
        },
        select: { duration: true, createdAt: true },
      }),
      this.prisma.submission.findMany({
        where: {
          studentId,
          status: 'SUBMITTED',
          createdAt: { gte: last12Months },
        },
        select: { createdAt: true },
      }),
    ]);

    const monthlyPerformance = new Map<string, { studyHours: number; assignmentsCompleted: number }>();
    
    studySessions.forEach(session => {
      const month = session.createdAt.toISOString().substring(0, 7);
      const existing = monthlyPerformance.get(month) || { studyHours: 0, assignmentsCompleted: 0 };
      monthlyPerformance.set(month, {
        ...existing,
        studyHours: existing.studyHours + session.duration,
      });
    });

    submissions.forEach(submission => {
      const month = submission.createdAt.toISOString().substring(0, 7);
      const existing = monthlyPerformance.get(month) || { studyHours: 0, assignmentsCompleted: 0 };
      monthlyPerformance.set(month, {
        ...existing,
        assignmentsCompleted: existing.assignmentsCompleted + 1,
      });
    });

    return Array.from(monthlyPerformance.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private async getYearlyPerformance(studentId: string) {
    const last5Years = new Date();
    last5Years.setFullYear(last5Years.getFullYear() - 5);

    const [studySessions, submissions] = await Promise.all([
      this.prisma.studySession.findMany({
        where: {
          studentId,
          createdAt: { gte: last5Years },
        },
        select: { duration: true, createdAt: true },
      }),
      this.prisma.submission.findMany({
        where: {
          studentId,
          status: 'SUBMITTED',
          createdAt: { gte: last5Years },
        },
        select: { createdAt: true },
      }),
    ]);

    const yearlyPerformance = new Map<string, { studyHours: number; assignmentsCompleted: number }>();
    
    studySessions.forEach(session => {
      const year = session.createdAt.getFullYear().toString();
      const existing = yearlyPerformance.get(year) || { studyHours: 0, assignmentsCompleted: 0 };
      yearlyPerformance.set(year, {
        ...existing,
        studyHours: existing.studyHours + session.duration,
      });
    });

    submissions.forEach(submission => {
      const year = submission.createdAt.getFullYear().toString();
      const existing = yearlyPerformance.get(year) || { studyHours: 0, assignmentsCompleted: 0 };
      yearlyPerformance.set(year, {
        ...existing,
        assignmentsCompleted: existing.assignmentsCompleted + 1,
      });
    });

    return Array.from(yearlyPerformance.entries())
      .map(([year, data]) => ({ year, ...data }))
      .sort((a, b) => a.year.localeCompare(b.year));
  }

  private async getClassSchedule(studentId: string) {
    try {
      const now = new Date();
      const classes = await this.prisma.class.findMany({
        where: {
          students: {
            some: { id: studentId },
          },
        },
        take: 10,
        orderBy: { startTime: 'asc' },
        include: {
          teacher: {
            select: { name: true },
          },
          subject: true,
        },
      });

      return classes.map(cls => {
        const now = new Date();
        const startTime = new Date(cls.startTime);
        const endTime = new Date(startTime.getTime() + cls.duration * 60 * 1000);
        
        let status: 'upcoming' | 'ongoing' | 'completed' = 'upcoming';
        if (now > endTime) status = 'completed';
        else if (now >= startTime && now <= endTime) status = 'ongoing';

        return {
          id: cls.id,
          title: cls.title,
          subject: cls.subject?.name || 'Unknown',
          teacher: cls.teacher.name,
          startTime: cls.startTime.toISOString(),
          endTime: endTime.toISOString(),
          room: cls.room || 'Online',
          status,
        };
      });
    } catch (error) {
      this.logger.warn('Could not get class schedule:', error);
      return [];
    }
  }

  private async getNotifications(studentId: string) {
    try {
      const notifications = await this.prisma.notification.findMany({
        where: { userId: studentId },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      return notifications.map(notification => ({
        id: notification.id,
        type: notification.type as any,
        title: notification.title,
        message: notification.message,
        timestamp: notification.createdAt.toISOString(),
        read: notification.read,
      }));
    } catch (error) {
      this.logger.warn('Could not get notifications:', error);
      return [];
    }
  }
}
