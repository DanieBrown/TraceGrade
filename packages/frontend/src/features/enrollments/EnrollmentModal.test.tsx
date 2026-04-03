import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClassListItem } from '../classes/classesTypes'
import type { EnrollmentListItem } from './enrollmentTypes'
import type { StudentListItem } from '../students/studentsTypes'
import EnrollmentModal from './EnrollmentModal'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const fetchEnrollmentsMock = vi.fn()
const enrollStudentMock = vi.fn()
const dropStudentMock = vi.fn()
const getEnrollmentsErrorDetailsMock = vi.fn((error: unknown) => ({
  message: error instanceof Error ? error.message : 'There was a problem loading enrollments.',
  retryable: true,
}))

vi.mock('./enrollmentApi', () => ({
  fetchEnrollments: (...args: unknown[]) => fetchEnrollmentsMock(...args),
  enrollStudent: (...args: unknown[]) => enrollStudentMock(...args),
  dropStudent: (...args: unknown[]) => dropStudentMock(...args),
  getEnrollmentsErrorDetails: (...args: unknown[]) => getEnrollmentsErrorDetailsMock(...args),
}))

const fetchStudentsMock = vi.fn()
const getStudentsLoadErrorDetailsMock = vi.fn((error: unknown) => ({
  message: error instanceof Error ? error.message : 'There was a problem loading students.',
  retryable: true,
}))

