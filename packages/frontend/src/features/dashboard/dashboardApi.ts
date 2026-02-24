import api from '../../lib/api'
import type { ApiResponse } from '../../lib/apiTypes'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface DashboardStatsResponse {
  totalStudents: number
  classCount: number
  gradedThisWeek: number
  pendingReviews: number
  classAverage: number
  letterGrade: string
}

export function isValidSchoolId(schoolId: string): boolean {
  return UUID_PATTERN.test(schoolId.trim())
}

export function fetchDashboardStats(schoolId: string): Promise<DashboardStatsResponse> {
  const normalizedSchoolId = schoolId.trim()

  if (!isValidSchoolId(normalizedSchoolId)) {
    throw new Error('Invalid schoolId format')
  }

  const encodedSchoolId = encodeURIComponent(normalizedSchoolId)

  return api
    .get<ApiResponse<DashboardStatsResponse>>(`/schools/${encodedSchoolId}/dashboard/stats`)
    .then((response) => {
      const payload = response.data?.data
      if (!payload) {
        throw new Error('Dashboard stats payload is empty')
      }
      return payload
    })
}
