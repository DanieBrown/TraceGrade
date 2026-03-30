import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import ArchiveClassModal from '../features/classes/ArchiveClassModal'
import ClassFormModal from '../features/classes/ClassFormModal'
import ClassesList from '../features/classes/ClassesList'
import {
  EmptyClassesState,
  ErrorClassesState,
  LoadingClassesState,
} from '../features/classes/ClassesStates'
import {
  archiveClass,
  createClass,
  fetchClasses,
  getClassesLoadErrorDetails,
  isClassListEmpty,
  updateClass,
} from '../features/classes/classesApi'
import type { ClassListItem, CreateClassPayload } from '../features/classes/classesTypes'
import EnrollmentModal from '../features/enrollments/EnrollmentModal'
import { AppNotice, AppPage, AppPageHeader, AppPanel } from '../components/layout/AppPage'

type LoadState = 'loading' | 'error' | 'done'
type MutationState = 'idle' | 'creating' | 'updating' | 'archiving'

function getMutationErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

export default function ClassesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [mutationState, setMutationState] = useState<MutationState>('idle')
  const [items, setItems] = useState<ClassListItem[]>([])
  const [errorMessage, setErrorMessage] = useState('There was a problem loading classes.')
  const [canRetry, setCanRetry] = useState(true)
  const [mutationError, setMutationError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingClass, setEditingClass] = useState<ClassListItem | null>(null)
  const [archivingClass, setArchivingClass] = useState<ClassListItem | null>(null)
  const [enrollingClass, setEnrollingClass] = useState<ClassListItem | null>(null)
  const latestRequestIdRef = useRef(0)
  const isMountedRef = useRef(true)

  const loadClasses = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current
    setLoadState('loading')

    try {
      const classes = await fetchClasses()
      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
        return
      }

      setItems(classes)
      setErrorMessage('There was a problem loading classes.')
      setCanRetry(true)
      setLoadState('done')
    } catch (error) {
      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
        return
      }

      const details = getClassesLoadErrorDetails(error)
      setErrorMessage(details.message)
      setCanRetry(details.retryable)
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    void loadClasses()

    return () => {
      isMountedRef.current = false
    }
  }, [loadClasses])

  useEffect(() => {
    if (searchParams.get('quick') !== 'create') {
      return
    }

    setMutationError('')
    setShowCreateModal(true)

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('quick')
    setSearchParams(nextParams, { replace: true })
  }, [searchParams, setSearchParams])

  const handleCreateClass = useCallback(async (payload: CreateClassPayload) => {
    setMutationState('creating')
    setMutationError('')

    try {
      const created = await createClass(payload)
      if (!isMountedRef.current) {
        return
      }

      setItems((currentItems) => {
        const deduped = currentItems.filter((item) => item.id !== created.id)

        if (!created.isActive) {
          return deduped
        }

        return [created, ...deduped]
      })
      toast.success(`Created ${created.name}.`)
      setShowCreateModal(false)
    } catch (error) {
      const message = getMutationErrorMessage(error, 'Failed to create class. Please try again.')
      if (isMountedRef.current) {
        setMutationError(message)
      }
      throw new Error(message)
    } finally {
      if (isMountedRef.current) {
        setMutationState('idle')
      }
    }
  }, [])

  const handleUpdateClass = useCallback(async (payload: CreateClassPayload) => {
    if (!editingClass) {
      return
    }

    setMutationState('updating')
    setMutationError('')

    try {
      const updated = await updateClass(editingClass.id, payload)
      if (!isMountedRef.current) {
        return
      }

      setItems((currentItems) =>
        currentItems.flatMap((item) => {
          if (item.id !== updated.id) {
            return [item]
          }

          return updated.isActive ? [updated] : []
        }),
      )
      toast.success(`Updated ${updated.name}.`)
      setEditingClass(null)
    } catch (error) {
      const message = getMutationErrorMessage(error, 'Failed to update class. Please try again.')
      if (isMountedRef.current) {
        setMutationError(message)
      }
      throw new Error(message)
    } finally {
      if (isMountedRef.current) {
        setMutationState('idle')
      }
    }
  }, [editingClass])

  const handleArchiveClass = useCallback(async () => {
    if (!archivingClass) {
      return
    }

    setMutationState('archiving')
    setMutationError('')

    try {
      await archiveClass(archivingClass.id)
      if (!isMountedRef.current) {
        return
      }

      setItems((currentItems) =>
        currentItems.filter((item) => item.id !== archivingClass.id),
      )
      toast.success(`Archived ${archivingClass.name}.`)
      setArchivingClass(null)
    } catch (error) {
      const message = getMutationErrorMessage(error, 'Failed to archive class. Please try again.')
      if (isMountedRef.current) {
        setMutationError(message)
      }
      throw new Error(message)
    } finally {
      if (isMountedRef.current) {
        setMutationState('idle')
      }
    }
  }, [archivingClass])

  const isMutating = mutationState !== 'idle'
  const hasNonRetryableLoadError = loadState === 'error' && !canRetry
  const isNewClassDisabled = isMutating || hasNonRetryableLoadError
  const classWithAssignment = items.find((item) => (item.assignmentId?.trim() ?? '').length > 0)

  function navigateToBatchGrading(item: ClassListItem) {
    const classId = encodeURIComponent(item.id)
    const assignmentId = item.assignmentId?.trim() ?? ''
    const search = new URLSearchParams({ className: item.name })

    if (assignmentId) {
      search.set('assignmentId', assignmentId)
    }

    navigate(`/classes/${classId}/batch-grading?${search.toString()}`)
  }

  return (
    <AppPage>
      <AppPageHeader
        eyebrow="Class management"
        title="Classes"
        description="Manage class sections, roster access, and the batch-grading entry points tied to each class."
        actions={(
          <button
            type="button"
            onClick={() => {
              setMutationError('')
              setShowCreateModal(true)
            }}
            disabled={isNewClassDisabled}
            className="inline-flex items-center justify-center rounded-xl bg-gold-500 px-5 py-3 font-display text-sm font-semibold text-navy-950 transition-colors duration-150 hover:bg-gold-600 disabled:cursor-not-allowed disabled:bg-gold-500/60"
            aria-label="Create class"
          >
            + New Class
          </button>
        )}
      />

      {mutationError && loadState === 'done' && (
        <AppNotice tone="danger">
          <p className="font-body text-sm">{mutationError}</p>
        </AppNotice>
      )}

      {loadState === 'loading' && <LoadingClassesState />}

      {loadState === 'error' && (
        <ErrorClassesState
          onRetry={() => void loadClasses()}
          message={errorMessage}
          canRetry={canRetry}
        />
      )}

      {loadState === 'done' && isClassListEmpty(items) && (
        <EmptyClassesState
          onNewClass={() => {
            setMutationError('')
            setShowCreateModal(true)
          }}
        />
      )}

      {loadState === 'done' && !isClassListEmpty(items) && (
        <>
          <ClassesList
            items={items}
            onEdit={(item) => {
              setMutationError('')
              setEditingClass(item)
            }}
            onEnroll={(item) => {
              setMutationError('')
              setEnrollingClass(item)
            }}
            onBatchGrade={(item) => navigateToBatchGrading(item)}
            onArchive={(item) => {
              setMutationError('')
              setArchivingClass(item)
            }}
            isMutating={isMutating}
          />
        </>
      )}

      {showCreateModal && (
        <ClassFormModal
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateClass}
        />
      )}

      {editingClass && (
        <ClassFormModal
          mode="edit"
          initialValues={editingClass}
          onClose={() => setEditingClass(null)}
          onSubmit={handleUpdateClass}
        />
      )}

      {archivingClass && (
        <ArchiveClassModal
          item={archivingClass}
          onClose={() => setArchivingClass(null)}
          onConfirm={handleArchiveClass}
        />
      )}

      {enrollingClass && (
        <EnrollmentModal
          item={enrollingClass}
          onClose={() => setEnrollingClass(null)}
        />
      )}
    </AppPage>
  )
}