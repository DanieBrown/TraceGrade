import type { GradebookViewModel } from './gradesTypes'

interface GradebookTableProps {
  viewModel: GradebookViewModel
}

export default function GradebookTable({ viewModel }: GradebookTableProps) {
  return (
    <section className="overflow-x-auto rounded-xl border border-subtle">
      <table aria-label="Class gradebook" className="w-full border-collapse text-left">
        <thead className="border-b border-subtle bg-elevated">
          <tr>
            <th scope="col" className="sticky left-0 z-20 bg-elevated p-4 font-display text-sm font-semibold text-sec whitespace-nowrap">
              Student
            </th>
            {viewModel.columns.map((column) => (
              <th key={column.id} scope="col" className="p-4 font-display text-sm font-semibold text-sec whitespace-nowrap">
                <div className="flex flex-col">
                  <span>{column.label}</span>
                  {column.categoryLabel && (
                    <span className="font-body text-xs font-normal text-mut">{column.categoryLabel}</span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="bg-surface">
          {viewModel.rows.map((row) => (
            <tr key={row.studentId} className="group border-b border-subtle transition-colors duration-150 hover:bg-elevated">
              <th
                scope="row"
                className="sticky left-0 z-10 bg-surface p-4 font-display font-semibold text-pri whitespace-nowrap group-hover:bg-elevated"
              >
                {row.studentName}
              </th>

              {row.cells.map((cell) => (
                <td key={`${row.studentId}-${cell.columnId}`} className="p-4 text-center font-mono text-sm text-pri whitespace-nowrap">
                  {cell.score === null ? <span className="text-mut" aria-label="No grade">—</span> : cell.displayValue}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
