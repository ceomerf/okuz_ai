import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getUsers() {
    return { message: 'Users endpoint is working' };
  }

  @Post('complete-onboarding')
  @UseGuards(JwtAuthGuard)
  async completeOnboarding(@Body() onboardingData: any, @Request() req: any) {
    console.log('🎯 Complete onboarding request:', onboardingData);
    console.log('🎯 User ID from token:', req.user?.id);
    
    return this.usersService.completeOnboarding(req.user.id, onboardingData);
  }
}
