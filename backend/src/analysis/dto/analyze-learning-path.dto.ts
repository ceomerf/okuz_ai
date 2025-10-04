import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ProgressStep {
  @IsString()
  @IsNotEmpty()
  stepId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  completionPercentage: number;

  @IsString()
  @IsOptional()
  completedAt?: string;
}

export class PerformanceMetrics {
  @IsNumber()
  overallScore: number;

  @IsNumber()
  timeSpent: number;

  @IsNumber()
  accuracy: number;
}

export class AnalyzeLearningPathDto {
  @IsString()
  @IsNotEmpty()
  pathId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProgressStep)
  progress: ProgressStep[];

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => PerformanceMetrics)
  performance?: PerformanceMetrics;

  @IsString()
  @IsOptional()
  userId?: string;
}

