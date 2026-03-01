export interface EnrollmentListItem {
  id: string
  classId: string
  studentId: string
  enrolledAt: string       // ISO timestamp
  droppedAt: string | null // null = active enrollment
  createdAt: string
  updatedAt: string
}

export interface RawEnrollment {
  id?: unknown
  classId?: unknown
  studentId?: unknown
  enrolledAt?: unknown
  droppedAt?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

export class NonRetryableEnrollmentsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NonRetryableEnrollmentsError'
  }
}
