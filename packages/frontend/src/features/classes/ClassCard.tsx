import type { ClassListItem } from './classesTypes'

interface ClassCardProps {
  item: ClassListItem
  onEdit: (item: ClassListItem) => void
  onArchive: (item: ClassListItem) => void
  isBusy?: boolean
}

export default function ClassCard({ item, onEdit, onArchive, isBusy = false }: ClassCardProps) {
  return (
    <article className="card-glow flex h-full flex-col justify-between rounded-xl border bg-surface p-5">
      <div className="space-y-3">
        <p className="truncate font-display text-base font-semibold text-pri" title={item.name}>
          {item.name}
        </p>

        <div className="space-y-1.5">
          <p className="font-body text-sm text-sec">{item.subject}</p>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border px-2 py-0.5 font-body text-xs text-sec">
              Period: {item.period}
            </span>
            <span className="rounded-full border px-2 py-0.5 font-body text-xs text-sec">
              Year: {item.schoolYear}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onEdit(item)}
          disabled={isBusy}
          className="inline-flex items-center rounded-lg px-2 py-1 font-display text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] disabled:cursor-not-allowed disabled:opacity-60"
          style={{ color: 'var(--text-secondary)' }}
          aria-label={`Edit ${item.name}`}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onArchive(item)}
          disabled={isBusy}
          className="inline-flex items-center rounded-lg px-2 py-1 font-display text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-crimson)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] disabled:cursor-not-allowed disabled:opacity-60"
          style={{ color: 'var(--accent-crimson)' }}
          aria-label={`Archive ${item.name}`}
        >
          Archive
        </button>
      </div>
    </article>
  )
}