import { IsNotEmpty, IsArray, IsString, IsObject, IsOptional, ArrayNotEmpty } from 'class-validator';

export class GeneratePlanDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  subjects: string[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  goals?: string[];

  @IsObject()
  @IsOptional()
  studentProfile?: { grade?: number; field?: string };

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

