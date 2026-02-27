import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchDashboardStats, isValidSchoolId } from '../features/dashboard/dashboardApi'
import { getTeacherThreshold } from '../features/settings/settingsApi'
import DashboardPage from './DashboardPage'

vi.mock('../features/dashboard/dashboardApi', () => ({
  fetchDashboardStats: vi.fn(),
  isValidSchoolId: vi.fn(),
}))

vi.mock('../features/settings/settingsApi', () => ({
  getTeacherThreshold: vi.fn(),
}))

const fetchDashboardStatsMock = vi.mocked(fetchDashboardStats)
const isValidSchoolIdMock = vi.mocked(isValidSchoolId)
const getTeacherThresholdMock = vi.mocked(getTeacherThreshold)

describe('DashboardPage threshold messaging', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_SCHOOL_ID', '11111111-1111-4111-8111-111111111111')
    isValidSchoolIdMock.mockReturnValue(true)
    fetchDashboardStatsMock.mockResolvedValue({
      totalStudents: 120,
      classCount: 5,
      gradedThisWeek: 42,
      pendingReviews: 7,
      classAverage: 84.3,
      letterGrade: 'B',
    })
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllEnvs()
  })

  it('shows dynamic threshold copy in pending reviews card when threshold is available', async () => {
    getTeacherThresholdMock.mockResolvedValueOnce({
      effectiveThreshold: 0.875,
      source: 'teacher_override',
      teacherThreshold: 0.875,
    })

    render(<DashboardPage />)

    expect(await screen.findByText('Confidence below 87.5%')).toBeInTheDocument()
    expect(screen.queryByText('Confidence below 95%')).not.toBeInTheDocument()
  })

  it('falls back to generic threshold copy when threshold lookup fails', async () => {
    getTeacherThresholdMock.mockRejectedValueOnce(new Error('threshold lookup failed'))

    render(<DashboardPage />)

    expect(await screen.findByText('Confidence below your configured threshold')).toBeInTheDocument()
  })
})