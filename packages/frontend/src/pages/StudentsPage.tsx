import { useCallback, useEffect, useRef, useState } from 'react'
import StudentsList from '../features/students/StudentsList'
import { EmptyStudentsState, ErrorStudentsState, LoadingStudentsState } from '../features/students/StudentsStates'
import { fetchStudents, getStudentsLoadErrorDetails, isStudentListEmpty } from '../features/students/studentsApi'
import type { StudentListItem } from '../features/students/studentsTypes'

type LoadState = 'loading' | 'error' | 'done'

export default function StudentsPage() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [items, setItems] = useState<StudentListItem[]>([])
  const [errorMessage, setErrorMessage] = useState('There was a problem connecting to the server.')
  const [canRetry, setCanRetry] = useState(true)
  const latestRequestIdRef = useRef(0)
  const isMountedRef = useRef(true)

  const loadStudents = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current
    setLoadState('loading')

    try {
      const students = await fetchStudents()
      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
        return
      }

      setItems(students)
      setErrorMessage('There was a problem connecting to the server.')
      setCanRetry(true)
      setLoadState('done')
    } catch (error) {
      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
        return
      }

      const details = getStudentsLoadErrorDetails(error)
      setErrorMessage(details.message)
      setCanRetry(details.retryable)
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    void loadStudents()

    return () => {
      isMountedRef.current = false
    }
  }, [loadStudents])

  return (
    <main className="flex-1 overflow-y-auto bg-base" style={{ padding: '40px', maxWidth: '1200px' }}>
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-pri">Students</h1>
          <p className="mt-1 font-body text-sm text-sec">Manage your students</p>
        </div>
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed items-center justify-center self-start rounded-lg px-5 py-2.5 font-display text-sm font-semibold opacity-60"
          style={{
            background: 'var(--accent-gold)',
            color: 'var(--bg-base)',
          }}
          aria-label="Add student unavailable"
        >
          + Add Student
        </button>
      </header>

      {loadState === 'loading' && <LoadingStudentsState />}

      {loadState === 'error' && (
        <ErrorStudentsState
          onRetry={() => void loadStudents()}
          message={errorMessage}
          canRetry={canRetry}
        />
      )}

      {loadState === 'done' && isStudentListEmpty(items) && <EmptyStudentsState />}

      {loadState === 'done' && !isStudentListEmpty(items) && <StudentsList items={items} />}
    </main>
  )
}
