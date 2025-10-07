export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'PARENT' | 'COACH' | 'ADMIN';
  isActive: boolean;
  permissions: string[];
  metadata: Record<string, any>;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceInfo?: {
    userAgent: string;
    ip: string;
    deviceType: string;
  };
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: 'STUDENT' | 'PARENT' | 'COACH';
  metadata?: Record<string, any>;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
  jti: string; // jwt id
}

export interface AuthContext {
  user: AuthUser;
  requestId: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
}

export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface Role {
  name: string;
  permissions: Permission[];
  description?: string;
}
