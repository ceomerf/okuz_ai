import { Controller, Post, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  getAuthInfo() {
    return { message: 'Auth endpoint working', endpoints: ['login', 'register', 'refresh'] };
  }

  @Post('login')
  login(@Body() loginDto: any) {
    return { message: 'Login endpoint', data: loginDto };
  }

  @Post('register')
  register(@Body() registerDto: any) {
    return { message: 'Register endpoint', data: registerDto };
  }

  @Post('refresh')
  refresh(@Body() refreshDto: any) {
    return { message: 'Refresh token endpoint', data: refreshDto };
  }
}
