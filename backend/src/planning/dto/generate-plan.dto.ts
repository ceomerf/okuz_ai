import { IsString, IsNumber, IsArray, IsOptional, Min, Max, IsEnum } from 'class-validator';

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
}