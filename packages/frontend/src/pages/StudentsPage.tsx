import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import AddStudentModal from '../features/students/AddStudentModal'
import StudentDetailModal from '../features/students/StudentDetailModal'
import StudentsList from '../features/students/StudentsList'
import { EmptyStudentsState, ErrorStudentsState, LoadingStudentsState } from '../features/students/StudentsStates'
import { fetchStudents, getStudentsLoadErrorDetails, isStudentListEmpty } from '../features/students/studentsApi'
import type { StudentListItem } from '../features/students/studentsTypes'
import { AppPage, AppPageHeader } from '../components/layout/AppPage'

type LoadState = 'loading' | 'error' | 'done'

export default function StudentsPage() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [items, setItems] = useState<StudentListItem[]>([])
  const [errorMessage, setErrorMessage] = useState('There was a problem connecting to the server.')
  const [canRetry, setCanRetry] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<StudentListItem | null>(null)
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
        description="Review your student list, open details, and add new learners without leaving the workspace."
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
        <StudentsList items={items} onStudentClick={(student) => setSelectedStudent(student)} />
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

      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onStudentUpdated={() => {
            setSelectedStudent(null)
            void loadStudents()
          }}
        />
      )}
    </AppPage>
  )
}
