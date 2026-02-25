import type { CSSProperties } from 'react'
import type { HomeworkListItem } from './homeworkTypes'

interface HomeworkListProps {
  items: HomeworkListItem[]
}

function getStatusBadgeStyle(statusLabel: string): CSSProperties {
  const normalized = statusLabel.trim().toLowerCase()

  if (normalized === 'published' || normalized === 'open') {
    return {
      color: 'var(--accent-teal)',
      background: 'rgba(0, 201, 167, 0.1)',
      border: '1px solid rgba(0, 201, 167, 0.2)',
    }
  }

  if (normalized === 'closed' || normalized === 'archived') {
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

function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return 'No due date'
  const date = new Date(dueDate)
  if (isNaN(date.getTime())) return 'No due date'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

interface HomeworkRowProps {
  item: HomeworkListItem
}

function HomeworkRow({ item }: HomeworkRowProps) {
  return (
    <article
      className="flex items-center justify-between gap-4 rounded-xl border bg-surface px-5 py-4 transition-colors hover:bg-elevated"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <h3 className="truncate font-display text-sm font-semibold text-pri" title={item.title}>
          {item.title}
        </h3>
        <p className="font-body text-xs text-sec">
          {item.className} · Due {formatDueDate(item.dueDate)}
        </p>
      </div>
      <span
        className="shrink-0 rounded-full px-2 py-0.5 font-mono text-xs font-medium"
        style={getStatusBadgeStyle(item.statusLabel)}
      >
        {item.statusLabel}
      </span>
    </article>
  )
}

export default function HomeworkList({ items }: HomeworkListProps) {
  return (
    <ul className="flex flex-col gap-3" aria-label="Homework assignments">
      {items.map((item) => (
        <li key={item.id} className="list-none">
          <HomeworkRow item={item} />
        </li>
      ))}
    </ul>
  )
}
