import type { GradebookClassOption } from './gradesTypes'

interface ClassContextHeaderProps {
  classOptions: GradebookClassOption[]
  selectedClassId: string
  onClassChange: (nextClassId: string) => void
  disabled?: boolean
}

export default function ClassContextHeader({
  classOptions,
  selectedClassId,
  onClassChange,
  disabled = false,
}: ClassContextHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold text-pri">Grades</h1>
        <p className="mt-1 font-body text-sm text-sec">View class gradebook</p>
      </div>

      <div className="flex flex-col gap-1 self-start">
        <label htmlFor="grades-class-select" className="sr-only">
          Select class
        </label>
        <select
          id="grades-class-select"
          value={selectedClassId}
          onChange={(event) => onClassChange(event.target.value)}
          aria-label="Select class"
          disabled={disabled || classOptions.length === 0}
          className="min-w-52 rounded-lg border border-subtle bg-surface px-3 py-2 font-body text-sm text-pri focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {classOptions.length === 0 ? (
            <option value="">No classes available</option>
          ) : (
            classOptions.map((classOption) => (
              <option key={classOption.id} value={classOption.id}>
                {classOption.label}
              </option>
            ))
          )}
        </select>
      </div>
    </header>
  )
}
