import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import ExamsPage from './ExamsPage'

const fetchExamTemplatesMock = vi.fn()

vi.mock('../features/exams/examsApi', () => ({
  fetchExamTemplates: (...args: unknown[]) => fetchExamTemplatesMock(...args),
  isExamTemplateListEmpty: (items: unknown[]) => items.length === 0,
}))

describe('ExamsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders loading state while templates are being fetched', () => {
    fetchExamTemplatesMock.mockReturnValueOnce(new Promise(() => {}))

    render(
      <MemoryRouter>
        <ExamsPage />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('Loading exams')).toBeInTheDocument()
  })

  it('renders error state when template fetch fails', async () => {
    fetchExamTemplatesMock.mockRejectedValueOnce(new Error('network error'))

    render(
      <MemoryRouter>
        <ExamsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Failed to load exams.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
  })

  it('renders empty state when no templates are returned', async () => {
    fetchExamTemplatesMock.mockResolvedValueOnce([])

    render(
      <MemoryRouter>
        <ExamsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('No exam templates found')).toBeInTheDocument()
    expect(screen.getByText('Create your first exam template to get started.')).toBeInTheDocument()
  })

  it('renders populated list and supports per-item manage action', async () => {
    fetchExamTemplatesMock.mockResolvedValueOnce([
      {
        id: 'exam-42',
        title: 'Algebra Final',
        questionCount: 20,
        totalPoints: 100,
        statusLabel: 'Published',
      },
    ])

    window.history.pushState({}, '', '/exams')
    render(<App />)

    expect(await screen.findByText('Algebra Final')).toBeInTheDocument()
    expect(screen.getByText('20 questions · 100 total points')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Manage exam Algebra Final' }))

    await waitFor(() => {
      expect(window.location.pathname).toBe('/paper-exams')
      expect(window.location.search).toContain('examId=exam-42')
    })
  })

  it('navigates to /paper-exams when Create Exam is clicked', async () => {
    fetchExamTemplatesMock.mockResolvedValueOnce([])

    window.history.pushState({}, '', '/exams')
    render(<App />)

    expect(await screen.findByText('No exam templates found')).toBeInTheDocument()

    const createButtons = screen.getAllByRole('button', { name: '+ Create Exam' })
    fireEvent.click(createButtons[0])

    await waitFor(() => {
      expect(window.location.pathname).toBe('/paper-exams')
    })
  })
})

describe('App routing non-regression', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders Exams page on /exams route', async () => {
    fetchExamTemplatesMock.mockResolvedValueOnce([])

    window.history.pushState({}, '', '/exams')
    render(<App />)

    expect(await screen.findByText('Manage your exam templates')).toBeInTheDocument()
  })

  it('still renders Paper Exams page on /paper-exams route', async () => {
    fetchExamTemplatesMock.mockResolvedValue([])

    window.history.pushState({}, '', '/paper-exams')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Paper Exams', level: 1 })).toBeInTheDocument()
  })
})