import { IsString, IsNotEmpty, Length, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class SosQuestionDto {
  @IsString()
  @IsOptional()
  @Length(10, 1000)
  questionText?: string;

  @IsString()
  @IsNotEmpty()
  subject!: string;

  @IsNumber()
  @Min(9)
  @Max(12)
  @IsOptional()
  grade?: number;

  @IsString()
  @IsOptional()
  imageBase64?: string;

  @IsString()
  @IsOptional()
  userId?: string;
}
