import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import TopNav from './TopNav'

function createToken(payload: Record<string, unknown>): string {
  const encode = (value: Record<string, unknown>) =>
    window.btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')

  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

describe('TopNav', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('renders the authenticated teacher identity instead of static admin text', () => {
    localStorage.setItem(
      'auth_token',
      createToken({
        sub: 'teacher.one@example.com',
        firstName: 'Teacher',
        lastName: 'One',
        role: 'TEACHER',
      }),
    )

    render(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>,
    )

    expect(screen.getByText('Teacher One')).toBeInTheDocument()
    expect(screen.getByText('teacher.one@example.com')).toBeInTheDocument()
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
    expect(screen.queryByText('admin@school.edu')).not.toBeInTheDocument()
  })
})