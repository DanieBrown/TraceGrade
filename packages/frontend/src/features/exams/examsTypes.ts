export interface ExamTemplateListItem {
  id: string
  assignmentId: string
  title: string
  questionCount: number
  totalPoints: number
  statusLabel: string
}

export interface RawExamTemplate {
  id?: string | null
  examTemplateId?: string | null
  templateId?: string | null
  assignmentId?: string | null
  assignmentUUID?: string | null
  assignment_id?: string | null
  title?: string | null
  name?: string | null
  questionCount?: number | string | null
  questions?: number | string | null
  totalPoints?: number | string | null
  status?: string | null
  label?: string | null
}