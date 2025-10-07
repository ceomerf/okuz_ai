import { IsString, IsNotEmpty, Length, IsNumber, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SosQuestionDto {
  @ApiProperty({ description: 'Soru metni', required: false, minLength: 10, maxLength: 1000 })
  @IsString()
  @IsOptional()
  @Length(10, 1000)
  questionText?: string;

  @ApiProperty({ description: 'Ders', example: 'Matematik' })
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @ApiProperty({ description: 'Sınıf', required: false, minimum: 9, maximum: 12, example: 11 })
  @IsNumber()
  @Min(9)
  @Max(12)
  @IsOptional()
  grade?: number;

  @ApiProperty({ description: 'Görselin Base64 içeriği', required: false })
  @IsString()
  @IsOptional()
  imageBase64?: string;

  @ApiProperty({ description: 'Kullanıcı ID', required: false })
  @IsString()
  @IsOptional()
  userId?: string;
}
