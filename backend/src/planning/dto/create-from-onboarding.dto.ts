import { Type } from 'class-transformer';
import { IsString, IsArray, IsObject, IsNumber, IsOptional, ValidateNested, IsBoolean } from 'class-validator';

// Önce iç içe geçmiş planContext nesnesinin yapısını tanımlıyoruz
class PlanContextDto {
  @IsString()
  @IsOptional()
  grade?: string;

  @IsString()
  @IsOptional()
  academicTrack?: string;

  @IsString()
  @IsOptional()
  targetExam?: string;

  @IsString()
  @IsOptional()
  learningStyle?: string;

  @IsNumber()
  @IsOptional()
  dailyHours?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  selectedSubjects?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  weaknesses?: string[];

  @IsObject()
  @IsOptional()
  confidenceLevels?: Record<string, string>;

  @IsObject()
  @IsOptional()
  lastCompletedTopics?: Record<string, string>;

  @IsString()
  @IsOptional()
  studyGoal?: string;
}

// Ana DTO, bu PlanContextDto'yu kullanacak
export class CreateFromOnboardingDto {
  @IsString()
  planType!: string;

  @IsBoolean()
  useOnboardingData!: boolean;

  @IsBoolean()
  @IsOptional()
  suppressLearningStyleInTitle?: boolean;

  @IsNumber()
  @IsOptional()
  planDurationDays?: number;

  @IsObject()
  @ValidateNested() // İç içe geçmiş nesneyi de doğrula
  @Type(() => PlanContextDto) // Tip dönüşümünü sağla
  @IsOptional()
  planContext?: PlanContextDto;
}
