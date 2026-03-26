import api from '../../lib/api';
import type { ApiResponse } from '../../lib/apiTypes';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AuthRole = 'TEACHER' | 'ADMIN' | 'COUNSELOR';

export type RegisterPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: AuthRole;
};

export interface AuthenticatedUser {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: AuthRole | null;
}

/** Shape of the data field returned by /api/auth/login and /api/auth/register */
type AuthResponse = {
  token: string;
  tokenType: string;
};

// ── localStorage key ──────────────────────────────────────────────────────────

const TOKEN_KEY = 'auth_token';

function normalizeClaim(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeRole(value: unknown): AuthRole | null {
  if (value === 'TEACHER' || value === 'ADMIN' || value === 'COUNSELOR') {
    return value;
  }

  return null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2 || typeof globalThis.atob !== 'function') {
    return null;
  }

  try {
    const normalized = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');

    const decoded = globalThis.atob(normalized);
    const payload = JSON.parse(decoded);

    return typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

// ── API functions ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Returns the JWT string on success. Propagates errors to the caller.
 */
export async function login(email: string, password: string): Promise<string> {
  const response = await api.post<ApiResponse<AuthResponse>>(
    '/auth/login',
    { email, password },
  );
  return response.data.data.token;
}

/**
 * POST /api/auth/register
 * Returns the JWT string on success. Propagates errors to the caller.
 */
export async function register(payload: RegisterPayload): Promise<string> {
  const response = await api.post<ApiResponse<AuthResponse>>(
    '/auth/register',
    payload,
  );
  return response.data.data.token;
}

/**
 * Removes the JWT from localStorage, ending the authenticated session.
 */
export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Reads the JWT from localStorage.
 * Returns the token string, or null if not present.
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAuthenticatedUser(): AuthenticatedUser | null {
  const token = getToken();
  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    return null;
  }

  const email = normalizeClaim(payload.sub) ?? normalizeClaim(payload.email);
  const firstName = normalizeClaim(payload.firstName);
  const lastName = normalizeClaim(payload.lastName);
  const role = normalizeRole(payload.role);

  if (!email && !firstName && !lastName && !role) {
    return null;
  }

  return {
    email,
    firstName,
    lastName,
    role,
  };
}

/**
 * Returns true iff a non-empty token is currently stored in localStorage.
 */
export function isAuthenticated(): boolean {
  const token = getToken();
  return token !== null && token !== '';
}
