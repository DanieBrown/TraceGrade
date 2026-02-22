// ── DashboardPage ─────────────────────────────────────────────────────────────
// Rich dashboard surfacing key teacher metrics from the PRD.
// Uses representative demo data until API endpoints are wired.

const DEMO_STATS = {
  totalStudents: 87,
  classCount: 3,
  gradedThisWeek: 42,
  pendingReviews: 3,
  classAverage: 82.4,
  letterGrade: 'B',
}

const GRADE_DISTRIBUTION = [
  { label: 'A',  range: '90–100',  count: 24, pct: 28, color: 'var(--accent-teal)' },
  { label: 'B',  range: '80–89',   count: 31, pct: 36, color: '#5bc5f5' },
  { label: 'C',  range: '70–79',   count: 18, pct: 21, color: 'var(--accent-gold)' },
  { label: 'D',  range: '60–69',   count: 9,  pct: 10, color: '#f0844a' },
  { label: 'F',  range: '<60',     count: 5,  pct: 6,  color: 'var(--accent-crimson)' },
]

const RECENT_ACTIVITY = [
  {
    id: 1,
    type: 'graded',
    message: "AI graded Jack's Algebra Quiz",
    detail: 'Confidence 97% — approved automatically',
    time: '2 min ago',
    confidence: 97,
    icon: '✦',
    iconColor: 'var(--accent-teal)',
  },
  {
    id: 2,
    type: 'flagged',
    message: "Mohammed's History Exam flagged",
    detail: 'Confidence 78% — awaiting your review',
    time: '18 min ago',
    confidence: 78,
    icon: '⚑',
    iconColor: 'var(--accent-gold)',
  },
  {
    id: 3,
    type: 'graded',
    message: "Sarah's Calculus Test graded",
    detail: 'Score 18/20 · Confidence 94%',
    time: '1 hr ago',
    confidence: 94,
    icon: '✦',
    iconColor: 'var(--accent-teal)',
  },
  {
    id: 4,
    type: 'uploaded',
    message: 'Batch upload: 12 submissions',
    detail: 'Chemistry Midterm · Period 3',
    time: '3 hr ago',
    confidence: null,
    icon: '↑',
    iconColor: '#5bc5f5',
  },
  {
    id: 5,
    type: 'flagged',
    message: "Lena's Chemistry Midterm flagged",
    detail: 'Confidence 61% — awaiting your review',
    time: '3 hr ago',
    confidence: 61,
    icon: '⚑',
    iconColor: 'var(--accent-gold)',
  },
]

const CLASSES = [
  { name: 'Algebra II — Period 3',   students: 30, avg: 84.1, graded: 30, total: 30 },
  { name: 'Calculus — Period 5',      students: 27, avg: 79.6, graded: 24, total: 27 },
  { name: 'Chemistry — Period 2',     students: 30, avg: 83.7, graded: 15, total: 30 },
]

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

function ConfidencePill({ score }: { score: number }) {
  const color =
    score >= 95 ? 'var(--accent-teal)'
    : score >= 80 ? '#5bc5f5'
    : score >= 60 ? 'var(--accent-gold)'
    : 'var(--accent-crimson)'

  return (
    <span
      className="font-mono"
      style={{
        fontSize: '10px',
        fontWeight: 500,
        padding: '2px 7px',
        borderRadius: '99px',
        color,
        background: `${color}18`,
        border: `1px solid ${color}35`,
        flexShrink: 0,
      }}
    >
      {score}%
    </span>
  )
}

