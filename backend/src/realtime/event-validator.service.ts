import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConnectionManagerService, ConnectionInfo } from './connection-manager.service';

export interface EventValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData: any;
  permissions: string[];
  rateLimitInfo?: {
    remaining: number;
    resetTime: Date;
  };
}

export interface EventSchema {
  event: string;
  requiredFields: string[];
  optionalFields: string[];
  dataTypes: Record<string, string>;
  permissions: string[];
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  validationRules: Record<string, any>;
}

@Injectable()
export class EventValidatorService {
  private readonly logger = new Logger(EventValidatorService.name);
  private readonly eventSchemas = new Map<string, EventSchema>();
  private readonly rateLimitCache = new Map<string, { count: number; resetTime: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly jwtService: JwtService,
    private readonly eventEmitter: EventEmitter2,
    private readonly connectionManager: ConnectionManagerService,
  ) {
    this.initializeEventSchemas();
  }

  /**
   * Event şemalarını başlat
   */
  private initializeEventSchemas(): void {
    // Plan events
    this.eventSchemas.set('plan.created', {
      event: 'plan.created',
      requiredFields: ['planId', 'title', 'userId'],
      optionalFields: ['description', 'subjects', 'goals'],
      dataTypes: {
        planId: 'string',
        title: 'string',
        userId: 'string',
        description: 'string',
        subjects: 'array',
        goals: 'array',
      },
      permissions: ['user:read', 'plan:read'],
      rateLimit: { maxRequests: 10, windowMs: 60000 },
      validationRules: {
        planId: { minLength: 1, maxLength: 100 },
        title: { minLength: 1, maxLength: 200 },
        userId: { format: 'uuid' },
      },
    });

    this.eventSchemas.set('plan.updated', {
      event: 'plan.updated',
      requiredFields: ['planId', 'userId'],
      optionalFields: ['title', 'description', 'subjects', 'goals', 'isActive'],
      dataTypes: {
        planId: 'string',
        userId: 'string',
        title: 'string',
        description: 'string',
        subjects: 'array',
        goals: 'array',
        isActive: 'boolean',
      },
      permissions: ['user:read', 'plan:write'],
      rateLimit: { maxRequests: 20, windowMs: 60000 },
      validationRules: {
        planId: { minLength: 1, maxLength: 100 },
        userId: { format: 'uuid' },
      },
    });

    this.eventSchemas.set('plan.deleted', {
      event: 'plan.deleted',
      requiredFields: ['planId', 'userId'],
      optionalFields: [],
      dataTypes: {
        planId: 'string',
        userId: 'string',
      },
      permissions: ['user:read', 'plan:delete'],
      rateLimit: { maxRequests: 5, windowMs: 60000 },
      validationRules: {
        planId: { minLength: 1, maxLength: 100 },
        userId: { format: 'uuid' },
      },
    });

    // Session events
    this.eventSchemas.set('session.started', {
      event: 'session.started',
      requiredFields: ['sessionId', 'planId', 'userId'],
      optionalFields: ['subject', 'topic', 'duration'],
      dataTypes: {
        sessionId: 'string',
        planId: 'string',
        userId: 'string',
        subject: 'string',
        topic: 'string',
        duration: 'number',
      },
      permissions: ['user:read', 'session:write'],
      rateLimit: { maxRequests: 30, windowMs: 60000 },
      validationRules: {
        sessionId: { minLength: 1, maxLength: 100 },
        planId: { minLength: 1, maxLength: 100 },
        userId: { format: 'uuid' },
        duration: { min: 1, max: 1440 }, // 1 dakika - 24 saat
      },
    });

    this.eventSchemas.set('session.completed', {
      event: 'session.completed',
      requiredFields: ['sessionId', 'planId', 'userId'],
      optionalFields: ['score', 'timeSpent', 'notes'],
      dataTypes: {
        sessionId: 'string',
        planId: 'string',
        userId: 'string',
        score: 'number',
        timeSpent: 'number',
        notes: 'string',
      },
      permissions: ['user:read', 'session:write'],
      rateLimit: { maxRequests: 30, windowMs: 60000 },
      validationRules: {
        sessionId: { minLength: 1, maxLength: 100 },
        planId: { minLength: 1, maxLength: 100 },
        userId: { format: 'uuid' },
        score: { min: 0, max: 100 },
        timeSpent: { min: 1, max: 1440 },
      },
    });

    // AI events
    this.eventSchemas.set('ai.request', {
      event: 'ai.request',
      requiredFields: ['requestId', 'promptType', 'userId'],
      optionalFields: ['context', 'model', 'temperature'],
      dataTypes: {
        requestId: 'string',
        promptType: 'string',
        userId: 'string',
        context: 'object',
        model: 'string',
        temperature: 'number',
      },
      permissions: ['user:read', 'ai:use'],
      rateLimit: { maxRequests: 50, windowMs: 60000 },
      validationRules: {
        requestId: { minLength: 1, maxLength: 100 },
        promptType: { enum: ['plan_generation', 'content_generation', 'question_solving', 'analysis', 'coaching'] },
        userId: { format: 'uuid' },
        temperature: { min: 0, max: 2 },
      },
    });

    this.eventSchemas.set('ai.response', {
      event: 'ai.response',
      requiredFields: ['requestId', 'userId', 'content'],
      optionalFields: ['usage', 'model', 'success'],
      dataTypes: {
        requestId: 'string',
        userId: 'string',
        content: 'string',
        usage: 'object',
        model: 'string',
        success: 'boolean',
      },
      permissions: ['user:read', 'ai:use'],
      rateLimit: { maxRequests: 100, windowMs: 60000 },
      validationRules: {
        requestId: { minLength: 1, maxLength: 100 },
        userId: { format: 'uuid' },
        content: { minLength: 1, maxLength: 10000 },
      },
    });

    // Notification events
    this.eventSchemas.set('notification.sent', {
      event: 'notification.sent',
      requiredFields: ['notificationId', 'userId', 'type'],
      optionalFields: ['title', 'message', 'data'],
      dataTypes: {
        notificationId: 'string',
        userId: 'string',
        type: 'string',
        title: 'string',
        message: 'string',
        data: 'object',
      },
      permissions: ['user:read', 'notification:read'],
      rateLimit: { maxRequests: 200, windowMs: 60000 },
      validationRules: {
        notificationId: { minLength: 1, maxLength: 100 },
        userId: { format: 'uuid' },
        type: { enum: ['reminder', 'achievement', 'progress', 'system', 'invite'] },
      },
    });

    // Chat events
    this.eventSchemas.set('chat.message', {
      event: 'chat.message',
      requiredFields: ['messageId', 'userId', 'content'],
      optionalFields: ['roomId', 'replyTo', 'attachments'],
      dataTypes: {
        messageId: 'string',
        userId: 'string',
        content: 'string',
        roomId: 'string',
        replyTo: 'string',
        attachments: 'array',
      },
      permissions: ['user:read', 'chat:write'],
      rateLimit: { maxRequests: 100, windowMs: 60000 },
      validationRules: {
        messageId: { minLength: 1, maxLength: 100 },
        userId: { format: 'uuid' },
        content: { minLength: 1, maxLength: 1000 },
      },
    });

    this.logger.log(`Initialized ${this.eventSchemas.size} event schemas`);
  }

