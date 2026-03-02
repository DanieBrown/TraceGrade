import api from '../../lib/api';
import type { ApiResponse } from '../../lib/apiTypes';

// ── Types ─────────────────────────────────────────────────────────────────────

export type RegisterPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'TEACHER' | 'ADMIN' | 'COUNSELOR';
};

/** Shape of the data field returned by /api/auth/login and /api/auth/register */
type AuthResponse = {
  token: string;
  tokenType: string;
};

// ── localStorage key ──────────────────────────────────────────────────────────

const TOKEN_KEY = 'auth_token';

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

/**
 * Returns true iff a non-empty token is currently stored in localStorage.
 */
export function isAuthenticated(): boolean {
  const token = getToken();
  return token !== null && token !== '';
}
