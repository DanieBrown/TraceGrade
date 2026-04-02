interface TraceGradeLogoProps {
  className?: string
  label?: string
}

export default function TraceGradeLogo({
  className = 'h-8 w-8',
  label = 'TraceGrade logo',
}: TraceGradeLogoProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label={label}
      className={className}
      fill="none"
    >
      <title>{label}</title>
      <rect
        x="6"
        y="5"
        width="26"
        height="34"
        rx="7"
        fill="var(--accent-gold)"
        opacity="0.16"
        stroke="var(--accent-gold)"
        strokeWidth="2"
      />
      <path d="M13 16h12" stroke="var(--accent-gold)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M13 22h11" stroke="var(--accent-gold)" strokeWidth="2.6" strokeLinecap="round" opacity="0.85" />
      <path d="M13 28h8" stroke="var(--accent-gold)" strokeWidth="2.6" strokeLinecap="round" opacity="0.72" />
      <circle
        cx="34"
        cy="31"
        r="9"
        fill="var(--accent-teal)"
        opacity="0.16"
        stroke="var(--accent-teal)"
        strokeWidth="2"
      />
      <path d="M30.5 31l2.6 2.8 5.2-6.4" stroke="var(--accent-teal)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}