import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PaperExamsPage from './PaperExamsPage'

const fetchExamTemplatesMock = vi.fn()
const fetchStudentsMock = vi.fn()
const fetchAnswerRubricsMock = vi.fn()
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

vi.mock('../features/rubrics/rubricsApi', () => ({
  fetchAnswerRubrics: (...args: unknown[]) => fetchAnswerRubricsMock(...args),
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

  function renderAtExamRoute(examId: string) {
    return render(
      <MemoryRouter initialEntries={[`/exams/${examId}`]}>
        <Routes>
          <Route path="/exams/:examId" element={<PaperExamsPage />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('blocks grading and links to rubric setup when rubric coverage is incomplete', async () => {
    fetchExamTemplatesMock.mockResolvedValueOnce([
      {
        id: 'template-1',
        assignmentId: 'assignment-42',
        title: 'Algebra Midterm',
        questionCount: 2,
        totalPoints: 60,
        statusLabel: 'Published',
        questionsJson: '[{"number":1},{"number":2}]',
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
    fetchAnswerRubricsMock.mockResolvedValueOnce([
      {
        id: 'rubric-1',
        examTemplateId: 'template-1',
        questionNumber: 1,
      },
    ])

    renderAtExamRoute('template-1')

    expect(await screen.findByText(/rubric coverage for 1 of 2 questions/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Set Up Rubric' })).toHaveAttribute('href', '/exams/template-1/rubrics')
    expect(screen.getAllByRole('button', { name: /back to exams/i })).toHaveLength(1)
    expect(screen.queryByLabelText('Select Student to Grade')).not.toBeInTheDocument()
  })

  it('passes template-derived assignmentId to file upload when rubric setup is ready', async () => {
    fetchExamTemplatesMock.mockResolvedValueOnce([
      {
        id: 'template-9',
        assignmentId: 'assignment-real-9',
        title: 'Physics Quiz',
        questionCount: 1,
        totalPoints: 25,
        statusLabel: 'Draft',
        questionsJson: '[{"number":1}]',
      },
    ])
    fetchStudentsMock.mockResolvedValueOnce([
      {
        id: 'student-9',
        fullName: 'Mia Torres',
      },
    ])
    fetchAnswerRubricsMock.mockResolvedValueOnce([
      {
        id: 'rubric-9',
        examTemplateId: 'template-9',
        questionNumber: 1,
      },
    ])

    renderAtExamRoute('template-9')

    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(await screen.findByText('Physics Quiz')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /back to exams/i })).toHaveLength(1)
    fireEvent.change(screen.getByLabelText('Select Student to Grade'), {
      target: { value: 'student-9' },
    })

    expect(await screen.findByTestId('file-upload-props')).toHaveTextContent('assignmentId=assignment-real-9')
    expect(screen.getByTestId('file-upload-props')).not.toHaveTextContent('00000000-0000-0000-0000-000000000001')
  })
})
