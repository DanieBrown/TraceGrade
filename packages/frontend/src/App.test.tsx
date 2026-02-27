import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./components/layout/TopNav', () => ({
  default: () => <nav aria-label="Top navigation" />,
}))

vi.mock('./pages/DashboardPage', () => ({
  default: () => <h1>Dashboard Mock Page</h1>,
}))

vi.mock('./pages/StudentsPage', () => ({
  default: () => <h1>Students Mock Page</h1>,
}))

vi.mock('./pages/ExamsPage', () => ({
  default: () => <h1>Exams Mock Page</h1>,
}))

vi.mock('./pages/PaperExamsPage', () => ({
  default: () => <h1>Paper Exams Mock Page</h1>,
}))

vi.mock('./pages/ManualReviewQueuePage', () => ({
  default: () => <h1>Review Mock Page</h1>,
}))

vi.mock('./pages/HomeworkPage', () => ({
  default: () => <h1>Homework Mock Page</h1>,
}))

vi.mock('./pages/GradesPage', () => ({
  default: () => <h1>Grades Mock Page</h1>,
}))

vi.mock('./pages/SettingsPage', () => ({
  default: () => <h1>Settings Mock Page</h1>,
}))

describe('App routes', () => {
  afterEach(() => {
    cleanup()
  })

  it.each([
    ['/', 'Dashboard Mock Page'],
    ['/students', 'Students Mock Page'],
    ['/exams', 'Exams Mock Page'],
    ['/paper-exams', 'Paper Exams Mock Page'],
    ['/review', 'Review Mock Page'],
    ['/homework', 'Homework Mock Page'],
    ['/grades', 'Grades Mock Page'],
    ['/settings', 'Settings Mock Page'],
  ])('renders %s route without regressions', (route, headingText) => {
    window.history.pushState({}, '', route)

    render(<App />)

    expect(screen.getByRole('heading', { name: headingText })).toBeInTheDocument()
  })
})
