import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('complete-onboarding')
  @UseGuards(JwtAuthGuard)
  async completeOnboarding(@Body() onboardingData: any, @Request() req: any) {
    console.log('🎯 Complete onboarding request:', onboardingData);
    console.log('🎯 User ID from token:', req.user.sub);
    
    return this.usersService.completeOnboarding(req.user.sub, onboardingData);
  }
}
