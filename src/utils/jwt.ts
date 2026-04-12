import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { config } from '../config/env';
import { ApiError } from './ApiError';

// ─── Payload Types ────────────────────────────────────────────────────────────

export interface UserAccessTokenPayload {
  sub: string;      // userId
  email: string;
  roleId: string;
  entity: 'user';
  type: 'access';
}

export interface UserRefreshTokenPayload {
  sub: string;      // userId
  entity: 'user';
  type: 'refresh';
  tokenId: string;
}

export interface AdminAccessTokenPayload {
  sub: string;      // adminId
  email: string;
  entity: 'admin';
  type: 'access';
}

export interface AdminRefreshTokenPayload {
  sub: string;      // adminId
  entity: 'admin';
  type: 'refresh';
  tokenId: string;
}

// ─── User Token Functions ─────────────────────────────────────────────────────

export const generateUserAccessToken = (
  payload: Omit<UserAccessTokenPayload, 'type' | 'entity'>,
): string => {
  const options: SignOptions = { expiresIn: config.jwt.accessExpiresIn as SignOptions['expiresIn'] };
  return jwt.sign({ ...payload, entity: 'user', type: 'access' }, config.jwt.accessSecret, options);
};

export const generateUserRefreshToken = (
  payload: Omit<UserRefreshTokenPayload, 'type' | 'entity'>,
): string => {
  const options: SignOptions = { expiresIn: config.jwt.refreshExpiresIn as SignOptions['expiresIn'] };
  return jwt.sign({ ...payload, entity: 'user', type: 'refresh' }, config.jwt.refreshSecret, options);
};

export const verifyUserAccessToken = (token: string): UserAccessTokenPayload => {
  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret) as JwtPayload & UserAccessTokenPayload;
    if (decoded.entity !== 'user' || decoded.type !== 'access') {
      throw ApiError.unauthorized('Invalid token');
    }
    return decoded;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof jwt.TokenExpiredError) throw ApiError.unauthorized('Access token expired');
    throw ApiError.unauthorized('Invalid access token');
  }
};

export const verifyUserRefreshToken = (token: string): UserRefreshTokenPayload => {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as JwtPayload & UserRefreshTokenPayload;
    if (decoded.entity !== 'user' || decoded.type !== 'refresh') {
      throw ApiError.unauthorized('Invalid token');
    }
    return decoded;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof jwt.TokenExpiredError) throw ApiError.unauthorized('Refresh token expired');
    throw ApiError.unauthorized('Invalid refresh token');
  }
};

// ─── Admin Token Functions ────────────────────────────────────────────────────

export const generateAdminAccessToken = (
  payload: Omit<AdminAccessTokenPayload, 'type' | 'entity'>,
): string => {
  const options: SignOptions = { expiresIn: config.adminJwt.accessExpiresIn as SignOptions['expiresIn'] };
  return jwt.sign({ ...payload, entity: 'admin', type: 'access' }, config.adminJwt.accessSecret, options);
};

export const generateAdminRefreshToken = (
  payload: Omit<AdminRefreshTokenPayload, 'type' | 'entity'>,
): string => {
  const options: SignOptions = { expiresIn: config.adminJwt.refreshExpiresIn as SignOptions['expiresIn'] };
  return jwt.sign({ ...payload, entity: 'admin', type: 'refresh' }, config.adminJwt.refreshSecret, options);
};

export const verifyAdminAccessToken = (token: string): AdminAccessTokenPayload => {
  try {
    const decoded = jwt.verify(token, config.adminJwt.accessSecret) as JwtPayload & AdminAccessTokenPayload;
    if (decoded.entity !== 'admin' || decoded.type !== 'access') {
      throw ApiError.unauthorized('Invalid token');
    }
    return decoded;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof jwt.TokenExpiredError) throw ApiError.unauthorized('Access token expired');
    throw ApiError.unauthorized('Invalid access token');
  }
};

export const verifyAdminRefreshToken = (token: string): AdminRefreshTokenPayload => {
  try {
    const decoded = jwt.verify(token, config.adminJwt.refreshSecret) as JwtPayload & AdminRefreshTokenPayload;
    if (decoded.entity !== 'admin' || decoded.type !== 'refresh') {
      throw ApiError.unauthorized('Invalid token');
    }
    return decoded;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof jwt.TokenExpiredError) throw ApiError.unauthorized('Refresh token expired');
    throw ApiError.unauthorized('Invalid refresh token');
  }
};
