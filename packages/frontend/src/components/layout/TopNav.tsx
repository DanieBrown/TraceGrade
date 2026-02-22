import { NavLink } from 'react-router-dom'

const NAV_LINKS = [
  { label: 'Dashboard',   to: '/',            icon: '⊞' },
  { label: 'Students',    to: '/students',    icon: '👤' },
  { label: 'Exams',       to: '/exams',       icon: '📄' },
  { label: 'Homework',    to: '/homework',    icon: '📖' },
  { label: 'Grades',      to: '/grades',      icon: '📊' },
  { label: 'Paper Exams', to: '/paper-exams', icon: '📋' },
  { label: 'Review Queue', to: '/review',     icon: '🔍' },
]

export default function TopNav() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">
        {/* Brand */}
        <div>
          <p className="text-sm font-semibold text-gray-900 leading-none">Teacher Portal</p>
          <p className="text-xs text-gray-500">Welcome, admin</p>
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map(({ label, to }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                ].join(' ')
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <button className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">
          <span className="text-base">⇥</span>
          Logout
        </button>
      </div>
    </header>
  )
}
