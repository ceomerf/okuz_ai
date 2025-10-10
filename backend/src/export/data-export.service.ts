import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-writer';
import * as ExcelJS from 'exceljs';

export interface ExportOptions {
  format: 'csv' | 'excel' | 'json';
  startDate?: string;
  endDate?: string;
  includeDeleted?: boolean;
  fields?: string[];
  filters?: Record<string, any>;
}

export interface ExportJob {
  id: string;
  type: 'users' | 'activities' | 'payments' | 'classes' | 'assignments' | 'grades' | 'analytics';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
  userId: string;
  options: ExportOptions;
}

export interface ExportResult {
  jobId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  recordCount: number;
  downloadUrl: string;
}

@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name);
  private readonly exportDir = path.join(process.cwd(), 'exports');
  private readonly maxFileSize = 100 * 1024 * 1024; // 100MB

  constructor(private prisma: PrismaService) {
    // Export dizinini oluştur
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  async createExportJob(
    userId: string,
    type: ExportJob['type'],
    options: ExportOptions
  ): Promise<ExportJob> {
    try {
      const jobId = this.generateJobId();
      const job: ExportJob = {
        id: jobId,
        type,
        status: 'pending',
        progress: 0,
        createdAt: new Date().toISOString(),
        userId,
        options,
      };

      // Veritabanına kaydet
      await this.prisma.exportJob.create({
        data: {
          id: jobId,
          type,
          status: 'pending',
          progress: 0,
          userId,
          options: options as any,
          createdAt: new Date(),
        },
      });

      // Arka planda işle
      this.processExportJob(job);

      return job;
    } catch (error) {
      this.logger.error('Failed to create export job:', error);
      throw error;
    }
  }

  private generateJobId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async processExportJob(job: ExportJob): Promise<void> {
    try {
      // Job durumunu processing olarak güncelle
      await this.updateJobStatus(job.id, 'processing', 0);

      let data: any[];
      let fileName: string;

      switch (job.type) {
        case 'users':
          data = await this.exportUsers(job.options);
          fileName = `users_${job.id}.${job.options.format}`;
          break;
        case 'activities':
          data = await this.exportActivities(job.options);
          fileName = `activities_${job.id}.${job.options.format}`;
          break;
        case 'payments':
          data = await this.exportPayments(job.options);
          fileName = `payments_${job.id}.${job.options.format}`;
          break;
        case 'classes':
          data = await this.exportClasses(job.options);
          fileName = `classes_${job.id}.${job.options.format}`;
          break;
        case 'assignments':
          data = await this.exportAssignments(job.options);
          fileName = `assignments_${job.id}.${job.options.format}`;
          break;
        case 'grades':
          data = await this.exportGrades(job.options);
          fileName = `grades_${job.id}.${job.options.format}`;
          break;
        case 'analytics':
          data = await this.exportAnalytics(job.options);
          fileName = `analytics_${job.id}.${job.options.format}`;
          break;
        default:
          throw new Error(`Unknown export type: ${job.type}`);
      }

      // Dosyayı oluştur
      const filePath = await this.createExportFile(data, fileName, job.options.format);
      const fileSize = fs.statSync(filePath).size;

      // Job'ı tamamla
      await this.updateJobStatus(job.id, 'completed', 100, fileName, filePath, fileSize);

      this.logger.log(`Export job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(`Export job ${job.id} failed:`, error);
      await this.updateJobStatus(job.id, 'failed', 0, undefined, undefined, undefined, error.message);
    }
  }

  private async updateJobStatus(
    jobId: string,
    status: ExportJob['status'],
    progress: number,
    fileName?: string,
    filePath?: string,
    fileSize?: number,
    error?: string
  ): Promise<void> {
    try {
      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status,
          progress,
          fileName,
          filePath,
          fileSize,
          error,
          completedAt: status === 'completed' || status === 'failed' ? new Date() : undefined,
        },
      });
    } catch (error) {
      this.logger.error('Failed to update job status:', error);
    }
  }

  private async createExportFile(data: any[], fileName: string, format: string): Promise<string> {
    const filePath = path.join(this.exportDir, fileName);

    switch (format) {
      case 'csv':
        return await this.createCSVFile(data, filePath);
      case 'excel':
        return await this.createExcelFile(data, filePath);
      case 'json':
        return await this.createJSONFile(data, filePath);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private async createCSVFile(data: any[], filePath: string): Promise<string> {
    if (data.length === 0) {
      fs.writeFileSync(filePath, '');
      return filePath;
    }

    const headers = Object.keys(data[0]);
    const csvWriter = csv.createObjectCsvWriter({
      path: filePath,
      header: headers.map(header => ({ id: header, title: header })),
    });

    await csvWriter.writeRecords(data);
    return filePath;
  }

  private async createExcelFile(data: any[], filePath: string): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    if (data.length === 0) {
      await workbook.xlsx.writeFile(filePath);
      return filePath;
    }

    // Headers
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);

    // Data
    data.forEach(row => {
      const values = headers.map(header => row[header]);
      worksheet.addRow(values);
    });

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  private async createJSONFile(data: any[], filePath: string): Promise<string> {
    const jsonData = {
      exportDate: new Date().toISOString(),
      recordCount: data.length,
      data,
    };

    fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
    return filePath;
  }

  private async exportUsers(options: ExportOptions): Promise<any[]> {
    try {
      const where: any = {};
      
      if (options.startDate || options.endDate) {
        where.createdAt = {};
        if (options.startDate) where.createdAt.gte = new Date(options.startDate);
        if (options.endDate) where.createdAt.lte = new Date(options.endDate);
      }

      if (!options.includeDeleted) {
        where.deletedAt = null;
      }

      const users = await this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          lastLoginAt: true,
          isActive: true,
        },
      });

      return users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() || '',
        isActive: user.isActive,
      }));
    } catch (error) {
      this.logger.error('Failed to export users:', error);
      throw error;
    }
  }

  private async exportActivities(options: ExportOptions): Promise<any[]> {
    try {
      const where: any = {};
      
      if (options.startDate || options.endDate) {
        where.timestamp = {};
        if (options.startDate) where.timestamp.gte = new Date(options.startDate);
        if (options.endDate) where.timestamp.lte = new Date(options.endDate);
      }

      const activities = await this.prisma.userActivity.findMany({
        where,
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      });

      return activities.map(activity => ({
        id: activity.id,
        userId: activity.userId,
        userName: activity.user?.name || '',
        userEmail: activity.user?.email || '',
        action: activity.action,
        resource: activity.resource,
        resourceId: activity.resourceId,
        timestamp: activity.timestamp.toISOString(),
        ipAddress: activity.ipAddress,
        userAgent: activity.userAgent,
        sessionId: activity.sessionId,
      }));
    } catch (error) {
      this.logger.error('Failed to export activities:', error);
      throw error;
    }
  }

  private async exportPayments(options: ExportOptions): Promise<any[]> {
    try {
      const where: any = {};
      
      if (options.startDate || options.endDate) {
        where.createdAt = {};
        if (options.startDate) where.createdAt.gte = new Date(options.startDate);
        if (options.endDate) where.createdAt.lte = new Date(options.endDate);
      }

      const payments = await this.prisma.payment.findMany({
        where,
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      });

      return payments.map(payment => ({
        id: payment.id,
        userId: payment.userId,
        userName: payment.user?.name || '',
        userEmail: payment.user?.email || '',
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        createdAt: payment.createdAt.toISOString(),
        updatedAt: payment.updatedAt.toISOString(),
      }));
    } catch (error) {
      this.logger.error('Failed to export payments:', error);
      throw error;
    }
  }

  private async exportClasses(options: ExportOptions): Promise<any[]> {
    try {
      const where: any = {};
      
      if (options.startDate || options.endDate) {
        where.createdAt = {};
        if (options.startDate) where.createdAt.gte = new Date(options.startDate);
        if (options.endDate) where.createdAt.lte = new Date(options.endDate);
      }

      const classes = await this.prisma.class.findMany({
        where,
        include: {
          teacher: {
            select: { name: true, email: true },
          },
          subject: {
            select: { name: true },
          },
        },
      });

      return classes.map(cls => ({
        id: cls.id,
        title: cls.title,
        description: cls.description,
        teacherId: cls.teacherId,
        teacherName: cls.teacher?.name || '',
        teacherEmail: cls.teacher?.email || '',
        subjectId: cls.subjectId,
        subjectName: cls.subject?.name || '',
        startTime: cls.startTime.toISOString(),
        duration: cls.duration,
        status: cls.status,
        room: cls.room,
        createdAt: cls.createdAt.toISOString(),
      }));
    } catch (error) {
      this.logger.error('Failed to export classes:', error);
      throw error;
    }
  }

  private async exportAssignments(options: ExportOptions): Promise<any[]> {
    try {
      const where: any = {};
      
      if (options.startDate || options.endDate) {
        where.createdAt = {};
        if (options.startDate) where.createdAt.gte = new Date(options.startDate);
        if (options.endDate) where.createdAt.lte = new Date(options.endDate);
      }

      const assignments = await this.prisma.assignment.findMany({
        where,
        include: {
          teacher: {
            select: { name: true, email: true },
          },
          subject: {
            select: { name: true },
          },
        },
      });

      return assignments.map(assignment => ({
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        teacherId: assignment.teacherId,
        teacherName: assignment.teacher?.name || '',
        teacherEmail: assignment.teacher?.email || '',
        subjectId: assignment.subjectId,
        subjectName: assignment.subject?.name || '',
        dueDate: assignment.dueDate.toISOString(),
        status: assignment.status,
        points: assignment.points,
        createdAt: assignment.createdAt.toISOString(),
      }));
    } catch (error) {
      this.logger.error('Failed to export assignments:', error);
      throw error;
    }
  }

  private async exportGrades(options: ExportOptions): Promise<any[]> {
    try {
      const where: any = {};
      
      if (options.startDate || options.endDate) {
        where.createdAt = {};
        if (options.startDate) where.createdAt.gte = new Date(options.startDate);
        if (options.endDate) where.createdAt.lte = new Date(options.endDate);
      }

      const grades = await this.prisma.grade.findMany({
        where,
        include: {
          student: {
            select: { name: true, email: true },
          },
          assignment: {
            select: { title: true },
          },
        },
      });

      return grades.map(grade => ({
        id: grade.id,
        studentId: grade.studentId,
        studentName: grade.student?.name || '',
        studentEmail: grade.student?.email || '',
        assignmentId: grade.assignmentId,
        assignmentTitle: grade.assignment?.title || '',
        score: grade.score,
        maxScore: grade.maxScore,
        percentage: (grade.score / grade.maxScore) * 100,
        feedback: grade.feedback,
        createdAt: grade.createdAt.toISOString(),
      }));
    } catch (error) {
      this.logger.error('Failed to export grades:', error);
      throw error;
    }
  }

  private async exportAnalytics(options: ExportOptions): Promise<any[]> {
    try {
      // Analytics verilerini topla
      const analytics = await this.getAnalyticsData(options);
      return analytics;
    } catch (error) {
      this.logger.error('Failed to export analytics:', error);
      throw error;
    }
  }

  private async getAnalyticsData(options: ExportOptions): Promise<any[]> {
    try {
      const [
        userStats,
        activityStats,
        paymentStats,
        classStats,
        gradeStats,
      ] = await Promise.all([
        this.getUserStats(options),
        this.getActivityStats(options),
        this.getPaymentStats(options),
        this.getClassStats(options),
        this.getGradeStats(options),
      ]);

      return [
        { category: 'Users', ...userStats },
        { category: 'Activities', ...activityStats },
        { category: 'Payments', ...paymentStats },
        { category: 'Classes', ...classStats },
        { category: 'Grades', ...gradeStats },
      ];
    } catch (error) {
      this.logger.error('Failed to get analytics data:', error);
      return [];
    }
  }

  private async getUserStats(options: ExportOptions) {
    try {
      const where: any = {};
      if (options.startDate || options.endDate) {
        where.createdAt = {};
        if (options.startDate) where.createdAt.gte = new Date(options.startDate);
        if (options.endDate) where.createdAt.lte = new Date(options.endDate);
      }

      const [total, active, newUsers] = await Promise.all([
        this.prisma.user.count({ where }),
        this.prisma.user.count({ 
          where: { 
            ...where, 
            lastLoginAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
          } 
        }),
        this.prisma.user.count({ 
          where: { 
            ...where, 
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } 
          } 
        }),
      ]);

      return { total, active, newUsers };
    } catch (error) {
      this.logger.warn('Could not get user stats:', error);
      return { total: 0, active: 0, newUsers: 0 };
    }
  }

  private async getActivityStats(options: ExportOptions) {
    try {
      const where: any = {};
      if (options.startDate || options.endDate) {
        where.timestamp = {};
        if (options.startDate) where.timestamp.gte = new Date(options.startDate);
        if (options.endDate) where.timestamp.lte = new Date(options.endDate);
      }

      const total = await this.prisma.userActivity.count({ where });
      return { total };
    } catch (error) {
      this.logger.warn('Could not get activity stats:', error);
      return { total: 0 };
    }
  }

  private async getPaymentStats(options: ExportOptions) {
    try {
      const where: any = {};
      if (options.startDate || options.endDate) {
        where.createdAt = {};
        if (options.startDate) where.createdAt.gte = new Date(options.startDate);
        if (options.endDate) where.createdAt.lte = new Date(options.endDate);
      }

      const [total, amount] = await Promise.all([
        this.prisma.payment.count({ where }),
        this.prisma.payment.aggregate({
          _sum: { amount: true },
          where: { ...where, status: 'COMPLETED' },
        }),
      ]);

      return { total, totalAmount: amount._sum.amount || 0 };
    } catch (error) {
      this.logger.warn('Could not get payment stats:', error);
      return { total: 0, totalAmount: 0 };
    }
  }

  private async getClassStats(options: ExportOptions) {
    try {
      const where: any = {};
      if (options.startDate || options.endDate) {
        where.createdAt = {};
        if (options.startDate) where.createdAt.gte = new Date(options.startDate);
        if (options.endDate) where.createdAt.lte = new Date(options.endDate);
      }

      const total = await this.prisma.class.count({ where });
      return { total };
    } catch (error) {
      this.logger.warn('Could not get class stats:', error);
      return { total: 0 };
    }
  }

  private async getGradeStats(options: ExportOptions) {
    try {
      const where: any = {};
      if (options.startDate || options.endDate) {
        where.createdAt = {};
        if (options.startDate) where.createdAt.gte = new Date(options.startDate);
        if (options.endDate) where.createdAt.lte = new Date(options.endDate);
      }

      const [total, average] = await Promise.all([
        this.prisma.grade.count({ where }),
        this.prisma.grade.aggregate({
          _avg: { score: true },
          where,
        }),
      ]);

      return { total, averageScore: average._avg.score || 0 };
    } catch (error) {
      this.logger.warn('Could not get grade stats:', error);
      return { total: 0, averageScore: 0 };
    }
  }

  async getExportJob(jobId: string): Promise<ExportJob | null> {
    try {
      const job = await this.prisma.exportJob.findUnique({
        where: { id: jobId },
      });

      if (!job) return null;

      return {
        id: job.id,
        type: job.type as any,
        status: job.status as any,
        progress: job.progress,
        fileName: job.fileName,
        filePath: job.filePath,
        fileSize: job.fileSize,
        createdAt: job.createdAt.toISOString(),
        completedAt: job.completedAt?.toISOString(),
        error: job.error,
        userId: job.userId,
        options: job.options as any,
      };
    } catch (error) {
      this.logger.error('Failed to get export job:', error);
      return null;
    }
  }

  async getUserExportJobs(userId: string): Promise<ExportJob[]> {
    try {
      const jobs = await this.prisma.exportJob.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return jobs.map(job => ({
        id: job.id,
        type: job.type as any,
        status: job.status as any,
        progress: job.progress,
        fileName: job.fileName,
        filePath: job.filePath,
        fileSize: job.fileSize,
        createdAt: job.createdAt.toISOString(),
        completedAt: job.completedAt?.toISOString(),
        error: job.error,
        userId: job.userId,
        options: job.options as any,
      }));
    } catch (error) {
      this.logger.error('Failed to get user export jobs:', error);
      return [];
    }
  }

  async deleteExportJob(jobId: string, userId: string): Promise<void> {
    try {
      const job = await this.prisma.exportJob.findUnique({
        where: { id: jobId },
      });

      if (!job || job.userId !== userId) {
        throw new Error('Job not found or access denied');
      }

      // Dosyayı sil
      if (job.filePath && fs.existsSync(job.filePath)) {
        fs.unlinkSync(job.filePath);
      }

      // Veritabanından sil
      await this.prisma.exportJob.delete({
        where: { id: jobId },
      });
    } catch (error) {
      this.logger.error('Failed to delete export job:', error);
      throw error;
    }
  }

  async getExportFile(jobId: string, userId: string): Promise<Buffer | null> {
    try {
      const job = await this.prisma.exportJob.findUnique({
        where: { id: jobId },
      });

      if (!job || job.userId !== userId || job.status !== 'completed' || !job.filePath) {
        return null;
      }

      if (!fs.existsSync(job.filePath)) {
        return null;
      }

      return fs.readFileSync(job.filePath);
    } catch (error) {
      this.logger.error('Failed to get export file:', error);
      return null;
    }
  }
}
