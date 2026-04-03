import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import AuthedLayout from './AuthedLayout'

vi.mock('../../features/auth/authApi', () => ({
  getAuthenticatedUser: () => ({
    firstName: 'Teacher',
    lastName: 'One',
    email: 'teacher.one@example.com',
    role: 'TEACHER',
  }),
  logout: vi.fn(),
}))

function RouteLinks() {
  return (
    <div>
      <Link to="/students">Students</Link>
      <Link to="/students/student-1">Student detail</Link>
      <Link to="/grades">Grades</Link>
      <Link to="/settings">Settings</Link>
      <Link to="/homework">Homework</Link>
      <Link to="/classes">Classes</Link>
    </div>
  )
}

function renderLayout(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route element={<AuthedLayout />}>
          <Route path="/" element={<RouteLinks />} />
          <Route path="/students" element={<RouteLinks />} />
          <Route path="/students/:studentId" element={<RouteLinks />} />
          <Route path="/grades" element={<RouteLinks />} />
          <Route path="/settings" element={<RouteLinks />} />
          <Route path="/homework" element={<RouteLinks />} />
          <Route path="/classes" element={<RouteLinks />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AuthedLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows the current main page as the first breadcrumb entry', async () => {
    renderLayout(['/grades'])

    const breadcrumbNav = await screen.findByRole('navigation', { name: /recent page history/i })

    expect(within(breadcrumbNav).getByRole('link', { name: 'Grades' })).toBeInTheDocument()
  })

  it('tracks only main pages and keeps the latest five breadcrumb entries', async () => {
    renderLayout(['/'])

    fireEvent.click(screen.getByRole('link', { name: 'Students' }))
    fireEvent.click(screen.getByRole('link', { name: 'Student detail' }))
    fireEvent.click(screen.getByRole('link', { name: 'Grades' }))
    fireEvent.click(screen.getByRole('link', { name: 'Settings' }))
    fireEvent.click(screen.getByRole('link', { name: 'Homework' }))
    fireEvent.click(screen.getByRole('link', { name: 'Classes' }))

    const breadcrumbNav = await screen.findByRole('navigation', { name: /recent page history/i })
    const breadcrumbLinks = within(breadcrumbNav).getAllByRole('link')

    expect(breadcrumbLinks.map((link) => link.textContent)).toEqual([
      'Students',
      'Grades',
      'Settings',
      'Homework',
      'Classes',
    ])
    expect(within(breadcrumbNav).queryByText('Dashboard')).not.toBeInTheDocument()
    expect(within(breadcrumbNav).queryByText('Student detail')).not.toBeInTheDocument()
  })
})