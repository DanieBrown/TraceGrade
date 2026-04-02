import type { ExamTemplateListItem } from './examsTypes'

// ── Parsed question shapes ────────────────────────────────────────────────────

interface PrintQuestion {
  questionNumber: number
  type?: string
  prompt: string
  pointsAvailable: number
  options?: { label: string; text: string }[]
  subQuestions?: { subQuestionNumber: number; prompt: string; pointsAvailable: number }[]
}

function parseForPrint(json: string | undefined): PrintQuestion[] {
  if (!json) return []
  try {
    const raw = JSON.parse(json)
    const arr: unknown[] = Array.isArray(raw) ? raw : []
    return arr
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item, i) => ({
        questionNumber: typeof item.questionNumber === 'number' ? item.questionNumber : i + 1,
        type: typeof item.type === 'string' ? item.type : 'open-ended',
        prompt: typeof item.prompt === 'string' ? item.prompt : typeof item.question === 'string' ? item.question : '',
        pointsAvailable: typeof item.pointsAvailable === 'number' ? item.pointsAvailable : typeof item.points === 'number' ? item.points : 0,
        options: Array.isArray(item.options) ? (item.options as { label: string; text: string }[]) : undefined,
        subQuestions: Array.isArray(item.subQuestions) ? (item.subQuestions as PrintQuestion['subQuestions']) : undefined,
      }))
  } catch {
    return []
  }
}

// ── Component props ───────────────────────────────────────────────────────────

interface ExamPrintPreviewProps {
  exam: ExamTemplateListItem
  onClose: () => void
}

export default function ExamPrintPreview({ exam, onClose }: ExamPrintPreviewProps) {
  const questions = parseForPrint(exam.questionsJson)
  const secondaryActionButtonClassName = 'rounded-lg border border-gold-500/30 bg-gold-500/10 px-3 py-2 font-display text-sm font-medium text-gold-300 transition-colors duration-150 hover:bg-gold-500/20 hover:text-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950'

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      {/* Screen-only backdrop + controls */}
      <div className="print:hidden fixed inset-0 z-50 flex flex-col items-center" style={{ backgroundColor: 'rgba(6, 16, 30, 0.85)' }}>
        {/* Toolbar */}
        <div className="flex w-full max-w-4xl items-center justify-between px-6 py-4">
          <h2 className="font-display text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Print Preview
          </h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 font-display text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent-gold)', color: 'var(--bg-base)' }}
            >
              🖨️ Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className={secondaryActionButtonClassName}
            >
              Close
            </button>
          </div>
        </div>

        {/* Scrollable preview frame */}
        <div className="flex-1 overflow-y-auto px-6 pb-8 w-full flex justify-center">
          <div className="w-full max-w-4xl bg-white rounded-lg shadow-2xl p-0">
            <PrintableContent exam={exam} questions={questions} />
          </div>
        </div>
      </div>

      {/* Print-only: rendered directly in the DOM for @media print */}
      <div className="hidden print:block">
        <PrintableContent exam={exam} questions={questions} />
      </div>
    </>
  )
}

// ── Printable content (renders in both preview and print) ─────────────────────

function PrintableContent({ exam, questions }: { exam: ExamTemplateListItem; questions: PrintQuestion[] }) {
  return (
    <div className="exam-print-content" style={{ color: '#111', fontFamily: "'Lora', 'Georgia', serif", padding: '40px 48px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px solid #111', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '22px', fontFamily: "'Syne', 'Arial', sans-serif", fontWeight: 700, margin: '0 0 4px' }}>
          {exam.title}
        </h1>
        <div style={{ fontSize: '12px', color: '#555', display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '8px' }}>
          <span>Questions: {questions.length}</span>
          <span>Total Points: {exam.totalPoints}</span>
        </div>
      </div>

      {/* Student info block */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '28px', fontSize: '13px' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 600 }}>Name: </span>
          <span style={{ borderBottom: '1px solid #999', display: 'inline-block', width: '200px' }}>&nbsp;</span>
        </div>
        <div>
          <span style={{ fontWeight: 600 }}>Date: </span>
          <span style={{ borderBottom: '1px solid #999', display: 'inline-block', width: '120px' }}>&nbsp;</span>
        </div>
        <div>
          <span style={{ fontWeight: 600 }}>Period: </span>
          <span style={{ borderBottom: '1px solid #999', display: 'inline-block', width: '60px' }}>&nbsp;</span>
        </div>
      </div>

      {/* Questions */}
      {questions.map((q) => (
        <div key={q.questionNumber} style={{ marginBottom: '24px', pageBreakInside: 'avoid' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontWeight: 700, fontSize: '14px', fontFamily: "'Syne', 'Arial', sans-serif" }}>
              {q.questionNumber}. {q.prompt}
            </span>
            <span style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap', marginLeft: '16px' }}>
              [{q.pointsAvailable} pt{q.pointsAvailable !== 1 ? 's' : ''}]
            </span>
          </div>

          {/* Multiple choice options */}
          {q.type === 'multiple-choice' && q.options && (
            <div style={{ paddingLeft: '20px', marginTop: '4px' }}>
              {q.options.map((opt) => (
                <div key={opt.label} style={{ fontSize: '13px', marginBottom: '3px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, minWidth: '18px' }}>
                    {opt.label}.
                  </span>
                  <span>{opt.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Multi-part sub-questions */}
          {q.type === 'multi-part' && q.subQuestions && (
            <div style={{ paddingLeft: '20px', marginTop: '6px' }}>
              {q.subQuestions.map((sub, si) => (
                <div key={sub.subQuestionNumber} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ fontWeight: 600 }}>
                      ({String.fromCharCode(97 + si)}) {sub.prompt}
                    </span>
                    <span style={{ fontSize: '11px', color: '#666', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                      [{sub.pointsAvailable} pt{sub.pointsAvailable !== 1 ? 's' : ''}]
                    </span>
                  </div>
                  {/* Answer lines */}
                  <div style={{ marginTop: '8px' }}>
                    {[...Array(3)].map((_, li) => (
                      <div key={li} style={{ borderBottom: '1px solid #ccc', height: '24px' }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Open-ended answer space */}
          {(q.type === 'open-ended' || (!q.type && !q.options && !q.subQuestions)) && (
            <div style={{ marginTop: '8px', paddingLeft: '20px' }}>
              {[...Array(4)].map((_, li) => (
                <div key={li} style={{ borderBottom: '1px solid #ccc', height: '28px' }} />
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Footer */}
      <div style={{ marginTop: '32px', paddingTop: '12px', borderTop: '1px solid #ccc', textAlign: 'center', fontSize: '10px', color: '#999' }}>
        Generated by TraceGrade — Giving the power of paper back to our education.
      </div>
    </div>
  )
}
