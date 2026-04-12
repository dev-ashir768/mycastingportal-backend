import { TokenType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../../config/database';
import { config } from '../../../config/env';
import { logger } from '../../../config/logger';
import { ApiError } from '../../../utils/ApiError';
import { hashPassword, comparePassword } from '../../../utils/crypto';
import {
  generateAdminAccessToken,
  generateAdminRefreshToken,
  verifyAdminRefreshToken,
} from '../../../utils/jwt';
import {
  AdminLoginDto,
  AdminRefreshTokenDto,
  AdminChangePasswordDto,
  AdminTokens,
  AdminAuthResponse,
  AdminResponse,
} from './admin-auth.types';

class AdminAuthService {
  private buildTokens(adminId: string, email: string): AdminTokens & { tokenId: string } {
    const tokenId = uuidv4();
    const accessToken = generateAdminAccessToken({ sub: adminId, email });
    const refreshToken = generateAdminRefreshToken({ sub: adminId, tokenId });
    return { accessToken, refreshToken, expiresIn: config.adminJwt.refreshExpiresInMs, tokenId };
  }

  private formatAdmin(admin: {
    id: string;
    fullName: string;
    email: string;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
  }): AdminResponse {
    return {
      id: admin.id,
      fullName: admin.fullName,
      email: admin.email,
      isActive: admin.isActive,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
    };
  }

  private async storeRefreshToken(adminId: string, token: string, tokenId: string): Promise<void> {
    const expiresAt = new Date(Date.now() + config.adminJwt.refreshExpiresInMs);
    await prisma.adminToken.create({
      data: { id: tokenId, token, type: TokenType.REFRESH, expiresAt, adminId },
    });
  }

  async login(dto: AdminLoginDto): Promise<AdminAuthResponse> {
    const admin = await prisma.admin.findUnique({ where: { email: dto.email } });

    if (!admin || admin.deletedAt !== null) {
      throw ApiError.unauthorized('Invalid email or password');
    }
    if (!admin.isActive) {
      throw ApiError.forbidden('Admin account has been deactivated');
    }

    // Account lockout check
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      const remaining = Math.ceil((admin.lockedUntil.getTime() - Date.now()) / 60000);
      throw ApiError.tooManyRequests(
        `Account locked. Try again in ${remaining} minute(s).`,
      );
    }

    const isPasswordValid = await comparePassword(dto.password, admin.password);

    if (!isPasswordValid) {
      const attempts = admin.failedLoginAttempts + 1;
      const shouldLock = attempts >= config.security.maxLoginAttempts;
      await prisma.admin.update({
        where: { id: admin.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: shouldLock
            ? new Date(Date.now() + config.security.lockoutDurationMs)
            : null,
        },
      });
      if (shouldLock) {
        throw ApiError.tooManyRequests('Account locked due to too many failed attempts. Try again in 15 minutes.');
      }
      throw ApiError.unauthorized('Invalid email or password');
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const { tokenId, ...tokens } = this.buildTokens(admin.id, admin.email);
    await this.storeRefreshToken(admin.id, tokens.refreshToken, tokenId);

    return { admin: this.formatAdmin(admin), tokens };
  }

  async refreshTokens(dto: AdminRefreshTokenDto): Promise<AdminTokens> {
    const payload = verifyAdminRefreshToken(dto.refreshToken);

    const storedToken = await prisma.adminToken.findUnique({
      where: { token: dto.refreshToken },
      include: { admin: true },
    });

    if (!storedToken || storedToken.used || storedToken.expiresAt < new Date()) {
      if (storedToken?.used) {
        await prisma.adminToken.deleteMany({
          where: { adminId: payload.sub, type: TokenType.REFRESH },
        });
        logger.warn(`Admin refresh token reuse detected: ${payload.sub}`);
      }
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    if (!storedToken.admin.isActive) {
      throw ApiError.forbidden('Admin account has been deactivated');
    }

    // Rotate token
    await prisma.adminToken.update({ where: { id: storedToken.id }, data: { used: true } });

    const { tokenId, ...newTokens } = this.buildTokens(storedToken.admin.id, storedToken.admin.email);
    await this.storeRefreshToken(storedToken.admin.id, newTokens.refreshToken, tokenId);

    return newTokens;
  }

  async logout(adminId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await prisma.adminToken.deleteMany({ where: { token: refreshToken, adminId } });
    } else {
      await prisma.adminToken.deleteMany({ where: { adminId, type: TokenType.REFRESH } });
    }
  }

  async changePassword(adminId: string, dto: AdminChangePasswordDto): Promise<void> {
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) throw ApiError.notFound('Admin not found');

    const isCurrentPasswordValid = await comparePassword(dto.currentPassword, admin.password);
    if (!isCurrentPasswordValid) throw ApiError.badRequest('Current password is incorrect');

    if (dto.currentPassword === dto.newPassword) {
      throw ApiError.badRequest('New password must be different from the current password');
    }

    const hashedPassword = await hashPassword(dto.newPassword);

    await prisma.$transaction([
      prisma.admin.update({
        where: { id: adminId },
        data: {
          password: hashedPassword,
          passwordChangedAt: new Date(),
          updatedBy: adminId,
        },
      }),
      prisma.adminToken.deleteMany({ where: { adminId, type: TokenType.REFRESH } }),
    ]);
  }

  async getMe(adminId: string): Promise<AdminResponse> {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true, fullName: true, email: true,
        isActive: true, lastLoginAt: true, createdAt: true,
      },
    });
    if (!admin) throw ApiError.notFound('Admin not found');
    return this.formatAdmin(admin);
  }
}

export const adminAuthService = new AdminAuthService();
