import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ExamPrintPreview from './ExamPrintPreview'

const exam = {
  id: 'exam-1',
  assignmentId: 'assignment-1',
  title: 'Geometry Benchmark',
  questionCount: 2,
  totalPoints: 25,
  statusLabel: 'Published',
  questionsJson: JSON.stringify([
    {
      questionNumber: 1,
      type: 'open-ended',
      prompt: 'Explain how to find the area of a triangle.',
      pointsAvailable: 10,
    },
    {
      questionNumber: 2,
      type: 'multiple-choice',
      prompt: 'Which shape has four equal sides?',
      pointsAvailable: 15,
      options: [
        { label: 'A', text: 'Rectangle' },
        { label: 'B', text: 'Square' },
      ],
    },
  ]),
}

describe('ExamPrintPreview', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders print-only markup outside the routed app container', () => {
    const { container } = render(<ExamPrintPreview exam={exam} onClose={() => {}} />)

    expect(container.querySelector('.print\\:block')).not.toBeInTheDocument()

    const printPortal = document.body.querySelector('.print\\:block')
    expect(printPortal).toBeInTheDocument()

    expect(
      within(printPortal as HTMLElement).getByRole('heading', { name: 'Geometry Benchmark' }),
    ).toBeInTheDocument()
  })
})