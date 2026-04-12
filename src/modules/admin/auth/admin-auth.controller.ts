import { Request, Response } from 'express';
import { adminAuthService } from './admin-auth.service';
import { ApiResponse } from '../../../utils/ApiResponse';
import { asyncHandler } from '../../../utils/asyncHandler';
import {
  AdminLoginDto,
  AdminRefreshTokenDto,
  AdminChangePasswordDto,
} from './admin-auth.types';
import { config } from '../../../config/env';

const ADMIN_REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: 'strict' as const,
  maxAge: config.adminJwt.refreshExpiresInMs,
  path: '/api/v1/admin/auth/refresh',
};

export const adminLogin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await adminAuthService.login(req.body as AdminLoginDto);
  res.cookie('adminRefreshToken', result.tokens.refreshToken, ADMIN_REFRESH_COOKIE_OPTIONS);
  ApiResponse.ok(res, 'Admin login successful', {
    admin: result.admin,
    accessToken: result.tokens.accessToken,
    expiresIn: result.tokens.expiresIn,
  });
});

export const adminLogout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const refreshToken = req.cookies?.adminRefreshToken as string | undefined;
  await adminAuthService.logout(req.admin!.id, refreshToken);
  res.clearCookie('adminRefreshToken', { path: '/api/v1/admin/auth/refresh' });
  ApiResponse.ok(res, 'Admin logout successful');
});

export const adminLogoutAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await adminAuthService.logout(req.admin!.id);
  res.clearCookie('adminRefreshToken', { path: '/api/v1/admin/auth/refresh' });
  ApiResponse.ok(res, 'Logged out from all admin sessions');
});

export const adminRefreshTokens = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const refreshToken =
      (req.cookies?.adminRefreshToken as string | undefined) ??
      (req.body as AdminRefreshTokenDto).refreshToken;

    if (!refreshToken) {
      res.status(401).json({ success: false, message: 'No refresh token provided' });
      return;
    }

    const tokens = await adminAuthService.refreshTokens({ refreshToken });
    res.cookie('adminRefreshToken', tokens.refreshToken, ADMIN_REFRESH_COOKIE_OPTIONS);
    ApiResponse.ok(res, 'Tokens refreshed', {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    });
  },
);

export const adminGetMe = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const admin = await adminAuthService.getMe(req.admin!.id);
  ApiResponse.ok(res, 'Admin profile retrieved', { admin });
});

export const adminChangePassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    await adminAuthService.changePassword(
      req.admin!.id,
      req.body as AdminChangePasswordDto,
    );
    ApiResponse.ok(res, 'Password changed successfully. All sessions have been invalidated.');
  },
);
