import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TeacherDashboardData {
  quickStats: {
    totalStudents: number;
    totalClasses: number;
    totalAssignments: number;
    completedAssignments: number;
    pendingAssignments: number;
    averageGrade: number;
    totalHours: number;
    thisMonthHours: number;
  };
  recentStudents: {
    id: string;
    name: string;
    email: string;
    lastActivity: string;
    grade: number;
    progress: number;
  }[];
  upcomingClasses: {
    id: string;
    title: string;
    date: string;
    time: string;
    duration: number;
    students: number;
    subject: string;
  }[];
  assignments: {
    id: string;
    title: string;
    subject: string;
    dueDate: string;
    totalStudents: number;
    submittedStudents: number;
    averageGrade: number;
    status: 'active' | 'completed' | 'overdue';
  }[];
  performanceAnalytics: {
    daily: { date: string; hours: number; students: number }[];
    monthly: { month: string; hours: number; students: number }[];
    yearly: { year: string; hours: number; students: number }[];
  };
  studentProgress: {
    studentId: string;
    studentName: string;
    subject: string;
    currentGrade: number;
    previousGrade: number;
    improvement: number;
    assignmentsCompleted: number;
    totalAssignments: number;
  }[];
  notifications: {
    id: string;
    type: 'assignment_due' | 'student_submission' | 'class_reminder' | 'grade_alert';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
  }[];
}

@Injectable()
export class TeacherDashboardService {
  private readonly logger = new Logger(TeacherDashboardService.name);

  constructor(private prisma: PrismaService) {}

  async getDashboardData(teacherId: string): Promise<TeacherDashboardData> {
    try {
      const [
        quickStats,
        recentStudents,
        upcomingClasses,
        assignments,
        performanceAnalytics,
        studentProgress,
        notifications,
      ] = await Promise.all([
        this.getQuickStats(teacherId),
        this.getRecentStudents(teacherId),
        this.getUpcomingClasses(teacherId),
        this.getAssignments(teacherId),
        this.getPerformanceAnalytics(teacherId),
        this.getStudentProgress(teacherId),
        this.getNotifications(teacherId),
      ]);

      return {
        quickStats,
        recentStudents,
        upcomingClasses,
        assignments,
        performanceAnalytics,
        studentProgress,
        notifications,
      };
    } catch (error) {
      this.logger.error('Failed to get teacher dashboard data:', error);
      throw error;
    }
  }

  private async getQuickStats(teacherId: string) {
    const [
      totalStudents,
      totalClasses,
      totalAssignments,
      completedAssignments,
      pendingAssignments,
      averageGrade,
      totalHours,
      thisMonthHours,
    ] = await Promise.all([
      this.getTotalStudents(teacherId),
      this.getTotalClasses(teacherId),
      this.getTotalAssignments(teacherId),
      this.getCompletedAssignments(teacherId),
      this.getPendingAssignments(teacherId),
      this.getAverageGrade(teacherId),
      this.getTotalHours(teacherId),
      this.getThisMonthHours(teacherId),
    ]);

    return {
      totalStudents,
      totalClasses,
      totalAssignments,
      completedAssignments,
      pendingAssignments,
      averageGrade,
      totalHours,
      thisMonthHours,
    };
  }

  private async getTotalStudents(teacherId: string): Promise<number> {
    try {
      return await this.prisma.student.count({
        where: {
          classes: {
            some: {
              teacherId,
            },
          },
        },
      });
    } catch (error) {
      this.logger.warn('Could not get total students:', error);
      return 0;
    }
  }

  private async getTotalClasses(teacherId: string): Promise<number> {
    try {
      return await this.prisma.class.count({
        where: { teacherId },
      });
    } catch (error) {
      this.logger.warn('Could not get total classes:', error);
      return 0;
    }
  }

  private async getTotalAssignments(teacherId: string): Promise<number> {
    try {
      return await this.prisma.assignment.count({
        where: { teacherId },
      });
    } catch (error) {
      this.logger.warn('Could not get total assignments:', error);
      return 0;
    }
  }

