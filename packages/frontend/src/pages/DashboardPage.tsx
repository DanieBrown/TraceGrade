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

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
  badge,
}: {
  label: string
  value: string | number
  sub: string
  accent?: string
  badge?: { text: string; color: string }
}) {
  return (
    <div
      className="card-glow rounded-xl p-5 flex flex-col gap-3"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        transition: 'box-shadow 0.2s ease',
      }}
    >
      <div className="flex items-start justify-between">
        <p
          className="font-mono"
          style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}
        >
          {label}
        </p>
        {badge && (
          <span
            className="font-mono"
            style={{
              fontSize: '9px',
              fontWeight: 500,
              padding: '2px 7px',
              borderRadius: '99px',
              color: badge.color,
              background: `${badge.color}18`,
              border: `1px solid ${badge.color}35`,
            }}
          >
            {badge.text}
          </span>
        )}
      </div>
      <p
        className="font-display"
        style={{ fontSize: '36px', fontWeight: 800, lineHeight: 1, color: accent ?? 'var(--text-primary)' }}
      >
        {value}
      </p>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Lora, serif' }}>{sub}</p>
    </div>
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
      ? 'Loading review queue metrics…'
      : loadState === 'error'
        ? 'Unable to load review queue metrics. Refresh to retry.'
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

  return (
    <div style={{ padding: '40px', maxWidth: '1100px' }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: '36px' }}>
        <p
          className="font-mono"
          style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}
        >
          {dateStr}
        </p>
        <h1
          className="font-display"
          style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '8px' }}
        >
          {greeting}, {displayName}.
        </h1>
        {loadState === 'loading' && (
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontFamily: 'Lora, serif' }}>
            Loading live dashboard stats…
          </p>
        )}
        {loadState === 'error' && (
          <p style={{ fontSize: '14px', color: 'var(--accent-crimson)', fontFamily: 'Lora, serif' }}>
            Unable to load dashboard metrics. Check school configuration and refresh to retry.
          </p>
        )}
        {loadState === 'done' && isEmptyState && (
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontFamily: 'Lora, serif' }}>
            No activity yet for this school. Once classes and submissions are active, live metrics will appear here.
          </p>
        )}
        {loadState === 'done' && !isEmptyState && stats && (
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontFamily: 'Lora, serif' }}>
            You have{' '}
            <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
              {stats.pendingReviews} submissions
            </span>{' '}
            waiting for manual review across {stats.classCount} classes.
          </p>
        )}
      </div>

      {/* ── Stat cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {loadState === 'loading' && (
          <div
            className="rounded-xl p-5 flex items-center gap-3"
            style={{
              gridColumn: '1 / -1',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="font-display text-sm">Loading dashboard summary…</span>
          </div>
        )}

        {loadState === 'error' && (
          <div
            role="alert"
            className="rounded-xl p-5"
            style={{
              gridColumn: '1 / -1',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
            }}
          >
            <p className="font-display" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-crimson)', marginBottom: '4px' }}>
              Dashboard summary is unavailable
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Lora, serif' }}>
              Check your connection and school configuration, then refresh the page to retry.
            </p>
          </div>
        )}

        {loadState === 'done' && isEmptyState && (
          <div
            className="rounded-xl p-5"
            style={{
              gridColumn: '1 / -1',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
            }}
          >
            <p className="font-display" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              No dashboard activity yet
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Lora, serif' }}>
              This school has no active classes, students, or graded submissions yet.
            </p>
          </div>
        )}

        {loadState === 'done' && !isEmptyState && stats && (
          <>
            <StatCard
              label="Total Students"
              value={stats.totalStudents}
              sub={`Across ${stats.classCount} active classes`}
              badge={{ text: 'Active', color: 'var(--accent-teal)' }}
            />
            <StatCard
              label="Graded This Week"
              value={stats.gradedThisWeek}
              sub="AI-graded submissions"
              badge={{ text: 'AI', color: '#5bc5f5' }}
            />
            <StatCard
              label="Pending Reviews"
              value={stats.pendingReviews}
              sub={reviewThresholdLabel ? `Confidence below ${reviewThresholdLabel}` : 'Confidence below your configured threshold'}
              accent={stats.pendingReviews > 0 ? 'var(--accent-gold)' : 'var(--accent-teal)'}
              badge={{ text: 'Needs Action', color: 'var(--accent-gold)' }}
            />
            <StatCard
              label="Class Average"
              value={`${stats.classAverage.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
              sub={`Letter grade — ${stats.letterGrade}`}
              accent="var(--accent-teal)"
              badge={{ text: stats.letterGrade, color: 'var(--accent-teal)' }}
            />
          </>
        )}
      </div>

      {/* ── Quick actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
        {[
          {
            label: 'Add Students',
            desc: 'Enroll new students into your school',
            to: '/students',
            icon: '+',
            accent: '#5bc5f5',
          },
          {
            label: 'Create Homework',
            desc: 'Create a new homework assignment',
            to: '/homework',
            icon: '📋',
            accent: 'var(--accent-gold)',
          },
          {
            label: 'Create Exam',
            desc: 'Build exam templates for AI grading',
            to: '/exams',
            icon: '✎',
            accent: 'var(--accent-teal)',
          },
        ].map(action => (
          <Link
            key={action.to}
            to={action.to}
            className="rounded-xl p-5 card-glow"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              textDecoration: 'none',
              transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = `${action.accent}40`
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--border)'
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: `${action.accent}14`,
                border: `1px solid ${action.accent}28`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: action.accent,
                fontSize: '16px',
                flexShrink: 0,
              }}
            >
              {action.icon}
            </div>
            <div style={{ flex: 1 }}>
              <p
                className="font-display"
                style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}
              >
                {action.label}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Lora, serif', lineHeight: 1.4 }}>
                {action.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Grading quick actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          {
            label: 'Grade Paper Exams',
            desc: 'Upload handwritten exams for AI grading',
            to: '/exams',
            icon: '✦',
            accent: '#5bc5f5',
          },
          {
            label: 'Review Queue',
            desc: reviewQuickActionDescription,
            to: '/review',
            icon: '⚑',
            accent: 'var(--accent-gold)',
            badge: reviewQuickActionBadge,
          },
          {
            label: 'View Grades',
            desc: 'Browse all grades across your classes',
            to: '/grades',
            icon: '◈',
            accent: 'var(--accent-teal)',
          },
        ].map(action => (
          <Link
            key={action.to}
            to={action.to}
            className="rounded-xl p-5 card-glow"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              textDecoration: 'none',
              transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = `${action.accent}40`
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--border)'
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: `${action.accent}14`,
                border: `1px solid ${action.accent}28`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: action.accent,
                fontSize: '16px',
                flexShrink: 0,
              }}
            >
              {action.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <p
                  className="font-display"
                  style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}
                >
                  {action.label}
                </p>
                {action.badge !== undefined && action.badge > 0 && (
                  <span
                    className="font-mono pulse-soft"
                    style={{
                      fontSize: '9px',
                      fontWeight: 500,
                      padding: '1px 6px',
                      borderRadius: '99px',
                      color: 'var(--accent-gold)',
                      background: 'rgba(232, 164, 40, 0.15)',
                      border: '1px solid rgba(232, 164, 40, 0.3)',
                    }}
                  >
                    {action.badge}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Lora, serif', lineHeight: 1.4 }}>
                {action.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>

    </div>
  )
}
