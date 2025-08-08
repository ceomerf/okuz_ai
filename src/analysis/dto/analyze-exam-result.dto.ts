import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class AnalyzeExamResultDto {
  @IsObject()
  @IsNotEmpty()
  examData: any; // İleride ayrı bir sınıf ile tiplenebilir

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsNumber()
  grade: number;

  @IsNumber()
  performance: number;

  @IsString()
  @IsOptional()
  userId?: string;
}

