import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import ExamsPage from './ExamsPage'

const fetchExamTemplatesMock = vi.fn()
const fetchExamTemplateByIdMock = vi.fn()
const updateExamTemplateMock = vi.fn()
const toastSuccessMock = vi.fn()

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
  Toaster: () => null,
}))

vi.mock('../features/exams/examsApi', () => ({
  fetchExamTemplates: (...args: unknown[]) => fetchExamTemplatesMock(...args),
  fetchExamTemplateById: (...args: unknown[]) => fetchExamTemplateByIdMock(...args),
  updateExamTemplate: (...args: unknown[]) => updateExamTemplateMock(...args),
  isExamTemplateListEmpty: (items: unknown[]) => items.length === 0,
}))

vi.mock('./PaperExamsPage', () => ({
  default: () => <h1>Paper Exams Mock Page</h1>,
}))

vi.mock('./CreateExamPage', () => ({
  default: () => <h1>Create Exam Mock Page</h1>,
}))

describe('ExamsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('auth_token', 'test-token')
    toastSuccessMock.mockReset()
  })

  afterEach(() => {
    cleanup()
    localStorage.removeItem('auth_token')
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
        questionsJson: '[]',
      },
    ])

    window.history.pushState({}, '', '/exams')
    render(<App />)

    expect(await screen.findByText('Algebra Final')).toBeInTheDocument()
    expect(screen.getByText('20 questions · 100 total points')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Grade exam Algebra Final' }))

    await waitFor(() => {
      expect(window.location.pathname).toBe('/exams/exam-42')
    })
  })

  it('routes exam card clicks into the shared editor flow instead of opening a modal', async () => {
    fetchExamTemplatesMock.mockResolvedValueOnce([
      {
        id: 'exam-42',
        title: 'Algebra Final',
        questionCount: 20,
        totalPoints: 100,
        statusLabel: 'Published',
        questionsJson: '[]',
      },
    ])

    window.history.pushState({}, '', '/exams')
    render(<App />)

    expect(await screen.findByText('Algebra Final')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Algebra Final'))

    await waitFor(() => {
      expect(window.location.pathname).toBe('/exams/new')
      expect(window.location.search).toBe('?examId=exam-42')
    })

    expect(await screen.findByRole('heading', { name: 'Create Exam Mock Page' })).toBeInTheDocument()
  })

  it('keeps the exams page focused on creating templates instead of importing JSON', async () => {
    fetchExamTemplatesMock.mockResolvedValueOnce([
      {
        id: 'exam-42',
        title: 'Algebra Final',
        questionCount: 20,
        totalPoints: 100,
        statusLabel: 'Published',
        questionsJson: '[]',
      },
    ])

    render(
      <MemoryRouter>
        <ExamsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Algebra Final')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /import json/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/import json backups or shared exam templates here/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Import exam JSON')).not.toBeInTheDocument()
  })

  it('keeps only the primary create exam action in the page header', async () => {
    fetchExamTemplatesMock.mockResolvedValueOnce([
      {
        id: 'exam-42',
        title: 'Algebra Final',
        questionCount: 20,
        totalPoints: 100,
        statusLabel: 'Published',
        questionsJson: '[]',
      },
    ])

    render(
      <MemoryRouter>
        <ExamsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Algebra Final')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Create Exam' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '+ Create Exam' })).toHaveLength(1)
  })
})

describe('App routing non-regression', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('auth_token', 'test-token')
  })

  afterEach(() => {
    cleanup()
    localStorage.removeItem('auth_token')
  })

  it('renders Exams page on /exams route', async () => {
    fetchExamTemplatesMock.mockResolvedValueOnce([])

    window.history.pushState({}, '', '/exams')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Exams' })).toBeInTheDocument()
  })

  it('still renders the exam detail route on /exams/:id', async () => {
    fetchExamTemplatesMock.mockResolvedValue([])

    window.history.pushState({}, '', '/exams/exam-42')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Paper Exams Mock Page' })).toBeInTheDocument()
  })
})