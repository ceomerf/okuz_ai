import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AnalyzeStudyPatternDto {
  @IsArray()
  @IsNotEmpty()
  studySessions: any[];

  @IsString()
  @IsIn(['week', 'month', 'quarter', 'custom'])
  timeRange: string;

  @IsString()
  @IsOptional()
  userId?: string;
}

