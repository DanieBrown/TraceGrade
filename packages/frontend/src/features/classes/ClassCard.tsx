import type { ClassListItem } from './classesTypes'

interface ClassCardProps {
  item: ClassListItem
  onEdit: (item: ClassListItem) => void
  onEnroll: (item: ClassListItem) => void
  onBatchGrade: (item: ClassListItem) => void
  onArchive: (item: ClassListItem) => void
  isBusy?: boolean
}

export default function ClassCard({ item, onEdit, onEnroll, onBatchGrade, onArchive, isBusy = false }: ClassCardProps) {
  return (
    <article className="surface-panel-plain flex h-full flex-col justify-between rounded-[22px] p-5 transition-colors duration-150 hover:bg-white/[0.04]">
      <div className="space-y-3">
        <p className="truncate font-display text-base font-semibold text-pri" title={item.name}>
          {item.name}
        </p>

        <div className="space-y-1.5">
          <p className="font-body text-sm text-sec">{item.subject}</p>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-subtle bg-white/[0.03] px-2.5 py-1 font-body text-xs text-sec">
              Period: {item.period}
            </span>
            <span className="rounded-full border border-subtle bg-white/[0.03] px-2.5 py-1 font-body text-xs text-sec">
              Year: {item.schoolYear}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-subtle pt-4">
        <button
          type="button"
          onClick={() => onEdit(item)}
          disabled={isBusy}
          className="inline-flex items-center rounded-lg px-2.5 py-1.5 font-display text-sm font-semibold text-sec transition-colors duration-150 hover:text-pri focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={`Edit ${item.name}`}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onEnroll(item)}
          disabled={isBusy}
          className="inline-flex items-center rounded-lg px-2.5 py-1.5 font-display text-sm font-semibold text-sec transition-colors duration-150 hover:text-pri focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={`Manage roster for ${item.name}`}
        >
          Roster
        </button>
        <button
          type="button"
          onClick={() => onBatchGrade(item)}
          disabled={isBusy}
          className="inline-flex items-center rounded-lg px-2.5 py-1.5 font-display text-sm font-semibold text-sec transition-colors duration-150 hover:text-pri focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={`Batch grade ${item.name}`}
        >
          Batch Grade
        </button>
        <button
          type="button"
          onClick={() => onArchive(item)}
          disabled={isBusy}
          className="inline-flex items-center rounded-lg px-2.5 py-1.5 font-display text-sm font-semibold text-crimson-400 transition-colors duration-150 hover:text-crimson-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-crimson)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={`Archive ${item.name}`}
        >
          Archive
        </button>
      </div>
    </article>
  )
}