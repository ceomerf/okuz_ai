import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly subscriptionService: SubscriptionService,
    private readonly configService: ConfigService,
  ) {}

  private async issueTokens(user: { id: string; email: string; role?: string }) {
    const now = Math.floor(Date.now() / 1000);
    const payload: { 
      email: string; 
      sub: string; 
      role?: string; 
      iat: number;
      jti: string;
    } = { 
      email: user.email, 
      sub: user.id,
      iat: now,
      jti: `${user.id}-${now}-${Math.random().toString(36).substr(2, 9)}`
    };
    if (user.role) payload.role = user.role;

    // Access token - kısa süreli
    const access_token = this.jwtService.sign(payload);
    
    // Refresh token - uzun süreli, farklı secret ile
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret || refreshSecret === this.configService.get<string>('JWT_SECRET')) {
      throw new Error('JWT_REFRESH_SECRET must be different from JWT_SECRET');
    }
    
    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: '7d',
    });

    // Refresh token'ı veritabanına kaydet
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 gün sonra

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    return { access_token, refreshToken };
  }

  async register(registerDto: { email: string; password: string; name: string; accountType?: string }) {
    const { email, password, name, accountType = 'STUDENT' } = registerDto;

    try {
      // Email kontrolü
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      // Şifre güvenlik kontrolü
      if (password.length < 8) {
        throw new BadRequestException('Password must be at least 8 characters long');
      }
      
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        throw new BadRequestException('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      }

      // Şifre hash'leme - güvenli salt rounds
      const saltRounds = parseInt(this.configService.get<string>('BCRYPT_SALT_ROUNDS') || '12');
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Account type'ı role'a çevir
      let role: 'STUDENT' | 'PARENT' | 'TEACHER' | 'ADMIN' = 'STUDENT';
      if (accountType === 'PARENT') {
        role = 'PARENT';
      } else if (accountType === 'TEACHER') {
        role = 'TEACHER';
      } else if (accountType === 'ADMIN') {
        role = 'ADMIN';
      }

      // Kullanıcı oluşturma
      const user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role,
        },
      });

      // Trial başlat
      await this.subscriptionService.startTrial(user.id);

      // Token üret
      const { access_token, refreshToken } = await this.issueTokens({ id: user.id, email: user.email, role });

      console.log('✅ User registered successfully:', email, 'Role:', role, 'Trial started');

      return {
        access_token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    } catch (error: any) {
      console.error('❌ Registration error:', error.message);
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new Error('Registration failed: ' + error.message);
    }
  }

  async login(loginDto: { email: string; password: string }) {
    const { email, password } = loginDto;

    // Kullanıcı kontrolü
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Şifre kontrolü
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Token üret
    const { access_token, refreshToken } = await this.issueTokens({ id: user.id, email: user.email });

    return {
      access_token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async refreshToken(data: { refreshToken: string }) {
    const { refreshToken } = data;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token gerekli');
    }

    try {
      // Önce veritabanından refresh token'ı kontrol et
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
        // Token geçersiz, kullanıcının tüm refresh token'larını iptal et
        if (storedToken?.userId) {
          await this.prisma.refreshToken.updateMany({
            where: { userId: storedToken.userId },
            data: { isRevoked: true },
          });
        }
        throw new UnauthorizedException('Geçersiz veya süresi dolmuş refresh token');
      }

      // Kullanıcının varlığını doğrula
      const user = storedToken.user;
      if (!user) {
        throw new UnauthorizedException('Kullanıcı bulunamadı');
      }

      // Eski refresh token'ı iptal et (rotation)
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      });

      // Yeni token'ları oluştur
      const { access_token, refreshToken: newRefreshToken } = await this.issueTokens({ 
        id: user.id, 
        email: user.email, 
        role: user.role 
      });

      return { token: access_token, refreshToken: newRefreshToken };
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        throw e;
      }
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş refresh token');
    }
  }
}
