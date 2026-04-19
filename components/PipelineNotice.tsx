interface PipelineNoticeProps {
  variant: 'warning' | 'error' | 'info'
  title: string
  children: React.ReactNode
}

const VARIANT_STYLES = {
  warning: {
    wrap: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
    icon: 'text-amber-500',
    title: 'text-amber-900 dark:text-amber-300',
    body: 'text-amber-800 dark:text-amber-400',
  },
  error: {
    wrap: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30',
    icon: 'text-red-400',
    title: 'text-red-900 dark:text-red-300',
    body: 'text-red-800 dark:text-red-400',
  },
  info: {
    wrap: 'border-border bg-surface-subtle',
    icon: 'text-text-muted',
    title: 'text-foreground',
    body: 'text-text-secondary',
  },
} as const

export default function PipelineNotice({ variant, title, children }: PipelineNoticeProps) {
  const s = VARIANT_STYLES[variant]
  return (
    <div className={`rounded-md border px-5 py-4 flex gap-3 ${s.wrap}`}>
      <Icon variant={variant} className={`mt-0.5 shrink-0 ${s.icon}`} />
      <div className="space-y-1">
        <p className={`text-sm font-medium ${s.title}`}>{title}</p>
        <div className={`text-sm leading-relaxed ${s.body}`}>{children}</div>
      </div>
    </div>
  )
}

function Icon({ variant, className }: { variant: 'warning' | 'error' | 'info'; className: string }) {
  if (variant === 'warning') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
        <path d="M8 1.5L14.5 13H1.5L8 1.5Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
        <path d="M8 6v3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        <circle cx="8" cy="11" r="0.75" fill="currentColor" />
      </svg>
    )
  }
  if (variant === 'error') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.25" />
        <path d="M8 5v3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        <circle cx="8" cy="10.5" r="0.75" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M8 7v4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <circle cx="8" cy="5.5" r="0.75" fill="currentColor" />
    </svg>
  )
}
