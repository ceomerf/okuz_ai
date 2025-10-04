import { IsString, IsNumber, IsArray, IsOptional, Min, Max, IsEnum, IsBoolean } from 'class-validator';

export enum PlanMode {
  AI = 'ai',
  MANUAL = 'manual',
  HYBRID = 'hybrid'
}

export class GeneratePlanDto {
  @IsEnum(PlanMode)
  mode: PlanMode;

  @IsNumber()
  @Min(1)
  @Max(52)
  planDurationWeeks: number;

  @IsString()
  planFocus: string;

  @IsArray()
  @IsOptional()
  subjects?: string[];

  @IsArray()
  @IsOptional()
  goals?: string[];

  @IsString()
  @IsOptional()
  learningStyle?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(600)
  dailyMaxMinutes?: number;

  @IsArray()
  @IsOptional()
  preferredTimes?: string[];

  @IsBoolean()
  @IsOptional()
  force?: boolean;
}