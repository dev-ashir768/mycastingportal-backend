import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';
import { config } from '../config/env';

interface ErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string>[];
  stack?: string;
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): Response => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Handle known API errors
  if (err instanceof ApiError) {
    const body: ErrorResponse = {
      success: false,
      message: err.message,
    };
    if (err.errors.length > 0) body.errors = err.errors;
    if (config.env === 'development') body.stack = err.stack;
    return res.status(err.statusCode).json(body);
  }

  // Handle Prisma unique constraint violations
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const fields = (err.meta?.target as string[]) ?? [];
      return res.status(409).json({
        success: false,
        message: `A record with this ${fields.join(', ')} already exists`,
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Record not found',
      });
    }
  }

  // Handle Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      success: false,
      message: 'Invalid data provided',
    });
  }

  // Handle JWT errors (fallback, most handled in utils/jwt.ts)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  // Unhandled errors
  const body: ErrorResponse = {
    success: false,
    message: config.env === 'production' ? 'Internal server error' : err.message,
  };
  if (config.env === 'development') body.stack = err.stack;

  return res.status(500).json(body);
};

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};
