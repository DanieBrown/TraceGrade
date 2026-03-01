import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchClassRoster } from '../data/rosterAdapter'
import {
  BATCH_WORKFLOW_STEPS,
  isTerminalBatchStatus,
  type BatchSummary,
  type BatchTrackingRow,
  type BatchWorkflowStep,
  type RosterStudent,
} from '../domain/batchTypes'
import { validateMappings } from '../domain/mappingValidation'
import { computeBatchSummary } from '../domain/summaryAggregation'
import { pollBatchProgress } from '../orchestration/pollBatchProgress'
import { buildFailedRetryMappings, getFailedRows } from '../orchestration/retryFailed'
import { submitBatch } from '../orchestration/submitBatch'
import {
  clearBatchSessionSnapshot,
  loadBatchSessionSnapshot,
  saveBatchSessionSnapshot,
} from './sessionPersistence'
import { useBatchMapping } from './useBatchMapping'
import { isValidAssignmentId } from '../domain/assignmentContext'

const POLL_INTERVAL_MS = 2000

type LoadState = 'loading' | 'error' | 'done'

const EMPTY_SUMMARY: BatchSummary = {
  totalProcessed: 0,
  passedCount: 0,
  failedCount: 0,
  passRate: 0,
  failRate: 0,
  averageScore: 0,
  flaggedReviewCount: 0,
  missingScoreCount: 0,
}

