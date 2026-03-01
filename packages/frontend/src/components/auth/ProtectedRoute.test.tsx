import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import ProtectedRoute from './ProtectedRoute'

describe('ProtectedRoute', () => {
  afterEach(() => {
    cleanup()
    localStorage.removeItem('auth_token')
  })

  it('renders children when localStorage has auth_token', () => {
    localStorage.setItem('auth_token', 'test-token')

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('does not render children when localStorage does not have auth_token', () => {
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    )

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })
})
