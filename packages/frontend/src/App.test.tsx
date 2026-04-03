import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

function createToken(payload: Record<string, unknown>): string {
  const encode = (value: Record<string, unknown>) =>
    window.btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')

  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

vi.mock('./pages/DashboardPage', () => ({
  default: () => <h1>Dashboard Mock Page</h1>,
}))

vi.mock('./pages/ClassesPage', () => ({
  default: () => <h1>Classes Mock Page</h1>,
}))

vi.mock('./pages/StudentsPage', () => ({
  default: () => <h1>Students Mock Page</h1>,
}))

vi.mock('./pages/StudentDetailPage', () => ({
  default: () => <h1>Student Detail Mock Page</h1>,
}))

vi.mock('./pages/ExamsPage', () => ({
  default: () => <h1>Exams Mock Page</h1>,
}))

vi.mock('./pages/PaperExamsPage', () => ({
  default: () => <h1>Paper Exams Mock Page</h1>,
}))

vi.mock('./pages/ExamRubricPage', () => ({
  default: () => <h1>Exam Rubric Mock Page</h1>,
}))

vi.mock('./pages/ManualReviewQueuePage', () => ({
  default: () => <h1>Review Mock Page</h1>,
}))

vi.mock('./pages/ManualReviewDetailPage', () => ({
  default: () => <h1>Manual Grading Mock Page</h1>,
}))

vi.mock('./pages/HomeworkPage', () => ({
  default: () => <h1>Homework Mock Page</h1>,
}))

vi.mock('./pages/CreateHomeworkPage', () => ({
  default: () => <h1>Create Homework Mock Page</h1>,
}))

vi.mock('./pages/GradesPage', () => ({
  default: () => <h1>Grades Mock Page</h1>,
}))

vi.mock('./pages/SettingsPage', () => ({
  default: () => <h1>Settings Mock Page</h1>,
}))

describe('App routes', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'test-token')
  })

  afterEach(() => {
    cleanup()
    localStorage.removeItem('auth_token')
  })

  it.each([
    ['/', 'Dashboard Mock Page'],
    ['/classes', 'Classes Mock Page'],
    ['/students', 'Students Mock Page'],
    ['/students/student-1', 'Student Detail Mock Page'],
    ['/exams', 'Exams Mock Page'],
    ['/exams/exam-1', 'Paper Exams Mock Page'],
    ['/exams/exam-1/rubrics', 'Exam Rubric Mock Page'],
    ['/classes/class-1/batch-grading', 'Classes Mock Page'],
    ['/review', 'Review Mock Page'],
    ['/review/grade-1', 'Manual Grading Mock Page'],
    ['/homework', 'Homework Mock Page'],
    ['/homework/new', 'Create Homework Mock Page'],
    ['/grades', 'Grades Mock Page'],
    ['/settings', 'Settings Mock Page'],
  ])('renders %s route without regressions', (route, headingText) => {
    window.history.pushState({}, '', route)

    render(<App />)

    expect(screen.getByRole('heading', { name: headingText })).toBeInTheDocument()
  })

  it('renders homework in the primary navigation', () => {
    window.history.pushState({}, '', '/classes')

    render(<App />)

    const nav = screen.getByRole('navigation', { name: /primary navigation/i })
    expect(within(nav).getByRole('link', { name: /Homework/i })).toBeInTheDocument()
  })

  it('marks Classes as active when path is /classes', () => {
    window.history.pushState({}, '', '/classes')

    render(<App />)

    const nav = screen.getByRole('navigation', { name: /primary navigation/i })
    const classesLink = within(nav).getByRole('link', { name: /Classes/i })
    const dashboardLink = within(nav).getByRole('link', { name: /Dashboard/i })

    expect(classesLink).toHaveAttribute('aria-current', 'page')
    expect(dashboardLink).not.toHaveAttribute('aria-current')
  })

  it('renders the authenticated user in the workspace header instead of the sidebar footer', () => {
    localStorage.setItem(
      'auth_token',
      createToken({
        sub: 'teacher.one@example.com',
        firstName: 'Teacher',
        lastName: 'One',
        role: 'TEACHER',
      }),
    )

    window.history.pushState({}, '', '/classes')
    render(<App />)

    const header = screen.getByRole('banner', { name: 'Workspace header' })
    expect(within(header).getByText('Teacher One')).toBeInTheDocument()
    expect(within(header).getByText('teacher.one@example.com')).toBeInTheDocument()
    expect(screen.getAllByText('teacher.one@example.com')).toHaveLength(1)
  })
})
