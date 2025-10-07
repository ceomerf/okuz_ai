import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class AnalyzeLearningPathDto {
  @IsString()
  @IsNotEmpty()
  pathId: string;

  @IsArray()
  @IsNotEmpty()
  progress: any[];

  @IsObject()
  @IsOptional()
  performance?: any;

  @IsString()
  @IsOptional()
  userId?: string;
}

