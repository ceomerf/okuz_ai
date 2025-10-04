import { IsString, IsNotEmpty, Length, IsOptional } from 'class-validator';

export class QuickChatDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 1000)
  message: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  grade?: string;
}
