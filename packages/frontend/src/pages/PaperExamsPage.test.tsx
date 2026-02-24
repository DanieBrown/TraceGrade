import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PaperExamsPage from './PaperExamsPage'

const fetchExamTemplatesMock = vi.fn()
const fetchStudentsMock = vi.fn()
const getStudentsLoadErrorDetailsMock = vi.fn(() => ({
  message: 'There was a problem connecting to the server.',
  retryable: true,
}))

vi.mock('../features/exams/examsApi', () => ({
  fetchExamTemplates: (...args: unknown[]) => fetchExamTemplatesMock(...args),
}))

vi.mock('../features/students/studentsApi', () => ({
  fetchStudents: (...args: unknown[]) => fetchStudentsMock(...args),
  getStudentsLoadErrorDetails: (...args: unknown[]) => getStudentsLoadErrorDetailsMock(...args),
}))

vi.mock('../features/submissions/FileUpload', () => ({
  default: ({ assignmentId, studentId }: { assignmentId: string; studentId: string }) => (
    <div data-testid="file-upload-props">
      assignmentId={assignmentId};studentId={studentId}
    </div>
  ),
}))

vi.mock('../features/grading/useGrading', () => ({
  useGrading: () => ({
    state: { phase: 'idle' as const },
    grade: vi.fn(),
    reset: vi.fn(),
  }),
}))

vi.mock('../features/grading/GradingResultCard', () => ({
  default: () => null,
}))

vi.mock('../features/grading/GradingResultsList', () => ({
  default: () => null,
}))

describe('PaperExamsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders exam templates and student dropdown from APIs without demo data', async () => {
    fetchExamTemplatesMock.mockResolvedValueOnce([
      {
        id: 'template-1',
        assignmentId: 'assignment-42',
        title: 'Algebra Midterm',
        questionCount: 12,
        totalPoints: 60,
        statusLabel: 'Published',
      },
    ])
    fetchStudentsMock.mockResolvedValueOnce([
      {
        id: 'student-1',
        fullName: 'Alice Smith',
      },
      {
        id: 'student-2',
        fullName: 'Jordan Lee',
      },
    ])

    render(
      <MemoryRouter>
        <PaperExamsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Algebra Midterm')).toBeInTheDocument()
    expect(screen.queryByText('Exam from Uploaded Image')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '✏ Grade' }))

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Alice Smith' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Jordan Lee' })).toBeInTheDocument()
    })

    expect(screen.queryByRole('option', { name: 'Jack' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Sarah' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Mohammed' })).not.toBeInTheDocument()
  })

  it('passes template-derived assignmentId to file upload instead of nil uuid', async () => {
    fetchExamTemplatesMock.mockResolvedValueOnce([
      {
        id: 'template-9',
        assignmentId: 'assignment-real-9',
        title: 'Physics Quiz',
        questionCount: 5,
        totalPoints: 25,
        statusLabel: 'Draft',
      },
    ])
    fetchStudentsMock.mockResolvedValueOnce([
      {
        id: 'student-9',
        fullName: 'Mia Torres',
      },
    ])

    render(
      <MemoryRouter>
        <PaperExamsPage />
      </MemoryRouter>,
    )

    await screen.findByText('Physics Quiz')
    fireEvent.click(screen.getByRole('button', { name: '✏ Grade' }))
    fireEvent.change(screen.getByLabelText('Select Student to Grade'), {
      target: { value: 'student-9' },
    })

    expect(await screen.findByTestId('file-upload-props')).toHaveTextContent('assignmentId=assignment-real-9')
    expect(screen.getByTestId('file-upload-props')).not.toHaveTextContent('00000000-0000-0000-0000-000000000001')
  })

  it('renders exam and student empty-state guidance links', async () => {
    fetchExamTemplatesMock.mockResolvedValueOnce([])
    fetchStudentsMock.mockResolvedValueOnce([])

    render(
      <MemoryRouter>
        <PaperExamsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('No exam templates available')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create exam template' })).toHaveAttribute('href', '/exams')
    expect(screen.getByRole('link', { name: 'Add students' })).toHaveAttribute('href', '/students')
  })
})
