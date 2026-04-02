import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import GradingResultsList from './GradingResultsList'
import type { GradedStudentRecord } from './GradingResultsList'

const records: GradedStudentRecord[] = [
  {
    studentId: 'student-1',
    studentName: 'Alice Smith',
    submissionId: 'submission-1',
    result: {
      gradeId: 'grade-1',
      submissionId: 'submission-1',
      status: 'COMPLETED',
      aiScore: 85,
      finalScore: 85,
      confidenceScore: 78,
      needsReview: true,
      questionScores: '[]',
      aiFeedback: 'Strong work overall.',
      teacherOverride: true,
      reviewedBy: 'teacher-1',
      reviewedAt: '2026-04-02T12:00:00Z',
      submissionImageUrl: null,
      processingTimeMs: 1200,
      createdAt: '2026-04-02T11:00:00Z',
      updatedAt: '2026-04-02T12:00:00Z',
    },
    parsedQuestions: [],
    savedScores: [],
    totalAdjusted: 17,
    totalAvailable: 20,
  },
]

describe('GradingResultsList', () => {
  afterEach(() => {
    cleanup()
  })

  it('uses the TraceGrade dark surface styling so the paper exam view stays visually consistent', () => {
    render(<GradingResultsList records={records} />)

    const section = screen.getByLabelText('Graded results (1 student)')

    expect(section).toHaveClass('surface-panel-plain')
    expect(section).not.toHaveClass('bg-white')
  })
})