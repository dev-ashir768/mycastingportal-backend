import { PrismaClient } from '@prisma/client';
import { config } from './env';
import { logger } from './logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const createPrismaClient = (): PrismaClient => {
  return new PrismaClient({
    log:
      config.env === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ]
        : [{ emit: 'event', level: 'error' }],
  });
};

export const prisma = global.__prisma ?? createPrismaClient();

if (config.env !== 'production') {
  global.__prisma = prisma;
}

if (config.env === 'development') {
  (prisma as PrismaClient & { $on: (event: string, cb: (e: { query: string; duration: number }) => void) => void }).$on('query', (e) => {
    logger.debug(`Query: ${e.query} | Duration: ${e.duration}ms`);
  });
}

(prisma as PrismaClient & { $on: (event: string, cb: (e: { message: string }) => void) => void }).$on('error', (e) => {
  logger.error(`Prisma error: ${e.message}`);
});

export const connectDatabase = async (): Promise<void> => {
  await prisma.$connect();
  logger.info('Database connected successfully');
};

export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
  logger.info('Database disconnected');
};
