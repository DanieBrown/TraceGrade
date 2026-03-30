import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import CreateExamModal from '../features/exams/CreateExamModal'
import ExamDetailModal from '../features/exams/ExamDetailModal'
import ExamsList from '../features/exams/ExamsList'
import { EmptyExamsState, ErrorExamsState, LoadingExamsState } from '../features/exams/ExamsStates'
import { fetchExamTemplates, isExamTemplateListEmpty } from '../features/exams/examsApi'
import type { ExamTemplateListItem } from '../features/exams/examsTypes'
import { AppPage, AppPageHeader } from '../components/layout/AppPage'

type LoadState = 'loading' | 'error' | 'done'

export default function ExamsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
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

  useEffect(() => {
    if (searchParams.get('quick') !== 'create') {
      return
    }

    setShowCreateModal(true)

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('quick')
    setSearchParams(nextParams, { replace: true })
  }, [searchParams, setSearchParams])

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
    <AppPage>
      <AppPageHeader
        eyebrow="Assessment templates"
        title="Exams"
        description="Create, manage, and open gradeable exam templates for classroom workflows."
        actions={(
          <button
          type="button"
          onClick={handleCreateExam}
          className="inline-flex items-center justify-center rounded-xl bg-gold-500 px-5 py-3 font-display text-sm font-semibold text-navy-950 transition-colors duration-150 hover:bg-gold-600"
        >
          + Create Exam
        </button>
        )}
      />

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
            toast.success('Exam template created.')
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
    </AppPage>
  )
}