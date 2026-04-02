import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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

function createToken(payload: Record<string, unknown>): string {
  const encode = (value: Record<string, unknown>) =>
    window.btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')

  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

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
    localStorage.clear()
  })

  it('greets the authenticated teacher instead of static admin copy', async () => {
    localStorage.setItem(
      'auth_token',
      createToken({
        sub: 'casey.rivera@example.com',
        firstName: 'Casey',
        lastName: 'Rivera',
        role: 'TEACHER',
      }),
    )
    getTeacherThresholdMock.mockResolvedValueOnce({
      effectiveThreshold: 0.875,
      source: 'teacher_override',
      teacherThreshold: 0.875,
    })

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: /(Good morning|Good afternoon|Good evening), Casey Rivera\./ })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Admin\./ })).not.toBeInTheDocument()
  })

  it('shows dynamic threshold copy in pending reviews card when threshold is available', async () => {
    getTeacherThresholdMock.mockResolvedValueOnce({
      effectiveThreshold: 0.875,
      source: 'teacher_override',
      teacherThreshold: 0.875,
    })

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Confidence below 87.5%')).toBeInTheDocument()
    expect(screen.queryByText('Confidence below 95%')).not.toBeInTheDocument()
  })

  it('keeps a single create exam entry point inside the dashboard content', async () => {
    getTeacherThresholdMock.mockResolvedValueOnce({
      effectiveThreshold: 0.875,
      source: 'teacher_override',
      teacherThreshold: 0.875,
    })

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Create exam')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Create exam/i })).toHaveLength(1)
  })

  it('keeps the review queue to a single dashboard entry point', async () => {
    getTeacherThresholdMock.mockResolvedValueOnce({
      effectiveThreshold: 0.875,
      source: 'teacher_override',
      teacherThreshold: 0.875,
    })

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    expect(await screen.findAllByRole('link', { name: /review queue/i })).toHaveLength(1)
    expect(screen.queryByText('Open review queue')).not.toBeInTheDocument()
    expect(screen.queryByText('Manual review queue')).not.toBeInTheDocument()
  })

  it('falls back to generic threshold copy when threshold lookup fails', async () => {
    getTeacherThresholdMock.mockRejectedValueOnce(new Error('threshold lookup failed'))

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Confidence below your configured threshold')).toBeInTheDocument()
  })
})