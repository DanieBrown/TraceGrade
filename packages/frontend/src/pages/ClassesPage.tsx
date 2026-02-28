import { useCallback, useEffect, useRef, useState } from 'react'
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

type LoadState = 'loading' | 'error' | 'done'
type MutationState = 'idle' | 'creating' | 'updating' | 'archiving'

function getMutationErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

export default function ClassesPage() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [mutationState, setMutationState] = useState<MutationState>('idle')
  const [items, setItems] = useState<ClassListItem[]>([])
  const [errorMessage, setErrorMessage] = useState('There was a problem loading classes.')
  const [canRetry, setCanRetry] = useState(true)
  const [mutationError, setMutationError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingClass, setEditingClass] = useState<ClassListItem | null>(null)
  const [archivingClass, setArchivingClass] = useState<ClassListItem | null>(null)
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

  return (
    <main className="flex-1 overflow-y-auto bg-base" style={{ padding: '40px', maxWidth: '1200px' }}>
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-pri">Classes</h1>
          <p className="mt-1 font-body text-sm text-sec">Manage your classes</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setMutationError('')
            setShowCreateModal(true)
          }}
          disabled={isNewClassDisabled}
          className="inline-flex items-center justify-center self-start rounded-lg px-5 py-2.5 font-display text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
          style={{
            background: 'var(--accent-gold)',
            color: 'var(--bg-base)',
          }}
          aria-label="Create class"
        >
          + New Class
        </button>
      </header>

      {mutationError && loadState === 'done' && (
        <section
          role="alert"
          className="mb-6 rounded-xl border p-4"
          style={{
            background: 'rgba(232, 69, 90, 0.08)',
            borderColor: 'rgba(232, 69, 90, 0.22)',
          }}
        >
          <p className="font-body text-sm" style={{ color: 'var(--accent-crimson)' }}>
            {mutationError}
          </p>
        </section>
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
        <ClassesList
          items={items}
          onEdit={(item) => {
            setMutationError('')
            setEditingClass(item)
          }}
          onArchive={(item) => {
            setMutationError('')
            setArchivingClass(item)
          }}
          isMutating={isMutating}
        />
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
    </main>
  )
}