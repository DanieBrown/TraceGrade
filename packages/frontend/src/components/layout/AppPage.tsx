import type { ReactNode } from 'react'

interface AppPageProps {
  children: ReactNode
  width?: 'wide' | 'standard'
}

interface AppPageHeaderProps {
  title: string
  description: string
  eyebrow?: string
  actions?: ReactNode
}

interface AppPanelProps {
  children: ReactNode
  className?: string
}

interface AppNoticeProps {
  children: ReactNode
  tone?: 'default' | 'danger'
}

function joinClassNames(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(' ')
}

export function AppPage({ children, width = 'wide' }: AppPageProps) {
  return (
    <main className={joinClassNames(
      'mx-auto px-4 py-6 sm:px-6 lg:py-10',
      width === 'wide' ? 'max-w-7xl lg:px-10' : 'max-w-5xl lg:px-8',
    )}>
      {children}
    </main>
  )
}

export function AppPageHeader({ title, description, eyebrow, actions }: AppPageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 lg:mb-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-300/80">{eyebrow}</p>
        )}
        <h1 className="mt-2 font-display text-3xl font-semibold text-white sm:text-[2rem]">{title}</h1>
        <p className="mt-2 font-body text-sm leading-6 text-sec">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  )
}

export function AppPanel({ children, className }: AppPanelProps) {
  return <section className={joinClassNames('surface-panel-plain rounded-[24px] p-5 sm:p-6', className)}>{children}</section>
}

export function AppNotice({ children, tone = 'default' }: AppNoticeProps) {
  const toneClasses =
    tone === 'danger'
      ? 'border-crimson-500/30 bg-crimson-500/10 text-crimson-400'
      : 'border-subtle bg-white/[0.03] text-sec'

  return <section className={joinClassNames('mb-6 rounded-2xl border px-4 py-4', toneClasses)}>{children}</section>
}
