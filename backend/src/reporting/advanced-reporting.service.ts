import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import * as pdf from 'html-pdf';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'user' | 'financial' | 'academic' | 'system' | 'custom';
  category: string;
  isActive: boolean;
  parameters: ReportParameter[];
  createdAt: string;
  updatedAt: string;
}

export interface ReportParameter {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'select';
  required: boolean;
  defaultValue?: any;
  options?: string[];
  description: string;
}

export interface Report {
  id: string;
  templateId: string;
  name: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  parameters: Record<string, any>;
  generatedBy: string;
  createdAt: string;
  completedAt?: string;
  filePath?: string;
  fileSize?: number;
  recordCount?: number;
  error?: string;
}

export interface ReportDashboard {
  templates: ReportTemplate[];
  recentReports: Report[];
  reportStats: {
    totalReports: number;
    completedReports: number;
    failedReports: number;
    totalFileSize: number;
  };
  popularTemplates: { templateId: string; name: string; usageCount: number }[];
  reportCategories: { category: string; count: number }[];
}

@Injectable()
export class AdvancedReportingService {
  private readonly logger = new Logger(AdvancedReportingService.name);
  private readonly reportsDir = path.join(process.cwd(), 'reports');

  constructor(private prisma: PrismaService) {
    // Reports dizinini oluştur
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  async getReportDashboard(): Promise<ReportDashboard> {
    try {
      const [templates, recentReports, reportStats, popularTemplates, reportCategories] = await Promise.all([
        this.getReportTemplates(),
        this.getRecentReports(),
        this.getReportStats(),
        this.getPopularTemplates(),
        this.getReportCategories(),
      ]);

      return {
        templates,
        recentReports,
        reportStats,
        popularTemplates,
        reportCategories,
      };
    } catch (error) {
      this.logger.error('Failed to get report dashboard:', error);
      throw error;
    }
  }

  private async getReportTemplates(): Promise<ReportTemplate[]> {
    try {
      const templates = await this.prisma.reportTemplate.findMany({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
      });

      return templates.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        type: template.type as any,
        category: template.category,
        isActive: template.isActive,
        parameters: template.parameters || [],
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      }));
    } catch (error) {
      this.logger.warn('Could not get report templates:', error);
      return [];
    }
  }

  private async getRecentReports(): Promise<Report[]> {
    try {
      const reports = await this.prisma.report.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      return reports.map(report => ({
        id: report.id,
        templateId: report.templateId,
        name: report.name,
        status: report.status as any,
        parameters: report.parameters || {},
        generatedBy: report.generatedBy,
        createdAt: report.createdAt.toISOString(),
        completedAt: report.completedAt?.toISOString(),
        filePath: report.filePath,
        fileSize: report.fileSize,
        recordCount: report.recordCount,
        error: report.error,
      }));
    } catch (error) {
      this.logger.warn('Could not get recent reports:', error);
      return [];
    }
  }

  private async getReportStats() {
    try {
      const [totalReports, completedReports, failedReports, totalFileSize] = await Promise.all([
        this.prisma.report.count(),
        this.prisma.report.count({ where: { status: 'completed' } }),
        this.prisma.report.count({ where: { status: 'failed' } }),
        this.prisma.report.aggregate({
          _sum: { fileSize: true },
          where: { status: 'completed' },
        }),
      ]);

      return {
        totalReports,
        completedReports,
        failedReports,
        totalFileSize: totalFileSize._sum.fileSize || 0,
      };
    } catch (error) {
      this.logger.warn('Could not get report stats:', error);
      return {
        totalReports: 0,
        completedReports: 0,
        failedReports: 0,
        totalFileSize: 0,
      };
    }
  }

  private async getPopularTemplates() {
    try {
      const templates = await this.prisma.reportTemplate.findMany({
        include: {
          _count: {
            select: { reports: true },
          },
        },
        orderBy: {
          reports: {
            _count: 'desc',
          },
        },
        take: 5,
      });

      return templates.map(template => ({
        templateId: template.id,
        name: template.name,
        usageCount: template._count.reports,
      }));
    } catch (error) {
      this.logger.warn('Could not get popular templates:', error);
      return [];
    }
  }

  private async getReportCategories() {
    try {
      const categories = await this.prisma.reportTemplate.groupBy({
        by: ['category'],
        _count: { id: true },
      });

      return categories.map(category => ({
        category: category.category,
        count: category._count.id,
      }));
    } catch (error) {
      this.logger.warn('Could not get report categories:', error);
      return [];
    }
  }

  async createReportTemplate(templateData: {
    name: string;
    description: string;
    type: 'user' | 'financial' | 'academic' | 'system' | 'custom';
    category: string;
    parameters: ReportParameter[];
  }): Promise<ReportTemplate> {
    try {
      const template = await this.prisma.reportTemplate.create({
        data: {
          name: templateData.name,
          description: templateData.description,
          type: templateData.type,
          category: templateData.category,
          isActive: true,
          parameters: templateData.parameters,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return {
        id: template.id,
        name: template.name,
        description: template.description,
        type: template.type as any,
        category: template.category,
        isActive: template.isActive,
        parameters: template.parameters || [],
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to create report template:', error);
      throw error;
    }
  }

  async generateReport(
    templateId: string,
    parameters: Record<string, any>,
    generatedBy: string,
    format: 'excel' | 'pdf' | 'csv' = 'excel'
  ): Promise<Report> {
    try {
      const report = await this.prisma.report.create({
        data: {
          templateId,
          name: `Report_${Date.now()}`,
          status: 'pending',
          parameters,
          generatedBy,
          createdAt: new Date(),
        },
      });

      // Arka planda raporu oluştur
      this.generateReportFile(report.id, templateId, parameters, format);

      return {
        id: report.id,
        templateId: report.templateId,
        name: report.name,
        status: report.status as any,
        parameters: report.parameters || {},
        generatedBy: report.generatedBy,
        createdAt: report.createdAt.toISOString(),
        completedAt: report.completedAt?.toISOString(),
        filePath: report.filePath,
        fileSize: report.fileSize,
        recordCount: report.recordCount,
        error: report.error,
      };
    } catch (error) {
      this.logger.error('Failed to generate report:', error);
      throw error;
    }
  }

  private async generateReportFile(
    reportId: string,
    templateId: string,
    parameters: Record<string, any>,
    format: 'excel' | 'pdf' | 'csv'
  ): Promise<void> {
    try {
      // Report'u generating olarak işaretle
      await this.prisma.report.update({
        where: { id: reportId },
        data: { status: 'generating' },
      });

      const template = await this.prisma.reportTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        throw new Error('Template not found');
      }

      // Veriyi topla
      const data = await this.collectReportData(template.type, parameters);
      
      // Dosyayı oluştur
      const fileName = `${template.name}_${reportId}.${format}`;
      const filePath = path.join(this.reportsDir, fileName);
      
      let fileSize = 0;
      let recordCount = data.length;

      switch (format) {
        case 'excel':
          await this.createExcelReport(data, filePath, template.name);
          break;
        case 'pdf':
          await this.createPDFReport(data, filePath, template.name);
          break;
        case 'csv':
          await this.createCSVReport(data, filePath);
          break;
      }

      fileSize = fs.statSync(filePath).size;

      // Report'u tamamla
      await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          filePath,
          fileSize,
          recordCount,
        },
      });

      this.logger.log(`Report ${reportId} generated successfully`);
    } catch (error) {
      this.logger.error(`Failed to generate report ${reportId}:`, error);
      
      await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          error: error.message,
        },
      });
    }
  }

  private async collectReportData(type: string, parameters: Record<string, any>): Promise<any[]> {
    try {
      switch (type) {
        case 'user':
          return await this.getUserReportData(parameters);
        case 'financial':
          return await this.getFinancialReportData(parameters);
        case 'academic':
          return await this.getAcademicReportData(parameters);
        case 'system':
          return await this.getSystemReportData(parameters);
        default:
          return [];
      }
    } catch (error) {
      this.logger.error('Failed to collect report data:', error);
      return [];
    }
  }

  private async getUserReportData(parameters: Record<string, any>) {
    try {
      const where: any = {};
      
      if (parameters.role) {
        where.role = parameters.role;
      }
      
      if (parameters.startDate || parameters.endDate) {
        where.createdAt = {};
        if (parameters.startDate) where.createdAt.gte = new Date(parameters.startDate);
        if (parameters.endDate) where.createdAt.lte = new Date(parameters.endDate);
      }

      const users = await this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });

      return users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() || '',
      }));
    } catch (error) {
      this.logger.warn('Could not get user report data:', error);
      return [];
    }
  }

  private async getFinancialReportData(parameters: Record<string, any>) {
    try {
      const where: any = { status: 'COMPLETED' };
      
      if (parameters.startDate || parameters.endDate) {
        where.createdAt = {};
        if (parameters.startDate) where.createdAt.gte = new Date(parameters.startDate);
        if (parameters.endDate) where.createdAt.lte = new Date(parameters.endDate);
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
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        status: payment.status,
        userName: payment.user?.name || '',
        userEmail: payment.user?.email || '',
        createdAt: payment.createdAt.toISOString(),
      }));
    } catch (error) {
      this.logger.warn('Could not get financial report data:', error);
      return [];
    }
  }

  private async getAcademicReportData(parameters: Record<string, any>) {
    try {
      const where: any = {};
      
      if (parameters.startDate || parameters.endDate) {
        where.createdAt = {};
        if (parameters.startDate) where.createdAt.gte = new Date(parameters.startDate);
        if (parameters.endDate) where.createdAt.lte = new Date(parameters.endDate);
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
        score: grade.score,
        maxScore: grade.maxScore,
        percentage: (grade.score / grade.maxScore) * 100,
        studentName: grade.student?.name || '',
        studentEmail: grade.student?.email || '',
        assignmentTitle: grade.assignment?.title || '',
        createdAt: grade.createdAt.toISOString(),
      }));
    } catch (error) {
      this.logger.warn('Could not get academic report data:', error);
      return [];
    }
  }

  private async getSystemReportData(parameters: Record<string, any>) {
    try {
      const where: any = {};
      
      if (parameters.startDate || parameters.endDate) {
        where.timestamp = {};
        if (parameters.startDate) where.timestamp.gte = new Date(parameters.startDate);
        if (parameters.endDate) where.timestamp.lte = new Date(parameters.endDate);
      }

      const events = await this.prisma.securityEvent.findMany({
        where,
        take: 1000,
        orderBy: { timestamp: 'desc' },
      });

      return events.map(event => ({
        id: event.id,
        type: event.type,
        severity: event.severity,
        description: event.description,
        ipAddress: event.ipAddress,
        timestamp: event.timestamp.toISOString(),
        resolved: event.resolved,
      }));
    } catch (error) {
      this.logger.warn('Could not get system report data:', error);
      return [];
    }
  }

  private async createExcelReport(data: any[], filePath: string, title: string): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title);

    if (data.length === 0) {
      await workbook.xlsx.writeFile(filePath);
      return;
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
  }

  private async createPDFReport(data: any[], filePath: string, title: string): Promise<void> {
    const html = this.generateHTMLReport(data, title);
    
    const options = {
      format: 'A4',
      border: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      },
    };

    return new Promise((resolve, reject) => {
      pdf.create(html, options).toFile(filePath, (err, res) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private generateHTMLReport(data: any[], title: string): string {
    if (data.length === 0) {
      return `
        <html>
          <head><title>${title}</title></head>
          <body>
            <h1>${title}</h1>
            <p>No data available</p>
          </body>
        </html>
      `;
    }

    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
      `<tr>${headers.map(header => `<td>${row[header]}</td>`).join('')}</tr>`
    ).join('');

    return `
      <html>
        <head>
          <title>${title}</title>
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p>Generated on: ${new Date().toISOString()}</p>
          <table>
            <thead>
              <tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `;
  }

  private async createCSVReport(data: any[], filePath: string): Promise<void> {
    if (data.length === 0) {
      fs.writeFileSync(filePath, '');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    fs.writeFileSync(filePath, csvContent);
  }

  async getReport(reportId: string): Promise<Report | null> {
    try {
      const report = await this.prisma.report.findUnique({
        where: { id: reportId },
      });

      if (!report) return null;

      return {
        id: report.id,
        templateId: report.templateId,
        name: report.name,
        status: report.status as any,
        parameters: report.parameters || {},
        generatedBy: report.generatedBy,
        createdAt: report.createdAt.toISOString(),
        completedAt: report.completedAt?.toISOString(),
        filePath: report.filePath,
        fileSize: report.fileSize,
        recordCount: report.recordCount,
        error: report.error,
      };
    } catch (error) {
      this.logger.error('Failed to get report:', error);
      return null;
    }
  }

  async getUserReports(userId: string): Promise<Report[]> {
    try {
      const reports = await this.prisma.report.findMany({
        where: { generatedBy: userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return reports.map(report => ({
        id: report.id,
        templateId: report.templateId,
        name: report.name,
        status: report.status as any,
        parameters: report.parameters || {},
        generatedBy: report.generatedBy,
        createdAt: report.createdAt.toISOString(),
        completedAt: report.completedAt?.toISOString(),
        filePath: report.filePath,
        fileSize: report.fileSize,
        recordCount: report.recordCount,
        error: report.error,
      }));
    } catch (error) {
      this.logger.error('Failed to get user reports:', error);
      return [];
    }
  }

  async deleteReport(reportId: string): Promise<void> {
    try {
      const report = await this.prisma.report.findUnique({
        where: { id: reportId },
      });

      if (report?.filePath && fs.existsSync(report.filePath)) {
        fs.unlinkSync(report.filePath);
      }

      await this.prisma.report.delete({
        where: { id: reportId },
      });
    } catch (error) {
      this.logger.error('Failed to delete report:', error);
      throw error;
    }
  }

  async getReportFile(reportId: string): Promise<Buffer | null> {
    try {
      const report = await this.prisma.report.findUnique({
        where: { id: reportId },
      });

      if (!report || !report.filePath || !fs.existsSync(report.filePath)) {
        return null;
      }

      return fs.readFileSync(report.filePath);
    } catch (error) {
      this.logger.error('Failed to get report file:', error);
      return null;
    }
  }
}
