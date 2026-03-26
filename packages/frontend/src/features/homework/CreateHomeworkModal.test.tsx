import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CreateHomeworkModal from './CreateHomeworkModal'

vi.mock('./homeworkApi', () => ({
  createHomework: vi.fn(),
}))

describe('CreateHomeworkModal', () => {
  afterEach(() => {
    cleanup()
  })

  it('labels class context as display-only to avoid implying gradebook linkage', () => {
    render(<CreateHomeworkModal onClose={() => undefined} onHomeworkCreated={() => undefined} />)

    expect(screen.getByLabelText(/Class Label/i)).toBeInTheDocument()
    expect(
      screen.getByText('This label helps organize homework on this page, but it does not link the item into Gradebook.'),
    ).toBeInTheDocument()
  })
})