import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min, MinLength, IsBoolean, IsEnum } from 'class-validator';

export enum PlanType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
}

export enum LearningStyle {
  VISUAL = 'visual',
  AUDITORY = 'auditory',
  KINESTHETIC = 'kinesthetic',
  READING = 'reading',
  MIXED = 'mixed',
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export class GeneratePlanDto {
  @ApiProperty({ 
    description: 'Subjects to include in the plan',
    example: ['Mathematics', 'Physics', 'Chemistry'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  subjects!: string[];

  @ApiProperty({ 
    description: 'Learning goals',
    example: ['Learn calculus', 'Understand mechanics'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  goals!: string[];

  @ApiProperty({ 
    description: 'Available study time in minutes',
    example: 120,
    minimum: 30
  })
  @IsOptional()
  @IsNumber()
  @Min(30)
  availableTime?: number;

  @ApiProperty({ 
    description: 'Current learning level',
    example: 'intermediate',
    enum: DifficultyLevel
  })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  currentLevel?: string;

  @ApiProperty({ 
    description: 'User preferences',
    example: { studyTimes: ['09:00', '14:00'], difficulty: 'medium' }
  })
  @IsOptional()
  preferences?: any;

  @ApiProperty({ 
    description: 'Plan duration in days',
    example: 7,
    minimum: 1
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  planDurationDays?: number;

  @ApiProperty({ 
    description: 'Plan type',
    example: 'weekly',
    enum: PlanType
  })
  @IsOptional()
  @IsEnum(PlanType)
  planType?: string;

  @ApiProperty({ 
    description: 'Target exam',
    example: 'YKS'
  })
  @IsOptional()
  @IsString()
  targetExam?: string;

  @ApiProperty({ 
    description: 'Whether to optimize the plan',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  optimize?: boolean;
}

export class PlanCreateData {
  userId!: string;
  title!: string;
  description?: string;
  subjects!: string[];
  goals!: string[];
  startDate!: Date;
  endDate!: Date;
  type!: string;
  planType?: string;
  targetExam?: string;
  metadata?: any;
}

export class PlanUpdateData {
  title?: string;
  description?: string;
  subjects?: string[];
  goals?: string[];
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
  metadata?: any;
}

export class SessionCreateData {
  planId!: string;
  userId!: string;
  subject!: string;
  topic!: string;
  duration!: number;
  difficulty?: string;
  type?: string;
  order?: number;
  startTime!: Date;
  endTime?: Date;
  objectives?: string[];
  resources?: string[];
  techniques?: string[];
  metadata?: any;
}

export class SessionUpdateData {
  subject?: string;
  topic?: string;
  duration?: number;
  difficulty?: string;
  type?: string;
  order?: number;
  startTime?: Date;
  endTime?: Date;
  isCompleted?: boolean;
  performance?: number;
  notes?: string;
  objectives?: string[];
  resources?: string[];
  techniques?: string[];
  metadata?: any;
}

export class PlanGenerationData {
  userId!: string;
  subjects!: string[];
  goals!: string[];
  availableTime!: number;
  learningStyle?: string;
  currentLevel?: string;
  preferences?: any;
  planDurationDays?: number;
  planType?: string;
  targetExam?: string;
}

export class OptimizationOptions {
  prioritizeDifficultTopics?: boolean;
  balanceWorkload?: boolean;
  considerUserPreferences?: boolean;
  maxSessionsPerDay?: number;
  minBreakTime?: number;
  focusOnWeakAreas?: boolean;
  balanceSubjects?: boolean;
  optimizeTiming?: boolean;
  adjustDifficulty?: boolean;
}

export class PlanValidationResult {
  isValid!: boolean;
  errors!: string[];
  warnings!: string[];
  suggestions!: string[];
}

export class SessionValidationResult {
  isValid!: boolean;
  errors!: string[];
  warnings!: string[];
  suggestions!: string[];
}

export class PlanOptimizationResult {
  optimized!: boolean;
  improvements!: string[];
  performanceGain?: number;
  efficiencyGain?: number;
  balanceScore?: number;
}

export class PlanStatistics {
  totalSessions!: number;
  completedSessions!: number;
  averageSessionDuration!: number;
  totalStudyTime!: number;
  completionRate!: number;
  performanceScore!: number;
  subjectBreakdown!: Record<string, {
    sessions: number;
    completed: number;
    averageDuration: number;
    performance: number;
  }>;
  weeklyProgress!: Array<{
    week: number;
    sessions: number;
    completed: number;
    studyTime: number;
    performance: number;
  }>;
}

export class ProgressTrackingData {
  userId!: string;
  planId!: string;
  sessionId!: string;
  progress!: number;
  notes?: string;
  completedAt?: Date;
}

export class PlanSearchFilters {
  userId?: string;
  subjects?: string[];
  planType?: string;
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class PlanSortOptions {
  field!: 'createdAt' | 'startDate' | 'endDate' | 'title';
  order!: 'asc' | 'desc';
}

export class PlanAnalytics {
  planId!: string;
  userId!: string;
  totalSessions!: number;
  completedSessions!: number;
  averagePerformance!: number;
  studyStreak!: number;
  lastActivity!: Date;
  recommendations!: string[];
}