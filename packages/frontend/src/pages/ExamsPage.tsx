import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import CreateExamModal from '../features/exams/CreateExamModal'
import ExamDetailModal from '../features/exams/ExamDetailModal'
import ExamPrintPreview from '../features/exams/ExamPrintPreview'
import ExamsList from '../features/exams/ExamsList'
import { EmptyExamsState, ErrorExamsState, LoadingExamsState } from '../features/exams/ExamsStates'
import { fetchExamTemplates, isExamTemplateListEmpty, createExamTemplate, type CreateExamTemplatePayload } from '../features/exams/examsApi'
import type { ExamTemplateListItem } from '../features/exams/examsTypes'
import { AppNotice, AppPage, AppPageHeader } from '../components/layout/AppPage'

type LoadState = 'loading' | 'error' | 'done'
const EXAM_TEMPLATE_IMPORT_ACCEPT = '.json,.tracegradeexam.json'

function isJsonExamImportFile(file: File): boolean {
  const normalizedName = file.name.trim().toLowerCase()
  return normalizedName.endsWith('.json') || file.type === 'application/json'
}

export default function ExamsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [items, setItems] = useState<ExamTemplateListItem[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedExam, setSelectedExam] = useState<ExamTemplateListItem | null>(null)
  const [printExam, setPrintExam] = useState<ExamTemplateListItem | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
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

  const handleExportExam = useCallback((exam: ExamTemplateListItem) => {
    const exportData = {
      title: exam.title,
      questionCount: exam.questionCount,
      totalPoints: exam.totalPoints,
      questionsJson: exam.questionsJson,
      exportedAt: new Date().toISOString(),
      source: 'TraceGrade',
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exam.title.replace(/[^a-zA-Z0-9]/g, '_')}.tracegradeexam.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exam exported.')
  }, [])

  const handleImportExam = useCallback(
    async (file: File) => {
      if (!isJsonExamImportFile(file)) {
        toast.error('Exam template import accepts JSON only. Use Grade exam for JPG, PNG, PDF, or HEIC student uploads.')
        return
      }

      try {
        const text = await file.text()
        const parsed = JSON.parse(text) as Record<string, unknown>
        if (!parsed.title || typeof parsed.title !== 'string') {
          toast.error('Invalid exam file: missing title.')
          return
        }

        const payload: CreateExamTemplatePayload = {
          name: parsed.title,
          totalPoints: typeof parsed.totalPoints === 'number' ? parsed.totalPoints : 0,
          questionsJson: typeof parsed.questionsJson === 'string' ? parsed.questionsJson : '[]',
        }

        await createExamTemplate(payload)
        toast.success(`Imported "${parsed.title}".`)
        void loadTemplates()
      } catch {
        toast.error('Failed to import exam. Check the file format.')
      }
    },
    [loadTemplates],
  )

  const handleImportFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) void handleImportExam(file)
      e.target.value = ''
    },
    [handleImportExam],
  )

  return (
    <AppPage>
      <AppPageHeader
        eyebrow="Assessment templates"
        title="Exams"
        description="Create, manage, and open gradeable exam templates for classroom workflows."
        actions={(
          <div className="flex items-center gap-3">
            <input
              ref={importInputRef}
              type="file"
              accept={EXAM_TEMPLATE_IMPORT_ACCEPT}
              onChange={handleImportFileChange}
              className="hidden"
              aria-label="Import exam JSON"
            />
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="inline-flex items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-3 font-display text-sm font-medium text-gold-300 transition-colors duration-150 hover:bg-gold-500/20 hover:text-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950"
            >
              ⬆ Import JSON
            </button>
            <button
              type="button"
              onClick={handleCreateExam}
              className="inline-flex items-center justify-center rounded-xl bg-gold-500 px-5 py-3 font-display text-sm font-semibold text-navy-950 transition-colors duration-150 hover:bg-gold-600"
            >
              + Create Exam
            </button>
          </div>
        )}
      />

      <AppNotice>
        <div className="flex flex-col gap-2">
          <p className="font-display text-sm font-semibold text-white">Import JSON backups or shared exam templates here.</p>
          <p className="font-body text-sm text-white/85">To upload JPG, PNG, PDF, or HEIC student work, create or open an exam and choose Grade exam.</p>
        </div>
      </AppNotice>

      {loadState === 'loading' && <LoadingExamsState />}

      {loadState === 'error' && <ErrorExamsState onRetry={() => void loadTemplates()} />}

      {loadState === 'done' && isExamTemplateListEmpty(items) && (
        <EmptyExamsState onCreateExam={handleCreateExam} />
      )}

      {loadState === 'done' && !isExamTemplateListEmpty(items) && (
        <ExamsList items={items} onOpenExam={handleOpenExam} onExamClick={(exam) => setSelectedExam(exam)} onPrintExam={setPrintExam} onExportExam={handleExportExam} />
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

      {printExam && (
        <ExamPrintPreview
          exam={printExam}
          onClose={() => setPrintExam(null)}
        />
      )}
    </AppPage>
  )
}