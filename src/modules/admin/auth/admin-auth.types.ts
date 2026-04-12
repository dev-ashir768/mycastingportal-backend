// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface AdminLoginDto {
  email: string;
  password: string;
}

export interface AdminRefreshTokenDto {
  refreshToken: string;
}

export interface AdminChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

// ─── Response Types ───────────────────────────────────────────────────────────

export interface AdminTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AdminResponse {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface AdminAuthResponse {
  admin: AdminResponse;
  tokens: AdminTokens;
}
