import { useLocation, useNavigate } from 'react-router-dom'
import { getAuthenticatedUser, logout } from '../../features/auth/authApi'
import TraceGradeLogo from './TraceGradeLogo'

function getSectionMeta(pathname: string): { eyebrow: string; title: string } {
  if (pathname.startsWith('/classes')) {
    return { eyebrow: 'Teacher workspace', title: 'Classes' }
  }

  if (pathname.startsWith('/students')) {
    return { eyebrow: 'Teacher workspace', title: 'Students' }
  }

  if (pathname.startsWith('/exams')) {
    return { eyebrow: 'Teacher workspace', title: 'Exams' }
  }

  if (pathname.startsWith('/homework')) {
    return { eyebrow: 'Teacher workspace', title: 'Homework' }
  }

  if (pathname.startsWith('/grades')) {
    return { eyebrow: 'Teacher workspace', title: 'Grades' }
  }

  if (pathname.startsWith('/review')) {
    return { eyebrow: 'Teacher workspace', title: 'Review Queue' }
  }

  if (pathname.startsWith('/settings')) {
    return { eyebrow: 'Teacher workspace', title: 'Settings' }
  }

  return { eyebrow: 'Teacher workspace', title: 'Dashboard' }
}

export default function WorkspaceHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const authenticatedUser = getAuthenticatedUser()
  const { eyebrow, title } = getSectionMeta(location.pathname)
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
      .join('') || 'TR'

  return (
    <header role="banner" aria-label="Workspace header" className="sticky top-0 z-20 border-b border-subtle bg-base/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gold-500/25 bg-gold-500/10">
            <TraceGradeLogo className="h-8 w-8" />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-300/80">{eyebrow}</p>
            <p className="font-display text-lg font-semibold text-white">{title}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start rounded-2xl border border-subtle bg-white/[0.03] px-3 py-2 lg:self-auto">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gold-500/25 bg-gold-500/10 font-display text-sm font-bold text-gold-300">
            {avatarInitials}
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-medium text-pri">{displayName}</p>
            <p className="truncate font-mono text-[10px] text-mut">{displayEmail}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="rounded-lg border border-subtle px-3 py-2 font-display text-xs font-semibold text-sec transition-colors duration-150 hover:border-gold-500/30 hover:text-pri"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  )
}