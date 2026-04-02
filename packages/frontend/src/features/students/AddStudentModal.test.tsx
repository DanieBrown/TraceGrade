import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AddStudentModal from './AddStudentModal'

const createStudentMock = vi.fn()

vi.mock('./studentsApi', () => ({
  createStudent: (...args: unknown[]) => createStudentMock(...args),
}))

describe('AddStudentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render or submit a student number field', async () => {
    createStudentMock.mockResolvedValueOnce({ id: 'student-1' })

    render(<AddStudentModal onClose={() => undefined} onStudentAdded={() => undefined} />)

    expect(screen.queryByLabelText(/Student Number/i)).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Jane' } })
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'jane.doe@school.edu' } })

    fireEvent.click(screen.getByRole('button', { name: '+ Add Student' }))

    await waitFor(() => {
      expect(createStudentMock).toHaveBeenCalledWith({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@school.edu',
      })
    })
  })
})