import { IsString, IsNotEmpty, Length, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QuickChatDto {
  @ApiProperty({ description: 'Mesaj içeriği', maxLength: 1000, example: 'Fotosentez nasıl çalışır?' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 1000)
  message!: string;

  @ApiProperty({ description: 'Konu/alan', required: false, example: 'Biyoloji' })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({ description: 'Sınıf seviyesi', required: false, example: '11' })
  @IsString()
  @IsOptional()
  grade?: string;
}