  private async getCompletedAssignments(teacherId: string): Promise<number> {
    try {
      return await this.prisma.assignment.count({
        where: {
          teacherId,
          status: 'COMPLETED',
        },
      });
    } catch (error) {
      this.logger.warn('Could not get completed assignments:', error);
      return 0;
    }
  }

  private async getPendingAssignments(teacherId: string): Promise<number> {
    try {
      return await this.prisma.assignment.count({
        where: {
          teacherId,
          status: 'ACTIVE',
        },
      });
    } catch (error) {
      this.logger.warn('Could not get pending assignments:', error);
      return 0;
    }
  }

  private async getAverageGrade(teacherId: string): Promise<number> {
    try {
      const result = await this.prisma.grade.aggregate({
        _avg: { score: true },
        where: {
          assignment: { teacherId },
        },
      });
      return result._avg.score || 0;
    } catch (error) {
      this.logger.warn('Could not get average grade:', error);
      return 0;
    }
  }

  private async getTotalHours(teacherId: string): Promise<number> {
    try {
      const result = await this.prisma.class.aggregate({
        _sum: { duration: true },
        where: { teacherId },
      });
      return result._sum.duration || 0;
    } catch (error) {
      this.logger.warn('Could not get total hours:', error);
      return 0;
    }
  }

