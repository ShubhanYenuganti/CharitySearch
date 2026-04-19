import { OrgResult } from '@/lib/types'

interface OrgCardProps {
  org: OrgResult
}

const EVIDENCE_CONFIG = {
  high: {
    label: 'High evidence',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
  },
  medium: {
    label: 'Some evidence',
    className: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
  },
  low: {
    label: 'Limited evidence',
    className: 'bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-800/30 dark:text-zinc-400 dark:border-zinc-700',
  },
} as const

const SOURCE_CONFIG = {
  givewell: {
    label: 'GiveWell vetted',
    className: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
  },
  globalgiving: {
    label: 'GlobalGiving',
    className: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
  },
  operational_presence: {
    label: 'UN verified',
    className: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800',
  },
} as const

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${className}`}>
      {label}
    </span>
  )
}

export default function OrgCard({ org }: OrgCardProps) {
  const evidence = EVIDENCE_CONFIG[org.evidence_quality]
  const source = SOURCE_CONFIG[org.source]

  return (
    <div className="bg-surface border border-border rounded-md p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground leading-tight">{org.name}</h3>
          <span className="text-xs text-text-muted font-mono mt-0.5 block">{org.acronym}</span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded bg-surface-subtle text-text-muted border border-border whitespace-nowrap shrink-0">
          {org.sector}
        </span>
      </div>

      <p className="text-sm text-text-secondary leading-relaxed">
        {org.description}
      </p>

      <div className="flex flex-wrap gap-1.5">
        <Badge label={evidence.label} className={evidence.className} />
        <Badge label={source.label} className={source.className} />
      </div>

      <blockquote className="text-xs text-text-secondary leading-relaxed border-l-2 border-border pl-3 italic">
        {org.recent_context}
      </blockquote>

      <a
        href={org.donate_url}
        target="_blank"
        rel="noopener noreferrer"
        className="
          mt-auto inline-flex items-center justify-center gap-1.5
          px-4 py-2.5 rounded-md text-sm font-medium
          border border-accent text-accent
          hover:bg-accent hover:text-white
          transition-colors duration-150
        "
      >
        Donate →
      </a>
    </div>
  )
}
