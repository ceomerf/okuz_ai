import { IsString, IsNotEmpty, Length, IsOptional, IsEnum } from 'class-validator';

export enum SummaryType {
  PARAGRAPH = 'paragraph',
  BULLET_POINTS = 'bullet_points',
  OUTLINE = 'outline',
  MIND_MAP = 'mind_map'
}

export class SummaryGeneratorDto {
  @IsString()
  @IsNotEmpty()
  @Length(50, 10000)
  content: string;

  @IsEnum(SummaryType)
  type: SummaryType;

  @IsString()
  @IsOptional()
  @Length(1, 200)
  title?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10)
  detailLevel?: number;
}
