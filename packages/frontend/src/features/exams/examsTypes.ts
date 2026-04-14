export interface ExamTemplateListItem {
  id: string
  assignmentId: string
  title: string
  subject?: string
  topic?: string
  description?: string
  gradeLevel?: string
  difficultyLevel?: string
  questionCount: number
  totalPoints: number
  statusLabel: string
  questionsJson?: string
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
  subject?: string | null
  topic?: string | null
  description?: string | null
  gradeLevel?: string | null
  difficultyLevel?: string | null
  questionCount?: number | string | null
  questions?: number | string | null
  totalPoints?: number | string | null
  status?: string | null
  label?: string | null
  questionsJson?: string | null
}