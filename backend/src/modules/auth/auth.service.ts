import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  async login(loginDto: any) {
    return { token: 'mock-token', refreshToken: 'mock-refresh-token' };
  }

  async register(registerDto: any) {
    return { token: 'mock-token', refreshToken: 'mock-refresh-token' };
  }

  async refreshToken(refreshDto: any) {
    return { token: 'new-mock-token', refreshToken: 'new-mock-refresh-token' };
  }
}
