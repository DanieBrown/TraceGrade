import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FileUpload from './FileUpload'

describe('FileUpload', () => {
  let inputClickSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    inputClickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    inputClickSpy.mockRestore()
    cleanup()
  })

  it('offers an explicit choose files action for handwritten exam uploads', () => {
    render(<FileUpload assignmentId="assignment-1" studentId="student-1" />)

    fireEvent.click(screen.getByRole('button', { name: /choose files/i }))

    expect(inputClickSpy).toHaveBeenCalledTimes(1)
  })
})