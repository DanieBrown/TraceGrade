import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CreateExamModal from '../features/exams/CreateExamModal'
import ExamDetailModal from '../features/exams/ExamDetailModal'
import ExamsList from '../features/exams/ExamsList'
import { EmptyExamsState, ErrorExamsState, LoadingExamsState } from '../features/exams/ExamsStates'
import { fetchExamTemplates, isExamTemplateListEmpty } from '../features/exams/examsApi'
import type { ExamTemplateListItem } from '../features/exams/examsTypes'

type LoadState = 'loading' | 'error' | 'done'

export default function ExamsPage() {
  const navigate = useNavigate()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [items, setItems] = useState<ExamTemplateListItem[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedExam, setSelectedExam] = useState<ExamTemplateListItem | null>(null)
  const latestRequestIdRef = useRef(0)
  const isMountedRef = useRef(true)

  const loadTemplates = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current
    setLoadState('loading')

    try {
      const templates = await fetchExamTemplates()
      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
        return
      }

      setItems(templates)
      setLoadState('done')
    } catch {
      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
        return
      }

      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    void loadTemplates()

    return () => {
      isMountedRef.current = false
    }
  }, [loadTemplates])

  const handleCreateExam = useCallback(() => {
    setShowCreateModal(true)
  }, [])

  const handleOpenExam = useCallback(
    (examId: string) => {
      navigate(`/exams/${encodeURIComponent(examId)}`)
    },
    [navigate],
  )

  return (
    <main className="flex-1 overflow-y-auto bg-base" style={{ padding: '40px', maxWidth: '1200px' }}>
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-pri">Exams</h1>
          <p className="mt-1 font-body text-sm text-sec">Create, manage, and grade your exam templates</p>
        </div>
        <button
          type="button"
          onClick={handleCreateExam}
          className="inline-flex items-center justify-center self-start rounded-lg px-5 py-2.5 font-display text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] active:scale-95"
          style={{
            background: 'var(--accent-gold)',
            color: 'var(--bg-base)',
          }}
        >
          + Create Exam
        </button>
      </header>

      {loadState === 'loading' && <LoadingExamsState />}

      {loadState === 'error' && <ErrorExamsState onRetry={() => void loadTemplates()} />}

      {loadState === 'done' && isExamTemplateListEmpty(items) && (
        <EmptyExamsState onCreateExam={handleCreateExam} />
      )}

      {loadState === 'done' && !isExamTemplateListEmpty(items) && (
        <ExamsList items={items} onOpenExam={handleOpenExam} onExamClick={(exam) => setSelectedExam(exam)} />
      )}

      {showCreateModal && (
        <CreateExamModal
          onClose={() => setShowCreateModal(false)}
          onExamCreated={() => {
            setShowCreateModal(false)
            void loadTemplates()
          }}
        />
      )}

      {selectedExam && (
        <ExamDetailModal
          exam={selectedExam}
          onClose={() => setSelectedExam(null)}
          onExamUpdated={() => {
            setSelectedExam(null)
            void loadTemplates()
          }}
          onGradeExam={(examId) => {
            setSelectedExam(null)
            handleOpenExam(examId)
          }}
        />
      )}
    </main>
  )
}