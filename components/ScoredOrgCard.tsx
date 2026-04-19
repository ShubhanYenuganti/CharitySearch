import type { ScoredOrg } from '@/lib/types'

const GRADE_COLORS: Record<string, string> = {
  Exceptional: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  Strong:      'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  Good:        'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  Adequate:    'bg-surface-subtle text-text-secondary',
}

const BADGE_COLORS: Record<string, string> = {
  'HAPI + Tier 1 Source': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
  'HAPI Verified':        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  'Source Verified':      'bg-surface-subtle text-text-secondary border-border',
}

export default function ScoredOrgCard({ org }: { org: ScoredOrg }) {
  const gradeColor = GRADE_COLORS[org.grade_label] ?? GRADE_COLORS['Adequate']
  const badgeColor = BADGE_COLORS[org.verified_badge] ?? BADGE_COLORS['Source Verified']

  return (
    <div className="flex flex-col gap-3 bg-surface border border-border rounded-md p-5 h-full">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground leading-snug">{org.org_name}</h3>
        <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${gradeColor}`}>
          {org.rating}
        </span>
      </div>

      <span className={`self-start text-xs px-2 py-0.5 rounded border ${badgeColor}`}>
        {org.verified_badge}
      </span>

      <p className="text-xs text-text-secondary leading-relaxed flex-1">{org.blurb}</p>

      {org.org_impact_stats.length > 0 && (
        <ul className="space-y-1">
          {org.org_impact_stats.slice(0, 3).map((stat, i) => (
            <li key={i} className="text-xs text-text-muted flex gap-1.5">
              <span className="shrink-0 text-accent">↗</span>
              <span>{stat}</span>
            </li>
          ))}
        </ul>
      )}

      {org.sector_tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {org.sector_tags.map((tag) => (
            <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-surface-subtle border border-border text-text-muted">
              {tag}
            </span>
          ))}
        </div>
      )}

      <a
        href={org.donate_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto block w-full text-center text-xs font-medium py-2 px-3 rounded bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
      >
        Donate →
      </a>
    </div>
  )
}