function GradeBar({ item, delay }: { item: typeof GRADE_DISTRIBUTION[0]; delay: number }) {
  return (
    <div className="flex items-center gap-3">
      {/* Grade letter */}
      <div
        className="font-display flex-shrink-0"
        style={{
          width: '28px',
          fontWeight: 700,
          fontSize: '14px',
          color: item.color,
          textAlign: 'right',
        }}
      >
        {item.label}
      </div>

      {/* Bar track */}
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: '8px', background: 'rgba(120, 180, 220, 0.08)' }}
      >
        <div
          className="h-full rounded-full animate-grow-x"
          style={{
            width: `${item.pct}%`,
            background: item.color,
            animationDelay: `${delay}ms`,
            opacity: 0.85,
          }}
        />
      </div>

      {/* Count + range */}
      <div className="flex items-center gap-2 flex-shrink-0" style={{ minWidth: '80px' }}>
        <span
          className="font-mono"
          style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', minWidth: '24px', textAlign: 'right' }}
        >
          {item.count}
        </span>
        <span
          className="font-mono"
          style={{ fontSize: '10px', color: 'var(--text-muted)' }}
        >
          {item.range}
        </span>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const now = new Date()
  const hour = now.getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
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
          {greeting}, Admin.
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontFamily: 'Lora, serif' }}>
          You have{' '}
          <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
            {DEMO_STATS.pendingReviews} submissions
          </span>{' '}
          waiting for manual review across {DEMO_STATS.classCount} classes.
        </p>
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
        <StatCard
          label="Total Students"
          value={DEMO_STATS.totalStudents}
          sub={`Across ${DEMO_STATS.classCount} active classes`}
          badge={{ text: 'Active', color: 'var(--accent-teal)' }}
        />
        <StatCard
          label="Graded This Week"
          value={DEMO_STATS.gradedThisWeek}
          sub="AI-graded submissions"
          badge={{ text: 'AI', color: '#5bc5f5' }}
        />
        <StatCard
          label="Pending Reviews"
          value={DEMO_STATS.pendingReviews}
          sub="Confidence below 95%"
          accent={DEMO_STATS.pendingReviews > 0 ? 'var(--accent-gold)' : 'var(--accent-teal)'}
          badge={{ text: 'Needs Action', color: 'var(--accent-gold)' }}
        />
        <StatCard
          label="Class Average"
          value={`${DEMO_STATS.classAverage}%`}
          sub={`Letter grade — ${DEMO_STATS.letterGrade}`}
          accent="var(--accent-teal)"
          badge={{ text: DEMO_STATS.letterGrade, color: 'var(--accent-teal)' }}
        />
      </div>

      {/* ── Main content row ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: '20px',
          marginBottom: '20px',
        }}
      >
        {/* Grade Distribution Chart */}
        <div
          className="rounded-xl p-6"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p
                className="font-mono"
                style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}
              >
                Grade Distribution
              </p>
              <h2
                className="font-display"
                style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}
              >
                All Classes · {DEMO_STATS.totalStudents} Students
              </h2>
            </div>
            <span
              className="font-mono"
              style={{ fontSize: '10px', color: 'var(--text-muted)', paddingTop: '4px' }}
            >
              Current term
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {GRADE_DISTRIBUTION.map((item, i) => (
              <GradeBar key={item.label} item={item} delay={i * 80} />
            ))}
          </div>

          {/* Legend row */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border)',
            }}
          >
            {GRADE_DISTRIBUTION.map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: item.color, flexShrink: 0 }} />
                <span
                  className="font-mono"
                  style={{ fontSize: '10px', color: 'var(--text-secondary)' }}
                >
                  {item.pct}% {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div
          className="rounded-xl p-6"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <p
              className="font-mono"
              style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}
            >
              Activity
            </p>
            <h2
              className="font-display"
              style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}
            >
              Recent Events
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {RECENT_ACTIVITY.map((event, i) => (
              <div
                key={event.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  paddingBottom: i < RECENT_ACTIVITY.length - 1 ? '16px' : '0',
                  marginBottom: i < RECENT_ACTIVITY.length - 1 ? '16px' : '0',
                  borderBottom: i < RECENT_ACTIVITY.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: `${event.iconColor}14`,
                    border: `1px solid ${event.iconColor}25`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: event.iconColor,
                    fontSize: '12px',
                    flexShrink: 0,
                    marginTop: '1px',
                  }}
                >
                  {event.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      fontFamily: 'Syne, sans-serif',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {event.message}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'Lora, serif' }}>
                    {event.detail}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span
                      className="font-mono"
                      style={{ fontSize: '10px', color: 'var(--text-muted)' }}
                    >
                      {event.time}
                    </span>
                    {event.confidence !== null && (
                      <ConfidencePill score={event.confidence} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Classes overview ── */}
      <div
        className="rounded-xl"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p
              className="font-mono"
              style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}
            >
              Classes
            </p>
            <h2 className="font-display" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Class Performance
            </h2>
          </div>
          <span
            className="font-mono"
            style={{
              fontSize: '10px',
              padding: '3px 10px',
              borderRadius: '99px',
              color: 'var(--accent-teal)',
              background: 'rgba(0, 201, 167, 0.08)',
              border: '1px solid rgba(0, 201, 167, 0.18)',
            }}
          >
            {CLASSES.length} classes
          </span>
        </div>

        {/* Table header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 100px 120px 180px',
            gap: '0',
            padding: '10px 24px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {['Class', 'Students', 'Average', 'Grading Progress'].map(col => (
            <p
              key={col}
              className="font-mono"
              style={{ fontSize: '9.5px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}
            >
              {col}
            </p>
          ))}
        </div>

        {/* Rows */}
        {CLASSES.map((cls, i) => {
          const progressPct = cls.total > 0 ? (cls.graded / cls.total) * 100 : 0
          const avgColor =
            cls.avg >= 90 ? 'var(--accent-teal)'
            : cls.avg >= 80 ? '#5bc5f5'
            : cls.avg >= 70 ? 'var(--accent-gold)'
            : 'var(--accent-crimson)'

          return (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 120px 180px',
                gap: '0',
                padding: '14px 24px',
                borderBottom: i < CLASSES.length - 1 ? '1px solid var(--border)' : 'none',
                alignItems: 'center',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(120, 180, 220, 0.03)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            >
              <p
                className="font-display"
                style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}
              >
                {cls.name}
              </p>
              <p
                className="font-mono"
                style={{ fontSize: '13px', color: 'var(--text-secondary)' }}
              >
                {cls.students}
              </p>
              <p
                className="font-mono"
                style={{ fontSize: '14px', fontWeight: 500, color: avgColor }}
              >
                {cls.avg}%
              </p>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      flex: 1,
                      height: '6px',
                      borderRadius: '99px',
                      background: 'rgba(120, 180, 220, 0.1)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${progressPct}%`,
                        background: progressPct === 100 ? 'var(--accent-teal)' : 'var(--accent-gold)',
                        borderRadius: '99px',
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                  <span
                    className="font-mono"
                    style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}
                  >
                    {cls.graded}/{cls.total}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Quick actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          {
            label: 'Upload Paper Exams',
            desc: 'Submit handwritten exams for AI grading',
            href: '/paper-exams',
            icon: '↑',
            accent: '#5bc5f5',
          },
          {
            label: 'Review Queue',
            desc: `${DEMO_STATS.pendingReviews} submissions need your attention`,
            href: '/review',
            icon: '⚑',
            accent: 'var(--accent-gold)',
            badge: DEMO_STATS.pendingReviews,
          },
          {
            label: 'View Grades',
            desc: 'Browse all grades across your classes',
            href: '/grades',
            icon: '◈',
            accent: 'var(--accent-teal)',
          },
        ].map(action => (
          <a
            key={action.href}
            href={action.href}
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
          </a>
        ))}
      </div>

    </div>
  )
}
