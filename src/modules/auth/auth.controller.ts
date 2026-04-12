import { Request, Response } from 'express';
import { authService } from './auth.service';
import { roleService } from '../admin/roles/role.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  VerifyEmailDto,
  RefreshTokenDto,
} from './auth.types';
import { config } from '../../config/env';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: 'strict' as const,
  maxAge: config.jwt.refreshExpiresInMs,
  path: '/api/v1/auth/refresh',
};

// GET /api/v1/roles — public, used by frontend signup form
export const listActiveRoles = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const roles = await roleService.findActiveRoles();
  ApiResponse.ok(res, 'Available roles retrieved', { roles });
});

export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await authService.register(req.body as RegisterDto);
  res.cookie('refreshToken', result.tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
  ApiResponse.created(res, 'Registration successful. Please check your email to verify your account.', {
    user: result.user,
    accessToken: result.tokens.accessToken,
    expiresIn: result.tokens.expiresIn,
  });
});

export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await authService.login(req.body as LoginDto);
  res.cookie('refreshToken', result.tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
  ApiResponse.ok(res, 'Login successful', {
    user: result.user,
    accessToken: result.tokens.accessToken,
    expiresIn: result.tokens.expiresIn,
  });
});

export const logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const refreshToken = req.cookies?.refreshToken as string | undefined;
  await authService.logout(req.user!.id, refreshToken);
  res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
  ApiResponse.ok(res, 'Logout successful');
});

export const logoutAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await authService.logout(req.user!.id);
  res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
  ApiResponse.ok(res, 'Logged out from all devices');
});

export const refreshTokens = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const refreshToken =
    (req.cookies?.refreshToken as string | undefined) ??
    (req.body as RefreshTokenDto).refreshToken;

  if (!refreshToken) {
    res.status(401).json({ success: false, message: 'No refresh token provided' });
    return;
  }

  const tokens = await authService.refreshTokens({ refreshToken });
  res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
  ApiResponse.ok(res, 'Tokens refreshed', {
    accessToken: tokens.accessToken,
    expiresIn: tokens.expiresIn,
  });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = await authService.verifyEmail(req.body as VerifyEmailDto);
  ApiResponse.ok(res, 'Email verified successfully', { user });
});

export const resendVerificationEmail = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    await authService.resendVerificationEmail(req.user!.id);
    ApiResponse.ok(res, 'Verification email sent. Please check your inbox.');
  },
);

export const forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await authService.forgotPassword(req.body as ForgotPasswordDto);
  ApiResponse.ok(res, 'If an account with that email exists, a password reset link has been sent.');
});

export const resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await authService.resetPassword(req.body as ResetPasswordDto);
  ApiResponse.ok(res, 'Password reset successful. Please log in with your new password.');
});

export const changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await authService.changePassword(req.user!.id, req.body as ChangePasswordDto);
  ApiResponse.ok(res, 'Password changed successfully. Please log in again.');
});

export const getMe = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = await authService.getMe(req.user!.id);
  ApiResponse.ok(res, 'Profile retrieved', { user });
});
