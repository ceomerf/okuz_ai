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
  async login(@Body() loginDto: any) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  async register(@Body() registerDto: any) {
    return this.authService.register(registerDto);
  }

  @Post('refresh')
  async refreshToken(@Body() refreshDto: any) {
    return this.authService.refreshToken(refreshDto);
  }
}
