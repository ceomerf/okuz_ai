import { IsString, IsNumber, IsArray, IsOptional, Min, Max, IsEnum, IsBoolean } from 'class-validator';

export enum PlanMode {
  AI = 'ai',
  MANUAL = 'manual',
  HYBRID = 'hybrid'
}

export class GeneratePlanDto {
  @IsEnum(PlanMode)
  mode!: PlanMode;

  @IsNumber()
  @Min(1)
  @Max(52)
  planDurationWeeks!: number;

  @IsString()
  planFocus!: string;

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

  // Aşağıdaki alanlar controller tarafında kullanılıyor; opsiyonel eklenir
  @IsNumber()
  @IsOptional()
  availableTime?: number;

  @IsString()
  @IsOptional()
  currentLevel?: string;

  @IsOptional()
  preferences?: any;

  @IsNumber()
  @IsOptional()
  planDurationDays?: number;

  @IsString()
  @IsOptional()
  planType?: string;

  @IsString()
  @IsOptional()
  targetExam?: string;

  @IsBoolean()
  @IsOptional()
  optimize?: boolean;
}