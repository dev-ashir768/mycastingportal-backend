import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { config } from './config/env';
import { logger, morganStream } from './config/logger';
import { globalRateLimiter } from './middleware/rateLimiter.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

// ── User routes ───────────────────────────────────────────────────────────────
import authRoutes from './modules/auth/auth.routes';
import { listActiveRoles } from './modules/auth/auth.controller';

// ── Admin routes ──────────────────────────────────────────────────────────────
import adminAuthRoutes from './modules/admin/auth/admin-auth.routes';
import adminRoleRoutes from './modules/admin/roles/role.routes';

const createApp = (): Application => {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: config.cors.origin.split(',').map((o) => o.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }),
  );

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Compression
  app.use(compression());

  // HTTP request logging
  if (config.env !== 'test') {
    app.use(
      morgan(config.env === 'production' ? 'combined' : 'dev', { stream: morganStream }),
    );
  }

  // Trust proxy (nginx / load balancer)
  app.set('trust proxy', 1);

  // Global rate limiter
  app.use('/api', globalRateLimiter);

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.env,
      version: process.env.npm_package_version ?? '1.0.0',
    });
  });

  // ── Public utility ─────────────────────────────────────────────────────────
  // Frontend signup form fetches available roles from here
  app.get('/api/v1/roles', listActiveRoles);

  // ── User auth routes (/api/v1/auth/*) ──────────────────────────────────────
  app.use('/api/v1/auth', authRoutes);

  // ── Admin routes (/api/v1/admin/*) ─────────────────────────────────────────
  app.use('/api/v1/admin/auth', adminAuthRoutes);
  app.use('/api/v1/admin/roles', adminRoleRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  logger.info('Express application initialized');

  return app;
};

export default createApp;
