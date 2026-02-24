import type { CSSProperties } from 'react'
import type { ExamTemplateListItem } from './examsTypes'

interface ExamCardProps {
  item: ExamTemplateListItem
  onOpen: (examId: string) => void
}

function getStatusBadgeStyle(statusLabel: string): CSSProperties {
  const normalized = statusLabel.trim().toLowerCase()

  if (normalized === 'published') {
    return {
      color: 'var(--accent-teal)',
      background: 'rgba(0, 201, 167, 0.1)',
      border: '1px solid rgba(0, 201, 167, 0.2)',
    }
  }

  if (normalized === 'archived') {
    return {
      color: 'var(--text-muted)',
      background: 'rgba(120, 180, 220, 0.08)',
      border: '1px solid rgba(120, 180, 220, 0.18)',
    }
  }

  return {
    color: 'var(--accent-gold)',
    background: 'rgba(232, 164, 40, 0.1)',
    border: '1px solid rgba(232, 164, 40, 0.2)',
  }
}

export default function ExamCard({ item, onOpen }: ExamCardProps) {
  return (
    <article
      className="card-glow flex h-full flex-col justify-between rounded-xl border bg-surface p-5"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h3
            className="min-w-0 flex-1 font-display text-base font-semibold text-pri"
            title={item.title}
          >
            <span className="block truncate">{item.title}</span>
          </h3>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 font-mono text-xs font-medium"
            style={getStatusBadgeStyle(item.statusLabel)}
          >
            {item.statusLabel}
          </span>
        </div>

        <p className="font-body text-sm text-sec">
          {item.questionCount} questions · {item.totalPoints} total points
        </p>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => onOpen(item.id)}
          className="inline-flex items-center rounded-lg px-2 py-1 font-display text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] active:scale-95"
          style={{ color: 'var(--accent-gold)' }}
          aria-label={`Manage exam ${item.title}`}
        >
          Manage Exam
        </button>
      </div>
    </article>
  )
}