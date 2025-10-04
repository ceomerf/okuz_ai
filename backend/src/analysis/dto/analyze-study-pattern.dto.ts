import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class StudySession {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsString()
  @IsNotEmpty()
  subject!: string;

  @IsString()
  @IsNotEmpty()
  topic!: string;

  @IsNumber()
  duration!: number; // minutes

  @IsString()
  @IsNotEmpty()
  startTime!: string;

  @IsString()
  @IsOptional()
  endTime?: string;

  @IsNumber()
  @IsOptional()
  performance?: number; // 0-100
}

export class AnalyzeStudyPatternDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudySession)
  studySessions!: StudySession[];

  @IsString()
  @IsIn(['week', 'month', 'quarter', 'custom'])
  timeRange!: string;

  @IsString()
  @IsOptional()
  userId?: string;
}

