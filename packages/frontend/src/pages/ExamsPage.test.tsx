import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import ExamsPage from './ExamsPage'

const fetchExamTemplatesMock = vi.fn()
const createExamTemplateMock = vi.fn()
const fetchExamTemplateByIdMock = vi.fn()
const updateExamTemplateMock = vi.fn()
const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
  Toaster: () => null,
}))

vi.mock('../features/exams/examsApi', () => ({
  fetchExamTemplates: (...args: unknown[]) => fetchExamTemplatesMock(...args),
  createExamTemplate: (...args: unknown[]) => createExamTemplateMock(...args),
  fetchExamTemplateById: (...args: unknown[]) => fetchExamTemplateByIdMock(...args),
  updateExamTemplate: (...args: unknown[]) => updateExamTemplateMock(...args),
  isExamTemplateListEmpty: (items: unknown[]) => items.length === 0,
}))

vi.mock('./PaperExamsPage', () => ({
  default: () => <h1>Paper Exams Mock Page</h1>,
}))

describe('ExamsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('auth_token', 'test-token')
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
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

  it('opens the create exam modal when Create Exam is clicked', async () => {
    fetchExamTemplatesMock.mockResolvedValueOnce([])

    render(
      <MemoryRouter>
        <ExamsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('No exam templates found')).toBeInTheDocument()

    const createButtons = screen.getAllByRole('button', { name: '+ Create Exam' })
    fireEvent.click(createButtons[0])

    expect(await screen.findByRole('dialog', { name: 'Create exam template' })).toBeInTheDocument()
  })

  it('clarifies that Exams imports are JSON templates and points paper uploads to Grade exam', async () => {
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
    expect(screen.getByRole('button', { name: /import json/i })).toBeInTheDocument()
    expect(screen.getByText(/import json backups or shared exam templates here/i)).toBeInTheDocument()
    expect(screen.getByText(/to upload jpg, png, pdf, or heic student work, create or open an exam and choose grade exam/i)).toBeInTheDocument()

    const importInput = screen.getByLabelText('Import exam JSON')
    expect(importInput).toHaveAttribute('accept', '.json,.tracegradeexam.json')
  })

  it('shows guidance instead of attempting to import a paper exam image file', async () => {
    fetchExamTemplatesMock.mockResolvedValueOnce([])

    render(
      <MemoryRouter>
        <ExamsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('No exam templates found')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Import exam JSON'), {
      target: {
        files: [new File(['png bytes'], 'scan.png', { type: 'image/png' })],
      },
    })

    await waitFor(() => {
      expect(createExamTemplateMock).not.toHaveBeenCalled()
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Exam template import accepts JSON only. Use Grade exam for JPG, PNG, PDF, or HEIC student uploads.',
      )
    })
  })

  it('uses accent styling for exams secondary actions so they stand out from the background', async () => {
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

    const importButton = screen.getByRole('button', { name: /import json/i })
    expect(importButton).toHaveClass('border-gold-500/30', 'bg-gold-500/10', 'text-gold-300')

    fireEvent.click(screen.getByRole('button', { name: '+ Create Exam' }))

    const closeDialogButton = await screen.findByRole('button', { name: 'Close dialog' })
    const cancelButton = screen.getByRole('button', { name: 'Cancel' })

    expect(closeDialogButton).toHaveClass('border-gold-500/30', 'bg-gold-500/10', 'text-gold-300')
    expect(cancelButton).toHaveClass('border-gold-500/30', 'bg-gold-500/10', 'text-gold-300')
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