vi.mock('../students/studentsApi', () => ({
  fetchStudents: (...args: unknown[]) => fetchStudentsMock(...args),
  getStudentsLoadErrorDetails: (...args: unknown[]) => getStudentsLoadErrorDetailsMock(...args),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_CLASS: ClassListItem = {
  id: 'class-1',
  name: 'Biology 101',
  subject: 'Science',
  period: '2',
  schoolYear: '2026-2027',
  isActive: true,
}

const BASE_STUDENT: StudentListItem = {
  id: 'student-1',
  fullName: 'Alice Johnson',
  firstName: 'Alice',
  lastName: 'Johnson',
  email: 'alice@example.com',
  classLabel: null,
  gradeLabel: null,
  isActive: true,
}

const SECOND_STUDENT: StudentListItem = {
  id: 'student-2',
  fullName: 'Bob Smith',
  firstName: 'Bob',
  lastName: 'Smith',
  email: 'bob@example.com',
  classLabel: null,
  gradeLabel: null,
  isActive: true,
}

const BASE_ENROLLMENT: EnrollmentListItem = {
  id: 'enrollment-1',
  classId: 'class-1',
  studentId: 'student-1',
  enrolledAt: '2026-01-15T00:00:00.000Z',
  droppedAt: null,
  createdAt: '2026-01-15T00:00:00.000Z',
  updatedAt: '2026-01-15T00:00:00.000Z',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderModal(onClose = vi.fn()) {
  return render(<EnrollmentModal item={BASE_CLASS} onClose={onClose} />)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EnrollmentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getEnrollmentsErrorDetailsMock.mockImplementation((error: unknown) => ({
      message: error instanceof Error ? error.message : 'There was a problem loading enrollments.',
      retryable: true,
    }))
    getStudentsLoadErrorDetailsMock.mockImplementation((error: unknown) => ({
      message: error instanceof Error ? error.message : 'There was a problem loading students.',
      retryable: true,
    }))
  })

  afterEach(() => {
    cleanup()
  })

  // ── 1. Loading skeleton state ───────────────────────────────────────────────

  it('renders skeleton loading state while enrollments are being fetched', () => {
    fetchEnrollmentsMock.mockReturnValueOnce(new Promise(() => {}))
    fetchStudentsMock.mockReturnValueOnce(new Promise(() => {}))

    renderModal()

    expect(screen.getByLabelText('Loading enrolled students')).toBeInTheDocument()
    expect(screen.getByLabelText('Loading students')).toBeInTheDocument()
  })

  // ── 2. Enrolled students list after fetch ───────────────────────────────────

  it('renders enrolled students list after both fetches resolve', async () => {
    fetchEnrollmentsMock.mockResolvedValueOnce([BASE_ENROLLMENT])
    fetchStudentsMock.mockResolvedValueOnce([BASE_STUDENT])

    renderModal()

    // Student name appears in the roster panel
    expect(await screen.findByRole('button', { name: 'Drop Alice Johnson' })).toBeInTheDocument()

    // Count badge shows up in header once roster is loaded
    expect(screen.getByLabelText('1 student enrolled')).toBeInTheDocument()
  })

  // ── 3. Empty state when no enrollments ─────────────────────────────────────

  it('renders empty state when no enrollments exist', async () => {
    fetchEnrollmentsMock.mockResolvedValueOnce([])
    fetchStudentsMock.mockResolvedValueOnce([BASE_STUDENT])

    renderModal()

    expect(await screen.findByText('No students enrolled yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Add Students' })).toBeInTheDocument()
  })

  // ── 4. Fetch error with retry button ────────────────────────────────────────

  it('renders fetch error with retry button that re-triggers fetch on click', async () => {
    fetchEnrollmentsMock.mockRejectedValueOnce(new Error('network error'))
    fetchEnrollmentsMock.mockResolvedValueOnce([])
    fetchStudentsMock.mockResolvedValueOnce([])
    getEnrollmentsErrorDetailsMock.mockReturnValueOnce({
      message: 'Could not connect to the server.',
      retryable: true,
    })

    renderModal()

    expect(await screen.findByText('Failed to load roster.')).toBeInTheDocument()

    const retryButton = screen.getByRole('button', { name: 'Try Again' })
    expect(retryButton).toBeInTheDocument()

    fireEvent.click(retryButton)

    await waitFor(() => {
      expect(fetchEnrollmentsMock).toHaveBeenCalledTimes(2)
    })

    expect(await screen.findByText('No students enrolled yet')).toBeInTheDocument()
  })

  // ── 5. NonRetryableEnrollmentsError — no retry button ──────────────────────

  it('renders error without retry button when error is non-retryable', async () => {
    fetchEnrollmentsMock.mockRejectedValueOnce(new Error('config error'))
    fetchStudentsMock.mockResolvedValueOnce([])
    getEnrollmentsErrorDetailsMock.mockReturnValueOnce({
      message: 'Enrollments cannot be loaded due to invalid configuration.',
      retryable: false,
    })

    renderModal()

    expect(await screen.findByText('Failed to load roster.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try Again' })).not.toBeInTheDocument()
    expect(screen.getByText('Check your configuration and refresh the page.')).toBeInTheDocument()
  })

  // ── 6. Escape key triggers onClose ─────────────────────────────────────────

  it('calls onClose when Escape key is pressed', async () => {
    fetchEnrollmentsMock.mockResolvedValueOnce([])
    fetchStudentsMock.mockResolvedValueOnce([])
    const onClose = vi.fn()

    renderModal(onClose)

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // ── 7. Enroll student flow ──────────────────────────────────────────────────

  it('calls enrollStudent when Add is clicked and adds student to roster', async () => {
    fetchEnrollmentsMock.mockResolvedValueOnce([])
    fetchStudentsMock.mockResolvedValueOnce([BASE_STUDENT])
    enrollStudentMock.mockResolvedValueOnce({
      ...BASE_ENROLLMENT,
      id: 'enrollment-new',
    })

    renderModal()

    const addButton = await screen.findByRole('button', { name: 'Enroll Alice Johnson' })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(enrollStudentMock).toHaveBeenCalledWith('class-1', 'student-1')
    })

    // Student should now appear in the roster with a Drop button
    expect(await screen.findByRole('button', { name: 'Drop Alice Johnson' })).toBeInTheDocument()
    expect(screen.getByLabelText('1 student enrolled')).toBeInTheDocument()
  })

  // ── 8. Client-side duplicate guard ─────────────────────────────────────────
  //
  // When a student is already in the active enrollments, the search panel shows
  // an "Enrolled" badge instead of an "Add" button, preventing the API call.
  // The handleAdd guard (FR-009) provides a safety net for race conditions.

  it('shows Enrolled badge for already-enrolled student and does not call enrollStudent', async () => {
    fetchEnrollmentsMock.mockResolvedValueOnce([BASE_ENROLLMENT])
    fetchStudentsMock.mockResolvedValueOnce([BASE_STUDENT, SECOND_STUDENT])

    renderModal()

    // Wait for roster to load — Alice is in the roster
    expect(await screen.findByRole('button', { name: 'Drop Alice Johnson' })).toBeInTheDocument()

    // In the search panel Alice has an "Enrolled" badge — no Add button for her
    expect(screen.getByLabelText('Alice Johnson is already enrolled')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enroll Alice Johnson' })).not.toBeInTheDocument()

    // Bob is not enrolled — his Add button IS present
    expect(screen.getByRole('button', { name: 'Enroll Bob Smith' })).toBeInTheDocument()

    // enrollStudent was never called (no Add button was clicked)
    expect(enrollStudentMock).not.toHaveBeenCalled()
  })

  // ── 9. Drop student flow ────────────────────────────────────────────────────

  it('calls dropStudent when Drop is clicked and removes student from roster', async () => {
    fetchEnrollmentsMock.mockResolvedValueOnce([BASE_ENROLLMENT])
    fetchStudentsMock.mockResolvedValueOnce([BASE_STUDENT])
    dropStudentMock.mockResolvedValueOnce(undefined)

    renderModal()

    // Wait for roster to load
    const dropButton = await screen.findByRole('button', { name: 'Drop Alice Johnson' })
    fireEvent.click(dropButton)

    await waitFor(() => {
      expect(dropStudentMock).toHaveBeenCalledWith('class-1', 'enrollment-1')
    })

    // Drop button should be gone — student removed from roster
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Drop Alice Johnson' })).not.toBeInTheDocument()
    })

    // Roster shows empty state after removal
    expect(await screen.findByText('No students enrolled yet')).toBeInTheDocument()
  })

  // ── 10. Drop error — inline error shown per row ─────────────────────────────

  it('shows per-row error message when dropStudent fails', async () => {
    fetchEnrollmentsMock.mockResolvedValueOnce([BASE_ENROLLMENT])
    fetchStudentsMock.mockResolvedValueOnce([BASE_STUDENT])
    // Simulate a 404 AxiosError so Fix 1 conditional (404|409 → reload) fires
    dropStudentMock.mockRejectedValueOnce(
      Object.assign(new Error('Not Found'), { isAxiosError: true, response: { status: 404 } }),
    )
    // Second fetchEnrollments call triggered by handleDrop catch (FIX 1 — EC-04 reconcile)
    fetchEnrollmentsMock.mockResolvedValueOnce([BASE_ENROLLMENT])

    renderModal()

    const dropButton = await screen.findByRole('button', { name: 'Drop Alice Johnson' })
    fireEvent.click(dropButton)

    await waitFor(() => {
      expect(dropStudentMock).toHaveBeenCalledWith('class-1', 'enrollment-1')
    })

    // Per-row error message appears below the Drop button with role="alert"
    expect(await screen.findByText('Drop failed. Please try again.')).toBeInTheDocument()

    // Student row remains in the roster after drop failure
    expect(screen.getByRole('button', { name: 'Drop Alice Johnson' })).toBeInTheDocument()

    // FIX 1: loadEnrollments was called a second time to reconcile stale state
    await waitFor(() => {
      expect(fetchEnrollmentsMock).toHaveBeenCalledTimes(2)
    })
  })
})
