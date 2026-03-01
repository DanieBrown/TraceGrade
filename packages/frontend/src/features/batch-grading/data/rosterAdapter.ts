import { fetchEnrollments, getEnrollmentsErrorDetails } from '../../enrollments/enrollmentApi'
import { fetchStudents, getStudentsLoadErrorDetails } from '../../students/studentsApi'
import type { RosterStudent } from '../domain/batchTypes'

function toSortedRoster(students: RosterStudent[]): RosterStudent[] {
  return [...students].sort((a, b) => a.fullName.localeCompare(b.fullName))
}

function toErrorMessage(error: unknown): string {
  const enrollmentError = getEnrollmentsErrorDetails(error)
  if (enrollmentError.message) {
    return enrollmentError.message
  }

  const studentError = getStudentsLoadErrorDetails(error)
  if (studentError.message) {
    return studentError.message
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Failed to load class roster for batch grading.'
}

export async function fetchClassRoster(classId: string): Promise<RosterStudent[]> {
  try {
    const [enrollments, students] = await Promise.all([
      fetchEnrollments(classId),
      fetchStudents(),
    ])

    const enrolledStudentIds = new Set(enrollments.map((enrollment) => enrollment.studentId))
    const roster = students
      .filter((student) => student.isActive && enrolledStudentIds.has(student.id))
      .map((student) => ({
        id: student.id,
        fullName: student.fullName,
      }))

    return toSortedRoster(roster)
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}
