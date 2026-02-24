import type { ExamTemplateListItem } from './examsTypes'
import ExamCard from './ExamCard'

interface ExamsListProps {
  items: ExamTemplateListItem[]
  onOpenExam: (examId: string) => void
}

export default function ExamsList({ items, onOpenExam }: ExamsListProps) {
  return (
    <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label="Exam templates">
      {items.map((item) => (
        <li key={item.id} className="list-none">
          <ExamCard item={item} onOpen={onOpenExam} />
        </li>
      ))}
    </ul>
  )
}