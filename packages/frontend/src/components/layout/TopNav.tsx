import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { getAuthenticatedUser, logout } from '../../features/auth/authApi'

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

const ReviewIcon: SvgIcon = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const SettingsIcon: SvgIcon = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 .99-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 .99 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51.99H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51.99z" />
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
  { label: 'Exams',        to: '/exams',       Icon: FileTextIcon,  end: false },
  { label: 'Classes',      to: '/classes',     Icon: BookOpenIcon,  end: false },
  { label: 'Students',     to: '/students',    Icon: UsersIcon,     end: false },
  { label: 'Grades',       to: '/grades',      Icon: BarChartIcon,  end: false },
  { label: 'Review Queue', to: '/review',      Icon: ReviewIcon,    end: false },
  { label: 'Settings',     to: '/settings',    Icon: SettingsIcon,  end: false },
]

interface CommandItem {
  id: string
  label: string
  description: string
  to: string
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function TopNav() {
  const navigate = useNavigate()
  const [isCommandOpen, setIsCommandOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const authenticatedUser = getAuthenticatedUser()
  const displayName =
    [authenticatedUser?.firstName, authenticatedUser?.lastName].filter(Boolean).join(' ').trim() ||
    authenticatedUser?.email?.split('@')[0] ||
    (authenticatedUser?.role === 'ADMIN'
      ? 'Admin'
      : authenticatedUser?.role === 'COUNSELOR'
        ? 'Counselor'
        : 'Teacher')
  const displayEmail = authenticatedUser?.email ?? 'teacher@school.edu'
  const avatarSource =
    [authenticatedUser?.firstName, authenticatedUser?.lastName].filter(Boolean).join(' ').trim() ||
    authenticatedUser?.email ||
    displayName
  const avatarInitials =
    avatarSource
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((segment) => segment[0]?.toUpperCase() ?? '')
      .join('') || 'TG'

  const commandItems = useMemo<CommandItem[]>(() => {
    const navCommands = NAV_LINKS.map((item) => ({
      id: `nav-${item.to}`,
      label: item.label,
      description: 'Navigate',
      to: item.to,
    }))

    return [
      {
        id: 'quick-new-exam',
        label: 'New Exam',
        description: 'Open exam creator',
        to: '/exams?quick=create',
      },
      {
        id: 'quick-new-class',
        label: 'New Class',
        description: 'Open class creator',
        to: '/classes?quick=create',
      },
      ...navCommands,
    ]
  }, [])

  const filteredCommands = useMemo(() => {
    const query = commandQuery.trim().toLowerCase()

    if (!query) {
      return commandItems
    }

    return commandItems.filter((item) => {
      const haystack = `${item.label} ${item.description} ${item.to}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [commandItems, commandQuery])

  useEffect(() => {
    function handleGlobalShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setIsCommandOpen((previous) => !previous)
      }

      if (event.key === 'Escape') {
        setIsCommandOpen(false)
      }
    }

    window.addEventListener('keydown', handleGlobalShortcut)

    return () => {
      window.removeEventListener('keydown', handleGlobalShortcut)
    }
  }, [])

  useEffect(() => {
    if (!isCommandOpen) {
      setCommandQuery('')
    }
  }, [isCommandOpen])

  function handleCommandNavigate(to: string) {
    setIsCommandOpen(false)
    navigate(to)
  }

  return (
    <>
      <aside
        className="surface-panel-plain flex flex-col border-b border-subtle lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r"
      >
        <div className="border-b border-subtle px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500 text-sm font-display font-bold text-navy-950">
              TG
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-white">TraceGrade</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold-300/80">Teacher workspace</p>
            </div>
          </div>
          <p className="mt-4 max-w-[18rem] font-body text-sm text-sec">
            Review grading activity, move between classes, and stay on top of manual checks.
          </p>
        </div>

        <div className="section-divider px-4 py-4">
          <button
            type="button"
            onClick={() => setIsCommandOpen(true)}
            className="surface-panel-plain w-full rounded-xl px-3 py-3 text-left hover:border-accent"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-display text-sm text-pri">Quick command</span>
              <span className="rounded-full border border-subtle px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-mut">
                Ctrl+K
              </span>
            </div>
            <p className="mt-1 font-body text-xs text-sec">Jump straight to a class, review queue, or creation flow.</p>
          </button>
        </div>

        <div className="px-5 pb-2">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-mut">Navigation</p>
        </div>

        <nav className="flex-1 px-3 pb-4" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {NAV_LINKS.map(({ label, to, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className="nav-item rounded-xl border border-transparent px-3 py-3 no-underline"
              style={({ isActive }) => ({
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                borderColor: isActive ? 'var(--border-strong)' : 'transparent',
              })}
            >
              {({ isActive }) => (
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{
                      opacity: isActive ? 1 : 0.72,
                      flexShrink: 0,
                      background: isActive ? 'rgba(232, 164, 40, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                      color: isActive ? 'var(--accent-gold)' : 'var(--text-secondary)',
                    }}
                  >
                    <Icon />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-sm font-medium">{label}</p>
                    <p className="font-body text-xs text-mut">
                      {label === 'Dashboard' && 'Overview and workload'}
                      {label === 'Classes' && 'Class rosters and activity'}
                      {label === 'Students' && 'Enrollment records'}
                      {label === 'Exams' && 'Assessments and grading'}
                      {label === 'Homework' && 'Assignments and submissions'}
                      {label === 'Grades' && 'Performance reporting'}
                      {label === 'Review Queue' && 'Confidence-based checks'}
                      {label === 'Settings' && 'Thresholds and preferences'}
                    </p>
                  </div>
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="section-divider px-3 py-3">
          <div
            className="surface-panel-plain flex items-center gap-3 rounded-xl px-3 py-3"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-accent bg-gold-500/10 font-display text-sm font-bold text-gold-400">
              {avatarInitials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="truncate font-display text-sm font-medium text-pri">{displayName}</p>
              <p className="font-mono text-[10px] text-mut">{displayEmail}</p>
            </div>
            <button
              title="Logout"
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="rounded-lg border border-transparent p-2 text-mut transition-colors duration-150 hover:border-subtle hover:text-crimson-400"
            >
              <LogOutIcon />
            </button>
          </div>
        </div>
      </aside>

      {isCommandOpen && (
        <div className="command-overlay" role="dialog" aria-modal="true" aria-label="Quick command">
          <div className="command-panel">
            <div className="border-b border-subtle p-3">
              <input
                type="text"
                autoFocus
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && filteredCommands.length > 0) {
                    event.preventDefault()
                    handleCommandNavigate(filteredCommands[0].to)
                  }
                }}
                placeholder="Go to classes, review queue, create exam..."
                className="w-full rounded-md border border-subtle bg-elevated px-3 py-2 font-body text-sm text-pri outline-none transition-colors focus:border-[var(--accent-gold)]"
              />
            </div>
            <ul className="max-h-80 overflow-y-auto p-2" aria-label="Command results">
              {filteredCommands.length === 0 && (
                <li className="rounded-md px-3 py-2 font-body text-sm text-sec">No commands found.</li>
              )}
              {filteredCommands.map((command) => (
                <li key={command.id}>
                  <button
                    type="button"
                    className="w-full rounded-md px-3 py-2 text-left transition-colors duration-150 hover:bg-white/5"
                    onClick={() => handleCommandNavigate(command.to)}
                  >
                    <p className="font-display text-sm text-pri">{command.label}</p>
                    <p className="font-body text-xs text-sec">{command.description}</p>
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-subtle px-3 py-2 font-mono text-xs text-mut">
              Enter to run command • Esc to close
            </div>
          </div>
          <button
            type="button"
            aria-label="Close quick command"
            className="command-backdrop"
            onClick={() => setIsCommandOpen(false)}
          />
        </div>
      )}
    </>
  )
}
