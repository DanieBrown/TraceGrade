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

  it('keeps authenticated identity out of the sidebar because it now lives in the workspace header', () => {
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

    expect(screen.queryByText('Teacher One')).not.toBeInTheDocument()
    expect(screen.queryByText('teacher.one@example.com')).not.toBeInTheDocument()
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
    expect(screen.queryByText('admin@school.edu')).not.toBeInTheDocument()
  })

  it('does not render a persistent create exam shortcut button in the sidebar', () => {
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

    expect(screen.queryByRole('button', { name: /Create exam/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Quick command/i })).toBeInTheDocument()
  })

  it('renders the branded logo, homework navigation, and updated students helper copy', () => {
    render(
      <MemoryRouter>
        <TopNav />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('TraceGrade logo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Homework/i })).toBeInTheDocument()
    expect(screen.getByText('Learner profiles and progress')).toBeInTheDocument()
    expect(screen.getByText(/Review grading activity and move between classes\./i)).toBeInTheDocument()
    expect(
      screen.queryByText('Review grading activity, move between classes, and stay on top of manual checks.'),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Enrollment records')).not.toBeInTheDocument()
  })
})