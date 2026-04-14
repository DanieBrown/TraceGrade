import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { AppNotice, AppPage, AppPageHeader } from '../components/layout/AppPage'

type LoadState = 'loading' | 'error' | 'done'
const HOMEWORKS_PER_PAGE = 10

export default function HomeworkPage() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [items, setItems] = useState<HomeworkListItem[]>([])
  const [pageIndex, setPageIndex] = useState(0)
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

  useEffect(() => {
    const maxPageIndex = Math.max(0, Math.ceil(items.length / HOMEWORKS_PER_PAGE) - 1)
    setPageIndex((currentPageIndex) => Math.min(currentPageIndex, maxPageIndex))
  }, [items.length])

  const startIndex = pageIndex * HOMEWORKS_PER_PAGE
  const paginatedItems = items.slice(startIndex, startIndex + HOMEWORKS_PER_PAGE)
  const showingStart = items.length === 0 ? 0 : startIndex + 1
  const showingEnd = Math.min(items.length, startIndex + HOMEWORKS_PER_PAGE)
  const hasPreviousPage = pageIndex > 0
  const hasNextPage = showingEnd < items.length

  return (
    <AppPage>
      <AppPageHeader
        eyebrow="Homework planning"
        title="Homework"
        description="Plan assignments and due dates for your classes."
        actions={(
          <Link
            to="/homework/new"
            className="inline-flex items-center justify-center rounded-xl bg-gold-500 px-5 py-3 font-display text-sm font-semibold text-navy-950 transition-colors duration-150 hover:bg-gold-600"
            aria-label="Create homework"
          >
            + Create Homework
          </Link>
        )}
      />

      <AppNotice>
        <p className="font-display text-sm font-semibold text-pri">Homework and gradebook are separate</p>
        <p className="mt-1 font-body text-sm text-sec">
          Homework entries on this page are planning records. They do not create gradebook columns or editable grade rows.
          Gradebook reflects published class assignments and finalized exam grades.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link to="/grades" className="font-display text-sm font-semibold text-gold-300 no-underline hover:text-gold-200">
            Open Gradebook
          </Link>
          <Link to="/exams" className="font-display text-sm font-semibold text-gold-300 no-underline hover:text-gold-200">
            Open Exams
          </Link>
        </div>
      </AppNotice>

      {loadState === 'loading' && <LoadingHomeworkState />}

      {loadState === 'error' && (
        <ErrorHomeworkState
          onRetry={() => void loadHomework()}
          message={errorMessage}
          canRetry={canRetry}
        />
      )}

      {loadState === 'done' && isHomeworkListEmpty(items) && <EmptyHomeworkState />}

      {loadState === 'done' && !isHomeworkListEmpty(items) && (
        <div className="space-y-4">
          <HomeworkList items={paginatedItems} />

          <div className="flex flex-col gap-3 rounded-2xl border border-subtle bg-white/[0.03] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-body text-sm text-sec">
              Showing {showingStart}-{showingEnd} of {items.length} homework records
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPageIndex((currentPageIndex) => Math.max(0, currentPageIndex - 1))}
                disabled={!hasPreviousPage}
                className="inline-flex items-center rounded-xl border border-subtle px-4 py-2 text-sm font-display font-semibold text-sec transition-colors hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Previous page"
              >
                Previous page
              </button>
              <button
                type="button"
                onClick={() => setPageIndex((currentPageIndex) => currentPageIndex + 1)}
                disabled={!hasNextPage}
                className="inline-flex items-center rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-2 text-sm font-display font-semibold text-gold-300 transition-colors hover:bg-gold-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Next page"
              >
                Next page
              </button>
            </div>
          </div>
        </div>
      )}
    </AppPage>
  )
}