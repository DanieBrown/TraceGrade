import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StudentListItem } from './studentsTypes'
import StudentDetailModal from './StudentDetailModal'

const updateStudentMock = vi.fn()

vi.mock('./studentsApi', () => ({
  updateStudent: (...args: unknown[]) => updateStudentMock(...args),
}))

const STUDENT: StudentListItem = {
  id: 'student-1',
  fullName: 'Alice Smith',
  firstName: 'Alice',
  lastName: 'Smith',
  email: 'alice@example.com',
  studentNumber: '12345',
  classLabel: 'Math 101',
  gradeLabel: 'A',
  isActive: true,
}

describe('StudentDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render or persist a student number field', async () => {
    updateStudentMock.mockResolvedValueOnce(STUDENT)

    render(
      <StudentDetailModal
        student={STUDENT}
        onClose={() => undefined}
        onStudentUpdated={() => undefined}
      />,
    )

    expect(screen.queryByLabelText(/Student Number/i)).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Alicia' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

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