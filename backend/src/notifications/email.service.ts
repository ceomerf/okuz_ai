import { Injectable, Logger, BadRequestException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { MetricsService } from '../monitoring/metrics.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  text: string;
  variables: string[];
  category: string;
  isActive: boolean;
}

export interface EmailMessage {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  headers?: Record<string, string>;
  replyTo?: string;
  priority?: 'high' | 'normal' | 'low';
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveryTime: number;
}

export interface BulkEmailResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
  deliveryTime: number;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly templates = new Map<string, EmailTemplate>();
  private readonly templateCache = new Map<string, handlebars.TemplateDelegate>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Optional() private readonly cache?: CacheService,
    @Optional() private readonly metrics?: MetricsService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {
    // Email transporter oluştur
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST') || 'localhost',
      port: this.configService.get<number>('SMTP_PORT') || 587,
      secure: this.configService.get<string>('NODE_ENV') === 'production' ? true : (this.configService.get<boolean>('SMTP_SECURE') || false),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
      tls: {
        rejectUnauthorized: this.configService.get<string>('NODE_ENV') === 'production',
      },
    });

    // Email templates yükle
    this.loadEmailTemplates();
    
    this.logger.log('EmailService initialized');
  }

  /**
   * Email templates yükle
   */
  private async loadEmailTemplates(): Promise<void> {
    try {
      // Veritabanından templates yükle
      const dbTemplates = await (this.prisma as any).emailTemplate.findMany({
        where: { isActive: true },
      });

      for (const template of dbTemplates) {
        this.templates.set(template.name, {
          id: template.id,
          name: template.name,
          subject: template.subject,
          html: template.html,
          text: template.text,
          variables: template.variables,
          category: template.category,
          isActive: template.isActive,
        });

        // Handlebars template compile et
        this.templateCache.set(template.name, handlebars.compile(template.html));
      }

      this.logger.log(`Loaded ${this.templates.size} email templates`);
    } catch (error) {
      this.logger.error(`Failed to load email templates: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Email gönder
   */
  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM') || 'noreply@okuz.ai',
        to: message.to,
        cc: message.cc,
        bcc: message.bcc,
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments: message.attachments,
        headers: message.headers,
        replyTo: message.replyTo,
        priority: message.priority,
      });

      const deliveryTime = Date.now() - startTime;

      // Metrikleri güncelle
      if (this.metrics) {
        this.metrics.incrementCounter('emails_sent_total');
        this.metrics.observeHistogram('email_delivery_time_ms', deliveryTime);
      }

      // Event emit
      if (this.eventEmitter) {
        this.eventEmitter.emit('email.sent', {
          messageId: result.messageId,
          to: message.to,
          subject: message.subject,
          deliveryTime,
          timestamp: new Date(),
        });
      }

      this.logger.log(`Email sent successfully: ${result.messageId}`);
      
      return {
        success: true,
        messageId: result.messageId,
        deliveryTime,
      };
    } catch (error) {
      const deliveryTime = Date.now() - startTime;
      
      this.logger.error(`Failed to send email: ${error instanceof Error ? error.message : String(error)}`);
      
      // Metrikleri güncelle
      if (this.metrics) {
        this.metrics.incrementCounter('emails_failed_total');
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        deliveryTime,
      };
    }
  }

  /**
   * Template ile email gönder
   */
  async sendTemplateEmail(
    templateName: string,
    to: string | string[],
    variables: Record<string, any> = {},
    options: Partial<EmailMessage> = {}
  ): Promise<EmailResult> {
    try {
      const template = this.templates.get(templateName);
      if (!template) {
        throw new BadRequestException(`Email template not found: ${templateName}`);
      }

      // Template compile et
      const compiledTemplate = this.templateCache.get(templateName);
      if (!compiledTemplate) {
        throw new BadRequestException(`Template compilation failed: ${templateName}`);
      }

      // Variables ile template render et
      const html = compiledTemplate(variables);
      const subject = this.renderTemplate(template.subject, variables);

      const message: EmailMessage = {
        to,
        subject,
        html,
        text: this.renderTemplate(template.text, variables),
        ...options,
      };

      return this.sendEmail(message);
    } catch (error) {
      this.logger.error(`Failed to send template email: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        deliveryTime: 0,
      };
    }
  }

  /**
   * Toplu email gönder
   */
  async sendBulkEmail(
    messages: EmailMessage[]
  ): Promise<BulkEmailResult> {
    const startTime = Date.now();
    const result: BulkEmailResult = {
      success: false,
      sent: 0,
      failed: 0,
      errors: [],
      deliveryTime: 0,
    };

    try {
      // Paralel olarak email gönder
      const sendPromises = messages.map(message => this.sendEmail(message));
      const results = await Promise.allSettled(sendPromises);

      // Sonuçları değerlendir
      for (const [index, promiseResult] of results.entries()) {
        if (promiseResult.status === 'fulfilled') {
          const emailResult = promiseResult.value;
          if (emailResult.success) {
            result.sent++;
          } else {
            result.failed++;
            result.errors.push(`Email ${index}: ${emailResult.error}`);
          }
        } else {
          result.failed++;
          result.errors.push(`Email ${index}: ${promiseResult.reason}`);
        }
      }

      result.success = result.sent > 0;
      result.deliveryTime = Date.now() - startTime;

      this.logger.log(`Bulk email sent: ${result.sent} sent, ${result.failed} failed`);
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to send bulk email: ${error instanceof Error ? error.message : String(error)}`);
      result.errors.push(error instanceof Error ? error.message : String(error));
      result.deliveryTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Kullanıcıya hoş geldin emaili gönder
   */
  async sendWelcomeEmail(
    userId: string,
    userEmail: string,
    userName: string
  ): Promise<EmailResult> {
    try {
      return this.sendTemplateEmail(
        'welcome',
        userEmail,
        {
          userName,
          userEmail,
          loginUrl: `${this.configService.get<string>('FRONTEND_URL')}/login`,
          supportEmail: this.configService.get<string>('SUPPORT_EMAIL') || 'support@okuz.ai',
        }
      );
    } catch (error) {
      this.logger.error(`Failed to send welcome email: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        deliveryTime: 0,
      };
    }
  }

  /**
   * Şifre sıfırlama emaili gönder
   */
  async sendPasswordResetEmail(
    userEmail: string,
    resetToken: string,
    userName: string
  ): Promise<EmailResult> {
    try {
      const resetUrl = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${resetToken}`;
      
      return this.sendTemplateEmail(
        'password-reset',
        userEmail,
        {
          userName,
          resetUrl,
          expiresIn: '1 hour',
        }
      );
    } catch (error) {
      this.logger.error(`Failed to send password reset email: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        deliveryTime: 0,
      };
    }
  }

  /**
   * Plan hatırlatma emaili gönder
   */
  async sendPlanReminderEmail(
    userEmail: string,
    userName: string,
    planTitle: string,
    sessionCount: number,
    nextSessionTime: Date
  ): Promise<EmailResult> {
    try {
      return this.sendTemplateEmail(
        'plan-reminder',
        userEmail,
        {
          userName,
          planTitle,
          sessionCount,
          nextSessionTime: nextSessionTime.toLocaleString('tr-TR'),
          planUrl: `${this.configService.get<string>('FRONTEND_URL')}/plans`,
        }
      );
    } catch (error) {
      this.logger.error(`Failed to send plan reminder email: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        deliveryTime: 0,
      };
    }
  }

  /**
   * Başarı bildirimi emaili gönder
   */
  async sendAchievementEmail(
    userEmail: string,
    userName: string,
    achievementTitle: string,
    achievementDescription: string,
    points: number
  ): Promise<EmailResult> {
    try {
      return this.sendTemplateEmail(
        'achievement',
        userEmail,
        {
          userName,
          achievementTitle,
          achievementDescription,
          points,
          profileUrl: `${this.configService.get<string>('FRONTEND_URL')}/profile`,
        }
      );
    } catch (error) {
      this.logger.error(`Failed to send achievement email: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        deliveryTime: 0,
      };
    }
  }

  /**
   * Haftalık rapor emaili gönder
   */
  async sendWeeklyReportEmail(
    userEmail: string,
    userName: string,
    reportData: {
      completedSessions: number;
      totalTime: number;
      achievements: string[];
      nextWeekGoals: string[];
    }
  ): Promise<EmailResult> {
    try {
      return this.sendTemplateEmail(
        'weekly-report',
        userEmail,
        {
          userName,
          completedSessions: reportData.completedSessions,
          totalTime: Math.round(reportData.totalTime / 60), // dakika cinsinden
          achievements: reportData.achievements,
          nextWeekGoals: reportData.nextWeekGoals,
          dashboardUrl: `${this.configService.get<string>('FRONTEND_URL')}/dashboard`,
        }
      );
    } catch (error) {
      this.logger.error(`Failed to send weekly report email: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        deliveryTime: 0,
      };
    }
  }

  /**
   * Email template oluştur
   */
  async createEmailTemplate(template: Omit<EmailTemplate, 'id'>): Promise<EmailTemplate> {
    try {
      const created = await (this.prisma as any).emailTemplate.create({
        data: {
          name: template.name,
          subject: template.subject,
          html: template.html,
          text: template.text,
          variables: template.variables,
          category: template.category,
          isActive: template.isActive,
        },
      });

      // Cache'e ekle
      this.templates.set(template.name, { ...template, id: created.id });
      this.templateCache.set(template.name, handlebars.compile(template.html));

      this.logger.log(`Created email template: ${template.name}`);
      
      return { ...template, id: created.id };
    } catch (error) {
      this.logger.error(`Failed to create email template: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException('Failed to create email template');
    }
  }

  /**
   * Email template güncelle
   */
  async updateEmailTemplate(
    templateName: string,
    updates: Partial<EmailTemplate>
  ): Promise<EmailTemplate> {
    try {
      const existing = this.templates.get(templateName);
      if (!existing) {
        throw new BadRequestException(`Email template not found: ${templateName}`);
      }

      const updated = await (this.prisma as any).emailTemplate.update({
        where: { name: templateName },
        data: updates,
      });

      // Cache'i güncelle
      this.templates.set(templateName, { ...existing, ...updates });
      if (updates.html) {
        this.templateCache.set(templateName, handlebars.compile(updates.html));
      }

      this.logger.log(`Updated email template: ${templateName}`);
      
      return { ...existing, ...updates };
    } catch (error) {
      this.logger.error(`Failed to update email template: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException('Failed to update email template');
    }
  }

  /**
   * Email template sil
   */
  async deleteEmailTemplate(templateName: string): Promise<void> {
    try {
      await (this.prisma as any).emailTemplate.delete({
        where: { name: templateName },
      });

      // Cache'den kaldır
      this.templates.delete(templateName);
      this.templateCache.delete(templateName);

      this.logger.log(`Deleted email template: ${templateName}`);
    } catch (error) {
      this.logger.error(`Failed to delete email template: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException('Failed to delete email template');
    }
  }

  /**
   * Template render et
   */
  private renderTemplate(template: string, variables: Record<string, any>): string {
    try {
      const compiled = handlebars.compile(template);
      return compiled(variables);
    } catch (error) {
      this.logger.error(`Template rendering failed: ${error instanceof Error ? error.message : String(error)}`);
      return template;
    }
  }

  /**
   * Email istatistikleri getir
   */
  async getEmailStats(): Promise<{
    totalSent: number;
    totalFailed: number;
    successRate: number;
    averageDeliveryTime: number;
    emailsByTemplate: Record<string, number>;
  }> {
    try {
      // Cache'den istatistikleri al
      if (this.cache) {
        const stats = await this.cache.get('email_stats');
        if (stats) {
          return JSON.parse(stats as string);
        }
      }

      // Veritabanından istatistikleri al
      const emailLogs = await (this.prisma as any).emailLog.findMany({
        select: {
          success: true,
          deliveryTime: true,
          templateName: true,
        },
      });

      const totalSent = emailLogs.filter((log: any) => log.success).length;
      const totalFailed = emailLogs.filter((log: any) => !log.success).length;
      const successRate = emailLogs.length > 0 ? totalSent / emailLogs.length : 0;
      const averageDeliveryTime = emailLogs.reduce((sum: number, log: any) => sum + log.deliveryTime, 0) / emailLogs.length;

      const emailsByTemplate: Record<string, number> = {};
      emailLogs.forEach((log: any) => {
        if (log.templateName) {
          emailsByTemplate[log.templateName] = (emailsByTemplate[log.templateName] || 0) + 1;
        }
      });

      const result = {
        totalSent,
        totalFailed,
        successRate,
        averageDeliveryTime,
        emailsByTemplate,
      };

      // Cache'e kaydet
      if (this.cache) {
        await this.cache.set('email_stats', JSON.stringify(result), 300); // 5 dakika
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to get email stats: ${error instanceof Error ? error.message : String(error)}`);
      return {
        totalSent: 0,
        totalFailed: 0,
        successRate: 0,
        averageDeliveryTime: 0,
        emailsByTemplate: {},
      };
    }
  }

  /**
   * Email template listesi getir
   */
  getEmailTemplates(): EmailTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Email template getir
   */
  getEmailTemplate(templateName: string): EmailTemplate | undefined {
    return this.templates.get(templateName);
  }
}
