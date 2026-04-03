import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import TraceGradeLogo from './TraceGradeLogo'

interface AuthLayoutProps {
  title: string
  description: string
  footerText: string
  footerLinkLabel: string
  footerLinkTo: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>
  submitLabel: string
  isSubmitting?: boolean
  error?: string
  asideTitle: string
  asideBody: string
  children: ReactNode
}

function BrandBlock() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold-500/25 bg-gold-500/10 text-gold-300">
        <TraceGradeLogo className="h-7 w-7" label="TraceGrade mark" />
      </div>
      <div>
        <p className="font-display text-lg font-semibold text-white">TraceGrade</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold-300/80">Bringing the power of paper back to education</p>
      </div>
    </div>
  )
}

export function AuthField({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block font-body text-sm font-medium text-sec">
        {label}
      </label>
      {children}
    </div>
  )
}

export default function AuthLayout({
  title,
  description,
  footerText,
  footerLinkLabel,
  footerLinkTo,
  onSubmit,
  submitLabel,
  isSubmitting = false,
  error,
  asideTitle,
  asideBody,
  children,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-base px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[32px] border border-subtle bg-[rgba(8,16,30,0.92)] shadow-[0_30px_70px_rgba(0,0,0,0.28)] lg:grid-cols-[1.02fr_0.98fr]">
        <section className="hidden border-r border-subtle bg-[linear-gradient(180deg,rgba(232,164,40,0.05),transparent_28%),linear-gradient(180deg,rgba(16,33,61,0.96),rgba(6,16,30,0.96))] p-8 lg:flex lg:flex-col lg:justify-between">
          <div>
            <BrandBlock />
            <div className="mt-12 max-w-md">
              <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-white">{asideTitle}</h1>
              <p className="mt-4 font-body text-base leading-7 text-sec">{asideBody}</p>
            </div>
          </div>
        </section>

        <section className="flex items-center px-5 py-8 sm:px-8 lg:px-10">
          <div className="mx-auto w-full max-w-md">
            <div className="lg:hidden">
              <BrandBlock />
            </div>
            <div className="mt-8 lg:mt-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-300/80">Secure access</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-white">{title}</h2>
              <p className="mt-2 font-body text-sm leading-6 text-sec">{description}</p>
            </div>

            <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
              {children}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-gold-500 px-4 py-3 font-display text-sm font-semibold text-navy-950 transition-colors duration-150 hover:bg-gold-600 disabled:cursor-not-allowed disabled:bg-gold-500/60"
              >
                {submitLabel}
              </button>

              {error && (
                <div role="alert" className="rounded-xl border border-crimson-500/30 bg-crimson-500/10 px-4 py-3">
                  <p className="font-body text-sm text-crimson-400">{error}</p>
                </div>
              )}
            </form>

            <p className="mt-6 text-center font-body text-sm text-sec">
              {footerText}{' '}
              <Link to={footerLinkTo} className="font-semibold text-gold-400 no-underline hover:text-gold-300">
                {footerLinkLabel}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
