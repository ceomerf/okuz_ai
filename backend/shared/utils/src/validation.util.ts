import { IsEmail, IsString, IsNumber, IsBoolean, IsOptional, IsEnum, IsArray, IsObject, IsDateString, Min, Max, Length } from 'class-validator';

export class ValidationError extends Error {
  constructor(message: string, public field: string, public value: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class BaseValidator {
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  static validateUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  static validateDate(date: string): boolean {
    const dateObj = new Date(date);
    return dateObj instanceof Date && !isNaN(dateObj.getTime());
  }

  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  static sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

export class AuthValidator {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(8, 128)
  password!: string;

  @IsString()
  @Length(2, 50)
  name!: string;

  @IsEnum(['STUDENT', 'PARENT', 'COACH', 'ADMIN'])
  role!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PlanningValidator {
  @IsString()
  @Length(3, 100)
  title!: string;

  @IsString()
  @Length(10, 500)
  description!: string;

  @IsString()
  @Length(2, 50)
  subject!: string;

  @IsNumber()
  @Min(1)
  @Max(12)
  grade!: number;

  @IsNumber()
  @Min(1)
  @Max(10)
  difficulty!: number;

  @IsNumber()
  @Min(5)
  @Max(480)
  estimatedDuration!: number;

  @IsEnum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'])
  status!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class NotificationValidator {
  @IsString()
  @Length(3, 100)
  title!: string;

  @IsString()
  @Length(10, 1000)
  message!: string;

  @IsEnum(['INFO', 'WARNING', 'ERROR', 'SUCCESS', 'COACHING', 'SYSTEM'])
  type!: string;

  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority!: string;

  @IsArray()
  @IsEnum(['PUSH', 'EMAIL', 'SMS', 'WEBSOCKET', 'IN_APP'], { each: true })
  channels!: string[];

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class AIValidator {
  @IsString()
  @Length(10, 10000)
  prompt!: string;

  @IsString()
  @Length(2, 50)
  promptType!: string;

  @IsString()
  @Length(2, 50)
  model!: string;

  @IsNumber()
  @Min(0)
  @Max(2)
  temperature!: number;

  @IsNumber()
  @Min(1)
  @Max(4000)
  maxTokens!: number;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class PaginationValidator {
  @IsNumber()
  @Min(1)
  page!: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  limit!: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: string;
}

export class FilterValidator {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  search?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  type?: string;
}