  /**
   * Event doğrula
   */
  async validateEvent(
    event: string,
    data: any,
    connectionInfo: ConnectionInfo,
    socketId: string
  ): Promise<EventValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedData = { ...data };

    try {
      // Event şeması kontrol et
      const schema = this.eventSchemas.get(event);
      if (!schema) {
        errors.push(`Unknown event: ${event}`);
        return { isValid: false, errors, warnings, sanitizedData, permissions: [] };
      }

      // Rate limiting kontrol et
      const rateLimitResult = await this.checkRateLimit(event, connectionInfo.userId);
      if (!rateLimitResult.allowed) {
        errors.push(`Rate limit exceeded for event: ${event}`);
        return {
          isValid: false,
          errors,
          warnings,
          sanitizedData,
          permissions: schema.permissions,
          rateLimitInfo: rateLimitResult.info,
        };
      }

      // Yetki kontrol et
      const permissionResult = await this.checkPermissions(schema.permissions, connectionInfo);
      if (!permissionResult.allowed) {
        errors.push(`Insufficient permissions for event: ${event}`);
        return { isValid: false, errors, warnings, sanitizedData, permissions: schema.permissions };
      }

      // Gerekli alanları kontrol et
      for (const field of schema.requiredFields) {
        if (!(field in data)) {
          errors.push(`Required field missing: ${field}`);
        }
      }

      // Veri tiplerini kontrol et
      for (const [field, expectedType] of Object.entries(schema.dataTypes)) {
        if (field in data) {
          const validationResult = this.validateDataType(field, data[field], expectedType);
          if (!validationResult.isValid) {
            errors.push(...validationResult.errors);
          } else {
            sanitizedData[field] = validationResult.sanitizedValue;
          }
        }
      }

      // Validation kurallarını kontrol et
      for (const [field, rules] of Object.entries(schema.validationRules)) {
        if (field in sanitizedData) {
          const validationResult = this.validateFieldRules(field, sanitizedData[field], rules);
          if (!validationResult.isValid) {
            errors.push(...validationResult.errors);
          }
        }
      }

      // XSS koruması
      sanitizedData = this.sanitizeData(sanitizedData);

      // Event emit
      this.eventEmitter.emit('event.validated', {
        event,
        socketId,
        userId: connectionInfo.userId,
        isValid: errors.length === 0,
        timestamp: new Date(),
      });

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        sanitizedData,
        permissions: schema.permissions,
        rateLimitInfo: rateLimitResult.info,
      };
    } catch (error) {
      this.logger.error(`Event validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isValid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
        sanitizedData,
        permissions: [],
      };
    }
  }

  /**
   * Rate limiting kontrol et
   */
  private async checkRateLimit(event: string, userId: string): Promise<{
    allowed: boolean;
    info?: { remaining: number; resetTime: Date };
  }> {
    const schema = this.eventSchemas.get(event);
    if (!schema?.rateLimit) {
      return { allowed: true };
    }

    const key = `rate_limit:${event}:${userId}`;
    const now = Date.now();
    const windowMs = schema.rateLimit.windowMs;
    const maxRequests = schema.rateLimit.maxRequests;

    // Cache'den mevcut durumu al
    const cached = this.rateLimitCache.get(key);
    if (cached && now < cached.resetTime) {
      if (cached.count >= maxRequests) {
        return {
          allowed: false,
          info: {
            remaining: 0,
            resetTime: new Date(cached.resetTime),
          },
        };
      }
      cached.count++;
    } else {
      // Yeni window başlat
      this.rateLimitCache.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
    }

    const current = this.rateLimitCache.get(key)!;
    return {
      allowed: true,
      info: {
        remaining: maxRequests - current.count,
        resetTime: new Date(current.resetTime),
      },
    };
  }

  /**
   * Yetki kontrol et
   */
  private async checkPermissions(requiredPermissions: string[], connectionInfo: ConnectionInfo): Promise<{
    allowed: boolean;
  }> {
    if (!connectionInfo.isAuthenticated) {
      return { allowed: false };
    }

    // Kullanıcı yetkilerini al
    const userPermissions = await this.getUserPermissions(connectionInfo.userId);
    
    // Gerekli yetkileri kontrol et
    for (const permission of requiredPermissions) {
      if (!userPermissions.includes(permission)) {
        return { allowed: false };
      }
    }

    return { allowed: true };
  }

  /**
   * Kullanıcı yetkilerini al
   */
  private async getUserPermissions(userId: string): Promise<string[]> {
    try {
      // Cache'den al
      const cached = await this.cache.get(`user_permissions:${userId}`);
      if (cached) {
        return JSON.parse(cached as string);
      }

      // Veritabanından al
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user) {
        return [];
      }

      // Role göre yetkileri belirle
      const permissions = this.getRolePermissions(user.role);
      
      // Cache'e kaydet
      await this.cache.set(`user_permissions:${userId}`, JSON.stringify(permissions), 300); // 5 dakika

      return permissions;
    } catch (error) {
      this.logger.error(`Failed to get user permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  /**
   * Role göre yetkileri belirle
   */
  private getRolePermissions(role: string): string[] {
    const rolePermissions: Record<string, string[]> = {
      STUDENT: [
        'user:read',
        'plan:read',
        'plan:write',
        'session:read',
        'session:write',
        'ai:use',
        'notification:read',
        'chat:read',
        'chat:write',
      ],
      PARENT: [
        'user:read',
        'plan:read',
        'notification:read',
        'chat:read',
      ],
      TEACHER: [
        'user:read',
        'plan:read',
        'plan:write',
        'session:read',
        'session:write',
        'ai:use',
        'notification:read',
        'chat:read',
        'chat:write',
      ],
      ADMIN: [
        'user:read',
        'user:write',
        'plan:read',
        'plan:write',
        'plan:delete',
        'session:read',
        'session:write',
        'ai:use',
        'notification:read',
        'notification:write',
        'chat:read',
        'chat:write',
        'admin:access',
      ],
    };

    return rolePermissions[role] || [];
  }

  /**
   * Veri tipi doğrula
   */
  private validateDataType(field: string, value: any, expectedType: string): {
    isValid: boolean;
    errors: string[];
    sanitizedValue: any;
  } {
    const errors: string[] = [];
    let sanitizedValue = value;

    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`Field ${field} must be a string`);
        } else {
          sanitizedValue = value.trim();
        }
        break;
      case 'number':
        if (typeof value !== 'number') {
          errors.push(`Field ${field} must be a number`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`Field ${field} must be a boolean`);
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`Field ${field} must be an array`);
        }
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push(`Field ${field} must be an object`);
        }
        break;
      case 'uuid':
        if (typeof value !== 'string' || !this.isValidUUID(value)) {
          errors.push(`Field ${field} must be a valid UUID`);
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue,
    };
  }

  /**
   * Alan kurallarını doğrula
   */
  private validateFieldRules(field: string, value: any, rules: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`Field ${field} must be at least ${rules.minLength} characters`);
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`Field ${field} must be at most ${rules.maxLength} characters`);
      }
    }

    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`Field ${field} must be at least ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`Field ${field} must be at most ${rules.max}`);
      }
    }

    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`Field ${field} must be one of: ${rules.enum.join(', ')}`);
    }

    if (rules.format === 'uuid' && !this.isValidUUID(value)) {
      errors.push(`Field ${field} must be a valid UUID`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * UUID doğrula
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Veri sanitizasyonu
   */
  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      // XSS koruması
      return data
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeData(value);
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Event şeması ekle
   */
  addEventSchema(schema: EventSchema): void {
    this.eventSchemas.set(schema.event, schema);
    this.logger.log(`Added event schema: ${schema.event}`);
  }

  /**
   * Event şeması güncelle
   */
  updateEventSchema(event: string, updates: Partial<EventSchema>): void {
    const existing = this.eventSchemas.get(event);
    if (existing) {
      this.eventSchemas.set(event, { ...existing, ...updates });
      this.logger.log(`Updated event schema: ${event}`);
    }
  }

  /**
   * Event şeması sil
   */
  removeEventSchema(event: string): void {
    this.eventSchemas.delete(event);
    this.logger.log(`Removed event schema: ${event}`);
  }

  /**
   * Tüm event şemalarını getir
   */
  getAllEventSchemas(): EventSchema[] {
    return Array.from(this.eventSchemas.values());
  }

  /**
   * Rate limit cache'i temizle
   */
  clearRateLimitCache(): void {
    this.rateLimitCache.clear();
    this.logger.log('Rate limit cache cleared');
  }

  /**
   * Eski rate limit kayıtlarını temizle
   */
  cleanupExpiredRateLimits(): void {
    const now = Date.now();
    for (const [key, value] of this.rateLimitCache.entries()) {
      if (now >= value.resetTime) {
        this.rateLimitCache.delete(key);
      }
    }
  }
}