interface UseBatchWorkflowInput {
  classId: string
  className: string
  assignmentId: string
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

const RETRY_REUPLOAD_GUIDANCE =
  'Retry unavailable for restored failed rows because original files are not persisted after refresh. Re-upload failed files from Upload, map them, and submit again.'

function getStepIndex(step: BatchWorkflowStep): number {
  const index = BATCH_WORKFLOW_STEPS.indexOf(step)
  return index >= 0 ? index : 0
}

export function useBatchWorkflow({ classId, className, assignmentId }: UseBatchWorkflowInput) {
  const {
    files,
    fileCount,
    fileRejectionMessage,
    addFiles,
    removeFile,
    setStudentForFile,
    clearFiles,
  } = useBatchMapping()

  const [step, setStep] = useState<BatchWorkflowStep>('upload')
  const [rosterState, setRosterState] = useState<LoadState>('loading')
  const [rosterError, setRosterError] = useState<string | null>(null)
  const [roster, setRoster] = useState<RosterStudent[]>([])
  const [rows, setRows] = useState<BatchTrackingRow[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [pollError, setPollError] = useState<string | null>(null)
  const [retryError, setRetryError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [isRestoredFromSession, setIsRestoredFromSession] = useState(false)

  const rowsRef = useRef<BatchTrackingRow[]>(rows)
  const pollIntervalRef = useRef<number | null>(null)
  const pollInFlightRef = useRef(false)

  const reloadRoster = useCallback(async () => {
    setRosterState('loading')
    setRosterError(null)

    try {
      const nextRoster = await fetchClassRoster(classId)
      setRoster(nextRoster)
      setRosterState('done')
    } catch (error) {
      setRoster([])
      setRosterState('error')
      setRosterError(toErrorMessage(error, 'Failed to load class roster.'))
    }
  }, [classId])

  useEffect(() => {
    void reloadRoster()
  }, [reloadRoster])

  useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  useEffect(() => {
    const snapshot = loadBatchSessionSnapshot(classId)
    if (!snapshot) {
      return
    }

    if (snapshot.assignmentId !== assignmentId) {
      clearBatchSessionSnapshot(classId)
      return
    }

    setRows(snapshot.rows)
    setStep(snapshot.step)
    setIsRestoredFromSession(true)
  }, [assignmentId, classId])

  useEffect(() => {
    if (rows.length === 0 || (step !== 'processing' && step !== 'summary')) {
      return
    }

    saveBatchSessionSnapshot({
      classId,
      className,
      assignmentId,
      step,
      rows,
      savedAt: new Date().toISOString(),
    })
  }, [assignmentId, classId, className, rows, step])

  useEffect(() => {
    if (step === 'upload' && rows.length === 0) {
      clearBatchSessionSnapshot(classId)
    }
  }, [classId, rows.length, step])

  const enrolledStudentIds = useMemo(() => new Set(roster.map((student) => student.id)), [roster])
  const hasValidAssignmentId = useMemo(() => isValidAssignmentId(assignmentId), [assignmentId])

  const validation = useMemo(
    () => validateMappings(files, enrolledStudentIds),
    [enrolledStudentIds, files],
  )

  const hasTerminalRows = useMemo(
    () => rows.length > 0 && rows.every((row) => isTerminalBatchStatus(row.status)),
    [rows],
  )

  const summary = useMemo(() => {
    if (rows.length === 0) {
      return EMPTY_SUMMARY
    }

    return computeBatchSummary(rows)
  }, [rows])

  const clearPollTimer = useCallback(() => {
    if (pollIntervalRef.current !== null) {
      window.clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (step !== 'processing' || rows.length === 0) {
      clearPollTimer()
      return
    }

    const runTick = async () => {
      if (pollInFlightRef.current) {
        return
      }

      pollInFlightRef.current = true
      setIsPolling(true)

      try {
        const { rows: nextRows, transientErrorCount } = await pollBatchProgress(rowsRef.current)
        setRows(nextRows)

        if (transientErrorCount > 0) {
          const label = transientErrorCount === 1 ? 'submission' : 'submissions'
          setPollError(
            `Temporary network issue while refreshing ${transientErrorCount} ${label}. Keeping last known statuses and retrying automatically.`,
          )
        } else {
          setPollError(null)
        }

        if (nextRows.length > 0 && nextRows.every((row) => isTerminalBatchStatus(row.status))) {
          setStep('summary')
          setPollError(null)
          clearPollTimer()
        }
      } catch (error) {
        setPollError(toErrorMessage(error, 'Failed to refresh batch progress.'))
      } finally {
        pollInFlightRef.current = false
        setIsPolling(false)
      }
    }

    void runTick()
    pollIntervalRef.current = window.setInterval(() => {
      void runTick()
    }, POLL_INTERVAL_MS)

    return () => {
      clearPollTimer()
    }
  }, [clearPollTimer, rows.length, step])

  const goToMapping = useCallback(() => {
    if (fileCount === 0) {
      return
    }

    setStep('mapping')
  }, [fileCount])

  const goToUpload = useCallback(() => {
    setStep('upload')
  }, [])

  const clearWorkflow = useCallback(() => {
    clearPollTimer()
    clearFiles()
    setRows([])
    setStep('upload')
    setSubmitError(null)
    setPollError(null)
    setRetryError(null)
    setIsRestoredFromSession(false)
    clearBatchSessionSnapshot(classId)
  }, [classId, clearFiles, clearPollTimer])

  const submitMappings = useCallback(async () => {
    if (!hasValidAssignmentId) {
      setSubmitError('Assignment context is missing or invalid. Add ?assignmentId=<uuid> to the URL and retry.')
      return
    }

    if (!validation.valid) {
      setSubmitError('Fix mapping errors before submitting this batch.')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setRetryError(null)
    setPollError(null)

    try {
      const result = await submitBatch({
        assignmentId,
        mappings: files,
        roster,
      })

      setRows(result.rows)

      if (result.rows.length > 0 && result.rows.every((row) => isTerminalBatchStatus(row.status))) {
        setStep('summary')
      } else {
        setStep('processing')
      }
    } catch (error) {
      setSubmitError(toErrorMessage(error, 'Failed to submit batch for grading.'))
    } finally {
      setIsSubmitting(false)
    }
  }, [assignmentId, files, hasValidAssignmentId, roster, validation.valid])

  const retryFailed = useCallback(async () => {
    if (!hasValidAssignmentId) {
      setRetryError('Assignment context is missing or invalid. Add ?assignmentId=<uuid> to the URL and retry.')
      return
    }

    const failedRows = getFailedRows(rows)
    if (failedRows.length === 0) {
      setRetryError('No failed entries are available to retry.')
      return
    }

    const retryMappings = buildFailedRetryMappings(rows, files)

    if (
      retryMappings.length !== failedRows.length ||
      retryMappings.some((mapping) => !(mapping.file instanceof File))
    ) {
      setRetryError(RETRY_REUPLOAD_GUIDANCE)
      return
    }

    setIsRetrying(true)
    setRetryError(null)
    setPollError(null)

    try {
      const retryResult = await submitBatch({
        assignmentId,
        mappings: retryMappings,
        roster,
      })

      const retryRowsByLocalFileId = new Map(
        retryResult.rows.map((row) => [row.localFileId, row] as const),
      )

      setRows((currentRows) =>
        currentRows.map((row) => retryRowsByLocalFileId.get(row.localFileId) ?? row),
      )

      setStep('processing')
    } catch (error) {
      setRetryError(toErrorMessage(error, 'Failed to retry failed submissions.'))
    } finally {
      setIsRetrying(false)
    }
  }, [assignmentId, files, hasValidAssignmentId, roster, rows])

  return {
    step,
    stepIndex: getStepIndex(step),
    files,
    fileCount,
    fileRejectionMessage,
    addFiles,
    removeFile,
    setStudentForFile,
    roster,
    rosterState,
    rosterError,
    reloadRoster,
    validation,
    rows,
    hasTerminalRows,
    summary,
    submitError,
    pollError,
    retryError,
    isSubmitting,
    isPolling,
    isRetrying,
    isRestoredFromSession,
    failedRows: getFailedRows(rows),
    canSubmitMappings:
      validation.valid && rosterState === 'done' && roster.length > 0 && hasValidAssignmentId,
    canRetryFailed: getFailedRows(rows).length > 0,
    goToMapping,
    goToUpload,
    submitMappings,
    retryFailed,
    clearWorkflow,
  }
}
