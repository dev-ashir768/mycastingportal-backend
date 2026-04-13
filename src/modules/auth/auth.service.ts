import { TokenType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import { config } from '../../config/env';
import { logger } from '../../config/logger';
import { ApiError } from '../../utils/ApiError';
import { hashPassword, comparePassword, generateSecureToken } from '../../utils/crypto';
import { generateUserAccessToken, generateUserRefreshToken, verifyUserRefreshToken } from '../../utils/jwt';
import { emailService } from '../../utils/email';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  VerifyEmailDto,
  RefreshTokenDto,
  AuthTokens,
  AuthResponse,
  UserResponse,
} from './auth.types';

class AuthService {
  private buildTokens(userId: string, email: string, roleId: string): AuthTokens & { tokenId: string } {
    const tokenId = uuidv4();
    const accessToken = generateUserAccessToken({ sub: userId, email, roleId });
    const refreshToken = generateUserRefreshToken({ sub: userId, tokenId });
    return { accessToken, refreshToken, expiresIn: config.jwt.refreshExpiresInMs, tokenId };
  }

  private async storeRefreshToken(userId: string, token: string, tokenId: string): Promise<void> {
    const expiresAt = new Date(Date.now() + config.jwt.refreshExpiresInMs);
    await prisma.token.create({
      data: { id: tokenId, token, type: TokenType.REFRESH, expiresAt, userId },
    });
  }

  private buildUserResponse(user: {
    id: string;
    fullName: string;
    email: string;
    isEmailVerified: boolean;
    isActive: boolean;
    avatar: string | null;
    phoneNumber: string | null;
    lastLoginAt: Date | null;
    createdAt: Date;
    role: { id: string; name: string; description: string };
  }): UserResponse {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
      },
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      avatar: user.avatar,
      phoneNumber: user.phoneNumber,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  // ── SELECT shape reused across queries ────────────────────────────────────
  private readonly userSelect = {
    id: true,
    fullName: true,
    email: true,
    roleId: true,
    isEmailVerified: true,
    isActive: true,
    avatar: true,
    phoneNumber: true,
    lastLoginAt: true,
    createdAt: true,
    role: { select: { id: true, name: true, description: true } },
  } as const;

  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Validate role exists and is active
    const role = await prisma.role.findFirst({
      where: { id: dto.roleId, isActive: true, deletedAt: null },
    });
    if (!role) throw ApiError.badRequest('The selected role is invalid or no longer available');

    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw ApiError.conflict('An account with this email already exists');

    const hashedPassword = await hashPassword(dto.password);

