import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class RescheduleSessionDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsDateString()
  @IsNotEmpty()
  newStartTime!: string; // ISO date string
}

