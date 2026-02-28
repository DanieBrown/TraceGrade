import ClassCard from './ClassCard'
import type { ClassListItem } from './classesTypes'

interface ClassesListProps {
  items: ClassListItem[]
  onEdit: (item: ClassListItem) => void
  onArchive: (item: ClassListItem) => void
  isMutating?: boolean
}

export default function ClassesList({ items, onEdit, onArchive, isMutating = false }: ClassesListProps) {
  return (
    <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label="Classes">
      {items.map((item) => (
        <li key={item.id} className="list-none">
          <ClassCard
            item={item}
            onEdit={onEdit}
            onArchive={onArchive}
            isBusy={isMutating}
          />
        </li>
      ))}
    </ul>
  )
}