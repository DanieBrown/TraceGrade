export interface StudentListItem {
  id: string
  fullName: string
  firstName: string | null
  lastName: string | null
  email: string | null
  studentNumber: string | null
  classLabel: string | null
  gradeLabel: string | null
  isActive: boolean
}

export interface RawStudent {
  id?: unknown
  studentId?: unknown
  fullName?: unknown
  name?: unknown
  firstName?: unknown
  lastName?: unknown
  email?: unknown
  studentNumber?: unknown
  rollNumber?: unknown
  className?: unknown
  classLabel?: unknown
  classRoom?: unknown
  classroom?: unknown
  homeroom?: unknown
  classInfo?: unknown
  classMetadata?: unknown
  class?: unknown
  grade?: unknown
  gradeName?: unknown
  gradeLevel?: unknown
  yearLevel?: unknown
  year?: unknown
  gradeInfo?: unknown
  metadata?: unknown
  isActive?: unknown
  active?: unknown
}