import { Request, Response, NextFunction } from 'express';
import { verifyAdminAccessToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { prisma } from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';

// ─── Authenticate admin ───────────────────────────────────────────────────────

export const authenticateAdmin = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No authentication token provided');
    }

    const token = authHeader.split(' ')[1];
    if (!token) throw ApiError.unauthorized('Malformed authorization header');

    const payload = verifyAdminAccessToken(token);

    const admin = await prisma.admin.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, isActive: true, deletedAt: true },
    });

    if (!admin || admin.deletedAt !== null) throw ApiError.unauthorized('Admin account not found');
    if (!admin.isActive) throw ApiError.forbidden('Admin account has been deactivated');

    req.admin = { id: admin.id, email: admin.email };
    next();
  },
);