  private async getThisMonthHours(teacherId: string): Promise<number> {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const result = await this.prisma.class.aggregate({
        _sum: { duration: true },
        where: {
          teacherId,
          createdAt: { gte: startOfMonth },
        },
      });
      return result._sum.duration || 0;
    } catch (error) {
      this.logger.warn('Could not get this month hours:', error);
      return 0;
    }
  }

  private async getRecentStudents(teacherId: string) {
    try {
      const students = await this.prisma.student.findMany({
        where: {
          classes: {
            some: { teacherId },
          },
        },
        take: 5,
        orderBy: { lastActivityAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          lastActivityAt: true,
        },
      });

      return students.map(student => ({
        id: student.id,
        name: student.name,
        email: student.email,
        lastActivity: student.lastActivityAt?.toISOString() || '',
        grade: 0, // Bu değer ayrı bir query ile alınabilir
        progress: 0, // Bu değer ayrı bir query ile alınabilir
      }));
    } catch (error) {
      this.logger.warn('Could not get recent students:', error);
      return [];
    }
  }

  private async getUpcomingClasses(teacherId: string) {
    try {
      const upcomingClasses = await this.prisma.class.findMany({
        where: {
          teacherId,
          startTime: { gte: new Date() },
        },
        take: 5,
        orderBy: { startTime: 'asc' },
        include: {
          subject: true,
          _count: {
            select: { students: true },
          },
        },
      });

      return upcomingClasses.map(cls => ({
        id: cls.id,
        title: cls.title,
        date: cls.startTime.toISOString().split('T')[0],
        time: cls.startTime.toISOString().split('T')[1].split('.')[0],
        duration: cls.duration,
        students: cls._count.students,
        subject: cls.subject?.name || 'Unknown',
      }));
    } catch (error) {
      this.logger.warn('Could not get upcoming classes:', error);
      return [];
    }
  }

  private async getAssignments(teacherId: string) {
    try {
      const assignments = await this.prisma.assignment.findMany({
        where: { teacherId },
        take: 10,
        orderBy: { dueDate: 'asc' },
        include: {
          subject: true,
          _count: {
            select: { submissions: true },
          },
        },
      });

      return assignments.map(assignment => {
        const now = new Date();
        const dueDate = new Date(assignment.dueDate);
        const isOverdue = now > dueDate && assignment.status !== 'COMPLETED';
        
        return {
          id: assignment.id,
          title: assignment.title,
          subject: assignment.subject?.name || 'Unknown',
          dueDate: assignment.dueDate.toISOString(),
          totalStudents: assignment._count.submissions,
          submittedStudents: assignment._count.submissions, // Bu değer daha detaylı hesaplanabilir
          averageGrade: 0, // Bu değer ayrı bir query ile alınabilir
          status: isOverdue ? 'overdue' : assignment.status.toLowerCase() as any,
        };
      });
    } catch (error) {
      this.logger.warn('Could not get assignments:', error);
      return [];
    }
  }

  private async getPerformanceAnalytics(teacherId: string) {
    try {
      const [daily, monthly, yearly] = await Promise.all([
        this.getDailyPerformance(teacherId),
        this.getMonthlyPerformance(teacherId),
        this.getYearlyPerformance(teacherId),
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

  private async getDailyPerformance(teacherId: string) {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const classes = await this.prisma.class.findMany({
      where: {
        teacherId,
        createdAt: { gte: last30Days },
      },
      select: {
        duration: true,
        createdAt: true,
        _count: { select: { students: true } },
      },
    });

    const dailyPerformance = new Map<string, { hours: number; students: number }>();
    
    classes.forEach(cls => {
      const date = cls.createdAt.toISOString().split('T')[0];
      const existing = dailyPerformance.get(date) || { hours: 0, students: 0 };
      dailyPerformance.set(date, {
        hours: existing.hours + cls.duration,
        students: existing.students + cls._count.students,
      });
    });

    return Array.from(dailyPerformance.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getMonthlyPerformance(teacherId: string) {
    const last12Months = new Date();
    last12Months.setMonth(last12Months.getMonth() - 12);

    const classes = await this.prisma.class.findMany({
      where: {
        teacherId,
        createdAt: { gte: last12Months },
      },
      select: {
        duration: true,
        createdAt: true,
        _count: { select: { students: true } },
      },
    });

    const monthlyPerformance = new Map<string, { hours: number; students: number }>();
    
    classes.forEach(cls => {
      const month = cls.createdAt.toISOString().substring(0, 7);
      const existing = monthlyPerformance.get(month) || { hours: 0, students: 0 };
      monthlyPerformance.set(month, {
        hours: existing.hours + cls.duration,
        students: existing.students + cls._count.students,
      });
    });

    return Array.from(monthlyPerformance.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private async getYearlyPerformance(teacherId: string) {
    const last5Years = new Date();
    last5Years.setFullYear(last5Years.getFullYear() - 5);

    const classes = await this.prisma.class.findMany({
      where: {
        teacherId,
        createdAt: { gte: last5Years },
      },
      select: {
        duration: true,
        createdAt: true,
        _count: { select: { students: true } },
      },
    });

    const yearlyPerformance = new Map<string, { hours: number; students: number }>();
    
    classes.forEach(cls => {
      const year = cls.createdAt.getFullYear().toString();
      const existing = yearlyPerformance.get(year) || { hours: 0, students: 0 };
      yearlyPerformance.set(year, {
        hours: existing.hours + cls.duration,
        students: existing.students + cls._count.students,
      });
    });

    return Array.from(yearlyPerformance.entries())
      .map(([year, data]) => ({ year, ...data }))
      .sort((a, b) => a.year.localeCompare(b.year));
  }

  private async getStudentProgress(teacherId: string) {
    try {
      const students = await this.prisma.student.findMany({
        where: {
          classes: {
            some: { teacherId },
          },
        },
        take: 10,
        include: {
          grades: {
            where: {
              assignment: { teacherId },
            },
            orderBy: { createdAt: 'desc' },
            take: 2,
          },
          submissions: {
            where: {
              assignment: { teacherId },
            },
            select: {
              assignmentId: true,
              status: true,
            },
          },
        },
      });

      return students.map(student => {
        const grades = student.grades;
        const currentGrade = grades[0]?.score || 0;
        const previousGrade = grades[1]?.score || 0;
        const improvement = currentGrade - previousGrade;
        
        const totalAssignments = student.submissions.length;
        const completedAssignments = student.submissions.filter(s => s.status === 'SUBMITTED').length;

        return {
          studentId: student.id,
          studentName: student.name,
          subject: 'General', // Bu değer daha detaylı hesaplanabilir
          currentGrade,
          previousGrade,
          improvement,
          assignmentsCompleted: completedAssignments,
          totalAssignments,
        };
      });
    } catch (error) {
      this.logger.warn('Could not get student progress:', error);
      return [];
    }
  }

  private async getNotifications(teacherId: string) {
    try {
      const notifications = await this.prisma.notification.findMany({
        where: { userId: teacherId },
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
