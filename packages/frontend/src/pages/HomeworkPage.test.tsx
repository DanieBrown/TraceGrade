import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HomeworkPage from './HomeworkPage'

const fetchHomeworkItemsMock = vi.fn()
const getHomeworkLoadErrorDetailsMock = vi.fn(() => ({
  message: 'There was a problem connecting to the server.',
  retryable: true,
}))

vi.mock('../features/homework/homeworkApi', () => ({
  fetchHomeworkItems: (...args: unknown[]) => fetchHomeworkItemsMock(...args),
  getHomeworkLoadErrorDetails: (...args: unknown[]) => getHomeworkLoadErrorDetailsMock(...args),
  isHomeworkListEmpty: (items: unknown[]) => items.length === 0,
}))

describe('HomeworkPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('explains that homework entries do not create gradebook rows or columns', async () => {
    fetchHomeworkItemsMock.mockResolvedValueOnce([])

    render(
      <MemoryRouter>
        <HomeworkPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/Homework and gradebook are separate/i)).toBeInTheDocument()
    expect(screen.getByText('Plan assignments and due dates for your classes.')).toBeInTheDocument()
    expect(
      screen.queryByText('Plan assignments and due dates for your classes without mixing them into the gradebook workflow.'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText('Homework entries on this page are planning records. They do not create gradebook columns or editable grade rows. Gradebook reflects published class assignments and finalized exam grades.'),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Create homework/i })).toHaveLength(2)
    screen.getAllByRole('link', { name: /Create homework/i }).forEach((link) => {
      expect(link).toHaveAttribute('href', '/homework/new')
    })
    expect(screen.getByRole('link', { name: 'Open Gradebook' })).toHaveAttribute('href', '/grades')
    expect(screen.getByRole('link', { name: 'Open Exams' })).toHaveAttribute('href', '/exams')
  })
})