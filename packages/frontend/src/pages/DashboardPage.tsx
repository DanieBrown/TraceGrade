import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAuthenticatedUser } from '../features/auth/authApi'
import { fetchDashboardStats, isValidSchoolId, type DashboardStatsResponse } from '../features/dashboard/dashboardApi'
import { getTeacherThreshold } from '../features/settings/settingsApi'

// ── DashboardPage ─────────────────────────────────────────────────────────────
// Rich dashboard surfacing key teacher metrics from the PRD.
// Summary metrics are wired to live school-scoped API data.

type LoadState = 'loading' | 'error' | 'done'

function formatThresholdPercent(threshold: number): string {
  const percentValue = threshold * 100

  if (Number.isInteger(percentValue)) {
    return `${percentValue}%`
  }

  return `${percentValue.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')}%`
}



function isEmptyDashboardStats(stats: DashboardStatsResponse): boolean {
  return (
    stats.totalStudents === 0
    && stats.classCount === 0
    && stats.gradedThisWeek === 0
    && stats.pendingReviews === 0
    && stats.classAverage === 0
    && stats.letterGrade === 'F'
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null)
  const [reviewThresholdLabel, setReviewThresholdLabel] = useState<string | null>(null)

  const schoolId = import.meta.env.VITE_SCHOOL_ID?.trim() ?? ''

  useEffect(() => {
    if (!schoolId || !isValidSchoolId(schoolId)) {
      setLoadState('error')
      return
    }

    let isMounted = true

    fetchDashboardStats(schoolId)
      .then((response) => {
        if (!isMounted) return
        setStats(response)
        setLoadState('done')
      })
      .catch(() => {
        if (!isMounted) return
        setLoadState('error')
      })

    return () => {
      isMounted = false
    }
  }, [schoolId])

  useEffect(() => {
    let isMounted = true

    getTeacherThreshold()
      .then((threshold) => {
        if (!isMounted || !threshold) {
          return
        }

        setReviewThresholdLabel(formatThresholdPercent(threshold.effectiveThreshold))
      })
      .catch(() => {
        if (!isMounted) {
          return
        }

        setReviewThresholdLabel(null)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const isEmptyState = loadState === 'done' && stats !== null && isEmptyDashboardStats(stats)
  const pendingReviews = stats?.pendingReviews ?? 0

  const reviewQuickActionDescription =
    loadState === 'loading'
      ? 'Loading the latest manual review workload…'
      : loadState === 'error'
        ? 'Unable to load flagged submission counts. Refresh to retry.'
        : isEmptyState
          ? 'No submissions are currently waiting for review'
          : `${pendingReviews} submissions need your attention`

  const reviewQuickActionBadge = loadState === 'done' && !isEmptyState ? pendingReviews : 0

  const now = new Date()
  const hour = now.getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const authenticatedUser = getAuthenticatedUser()
  const displayName =
    [authenticatedUser?.firstName, authenticatedUser?.lastName].filter(Boolean).join(' ').trim() ||
    authenticatedUser?.email?.split('@')[0] ||
    (authenticatedUser?.role === 'ADMIN'
      ? 'Admin'
      : authenticatedUser?.role === 'COUNSELOR'
        ? 'Counselor'
        : 'Teacher')
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const metricItems = stats
    ? [
        {
          label: 'Students',
          value: `${stats.totalStudents}`,
          detail: `${stats.classCount} active classes`,
        },
        {
          label: 'Graded this week',
          value: `${stats.gradedThisWeek}`,
          detail: 'AI-graded submissions',
        },
        {
          label: 'Pending review',
          value: `${stats.pendingReviews}`,
          detail: reviewThresholdLabel ? `Confidence below ${reviewThresholdLabel}` : 'Confidence below your configured threshold',
        },
        {
          label: 'Class average',
          value: `${stats.classAverage.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
          detail: `Letter grade ${stats.letterGrade}`,
        },
      ]
    : []

  const actionItems = [
    {
      label: 'Manage students',
      description: 'Review rosters, enroll new learners, and fix records.',
      to: '/students',
    },
    {
      label: 'Manage classes',
      description: 'Open sections, monitor activity, and keep grading context organised.',
      to: '/classes',
    },
  ]

  const workloadItems = [
    {
      label: 'Pending manual reviews',
      value:
        loadState === 'loading'
          ? 'Loading'
          : loadState === 'error'
            ? 'Unavailable'
            : `${reviewQuickActionBadge}`,
      description:
        loadState === 'loading'
          ? 'Pulling the latest review workload.'
          : reviewQuickActionDescription,
      tone: loadState === 'error' ? 'var(--accent-crimson)' : 'var(--accent-gold)',
    },
    {
      label: 'Review threshold',
      value: reviewThresholdLabel ?? 'Default',
      description: reviewThresholdLabel
        ? 'Submissions under this score are queued for review.'
        : 'Threshold will appear once settings finish loading.',
      tone: 'var(--text-primary)',
    },
    {
      label: 'Priority focus',
      value: loadState === 'done' && !isEmptyState && pendingReviews > 0 ? 'Flagged work' : 'Create exam',
      description:
        loadState === 'done' && !isEmptyState && pendingReviews > 0
          ? 'There are flagged submissions waiting for a manual decision.'
          : 'No urgent review backlog. Prepare the next assessment workflow.',
      tone: 'var(--text-primary)',
    },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <section className="surface-panel rounded-[28px] px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold-300/80">{dateStr}</p>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
              {greeting}, {displayName}.
            </h1>
            <p className="mt-3 font-body text-sm leading-6 text-sec">
              {loadState === 'loading' && 'Loading your school activity and grading workload.'}
              {loadState === 'error' && 'Dashboard data is unavailable right now. Check school configuration and retry.'}
              {loadState === 'done' && isEmptyState && 'No live activity yet. Once classes and submissions begin, the workspace will populate here.'}
              {loadState === 'done' && !isEmptyState && stats && `You have ${stats.pendingReviews} submissions waiting for manual review across ${stats.classCount} classes.`}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[23rem]">
            <Link
              to="/exams/new"
              className="rounded-2xl border border-accent bg-gold-500/10 px-4 py-4 no-underline transition-colors duration-150 hover:bg-gold-500/14"
            >
              <p className="font-display text-sm font-medium text-white">Create exam</p>
              <p className="mt-2 font-mono text-2xl text-gold-400">+</p>
              <p className="mt-2 font-body text-xs leading-5 text-sec">Build a paper exam with rubrics and print it for your classroom.</p>
            </Link>
            <Link
              to="/review"
              className="rounded-2xl border border-subtle bg-white/[0.03] px-4 py-4 no-underline transition-colors duration-150 hover:bg-white/[0.05]"
            >
              <p className="font-display text-sm font-medium text-white">Review queue</p>
              <p className="mt-2 font-mono text-2xl text-gold-400">{loadState === 'done' ? reviewQuickActionBadge : '...'}</p>
              <p className="mt-2 font-body text-xs leading-5 text-sec">{reviewQuickActionDescription}</p>
            </Link>
          </div>
        </div>

        <div className="section-divider mt-8 pt-6">
          {loadState === 'loading' && (
            <div className="rounded-2xl border border-subtle bg-white/[0.03] px-4 py-4 font-body text-sm text-sec">
              Loading dashboard summary...
            </div>
          )}

          {loadState === 'error' && (
            <div role="alert" className="rounded-2xl border border-crimson-500/30 bg-crimson-500/10 px-4 py-4">
              <p className="font-display text-sm font-medium text-crimson-400">Dashboard summary unavailable</p>
              <p className="mt-1 font-body text-sm text-sec">Check your connection and school configuration, then refresh to retry.</p>
            </div>
          )}

          {loadState === 'done' && isEmptyState && (
            <div className="rounded-2xl border border-subtle bg-white/[0.03] px-4 py-4">
              <p className="font-display text-sm font-medium text-white">No dashboard activity yet</p>
              <p className="mt-1 font-body text-sm text-sec">This school has no active classes, students, or graded submissions yet.</p>
            </div>
          )}

          {loadState === 'done' && !isEmptyState && stats && (
            <div className="grid gap-px overflow-hidden rounded-[24px] border border-subtle bg-white/10 lg:grid-cols-4">
              {metricItems.map((item) => (
                <div key={item.label} className="metric-divider bg-base/80 px-5 py-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mut">{item.label}</p>
                  <p className="mt-3 font-display text-3xl font-semibold text-white">{item.value}</p>
                  <p className="mt-2 font-body text-sm text-sec">{item.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <section className="surface-panel-plain rounded-[24px] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-display text-xl font-medium text-white">Workspace actions</p>
              <p className="mt-1 font-body text-sm text-sec">Use these shortcuts for the most common teacher tasks.</p>
            </div>
            <Link to="/grades" className="font-mono text-xs uppercase tracking-[0.18em] text-gold-300 no-underline">
              View grades
            </Link>
          </div>
          <div className="section-divider mt-5 space-y-3 pt-5">
            {actionItems.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="block rounded-2xl border border-subtle bg-white/[0.03] px-4 py-4 no-underline transition-colors duration-150 hover:bg-white/[0.05]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-base font-medium text-white">{action.label}</p>
                    <p className="mt-1 font-body text-sm leading-6 text-sec">{action.description}</p>
                  </div>
                  <span className="font-mono text-xs uppercase tracking-[0.18em] text-mut">Open</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="surface-panel-plain rounded-[24px] p-6">
          <div>
            <p className="font-display text-xl font-medium text-white">Today at a glance</p>
            <p className="mt-1 font-body text-sm text-sec">A quieter summary of review pressure and grading readiness.</p>
          </div>
          <div className="section-divider mt-5 space-y-4 pt-5">
            {workloadItems.map((item) => (
              <div key={item.label} className="rounded-2xl border border-subtle bg-white/[0.03] px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mut">{item.label}</p>
                    <p className="mt-3 font-display text-2xl font-semibold" style={{ color: item.tone }}>
                      {item.value}
                    </p>
                  </div>
                </div>
                <p className="mt-2 font-body text-sm leading-6 text-sec">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
