import { IsBoolean, IsNumber, IsOptional, IsString, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PlanContextDto {
  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsString()
  academicTrack?: string;

  @IsOptional()
  @IsString()
  targetExam?: string;

  @IsOptional()
  @IsString()
  learningStyle?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  weaknesses?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedSubjects?: string[];

  @IsOptional()
  @IsNumber()
  dailyHours?: number;

  @IsOptional()
  @IsNumber()
  preferredSessionDuration?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredStudyTimes?: string[];

  @IsOptional()
  @IsArray()
  studyDays?: number[] | string[];

  @IsOptional()
  @IsObject()
  lastCompletedTopics?: Record<string, string>;

  @IsOptional()
  @IsObject()
  confidenceLevels?: Record<string, string>;

  @IsOptional()
  @IsString()
  curriculumPreference?: string;

  @IsOptional()
  @IsString()
  studyGoal?: string;
}

export class CreateFromOnboardingDto {
  @IsOptional()
  @IsString()
  planType?: string; // 'initial'

  @IsOptional()
  @IsBoolean()
  useOnboardingData?: boolean;

  @IsOptional()
  @IsBoolean()
  suppressLearningStyleInTitle?: boolean;

  @IsOptional()
  @IsNumber()
  planDurationDays?: number;

  // Identity / targets
  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsString()
  academicTrack?: string;

  @IsOptional()
  @IsString()
  targetExam?: string;

  @IsOptional()
  @IsString()
  targetUniversity?: string;

  // Preferences
  @IsOptional()
  @IsString()
  learningStyle?: string;

  @IsOptional()
  @IsNumber()
  dailyHours?: number;

  @IsOptional()
  @IsNumber()
  preferredSessionDuration?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredStudyTimes?: string[];

  @IsOptional()
  @IsArray()
  studyDays?: number[] | string[]; // UI string olabilir

  // Subjects / topics
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedSubjects?: string[];

  @IsOptional()
  @IsObject()
  lastCompletedTopics?: Record<string, string>;

  @IsOptional()
  @IsObject()
  confidenceLevels?: Record<string, string>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  weaknesses?: string[];

  // Curriculum
  @IsOptional()
  @IsString()
  curriculumPreference?: string;

  // Yeni: planContext (zengin bağlam)
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PlanContextDto)
  planContext?: PlanContextDto;
}


