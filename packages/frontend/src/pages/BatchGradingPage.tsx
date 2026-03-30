import { useMemo } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import BatchMappingStep from '../features/batch-grading/components/BatchMappingStep'
import BatchProgressStep from '../features/batch-grading/components/BatchProgressStep'
import BatchSummaryStep from '../features/batch-grading/components/BatchSummaryStep'
import BatchUploadStep from '../features/batch-grading/components/BatchUploadStep'
import {
  isValidAssignmentId,
  normalizeAssignmentId,
} from '../features/batch-grading/domain/assignmentContext'
import { BATCH_WORKFLOW_STEPS } from '../features/batch-grading/domain/batchTypes'
import { useBatchWorkflow } from '../features/batch-grading/state/useBatchWorkflow'
import { AppPage, AppPageHeader, AppPanel } from '../components/layout/AppPage'

const STEP_LABELS: Record<(typeof BATCH_WORKFLOW_STEPS)[number], string> = {
  upload: 'Upload',
  mapping: 'Map Students',
  processing: 'Processing',
  summary: 'Summary',
}

export default function BatchGradingPage() {
  const navigate = useNavigate()
  const params = useParams<{ classId: string }>()
  const [searchParams] = useSearchParams()

  const classId = params.classId?.trim() ?? ''
  const className = searchParams.get('className')?.trim() ?? 'Class'
  const assignmentIdFromQuery = searchParams.get('assignmentId')
  const assignmentId = normalizeAssignmentId(assignmentIdFromQuery)
  const hasInvalidAssignmentId =
    typeof assignmentIdFromQuery === 'string' &&
    assignmentIdFromQuery.trim().length > 0 &&
    !isValidAssignmentId(assignmentIdFromQuery)

  const workflow = useBatchWorkflow({
    classId,
    className,
    assignmentId,
  })

  const breadcrumbClassLabel = useMemo(() => className || classId || 'Unknown class', [classId, className])

  if (!classId) {
    return (
      <AppPage>
        <AppPanel>
          <h1 className="font-display text-xl font-bold text-pri">Batch grading</h1>
          <p className="mt-2 font-body text-sm text-sec">
            Choose a class from the Classes page to start batch grading.
          </p>
          <button
            type="button"
            onClick={() => navigate('/classes')}
            className="mt-4 rounded-lg px-4 py-2 font-display text-sm font-semibold"
            style={{
              background: 'var(--accent-gold)',
              color: 'var(--bg-base)',
            }}
          >
            Back to Classes
          </button>
        </AppPanel>
      </AppPage>
    )
  }

  return (
    <AppPage>
      <AppPageHeader
        eyebrow="Batch grading"
        title={`Batch grading: ${breadcrumbClassLabel}`}
        description="Upload, map, process, and review class submissions in one guided flow."
      />
      <div className="mb-6">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 font-body text-sm text-sec">
          <Link to="/classes" className="text-gold-300 no-underline hover:text-gold-200">Classes</Link>
          <span className="text-mut">/</span>
          <Link to="/classes" className="text-gold-300 no-underline hover:text-gold-200">{breadcrumbClassLabel}</Link>
          <span className="text-mut">/</span>
          <span className="text-pri">Batch grading</span>
        </nav>
        {!assignmentId && (
          <p className="mt-3 rounded-xl border border-gold-500/20 bg-gold-500/8 px-4 py-3 font-body text-sm text-sec">
            {hasInvalidAssignmentId
              ? 'The selected assignment could not be matched. Return to Classes and launch batch grading again from the correct assignment.'
              : 'This class was opened without an assignment selected. Return to Classes and choose the assignment you want to grade.'}
          </p>
        )}
      </div>

      <section className="rounded-xl border border-subtle bg-surface p-5">
        <ol className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="Batch grading steps">
          {BATCH_WORKFLOW_STEPS.map((stepName, index) => {
            const isActive = workflow.step === stepName
            const isCompleted = workflow.stepIndex > index

            return (
              <li
                key={stepName}
                className="rounded-lg border px-3 py-2"
                style={{
                  borderColor: isActive || isCompleted ? 'var(--border-accent)' : 'var(--border)',
                  background: isActive
                    ? 'rgba(232, 164, 40, 0.1)'
                    : isCompleted
                      ? 'rgba(0, 201, 167, 0.08)'
                      : 'var(--bg-elevated)',
                }}
              >
                <p className="font-mono text-xs text-mut">Step {index + 1}</p>
                <p
                  className="font-display text-sm font-semibold"
                  style={{
                    color: isActive
                      ? 'var(--accent-gold)'
                      : isCompleted
                        ? 'var(--accent-teal)'
                        : 'var(--text-secondary)',
                  }}
                >
                  {STEP_LABELS[stepName]}
                </p>
              </li>
            )
          })}
        </ol>

        {workflow.step === 'upload' && (
          <BatchUploadStep
            files={workflow.files}
            isLoading={workflow.rosterState === 'loading'}
            errorMessage={workflow.rosterState === 'error' ? workflow.rosterError : null}
            fileRejectionMessage={workflow.fileRejectionMessage}
            onFilesAdded={workflow.addFiles}
            onRemoveFile={workflow.removeFile}
            onCancel={() => navigate('/classes')}
            onNext={workflow.goToMapping}
          />
        )}

        {workflow.step === 'mapping' && (
          <BatchMappingStep
            files={workflow.files}
            roster={workflow.roster}
            rosterState={workflow.rosterState}
            rosterError={workflow.rosterError}
            validation={workflow.validation}
            submitError={workflow.submitError}
            isSubmitting={workflow.isSubmitting}
            canSubmit={workflow.canSubmitMappings}
            onRetryRoster={workflow.reloadRoster}
            onMapStudent={workflow.setStudentForFile}
            onBack={workflow.goToUpload}
            onSubmit={workflow.submitMappings}
          />
        )}

        {workflow.step === 'processing' && (
          <BatchProgressStep
            rows={workflow.rows}
            isPolling={workflow.isPolling}
            pollError={workflow.pollError}
            isRestoredFromSession={workflow.isRestoredFromSession}
          />
        )}

        {workflow.step === 'summary' && (
          <BatchSummaryStep
            summary={workflow.summary}
            rows={workflow.rows}
            failedRows={workflow.failedRows}
            retryError={workflow.retryError}
            isRetrying={workflow.isRetrying}
            onDone={() => {
              workflow.clearWorkflow()
              navigate('/classes')
            }}
            onRetryFailed={workflow.retryFailed}
          />
        )}
      </section>
    </AppPage>
  )
}
