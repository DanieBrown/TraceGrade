import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchClasses } from '../features/classes/classesApi'
import { fetchClassGradebook } from '../features/grades/gradesApi'
import { fetchStudentById, updateStudent } from '../features/students/studentsApi'
import StudentDetailPage from './StudentDetailPage'

vi.mock('../features/students/studentsApi', () => ({
  fetchStudentById: vi.fn(),
  updateStudent: vi.fn(),
  getStudentsLoadErrorDetails: (error: unknown) => ({
    message: error instanceof Error ? error.message : 'There was a problem connecting to the server.',
    retryable: true,
  }),
}))

vi.mock('../features/classes/classesApi', () => ({
  fetchClasses: vi.fn(),
  getClassesLoadErrorDetails: (error: unknown) => ({
    message: error instanceof Error ? error.message : 'There was a problem loading classes.',
    retryable: true,
  }),
}))

vi.mock('../features/grades/gradesApi', () => ({
  fetchClassGradebook: vi.fn(),
  getGradesLoadErrorDetails: (error: unknown) => ({
    message: error instanceof Error ? error.message : 'There was a problem connecting to the server.',
    retryable: true,
  }),
}))

const fetchStudentByIdMock = vi.mocked(fetchStudentById)
const updateStudentMock = vi.mocked(updateStudent)
const fetchClassesMock = vi.mocked(fetchClasses)
const fetchClassGradebookMock = vi.mocked(fetchClassGradebook)

describe('StudentDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows class and performance context for a student and highlights grading handoff context', async () => {
    fetchStudentByIdMock.mockResolvedValueOnce({
      id: 'student-1',
      fullName: 'Alice Smith',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
      classLabel: 'Biology 1',
      gradeLabel: '10',
      isActive: true,
    })
    fetchClassesMock.mockResolvedValueOnce([
      {
        id: 'class-1',
        name: 'Biology',
        subject: 'Science',
        period: '1',
        schoolYear: '2025-2026',
        isActive: true,
      },
    ])
    fetchClassGradebookMock.mockResolvedValueOnce({
      classId: 'class-1',
      classLabel: 'Biology P1',
      columns: [
        { id: 'assignment-1', label: 'Cell Quiz', maxPoints: 20 },
      ],
      rows: [
        {
          studentId: 'student-1',
          studentName: 'Alice Smith',
          average: 92,
          cells: [
            { columnId: 'assignment-1', score: 18, displayValue: '18' },
          ],
        },
      ],
    })

    render(
      <MemoryRouter initialEntries={['/students/student-1?source=grading']}>
        <Routes>
          <Route path="/students/:studentId" element={<StudentDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Alice Smith' })).toBeInTheDocument()
    expect(screen.getByText(/latest paper exam score was saved to this student record/i)).toBeInTheDocument()
    expect(screen.getByText('Biology P1')).toBeInTheDocument()
    expect(screen.getAllByText('92%').length).toBeGreaterThan(0)
    expect(screen.getByText('Cell Quiz')).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument()
  })

  it('uses recorded points for the overall average and pages through classes one at a time', async () => {
    fetchStudentByIdMock.mockResolvedValueOnce({
      id: 'student-1',
      fullName: 'Alice Smith',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
      classLabel: 'Biology 1',
      gradeLabel: '10',
      isActive: true,
    })
    fetchClassesMock.mockResolvedValueOnce([
      {
        id: 'class-1',
        name: 'Biology',
        subject: 'Science',
        period: '1',
        schoolYear: '2025-2026',
        isActive: true,
      },
      {
        id: 'class-2',
        name: 'Algebra',
        subject: 'Math',
        period: '3',
        schoolYear: '2025-2026',
        isActive: true,
      },
    ])
    fetchClassGradebookMock
      .mockResolvedValueOnce({
        classId: 'class-1',
        classLabel: 'Biology P1',
        columns: [
          { id: 'assignment-1', label: 'Cell Quiz', maxPoints: 100 },
        ],
        rows: [
          {
            studentId: 'student-1',
            studentName: 'Alice Smith',
            average: 90,
            cells: [
              { columnId: 'assignment-1', score: 90, displayValue: '90' },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({
        classId: 'class-2',
        classLabel: 'Algebra P3',
        columns: [
          { id: 'assignment-2', label: 'Equation Check', maxPoints: 20 },
        ],
        rows: [
          {
            studentId: 'student-1',
            studentName: 'Alice Smith',
            average: 50,
            cells: [
              { columnId: 'assignment-2', score: 10, displayValue: '10' },
            ],
          },
        ],
      })

    render(
      <MemoryRouter initialEntries={['/students/student-1']}>
        <Routes>
          <Route path="/students/:studentId" element={<StudentDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Alice Smith' })).toBeInTheDocument()
    expect(screen.getAllByText('83.3%').length).toBeGreaterThan(0)
    expect(screen.getByText('Class 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Biology P1')).toBeInTheDocument()
    expect(screen.queryByText('Algebra P3')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /next class/i }))

    expect(screen.getByText('Class 2 of 2')).toBeInTheDocument()
    expect(screen.getByText('Algebra P3')).toBeInTheDocument()
    expect(screen.queryByText('Biology P1')).not.toBeInTheDocument()
  })

  it('saves profile edits back through the student API', async () => {
    fetchStudentByIdMock.mockResolvedValueOnce({
      id: 'student-1',
      fullName: 'Alice Smith',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
      classLabel: 'Biology 1',
      gradeLabel: '10',
      isActive: true,
    })
    fetchClassesMock.mockResolvedValueOnce([])
    updateStudentMock.mockResolvedValueOnce({
      id: 'student-1',
      fullName: 'Alicia Smith',
      firstName: 'Alicia',
      lastName: 'Smith',
      email: 'alice@example.com',
      classLabel: 'Biology 1',
      gradeLabel: '10',
      isActive: true,
    })

    render(
      <MemoryRouter initialEntries={['/students/student-1']}>
        <Routes>
          <Route path="/students/:studentId" element={<StudentDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Alice Smith' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/student number/i)).not.toBeInTheDocument()

    fireEvent.change(screen.getByDisplayValue('Alice'), {
      target: { value: 'Alicia' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save student profile/i }))

    await waitFor(() => {
      expect(updateStudentMock).toHaveBeenCalledWith('student-1', {
        firstName: 'Alicia',
        lastName: 'Smith',
        email: 'alice@example.com',
        isActive: true,
      })
    })
  })
})