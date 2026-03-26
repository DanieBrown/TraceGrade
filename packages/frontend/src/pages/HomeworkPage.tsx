import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import CreateHomeworkModal from '../features/homework/CreateHomeworkModal'
import HomeworkList from '../features/homework/HomeworkList'
import {
  EmptyHomeworkState,
  ErrorHomeworkState,
  LoadingHomeworkState,
} from '../features/homework/HomeworkStates'
import {
  fetchHomeworkItems,
  getHomeworkLoadErrorDetails,
  isHomeworkListEmpty,
} from '../features/homework/homeworkApi'
import type { HomeworkListItem } from '../features/homework/homeworkTypes'

type LoadState = 'loading' | 'error' | 'done'

export default function HomeworkPage() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [items, setItems] = useState<HomeworkListItem[]>([])
  const [errorMessage, setErrorMessage] = useState('There was a problem connecting to the server.')
  const [canRetry, setCanRetry] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const latestRequestIdRef = useRef(0)
  const isMountedRef = useRef(true)

  const loadHomework = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current
    setLoadState('loading')

    try {
      const homeworkItems = await fetchHomeworkItems()
      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
        return
      }

      setItems(homeworkItems)
      setErrorMessage('There was a problem connecting to the server.')
      setCanRetry(true)
      setLoadState('done')
    } catch (error) {
      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
        return
      }

      const details = getHomeworkLoadErrorDetails(error)
      setErrorMessage(details.message)
      setCanRetry(details.retryable)
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    void loadHomework()

    return () => {
      isMountedRef.current = false
    }
  }, [loadHomework])

  return (
    <main className="flex-1 overflow-y-auto bg-base" style={{ padding: '40px', maxWidth: '1200px' }}>
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-pri">Homework</h1>
          <p className="mt-1 font-body text-sm text-sec">Plan homework reminders and due dates for your classes.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center self-start rounded-lg px-5 py-2.5 font-display text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] active:scale-95"
          style={{
            background: 'var(--accent-gold)',
            color: 'var(--bg-base)',
          }}
          aria-label="Create homework"
        >
          + Create Homework
        </button>
      </header>

      <section
        className="mb-6 rounded-xl border p-4"
        style={{
          background: 'rgba(91, 197, 245, 0.06)',
          borderColor: 'rgba(91, 197, 245, 0.18)',
        }}
      >
        <p className="font-display text-sm font-semibold text-pri">Homework and Gradebook are separate</p>
        <p className="mt-1 font-body text-sm text-sec">
          Homework entries on this page are planning records. They do not create gradebook columns or editable grade rows.
          Gradebook reflects published class assignments and finalized exam grades.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link to="/grades" className="font-display text-sm font-semibold underline" style={{ color: 'var(--accent-teal)' }}>
            Open Gradebook
          </Link>
          <Link to="/exams" className="font-display text-sm font-semibold underline" style={{ color: 'var(--accent-gold)' }}>
            Open Exams
          </Link>
        </div>
      </section>

      {loadState === 'loading' && <LoadingHomeworkState />}

      {loadState === 'error' && (
        <ErrorHomeworkState
          onRetry={() => void loadHomework()}
          message={errorMessage}
          canRetry={canRetry}
        />
      )}

      {loadState === 'done' && isHomeworkListEmpty(items) && (
        <EmptyHomeworkState onCreateHomework={() => setShowCreateModal(true)} />
      )}

      {loadState === 'done' && !isHomeworkListEmpty(items) && <HomeworkList items={items} />}

      {showCreateModal && (
        <CreateHomeworkModal
          onClose={() => setShowCreateModal(false)}
          onHomeworkCreated={() => {
            setShowCreateModal(false)
            void loadHomework()
          }}
        />
      )}
    </main>
  )
}