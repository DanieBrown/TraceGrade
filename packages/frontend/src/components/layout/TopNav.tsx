import { NavLink } from 'react-router-dom'

// ── Inline SVG icons ──────────────────────────────────────────────────────────

type SvgIcon = React.FC<{ size?: number }>

const GridIcon: SvgIcon = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
)

const UsersIcon: SvgIcon = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const FileTextIcon: SvgIcon = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)

const BookOpenIcon: SvgIcon = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
)

const BarChartIcon: SvgIcon = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
    <line x1="2" y1="20" x2="22" y2="20" />
  </svg>
)

const ClipboardIcon: SvgIcon = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
)

const ReviewIcon: SvgIcon = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const LogOutIcon: SvgIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

// ── Nav data ──────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Dashboard',    to: '/',            Icon: GridIcon,      end: true  },
  { label: 'Students',     to: '/students',    Icon: UsersIcon,     end: false },
  { label: 'Exams',        to: '/exams',       Icon: FileTextIcon,  end: false },
  { label: 'Homework',     to: '/homework',    Icon: BookOpenIcon,  end: false },
  { label: 'Grades',       to: '/grades',      Icon: BarChartIcon,  end: false },
  { label: 'Paper Exams',  to: '/paper-exams', Icon: ClipboardIcon, end: false },
  { label: 'Review Queue', to: '/review',      Icon: ReviewIcon,    end: false },
]

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function TopNav() {
  return (
    <aside
      className="bg-grid flex-shrink-0 flex flex-col"
      style={{
        width: '232px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        overflowY: 'auto',
      }}
    >
      {/* ── Logo ── */}
      <div
        className="flex items-center gap-3 px-5"
        style={{
          height: '64px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <div
          className="flex items-center justify-center font-display font-extrabold flex-shrink-0"
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--accent-gold) 0%, #f0c050 100%)',
            color: '#06101e',
            fontSize: '13px',
            letterSpacing: '-0.5px',
          }}
        >
          TG
        </div>
        <div>
          <p
            className="font-display"
            style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1 }}
          >
            TraceGrade
          </p>
          <p
            className="font-mono"
            style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: '3px', letterSpacing: '0.1em' }}
          >
            TEACHER PORTAL
          </p>
        </div>
      </div>

      {/* ── Section label ── */}
      <div className="px-5 pt-5 pb-2">
        <p
          className="font-mono"
          style={{
            fontSize: '9px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            fontWeight: 500,
          }}
        >
          Menu
        </p>
      </div>

      {/* ── Nav links ── */}
      <nav className="flex-1 px-3" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV_LINKS.map(({ label, to, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 12px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontFamily: "'Syne', sans-serif",
              fontSize: '13.5px',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--accent-gold)' : 'var(--text-secondary)',
              background: isActive ? 'rgba(232, 164, 40, 0.09)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--accent-gold)' : '2px solid transparent',
              transition: 'all 0.15s ease',
            })}
          >
            {({ isActive }) => (
              <>
                <span style={{ opacity: isActive ? 1 : 0.6, flexShrink: 0 }}>
                  <Icon />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Version tag ── */}
      <div
        className="mx-3 mb-3 px-3 py-2 rounded-lg font-mono"
        style={{
          background: 'rgba(0, 201, 167, 0.06)',
          border: '1px solid rgba(0, 201, 167, 0.12)',
          fontSize: '10px',
          color: 'var(--text-muted)',
        }}
      >
        <span style={{ color: 'var(--accent-teal)', marginRight: '6px' }}>◈</span>
        AI Grading Active
      </div>

      {/* ── User profile ── */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '12px', flexShrink: 0 }}>
        <div
          className="flex items-center gap-3 px-2 py-2 rounded-lg"
          style={{ background: 'rgba(120, 180, 220, 0.04)' }}
        >
          {/* Avatar */}
          <div
            className="flex items-center justify-center font-display font-bold flex-shrink-0"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(232, 164, 40, 0.14)',
              border: '1px solid rgba(232, 164, 40, 0.28)',
              color: 'var(--accent-gold)',
              fontSize: '12px',
            }}
          >
            AD
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              className="font-display"
              style={{
                fontWeight: 600,
                fontSize: '13px',
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Admin
            </p>
            <p
              className="font-mono"
              style={{ fontSize: '10px', color: 'var(--text-muted)' }}
            >
              admin@school.edu
            </p>
          </div>
          <button
            title="Logout"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              color: 'var(--text-muted)',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--accent-crimson)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
          >
            <LogOutIcon />
          </button>
        </div>
      </div>
    </aside>
  )
}
