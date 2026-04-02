import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import AddStudentModal from '../features/students/AddStudentModal'
import StudentsList from '../features/students/StudentsList'
import { EmptyStudentsState, ErrorStudentsState, LoadingStudentsState } from '../features/students/StudentsStates'
import { fetchStudents, getStudentsLoadErrorDetails, isStudentListEmpty } from '../features/students/studentsApi'
import { AppPage, AppPageHeader } from '../components/layout/AppPage'

type LoadState = 'loading' | 'error' | 'done'

export default function StudentsPage() {
  const navigate = useNavigate()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [items, setItems] = useState([])
  const [errorMessage, setErrorMessage] = useState('There was a problem connecting to the server.')
  const [canRetry, setCanRetry] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
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
    <AppPage>
      <AppPageHeader
        eyebrow="Student records"
        title="Students"
        description="Review your student list, open full student profiles, and add new learners to the grading workspace."
        actions={(
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center rounded-xl bg-gold-500 px-5 py-3 font-display text-sm font-semibold text-navy-950 transition-colors duration-150 hover:bg-gold-600"
            aria-label="Add student"
          >
            + Add Student
          </button>
        )}
      />

      {loadState === 'loading' && <LoadingStudentsState />}

      {loadState === 'error' && (
        <ErrorStudentsState
          onRetry={() => void loadStudents()}
          message={errorMessage}
          canRetry={canRetry}
        />
      )}

      {loadState === 'done' && isStudentListEmpty(items) && (
        <EmptyStudentsState onAddStudent={() => setShowAddModal(true)} />
      )}

      {loadState === 'done' && !isStudentListEmpty(items) && (
        <StudentsList items={items} onStudentClick={(student) => navigate(`/students/${encodeURIComponent(student.id)}`)} />
      )}

      {showAddModal && (
        <AddStudentModal
          onClose={() => setShowAddModal(false)}
          onStudentAdded={() => {
            setShowAddModal(false)
            toast.success('Student added.')
            void loadStudents()
          }}
        />
      )}
    </AppPage>
  )
}
