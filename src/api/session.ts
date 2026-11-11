import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import mongoose from 'mongoose';

const { Types } = mongoose;
import { User, type UserRole } from '../db/models/User.js';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
let processDevSessionSecret: string | undefined;

export class AuthConfigurationError extends Error {
  readonly code = 'AUTH_NOT_CONFIGURED' as const;

  constructor(message: string) {
    super(message);
    this.name = 'AuthConfigurationError';
  }
}

export class AuthRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 401) {
    super(message);
    this.name = 'AuthRequestError';
    this.code = code;
    this.status = status;
  }
}

export interface SessionClaims {
  sub: string;
  role: UserRole;
  iat: number;
  exp: number;
}

function devAuthEnabled(): boolean {
  return process.env.DEV_AUTH_SIMULATION === 'true' || process.env.NODE_ENV !== 'production';
}

function sessionSecret(): string {
  const configured = process.env.SESSION_SECRET?.trim();
  if (configured) return configured;
  if (devAuthEnabled()) {
    processDevSessionSecret ||= randomBytes(32).toString('hex');
    return processDevSessionSecret;
  }
  throw new AuthConfigurationError('SESSION_SECRET must be configured for production session tokens.');
}

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signature(input: string): string {
  return createHmac('sha256', sessionSecret()).update(input).digest('base64url');
}

export function signSession(claims: SessionClaims): string {
  const payload = encode(JSON.stringify(claims));
  return `${payload}.${signature(payload)}`;
}

export function verifySession(token: string): SessionClaims {
  const [payload, providedSignature] = token.split('.');
  if (!payload || !providedSignature) {
    throw new AuthRequestError('INVALID_SESSION', 'A valid session token is required.');
  }

  const expectedSignature = signature(payload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(providedSignature);
  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    throw new AuthRequestError('INVALID_SESSION', 'A valid session token is required.');
  }

  let claims: SessionClaims;
  try {
    claims = JSON.parse(decode(payload)) as SessionClaims;
  } catch {
    throw new AuthRequestError('INVALID_SESSION', 'A valid session token is required.');
  }

  if (
    !claims ||
    typeof claims.sub !== 'string' ||
    !Types.ObjectId.isValid(claims.sub) ||
    (claims.role !== 'customer' && claims.role !== 'seller') ||
    !Number.isFinite(claims.exp) ||
    claims.exp <= Math.floor(Date.now() / 1000)
  ) {
    throw new AuthRequestError('INVALID_SESSION', 'A valid session token is required.');
  }

  return claims;
}

export function createSession(userId: string, role: UserRole): string {
  const now = Math.floor(Date.now() / 1000);
  return signSession({ sub: userId, role, iat: now, exp: now + SESSION_TTL_SECONDS });
}

export function getBearerToken(request: Pick<Request, 'headers'>): string | undefined {
  const authorization = request.headers.authorization;
  if (!authorization) return undefined;
  const [scheme, token] = authorization.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token.trim() : undefined;
}

export function safeAuthUser(user: {
  id?: string;
  _id?: unknown;
  phone: string;
  name?: string;
  role: UserRole;
  email?: string;
}): Record<string, unknown> {
  const id = user.id || String(user._id || '');
  return {
    id,
    name: user.name || 'User',
    phone: user.phone,
    role: user.role,
    // Email is useful to authenticated account settings, but is never used by
    // public catalog serializers.
    ...(user.email ? { email: user.email } : {}),
  };
}

export async function requireMongoUser(request: Request, role?: UserRole) {
  const bearer = getBearerToken(request);
  let userId: string | undefined;
  let claims: SessionClaims | undefined;

  if (bearer) {
    claims = verifySession(bearer);
    userId = claims.sub;
  } else if (devAuthEnabled()) {
    const headerValue = request.headers['x-user-id'];
    userId = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new AuthRequestError(
        'AUTH_REQUIRED',
        'Authentication is required. Use a bearer session token or enable the local dev auth simulation.',
      );
    }
  } else {
    throw new AuthRequestError('AUTH_REQUIRED', 'Authentication is required.');
  }

  const user = await User.findById(userId).select('+email').lean();
  if (!user) throw new AuthRequestError('AUTH_REQUIRED', 'Authentication is required.');

  if (role && user.role !== role) {
    throw new AuthRequestError('FORBIDDEN', 'This account is not allowed to perform that action.', 403);
  }

  if (claims && claims.role !== user.role) {
    throw new AuthRequestError('INVALID_SESSION', 'A valid session token is required.');
  }

  return user;
}

export function hashOtp(phone: string, otp: string): string {
  // OTP plaintext is never persisted or logged. A per-request random salt is
  // unnecessary here because the phone is part of the stable lookup key and
  // the short-lived value is additionally protected by the session secret.
  return createHmac('sha256', sessionSecret()).update(`${phone}:${otp}`).digest('hex');
}

export function generateOtp(): string {
  return String(100000 + (randomBytes(4).readUInt32BE(0) % 900000));
}

export function otpSimulationEnabled(): boolean {
  return devAuthEnabled();
}
