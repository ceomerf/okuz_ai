import { IsArray, IsIn, IsNotEmpty, IsString } from 'class-validator';

export class AnalyzeStudyPatternDto {
  @IsArray()
  @IsNotEmpty()
  studySessions: any[];

  @IsString()
  @IsIn(['week', 'month', 'quarter', 'custom'])
  timeRange: string;
}

