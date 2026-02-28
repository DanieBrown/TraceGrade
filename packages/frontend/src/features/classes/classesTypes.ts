export interface ClassListItem {
  id: string
  name: string
  subject: string
  period: string
  schoolYear: string
  isActive: boolean
}

export interface CreateClassPayload {
  name: string
  subject: string
  period: string
  schoolYear: string
}

export type UpdateClassPayload = Partial<CreateClassPayload>

export interface RawClassItem {
  id?: unknown
  classId?: unknown
  classUUID?: unknown
  className?: unknown
  name?: unknown
  subject?: unknown
  course?: unknown
  period?: unknown
  schoolYear?: unknown
  school_year?: unknown
  academicYear?: unknown
  isActive?: unknown
  active?: unknown
}
