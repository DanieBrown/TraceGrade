import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { register, isAuthenticated } from '../features/auth/authApi'
import RegisterPage from './RegisterPage'

// ── Hoist mockNavigate so it is available inside the hoisted vi.mock factory ──

const mockNavigate = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../features/auth/authApi', () => ({
  register: vi.fn(),
  isAuthenticated: vi.fn(() => false),
}))

const registerMock = vi.mocked(register)
const isAuthenticatedMock = vi.mocked(isAuthenticated)

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isAuthenticatedMock.mockReturnValue(false)
    localStorage.removeItem('auth_token')
  })

  afterEach(() => {
    cleanup()
    localStorage.removeItem('auth_token')
  })

  it('renders firstName, lastName, email, password fields', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('First name')).toBeInTheDocument()
    expect(screen.getByLabelText('Last name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('shows client-side error when password is less than 8 characters (no API call made)', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))

    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument()
    expect(registerMock).not.toHaveBeenCalled()
  })

  it("shows 'An account with this email already exists.' on 409 response", async () => {
    registerMock.mockRejectedValueOnce({ response: { status: 409 } })

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Jane' } })
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Smith' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'existing@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'securepassword' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))

    expect(
      await screen.findByText('An account with this email already exists.'),
    ).toBeInTheDocument()
  })

  it('stores token in localStorage and navigates to / on successful registration', async () => {
    registerMock.mockResolvedValueOnce('jwt-register-token')

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'New' } })
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'User' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'securepassword' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(localStorage.getItem('auth_token')).toBe('jwt-register-token')
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })
})
