import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import StudentsPage from './StudentsPage'

const fetchStudentsMock = vi.fn()
const getStudentsLoadErrorDetailsMock = vi.fn((error: unknown) => ({
  message: error instanceof Error ? error.message : 'There was a problem connecting to the server.',
  retryable: true,
}))

vi.mock('../features/students/studentsApi', () => ({
  fetchStudents: (...args: unknown[]) => fetchStudentsMock(...args),
  isStudentListEmpty: (items: unknown[]) => items.length === 0,
  getStudentsLoadErrorDetails: (...args: unknown[]) => getStudentsLoadErrorDetailsMock(...args),
}))

describe('StudentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getStudentsLoadErrorDetailsMock.mockImplementation((error: unknown) => ({
      message: error instanceof Error ? error.message : 'There was a problem connecting to the server.',
      retryable: true,
    }))
  })

  afterEach(() => {
    cleanup()
  })

  it('renders loading state while students are being fetched', () => {
    fetchStudentsMock.mockReturnValueOnce(new Promise(() => {}))

    render(
      <MemoryRouter>
        <StudentsPage />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('Loading students')).toBeInTheDocument()
  })

  it('renders error state when student fetch fails', async () => {
    fetchStudentsMock.mockRejectedValueOnce(new Error('network error'))

    render(
      <MemoryRouter>
        <StudentsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Failed to load students.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry loading students' })).toBeInTheDocument()
  })

  it('renders empty state when no students are returned', async () => {
    fetchStudentsMock.mockResolvedValueOnce([])

    render(
      <MemoryRouter>
        <StudentsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('No students found')).toBeInTheDocument()
    expect(screen.getByText('Students added to the system will appear here.')).toBeInTheDocument()
  })

  it('renders populated list and handles missing optional fields safely', async () => {
    fetchStudentsMock.mockResolvedValueOnce([
      {
        id: 'student-1',
        fullName: 'Alice Smith',
        email: 'alice@example.com',
        studentNumber: '12345',
        classLabel: 'Math 101',
        gradeLabel: 'A',
        isActive: true,
      },
      {
        id: 'student-2',
        fullName: 'Bob Jones',
        // Missing optional fields
      },
    ])

    render(
      <MemoryRouter>
        <StudentsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Alice Smith')).toBeInTheDocument()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    expect(screen.getByText('#12345')).toBeInTheDocument()
    expect(screen.getByText('Class: Math 101')).toBeInTheDocument()
    expect(screen.getByText('Grade: A')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()

    expect(screen.getByText('Bob Jones')).toBeInTheDocument()
    expect(screen.getByText('No email provided')).toBeInTheDocument()
  })

  it('retries fetching students when Try Again is clicked', async () => {
    fetchStudentsMock.mockRejectedValueOnce(new Error('network error'))
    fetchStudentsMock.mockResolvedValueOnce([])

    render(
      <MemoryRouter>
        <StudentsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Failed to load students.')).toBeInTheDocument()
    
    const retryButton = screen.getByRole('button', { name: 'Retry loading students' })
    fireEvent.click(retryButton)

    expect(await screen.findByText('No students found')).toBeInTheDocument()
    expect(fetchStudentsMock).toHaveBeenCalledTimes(2)
  })

  it('renders non-retryable error state without retry action', async () => {
    fetchStudentsMock.mockRejectedValueOnce(new Error('invalid config'))
    getStudentsLoadErrorDetailsMock.mockReturnValueOnce({
      message: 'Students cannot be loaded because school configuration is invalid. Set VITE_SCHOOL_ID to a valid school UUID and reload the page.',
      retryable: false,
    })

    render(
      <MemoryRouter>
        <StudentsPage />
      </MemoryRouter>,
    )

    expect(
      await screen.findByText(
        'Students cannot be loaded because school configuration is invalid. Set VITE_SCHOOL_ID to a valid school UUID and reload the page.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retry loading students' })).not.toBeInTheDocument()
  })
})
