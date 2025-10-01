import { IsNotEmpty, IsArray, IsString, IsObject, IsOptional, ArrayNotEmpty, IsNumber, Min, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

class WeeklyPlanItemDto {
  @IsNumber()
  @Min(1)
  weekNumber: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  @Min(0)
  totalStudyTime: number;
}

export class GeneratePlanDto {
  @IsString()
  @IsNotEmpty()
  planTitle: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  subjects: string[];

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => WeeklyPlanItemDto)
  weeklyPlans: WeeklyPlanItemDto[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  goals?: string[];

  @IsObject()
  @IsOptional()
  studentProfile?: { grade?: number; field?: string };

  @IsNumber()
  @Min(0)
  @IsOptional()
  availableTime?: number; // dakika/gün

  @IsString()
  @IsNotEmpty()
  learningStyle: string;

  @IsString()
  @IsNotEmpty()
  currentLevel: string;

  @IsObject()
  @IsOptional()
  preferences?: { focusAreas?: string[]; previousPlanId?: string };
}

