import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsEnum } from 'class-validator';

export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  PARENT = 'PARENT',
  ADMIN = 'ADMIN',
}

export class RegisterDto {
  @ApiProperty({ 
    description: 'User email address',
    example: 'user@example.com',
    format: 'email'
  })
  @IsEmail()
  email!: string;

  @ApiProperty({ 
    description: 'User password (minimum 8 characters)',
    example: 'securepassword123',
    minLength: 8
  })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ 
    description: 'User full name',
    example: 'John Doe'
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ 
    description: 'Account type',
    enum: UserRole,
    example: UserRole.STUDENT,
    required: false
  })
  @IsOptional()
  @IsEnum(UserRole)
  accountType?: UserRole;
}

export class LoginDto {
  @ApiProperty({ 
    description: 'User email address',
    example: 'user@example.com',
    format: 'email'
  })
  @IsEmail()
  email!: string;

  @ApiProperty({ 
    description: 'User password',
    example: 'securepassword123'
  })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty({ 
    description: 'Refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class LogoutDto {
  @ApiProperty({ 
    description: 'Refresh token to invalidate',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class UserProfileDto {
  @ApiProperty({ description: 'User ID' })
  id!: string;

  @ApiProperty({ description: 'User email' })
  email!: string;

  @ApiProperty({ description: 'User name' })
  name!: string;

  @ApiProperty({ description: 'User role', enum: UserRole })
  role!: UserRole;

  @ApiProperty({ description: 'Account creation date' })
  createdAt!: string;

  @ApiProperty({ description: 'Last login date' })
  lastLoginAt?: string;

  @ApiProperty({ description: 'Account status' })
  isActive!: boolean;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  access_token!: string;

  @ApiProperty({ description: 'Refresh token' })
  refreshToken!: string;

  @ApiProperty({ description: 'Token expiration time in seconds' })
  expiresIn!: number;

  @ApiProperty({ description: 'User profile information' })
  user!: UserProfileDto;
}
