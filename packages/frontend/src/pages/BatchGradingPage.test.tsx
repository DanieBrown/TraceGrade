import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MappingValidationResult } from '../features/batch-grading/domain/batchTypes'
import BatchGradingPage from './BatchGradingPage'

const useBatchWorkflowMock = vi.fn()

vi.mock('../features/batch-grading/state/useBatchWorkflow', () => ({
  useBatchWorkflow: (...args: unknown[]) => useBatchWorkflowMock(...args),
}))

vi.mock('../features/batch-grading/components/BatchUploadStep', () => ({
  default: () => <div>Upload Step Mock</div>,
}))

vi.mock('../features/batch-grading/components/BatchMappingStep', () => ({
  default: () => <div>Mapping Step Mock</div>,
}))

vi.mock('../features/batch-grading/components/BatchProgressStep', () => ({
  default: () => <div>Progress Step Mock</div>,
}))

vi.mock('../features/batch-grading/components/BatchSummaryStep', () => ({
  default: () => <div>Summary Step Mock</div>,
}))

const EMPTY_VALIDATION: MappingValidationResult = {
  valid: true,
  rowErrors: {},
  formErrors: [],
}

function createWorkflowState(step: 'upload' | 'mapping' | 'processing' | 'summary') {
  return {
    step,
    stepIndex: ['upload', 'mapping', 'processing', 'summary'].indexOf(step),
    files: [],
    fileCount: 0,
    fileRejectionMessage: null,
    addFiles: vi.fn(),
    removeFile: vi.fn(),
    setStudentForFile: vi.fn(),
    roster: [],
    rosterState: 'done' as const,
    rosterError: null,
    reloadRoster: vi.fn(),
    validation: EMPTY_VALIDATION,
    rows: [],
    hasTerminalRows: false,
    summary: {
      totalProcessed: 0,
      passedCount: 0,
      failedCount: 0,
      passRate: 0,
      failRate: 0,
      averageScore: 0,
      flaggedReviewCount: 0,
      missingScoreCount: 0,
    },
    submitError: null,
    pollError: null,
    retryError: null,
    isSubmitting: false,
    isPolling: false,
    isRetrying: false,
    isRestoredFromSession: false,
    failedRows: [],
    canSubmitMappings: true,
    canRetryFailed: false,
    goToMapping: vi.fn(),
    goToUpload: vi.fn(),
    submitMappings: vi.fn(),
    retryFailed: vi.fn(),
    clearWorkflow: vi.fn(),
  }
}

describe('BatchGradingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows class-context error when route param is missing', () => {
    useBatchWorkflowMock.mockReturnValue(createWorkflowState('upload'))

    render(
      <MemoryRouter initialEntries={['/batch']}>
        <Routes>
          <Route path="/batch" element={<BatchGradingPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Class context is missing. Return to Classes and start Batch Grade from a class card.')).toBeInTheDocument()
  })

  it('renders stepper and upload step from class-context route', () => {
    useBatchWorkflowMock.mockReturnValue(createWorkflowState('upload'))

    render(
      <MemoryRouter initialEntries={['/classes/class-1/batch-grading?className=Biology%20101&assignmentId=123e4567-e89b-12d3-a456-426614174000']}>
        <Routes>
          <Route path="/classes/:classId/batch-grading" element={<BatchGradingPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Batch Grading: Biology 101')).toBeInTheDocument()
    expect(screen.getByText('Upload Step Mock')).toBeInTheDocument()
    expect(screen.getByText('Step 1')).toBeInTheDocument()
    expect(screen.getByText('Map Students')).toBeInTheDocument()
  })

  it('renders summary step content when workflow reaches terminal stage', () => {
    useBatchWorkflowMock.mockReturnValue(createWorkflowState('summary'))

    render(
      <MemoryRouter initialEntries={['/classes/class-1/batch-grading?className=Biology%20101&assignmentId=123e4567-e89b-12d3-a456-426614174000']}>
        <Routes>
          <Route path="/classes/:classId/batch-grading" element={<BatchGradingPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Summary Step Mock')).toBeInTheDocument()
  })

  it('sanitizes invalid assignmentId from query before passing workflow input and shows guidance', () => {
    useBatchWorkflowMock.mockReturnValue(createWorkflowState('upload'))

    render(
      <MemoryRouter initialEntries={['/classes/class-1/batch-grading?className=Biology%20101&assignmentId=invalid%26x%3D1']}>
        <Routes>
          <Route path="/classes/:classId/batch-grading" element={<BatchGradingPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(useBatchWorkflowMock).toHaveBeenCalledWith(
      expect.objectContaining({ assignmentId: '' }),
    )
    expect(screen.getByText(/Invalid assignment context\./i)).toBeInTheDocument()
  })
})
