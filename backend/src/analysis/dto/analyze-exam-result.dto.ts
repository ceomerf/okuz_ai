import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QuestionResult {
  @ApiProperty({ description: 'Soru ID', example: 'q_101' })
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @ApiProperty({ description: 'Öğrencinin cevabı', example: 'A' })
  @IsString()
  @IsNotEmpty()
  studentAnswer!: string;

  @ApiProperty({ description: 'Doğru cevap', example: 'C' })
  @IsString()
  @IsNotEmpty()
  correctAnswer!: string;

  @ApiProperty({ description: 'Konu', example: 'Üslü İfadeler' })
  @IsString()
  @IsNotEmpty()
  topic!: string;

  @ApiProperty({ description: 'Zorluk', example: 'medium' })
  @IsString()
  @IsNotEmpty()
  difficulty!: string;
}

export class AnalyzeExamResultDto {
  @ApiProperty({ type: [QuestionResult], description: 'Sınav soru sonuçları' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionResult)
  examData!: QuestionResult[];

  @ApiProperty({ description: 'Ders', example: 'Matematik' })
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @ApiProperty({ description: 'Sınıf', example: 11 })
  @IsNumber()
  grade!: number;

  @ApiProperty({ description: 'Performans skoru', example: 78 })
  @IsNumber()
  performance!: number;

  @ApiProperty({ description: 'Kullanıcı ID', required: false })
  @IsString()
  @IsOptional()
  userId?: string;
}

