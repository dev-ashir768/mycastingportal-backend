import { Request, Response, NextFunction } from 'express';
import { verifyUserAccessToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { prisma } from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';

// ─── Authenticate regular user ────────────────────────────────────────────────

export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No authentication token provided');
    }

    const token = authHeader.split(' ')[1];
    if (!token) throw ApiError.unauthorized('Malformed authorization header');

    const payload = verifyUserAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, roleId: true, isActive: true, deletedAt: true },
    });

    if (!user || user.deletedAt !== null) throw ApiError.unauthorized('User no longer exists');
    if (!user.isActive) throw ApiError.forbidden('Your account has been deactivated');

    req.user = { id: user.id, email: user.email, roleId: user.roleId };
    next();
  },
);

// ─── Email verified guard ─────────────────────────────────────────────────────

export const requireEmailVerified = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { isEmailVerified: true },
    });

    if (!user?.isEmailVerified) {
      throw ApiError.forbidden('Please verify your email address first');
    }
    next();
  },
);
