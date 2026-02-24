export interface GradebookClassOption {
  id: string
  label: string
}

export interface GradebookColumn {
  id: string
  label: string
  categoryLabel?: string | null
  maxPoints?: number | null
}

export interface GradebookCell {
  columnId: string
  score: number | null
  displayValue: string
}

export interface GradebookStudentRow {
  studentId: string
  studentName: string
  cells: GradebookCell[]
}

export interface GradebookViewModel {
  classId: string
  classLabel: string
  columns: GradebookColumn[]
  rows: GradebookStudentRow[]
}

export interface RawGradebookClassOption {
  id?: unknown
  classId?: unknown
  value?: unknown
  label?: unknown
  classLabel?: unknown
  name?: unknown
  title?: unknown
  className?: unknown
}

export interface RawGradebookColumn {
  id?: unknown
  columnId?: unknown
  assignmentId?: unknown
  categoryId?: unknown
  label?: unknown
  title?: unknown
  name?: unknown
  assignmentLabel?: unknown
  assignmentName?: unknown
  categoryLabel?: unknown
  categoryName?: unknown
  category?: unknown
  maxPoints?: unknown
  pointsPossible?: unknown
  maxScore?: unknown
}

export interface RawGradebookCell {
  columnId?: unknown
  assignmentId?: unknown
  id?: unknown
  score?: unknown
  value?: unknown
  grade?: unknown
  percentage?: unknown
}

export interface RawGradebookStudentRow {
  studentId?: unknown
  id?: unknown
  userId?: unknown
  studentName?: unknown
  fullName?: unknown
  name?: unknown
  firstName?: unknown
  lastName?: unknown
  cells?: unknown
  grades?: unknown
  scores?: unknown
}

export interface RawGradebookPayload {
  classId?: unknown
  classLabel?: unknown
  className?: unknown
  name?: unknown
  title?: unknown
  columns?: unknown
  assignments?: unknown
  categories?: unknown
  headers?: unknown
  rows?: unknown
  students?: unknown
  entries?: unknown
}