    const user = await prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        password: hashedPassword,
        roleId: dto.roleId,
      },
      select: this.userSelect,
    });

    // Email verification token
    const verificationToken = generateSecureToken();
    await prisma.token.create({
      data: {
        token: verificationToken,
        type: TokenType.EMAIL_VERIFICATION,
        expiresAt: new Date(Date.now() + config.tokens.emailVerificationExpiresMs),
        userId: user.id,
      },
    });

    // emailService
    //   .sendEmailVerification(user.email, user.fullName, verificationToken)
    //   .catch((err) => logger.error('Failed to send verification email', err));

    const { tokenId, ...tokens } = this.buildTokens(user.id, user.email, user.roleId);
    await this.storeRefreshToken(user.id, tokens.refreshToken, tokenId);

    return { user: this.buildUserResponse(user), tokens };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
      include: { role: { select: { id: true, name: true, description: true } } },
    });

    if (!user) throw ApiError.unauthorized('Invalid email or password');
    if (!user.isActive) throw ApiError.forbidden('Your account has been deactivated. Contact support.');

    // Check role is still active
    if (!user.role.id || !(await prisma.role.findFirst({ where: { id: user.roleId, isActive: true, deletedAt: null } }))) {
      throw ApiError.forbidden('Your assigned role has been deactivated. Contact support.');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw ApiError.tooManyRequests(`Account locked. Try again in ${remaining} minute(s).`);
    }

    const isPasswordValid = await comparePassword(dto.password, user.password);

    if (!isPasswordValid) {
      const attempts = user.failedLoginAttempts + 1;
      const shouldLock = attempts >= config.security.maxLoginAttempts;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: shouldLock ? new Date(Date.now() + config.security.lockoutDurationMs) : null,
        },
      });
      if (shouldLock) {
        throw ApiError.tooManyRequests('Account locked due to too many failed attempts. Try again in 15 minutes.');
      }
      throw ApiError.unauthorized('Invalid email or password');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const { tokenId, ...tokens } = this.buildTokens(user.id, user.email, user.roleId);
    await this.storeRefreshToken(user.id, tokens.refreshToken, tokenId);

    return { user: this.buildUserResponse(user), tokens };
  }

  async refreshTokens(dto: RefreshTokenDto): Promise<AuthTokens> {
    const payload = verifyUserRefreshToken(dto.refreshToken);

    const storedToken = await prisma.token.findUnique({
      where: { token: dto.refreshToken },
      include: { user: { include: { role: { select: { id: true, name: true, description: true } } } } },
    });

    if (!storedToken || storedToken.used || storedToken.expiresAt < new Date()) {
      if (storedToken?.used) {
        await prisma.token.deleteMany({ where: { userId: payload.sub, type: TokenType.REFRESH } });
        logger.warn(`Refresh token reuse detected for user: ${payload.sub}`);
      }
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    if (!storedToken.user.isActive || storedToken.user.deletedAt) {
      throw ApiError.forbidden('Account is no longer active');
    }

    await prisma.token.update({ where: { id: storedToken.id }, data: { used: true } });

    const { tokenId, ...newTokens } = this.buildTokens(
      storedToken.user.id,
      storedToken.user.email,
      storedToken.user.roleId,
    );
    await this.storeRefreshToken(storedToken.user.id, newTokens.refreshToken, tokenId);

    return newTokens;
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await prisma.token.deleteMany({ where: { token: refreshToken, userId } });
    } else {
      await prisma.token.deleteMany({ where: { userId, type: TokenType.REFRESH } });
    }
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<UserResponse> {
    const tokenRecord = await prisma.token.findUnique({
      where: { token: dto.token },
      include: { user: { include: { role: { select: { id: true, name: true, description: true } } } } },
    });

    if (
      !tokenRecord ||
      tokenRecord.type !== TokenType.EMAIL_VERIFICATION ||
      tokenRecord.used ||
      tokenRecord.expiresAt < new Date()
    ) {
      throw ApiError.badRequest('Invalid or expired verification token');
    }

    if (tokenRecord.user.isEmailVerified) throw ApiError.conflict('Email is already verified');

    const [user] = await prisma.$transaction([
      prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { isEmailVerified: true },
        select: this.userSelect,
      }),
      prisma.token.update({ where: { id: tokenRecord.id }, data: { used: true } }),
    ]);

    emailService
      .sendWelcome(user.email, user.fullName)
      .catch((err) => logger.error('Failed to send welcome email', err));

    return this.buildUserResponse(user);
  }

  async resendVerificationEmail(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true, email: true, isEmailVerified: true } });
    if (!user) throw ApiError.notFound('User not found');
    if (user.isEmailVerified) throw ApiError.conflict('Email is already verified');

    await prisma.token.deleteMany({ where: { userId, type: TokenType.EMAIL_VERIFICATION } });

    const verificationToken = generateSecureToken();
    await prisma.token.create({
      data: {
        token: verificationToken,
        type: TokenType.EMAIL_VERIFICATION,
        expiresAt: new Date(Date.now() + config.tokens.emailVerificationExpiresMs),
        userId,
      },
    });

    await emailService.sendEmailVerification(user.email, user.fullName, verificationToken);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { email: dto.email, isActive: true, deletedAt: null },
      select: { id: true, fullName: true, email: true },
    });
    if (!user) return; // Prevent user enumeration

    await prisma.token.deleteMany({ where: { userId: user.id, type: TokenType.PASSWORD_RESET } });

    const resetToken = generateSecureToken();
    await prisma.token.create({
      data: {
        token: resetToken,
        type: TokenType.PASSWORD_RESET,
        expiresAt: new Date(Date.now() + config.tokens.passwordResetExpiresMs),
        userId: user.id,
      },
    });

    await emailService.sendPasswordReset(user.email, user.fullName, resetToken);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenRecord = await prisma.token.findUnique({ where: { token: dto.token } });

    if (
      !tokenRecord ||
      tokenRecord.type !== TokenType.PASSWORD_RESET ||
      tokenRecord.used ||
      tokenRecord.expiresAt < new Date()
    ) {
      throw ApiError.badRequest('Invalid or expired password reset token');
    }

    const hashedPassword = await hashPassword(dto.password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { password: hashedPassword, passwordChangedAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
      }),
      prisma.token.update({ where: { id: tokenRecord.id }, data: { used: true } }),
      prisma.token.deleteMany({ where: { userId: tokenRecord.userId, type: TokenType.REFRESH } }),
    ]);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
    if (!user) throw ApiError.notFound('User not found');

    const isCurrentPasswordValid = await comparePassword(dto.currentPassword, user.password);
    if (!isCurrentPasswordValid) throw ApiError.badRequest('Current password is incorrect');

    if (dto.currentPassword === dto.newPassword) {
      throw ApiError.badRequest('New password must be different from current password');
    }

    const hashedPassword = await hashPassword(dto.newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword, passwordChangedAt: new Date(), updatedBy: userId },
      }),
      prisma.token.deleteMany({ where: { userId, type: TokenType.REFRESH } }),
    ]);
  }

  async getMe(userId: string): Promise<UserResponse> {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: this.userSelect,
    });
    if (!user) throw ApiError.notFound('User not found');
    return this.buildUserResponse(user);
  }
}

export const authService = new AuthService();
