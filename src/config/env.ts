import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const getEnv = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const getEnvNumber = (key: string, fallback?: number): number => {
  const value = process.env[key];
  if (value === undefined) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) throw new Error(`Environment variable ${key} must be a number`);
  return parsed;
};

const getEnvBoolean = (key: string, fallback: boolean): boolean => {
  const value = process.env[key];
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
};

export const config = {
  env: getEnv('NODE_ENV', 'development') as 'development' | 'production' | 'test',
  port: getEnvNumber('PORT', 5000),

  database: {
    url: getEnv('DATABASE_URL'),
  },

  // JWT for regular users
  jwt: {
    accessSecret: getEnv('JWT_ACCESS_SECRET'),
    refreshSecret: getEnv('JWT_REFRESH_SECRET'),
    accessExpiresIn: getEnv('JWT_ACCESS_EXPIRES_IN', '15m'),
    refreshExpiresIn: getEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
    refreshExpiresInMs: getEnvNumber('JWT_REFRESH_EXPIRES_IN_MS', 7 * 24 * 60 * 60 * 1000),
  },

  // JWT for admin — separate secrets, shorter refresh lifetime
  adminJwt: {
    accessSecret: getEnv('JWT_ADMIN_ACCESS_SECRET'),
    refreshSecret: getEnv('JWT_ADMIN_REFRESH_SECRET'),
    accessExpiresIn: getEnv('JWT_ADMIN_ACCESS_EXPIRES_IN', '15m'),
    refreshExpiresIn: getEnv('JWT_ADMIN_REFRESH_EXPIRES_IN', '1d'),
    refreshExpiresInMs: getEnvNumber('JWT_ADMIN_REFRESH_EXPIRES_IN_MS', 24 * 60 * 60 * 1000),
  },

  cors: {
    origin: getEnv('CORS_ORIGIN', 'http://localhost:3000'),
  },

  email: {
    host: getEnv('EMAIL_HOST', 'smtp.gmail.com'),
    port: getEnvNumber('EMAIL_PORT', 587),
    secure: getEnvBoolean('EMAIL_SECURE', false),
    user: getEnv('EMAIL_USER'),
    pass: getEnv('EMAIL_PASS'),
    from: getEnv('EMAIL_FROM'),
    fromName: getEnv('EMAIL_FROM_NAME', 'Actor Agency'),
  },

  client: {
    url: getEnv('CLIENT_URL', 'http://localhost:3000'),
  },

  rateLimit: {
    windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    max: getEnvNumber('RATE_LIMIT_MAX', 100),
    authMax: getEnvNumber('RATE_LIMIT_AUTH_MAX', 10),
  },

  security: {
    bcryptRounds: getEnvNumber('BCRYPT_ROUNDS', 12),
    maxLoginAttempts: getEnvNumber('MAX_LOGIN_ATTEMPTS', 5),
    lockoutDurationMs: getEnvNumber('LOCKOUT_DURATION_MS', 15 * 60 * 1000),
  },

  tokens: {
    emailVerificationExpiresMs: getEnvNumber('EMAIL_VERIFICATION_EXPIRES_MS', 24 * 60 * 60 * 1000),
    passwordResetExpiresMs: getEnvNumber('PASSWORD_RESET_EXPIRES_MS', 60 * 60 * 1000),
  },
} as const;

export type Config = typeof config;
