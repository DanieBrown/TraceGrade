import { useCallback, useEffect, useRef, useState } from 'react'
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
          <p className="mt-1 font-body text-sm text-sec">Manage your homework assignments</p>
        </div>
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed items-center justify-center self-start rounded-lg px-5 py-2.5 font-display text-sm font-semibold opacity-60"
          style={{
            background: 'var(--accent-gold)',
            color: 'var(--bg-base)',
          }}
          aria-label="Create homework unavailable"
        >
          + Create Homework
        </button>
      </header>

      {loadState === 'loading' && <LoadingHomeworkState />}

      {loadState === 'error' && (
        <ErrorHomeworkState
          onRetry={() => void loadHomework()}
          message={errorMessage}
          canRetry={canRetry}
        />
      )}

      {loadState === 'done' && isHomeworkListEmpty(items) && <EmptyHomeworkState />}

      {loadState === 'done' && !isHomeworkListEmpty(items) && <HomeworkList items={items} />}
    </main>
  )
}