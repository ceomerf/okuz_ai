import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class QuestionResult {
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @IsString()
  @IsNotEmpty()
  studentAnswer!: string;

  @IsString()
  @IsNotEmpty()
  correctAnswer!: string;

  @IsString()
  @IsNotEmpty()
  topic!: string;

  @IsString()
  @IsNotEmpty()
  difficulty!: string;
}

export class AnalyzeExamResultDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionResult)
  examData!: QuestionResult[];

  @IsString()
  @IsNotEmpty()
  subject!: string;

  @IsNumber()
  grade!: number;

  @IsNumber()
  performance!: number;

  @IsString()
  @IsOptional()
  userId?: string;
}

