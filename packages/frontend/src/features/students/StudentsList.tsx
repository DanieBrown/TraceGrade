import type { StudentListItem } from './studentsTypes'

interface StudentsListProps {
  items: StudentListItem[]
  onStudentClick: (student: StudentListItem) => void
}

interface StudentCardProps {
  item: StudentListItem
  onClick: () => void
}

function StudentCard({ item, onClick }: StudentCardProps) {
  const hasEmail = Boolean(item.email)
  const hasClassLabel = Boolean(item.classLabel)
  const hasGradeLabel = Boolean(item.gradeLabel)

  return (
    <article
      className="card-glow flex h-full cursor-pointer flex-col justify-between rounded-xl border bg-surface p-5 transition-colors hover:border-[var(--accent-gold)]"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
    >
      <div className="space-y-3">
        <p className="truncate font-display text-base font-semibold text-pri" title={item.fullName}>
          {item.fullName}
        </p>

        <div className="space-y-1.5">
          <p className="font-body text-sm text-sec">{hasEmail ? item.email : 'No email provided'}</p>

          {(hasClassLabel || hasGradeLabel || item.isActive) && (
            <div className="flex flex-wrap gap-2">
              {hasClassLabel && (
                <span className="rounded-full border px-2 py-0.5 font-body text-xs text-sec">
                  Class: {item.classLabel}
                </span>
              )}
              {hasGradeLabel && (
                <span className="rounded-full border px-2 py-0.5 font-body text-xs text-sec">
                  Grade: {item.gradeLabel}
                </span>
              )}
              {item.isActive && (
                <span
                  className="rounded-full border px-2 py-0.5 font-body text-xs"
                  style={{
                    borderColor: 'rgba(232, 164, 40, 0.35)',
                    color: 'var(--accent-gold)',
                  }}
                >
                  Active
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

export default function StudentsList({ items, onStudentClick }: StudentsListProps) {
  return (
    <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label="Students">
      {items.map((item) => (
        <li key={item.id} className="list-none">
          <StudentCard item={item} onClick={() => onStudentClick(item)} />
        </li>
      ))}
    </ul>
  )
}
