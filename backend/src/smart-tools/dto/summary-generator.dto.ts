import { IsString, IsNotEmpty, Length, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SummaryType {
  PARAGRAPH = 'paragraph',
  BULLET_POINTS = 'bullet_points',
  OUTLINE = 'outline',
  MIND_MAP = 'mind_map'
}

export class SummaryGeneratorDto {
  @ApiProperty({ description: 'Özetlenecek içerik', minLength: 50, maxLength: 10000 })
  @IsString()
  @IsNotEmpty()
  @Length(50, 10000)
  content!: string;

  @ApiProperty({ description: 'Özet tipi', enum: SummaryType, example: SummaryType.BULLET_POINTS })
  @IsEnum(SummaryType)
  type!: SummaryType;

  @ApiProperty({ description: 'İsteğe bağlı başlık', required: false, maxLength: 200 })
  @IsString()
  @IsOptional()
  @Length(1, 200)
  title?: string;

  @ApiProperty({ description: 'Detay seviyesi (1-10)', required: false, minimum: 1, maximum: 10 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10)
  detailLevel?: number;
}
