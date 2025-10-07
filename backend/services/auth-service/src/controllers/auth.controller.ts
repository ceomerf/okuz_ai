import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Request, Response, Get, Query, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { ValidationService } from '../services/validation.service';
import { AuditService } from '../services/audit.service';
import { LoginDto, RegisterDto, RefreshTokenDto, PasswordResetDto, PasswordResetConfirmDto, ChangePasswordDto } from '../dto/auth.dto';
import { LoginResponseDto, RegisterResponseDto, UserResponseDto } from '../dto/response.dto';
import { ResponseUtil } from '../../../shared/utils/src/response.util';
import { LoggerUtil } from '../../../shared/utils/src/logger.util';

@ApiTags('Authentication')
@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly validationService: ValidationService,
    private readonly auditService: AuditService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ 
    summary: 'User login',
    description: 'Authenticate user with email and password. Returns JWT tokens and user information.'
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    type: LoginResponseDto 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Invalid credentials' 
  })
  @ApiResponse({ 
    status: 429, 
    description: 'Too many login attempts' 
  })
  async login(
    @Body(ValidationPipe) loginDto: LoginDto,
    @Request() req: any,
    @Response() res: any,
  ) {
    try {
      const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;
      
      // Validate input
      const validation = await this.validationService.validateLogin(loginDto);
      if (!validation.isValid) {
        LoggerUtil.warn('Login validation failed', { 
          requestId, 
          errors: validation.errors 
        });
        return res.json(ResponseUtil.validationError(validation.errors, requestId));
      }

      // Attempt login
      const result = await this.authService.login(loginDto, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        requestId,
      });

      if (!result.success) {
        LoggerUtil.warn('Login failed', { 
          requestId, 
          email: loginDto.email,
          reason: result.message 
        });
        return res.json(ResponseUtil.unauthorized(result.message, requestId));
      }

      // Audit log
      await this.auditService.logLogin(result.user.id, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        success: true,
        requestId,
      });

      LoggerUtil.info('Login successful', { 
        requestId, 
        userId: result.user.id,
        email: result.user.email 
      });

      return res.json(ResponseUtil.success(result, 'Login successful', requestId));
    } catch (error) {
      LoggerUtil.error('Login error', error, { 
        requestId: req.headers['x-request-id'] 
      });
      return res.json(ResponseUtil.internalError('Login failed', error.message, req.headers['x-request-id']));
    }
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ 
    summary: 'User registration',
    description: 'Register a new user account. Returns user information and JWT tokens.'
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Registration successful',
    type: RegisterResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid input data' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'User already exists' 
  })
  async register(
    @Body(ValidationPipe) registerDto: RegisterDto,
    @Request() req: any,
    @Response() res: any,
  ) {
    try {
      const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;
      
      // Validate input
      const validation = await this.validationService.validateRegister(registerDto);
      if (!validation.isValid) {
        LoggerUtil.warn('Registration validation failed', { 
          requestId, 
          errors: validation.errors 
        });
        return res.json(ResponseUtil.validationError(validation.errors, requestId));
      }

      // Attempt registration
      const result = await this.authService.register(registerDto, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        requestId,
      });

      if (!result.success) {
        LoggerUtil.warn('Registration failed', { 
          requestId, 
          email: registerDto.email,
          reason: result.message 
        });
        return res.json(ResponseUtil.badRequest(result.message, 'REGISTRATION_FAILED', requestId));
      }

      // Audit log
      await this.auditService.logRegistration(result.user.id, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        success: true,
        requestId,
      });

      LoggerUtil.info('Registration successful', { 
        requestId, 
        userId: result.user.id,
        email: result.user.email 
      });

      return res.json(ResponseUtil.created(result, 'Registration successful', requestId));
    } catch (error) {
      LoggerUtil.error('Registration error', error, { 
        requestId: req.headers['x-request-id'] 
      });
      return res.json(ResponseUtil.internalError('Registration failed', error.message, req.headers['x-request-id']));
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ 
    summary: 'Refresh access token',
    description: 'Refresh JWT access token using refresh token.'
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Token refreshed successfully' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Invalid refresh token' 
  })
  async refresh(
    @Body(ValidationPipe) refreshDto: RefreshTokenDto,
    @Request() req: any,
    @Response() res: any,
  ) {
    try {
      const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;
      
      const result = await this.authService.refreshToken(refreshDto.refreshToken, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        requestId,
      });

      if (!result.success) {
        LoggerUtil.warn('Token refresh failed', { 
          requestId, 
          reason: result.message 
        });
        return res.json(ResponseUtil.unauthorized(result.message, requestId));
      }

      LoggerUtil.info('Token refreshed successfully', { 
        requestId, 
        userId: result.user.id 
      });

      return res.json(ResponseUtil.success(result, 'Token refreshed successfully', requestId));
    } catch (error) {
      LoggerUtil.error('Token refresh error', error, { 
        requestId: req.headers['x-request-id'] 
      });
      return res.json(ResponseUtil.internalError('Token refresh failed', error.message, req.headers['x-request-id']));
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ 
    summary: 'User logout',
    description: 'Logout user and invalidate tokens.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Logout successful' 
  })
  async logout(
    @Request() req: any,
    @Response() res: any,
  ) {
    try {
      const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;
      const userId = req.user?.id;

      if (userId) {
        await this.authService.logout(userId, {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          requestId,
        });

        // Audit log
        await this.auditService.logLogout(userId, {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          success: true,
          requestId,
        });

        LoggerUtil.info('Logout successful', { 
          requestId, 
          userId 
        });
      }

      return res.json(ResponseUtil.success(null, 'Logout successful', requestId));
    } catch (error) {
      LoggerUtil.error('Logout error', error, { 
        requestId: req.headers['x-request-id'] 
      });
      return res.json(ResponseUtil.internalError('Logout failed', error.message, req.headers['x-request-id']));
    }
  }

  @Post('password-reset')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ 
    summary: 'Request password reset',
    description: 'Send password reset email to user.'
  })
  @ApiBody({ type: PasswordResetDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Password reset email sent' 
  })
  async requestPasswordReset(
    @Body(ValidationPipe) passwordResetDto: PasswordResetDto,
    @Request() req: any,
    @Response() res: any,
  ) {
    try {
      const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;
      
      const result = await this.authService.requestPasswordReset(passwordResetDto.email, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        requestId,
      });

      LoggerUtil.info('Password reset requested', { 
        requestId, 
        email: passwordResetDto.email 
      });

      return res.json(ResponseUtil.success(null, 'Password reset email sent', requestId));
    } catch (error) {
      LoggerUtil.error('Password reset request error', error, { 
        requestId: req.headers['x-request-id'] 
      });
      return res.json(ResponseUtil.internalError('Password reset request failed', error.message, req.headers['x-request-id']));
    }
  }

  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ 
    summary: 'Confirm password reset',
    description: 'Reset password using reset token.'
  })
  @ApiBody({ type: PasswordResetConfirmDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Password reset successful' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid or expired token' 
  })
  async confirmPasswordReset(
    @Body(ValidationPipe) passwordResetConfirmDto: PasswordResetConfirmDto,
    @Request() req: any,
    @Response() res: any,
  ) {
    try {
      const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;
      
      const result = await this.authService.confirmPasswordReset(
        passwordResetConfirmDto.token,
        passwordResetConfirmDto.newPassword,
        {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          requestId,
        }
      );

      if (!result.success) {
        LoggerUtil.warn('Password reset confirmation failed', { 
          requestId, 
          reason: result.message 
        });
        return res.json(ResponseUtil.badRequest(result.message, 'PASSWORD_RESET_FAILED', requestId));
      }

      LoggerUtil.info('Password reset confirmed', { 
        requestId, 
        userId: result.userId 
      });

      return res.json(ResponseUtil.success(null, 'Password reset successful', requestId));
    } catch (error) {
      LoggerUtil.error('Password reset confirmation error', error, { 
        requestId: req.headers['x-request-id'] 
      });
      return res.json(ResponseUtil.internalError('Password reset confirmation failed', error.message, req.headers['x-request-id']));
    }
  }

  @Get('me')
  @UseGuards(ThrottlerGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get current user',
    description: 'Get current authenticated user information.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User information retrieved',
    type: UserResponseDto 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized' 
  })
  async getCurrentUser(
    @Request() req: any,
    @Response() res: any,
  ) {
    try {
      const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;
      const user = req.user;

      LoggerUtil.info('Current user retrieved', { 
        requestId, 
        userId: user.id 
      });

      return res.json(ResponseUtil.success(user, 'User information retrieved', requestId));
    } catch (error) {
      LoggerUtil.error('Get current user error', error, { 
        requestId: req.headers['x-request-id'] 
      });
      return res.json(ResponseUtil.internalError('Failed to get user information', error.message, req.headers['x-request-id']));
    }
  }
}
