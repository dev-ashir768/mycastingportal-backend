// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface RegisterDto {
  fullName: string;
  email: string;
  password: string;
  roleId: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface VerifyEmailDto {
  token: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

// ─── Response Types ───────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserRoleResponse {
  id: string;
  name: string;
  description: string;
}

export interface UserResponse {
  id: string;
  fullName: string;
  email: string;
  role: UserRoleResponse;
  isEmailVerified: boolean;
  isActive: boolean;
  avatar: string | null;
  phoneNumber: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface AuthResponse {
  user: UserResponse;
  tokens: AuthTokens;
}
