import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from "../common/prisma/prisma.service"';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

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

      // Şifre hash'leme
      const hashedPassword = await bcrypt.hash(password, 10);

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

      // JWT token oluşturma
      const payload = { email: user.email, sub: user.id, role: user.role };
      const access_token = this.jwtService.sign(payload);

      console.log('✅ User registered successfully:', email, 'Role:', role);

      return {
        access_token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    } catch (error) {
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

    // JWT token oluşturma
    const payload = { email: user.email, sub: user.id };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }
}
