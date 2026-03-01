import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { login, isAuthenticated } from '../features/auth/authApi'
import LoginPage from './LoginPage'

// ── Hoist mockNavigate so it is available inside the hoisted vi.mock factory ──

const mockNavigate = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../features/auth/authApi', () => ({
  login: vi.fn(),
  isAuthenticated: vi.fn(() => false),
}))

const loginMock = vi.mocked(login)
const isAuthenticatedMock = vi.mocked(isAuthenticated)

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isAuthenticatedMock.mockReturnValue(false)
    localStorage.removeItem('auth_token')
  })

  afterEach(() => {
    cleanup()
    localStorage.removeItem('auth_token')
  })

  it('renders email, password fields and Sign In button', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
  })

  it("shows 'Invalid email or password.' when the login API returns 401", async () => {
    loginMock.mockRejectedValueOnce({ response: { status: 401 } })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrongpassword' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument()
  })

  it('disables submit button while loading (slow API)', async () => {
    loginMock.mockReturnValueOnce(new Promise(() => {})) // never resolves

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Signing in\u2026' })).toBeDisabled()
    })
  })

  it('stores token in localStorage and navigates to / on successful login', async () => {
    loginMock.mockResolvedValueOnce('jwt-token-success')

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(localStorage.getItem('auth_token')).toBe('jwt-token-success')
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })
})
