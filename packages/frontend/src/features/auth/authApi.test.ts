import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { login, register, logout, getAuthenticatedUser, getToken, isAuthenticated } from './authApi'

// ── Mock the Axios instance ────────────────────────────────────────────────────

const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }))

vi.mock('../../lib/api', () => ({
  default: {
    post: mockPost,
  },
}))

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  function createToken(payload: Record<string, unknown>): string {
    const encode = (value: Record<string, unknown>) =>
      window.btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')

    return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
  }

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('calls POST /auth/login with email and password and returns the token string', async () => {
      mockPost.mockResolvedValueOnce({
        data: { data: { token: 'jwt-login-token', tokenType: 'Bearer' } },
      })

      const token = await login('user@example.com', 'password123')

      expect(mockPost).toHaveBeenCalledWith('/auth/login', {
        email: 'user@example.com',
        password: 'password123',
      })
      expect(token).toBe('jwt-login-token')
    })

    it('propagates errors to the caller', async () => {
      const error = { response: { status: 401 } }
      mockPost.mockRejectedValueOnce(error)

      await expect(login('bad@example.com', 'wrong')).rejects.toEqual(error)
    })
  })

  // ── register ───────────────────────────────────────────────────────────────

  describe('register', () => {
    it('calls POST /auth/register with RegisterPayload and returns the token string', async () => {
      mockPost.mockResolvedValueOnce({
        data: { data: { token: 'jwt-register-token', tokenType: 'Bearer' } },
      })

      const payload = {
        email: 'new@example.com',
        password: 'secure123',
        firstName: 'Test',
        lastName: 'User',
      }
      const token = await register(payload)

      expect(mockPost).toHaveBeenCalledWith('/auth/register', payload)
      expect(token).toBe('jwt-register-token')
    })
  })

  // ── logout ─────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('removes auth_token from localStorage', () => {
      localStorage.setItem('auth_token', 'some-token')
      logout()
      expect(localStorage.getItem('auth_token')).toBeNull()
    })

    it('does nothing when auth_token is already absent', () => {
      expect(() => logout()).not.toThrow()
      expect(localStorage.getItem('auth_token')).toBeNull()
    })
  })

  // ── getToken ───────────────────────────────────────────────────────────────

  describe('getToken', () => {
    it('returns the stored auth_token string', () => {
      localStorage.setItem('auth_token', 'my-token')
      expect(getToken()).toBe('my-token')
    })

    it('returns null when auth_token is absent', () => {
      expect(getToken()).toBeNull()
    })
  })

  describe('getAuthenticatedUser', () => {
    it('extracts the authenticated teacher identity from JWT claims', () => {
      localStorage.setItem(
        'auth_token',
        createToken({
          sub: 'teacher@example.com',
          firstName: 'Casey',
          lastName: 'Rivera',
          role: 'TEACHER',
        }),
      )

      expect(getAuthenticatedUser()).toEqual({
        email: 'teacher@example.com',
        firstName: 'Casey',
        lastName: 'Rivera',
        role: 'TEACHER',
      })
    })

    it('returns null for malformed tokens', () => {
      localStorage.setItem('auth_token', 'not-a-jwt')

      expect(getAuthenticatedUser()).toBeNull()
    })
  })

  // ── isAuthenticated ────────────────────────────────────────────────────────

  describe('isAuthenticated', () => {
    it('returns true when a non-empty token is stored', () => {
      localStorage.setItem('auth_token', 'valid-token')
      expect(isAuthenticated()).toBe(true)
    })

    it('returns false when no token is stored (null)', () => {
      expect(isAuthenticated()).toBe(false)
    })

    it('returns false when the stored token is an empty string', () => {
      localStorage.setItem('auth_token', '')
      expect(isAuthenticated()).toBe(false)
    })
  })
})
