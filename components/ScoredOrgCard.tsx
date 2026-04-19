import type { ScoredOrg } from '@/lib/types'

const BADGE_COLORS: Record<string, string> = {
  'HAPI + Tier 1 Source': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
  'HAPI Verified':        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  'Source Verified':      'bg-surface-subtle text-text-secondary border-border',
}

function deriveRelevanceTag(org: ScoredOrg): { label: string; className: string } {
  const { alignment_score, grade_label, sector_tags } = org
  const isExceptional = grade_label === 'Exceptional'
  const isStrong = grade_label === 'Strong'
  const isCriticalSector = sector_tags.some((t) => t === 'Emergency' || t === 'Nutrition')

  if (alignment_score >= 9 && (isExceptional || isStrong))
    return { label: 'Best Match', className: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800' }
  if (alignment_score >= 8)
    return { label: 'Strong Match', className: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800' }
  if (alignment_score >= 6)
    return { label: 'Relevant Match', className: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' }
  if (isExceptional)
    return { label: 'High Impact', className: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' }
  if (isCriticalSector)
    return { label: 'Critical Need', className: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800' }
  return { label: 'Relevant Match', className: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' }
}

export default function ScoredOrgCard({ org }: { org: ScoredOrg }) {
  const relevance  = deriveRelevanceTag(org)
  const badgeColor = BADGE_COLORS[org.verified_badge] ?? BADGE_COLORS['Source Verified']

  return (
    <div className="flex flex-col gap-3 bg-surface border border-border rounded-md p-5 h-full">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground leading-snug">{org.org_name}</h3>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded border ${relevance.className}`}>
          {relevance.label}
        </span>
      </div>

      <span className={`self-start text-xs px-2 py-0.5 rounded border ${badgeColor}`}>
        {org.verified_badge}
      </span>

      <p className="text-xs text-text-secondary leading-relaxed">{org.blurb}</p>

      {(org.alignment_rationale || org.impact_rationale) && (
        <div className="space-y-1.5">
          {org.alignment_rationale && (
            <div>
              <p className="text-xs text-text-muted font-medium">Geographic fit</p>
              <p className="text-xs text-text-muted leading-relaxed">{org.alignment_rationale}</p>
            </div>
          )}
          {org.impact_rationale && (
            <div>
              <p className="text-xs text-text-muted font-medium">Impact</p>
              <p className="text-xs text-text-muted leading-relaxed">{org.impact_rationale}</p>
            </div>
          )}
        </div>
      )}

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
