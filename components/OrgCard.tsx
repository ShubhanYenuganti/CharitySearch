import { OrgResult } from '@/lib/types'

interface OrgCardProps {
  org: OrgResult
}

function deriveRelevanceTag(org: OrgResult): { label: string; className: string } {
  const { alignment_score, grade_label, sector_tags } = org
  const isExcellent = grade_label === 'Excellent'
  const isCriticalSector = sector_tags.some((t) => t === 'Emergency' || t === 'Nutrition')

  if (alignment_score != null && alignment_score >= 8 && isExcellent)
    return { label: 'Best Match', className: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800' }
  if (alignment_score != null && alignment_score >= 8)
    return { label: 'Strong Match', className: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800' }
  if (alignment_score != null && alignment_score >= 6)
    return { label: 'Relevant Match', className: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' }
  if (isExcellent)
    return { label: 'High Impact', className: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' }
  if (isCriticalSector)
    return { label: 'Critical Need', className: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800' }
  return { label: 'Relevant Match', className: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' }
}

function pickImpactStat(stats: string[]): string | null {
  if (stats.length === 0) return null
  return stats.find((s) => s.includes('%')) ?? stats[0]
}

export default function OrgCard({ org }: OrgCardProps) {
  const relevance = deriveRelevanceTag(org)
  const impactStat = pickImpactStat(org.org_impact_stats)
  const sectorLabel = org.sector_tags[0] ?? org.sector
  const bodyText = org.blurb ?? org.reason

  return (
    <div className="bg-surface border border-border rounded-md p-5 flex flex-col gap-4">
      {/* Badges + title */}
      <div>
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${relevance.className}`}>
            {relevance.label}
          </span>
          {org.verified_badge && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800">
              ✓ {org.verified_badge}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-foreground leading-tight">{org.org_name}</h3>
      </div>

      {/* Sector pill */}
      <div className="flex flex-wrap gap-1.5">
        {org.sector_tags.length > 0
          ? org.sector_tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded bg-surface-subtle text-text-muted border border-border">
                {tag}
              </span>
            ))
          : (
              <span className="text-xs px-2 py-0.5 rounded bg-surface-subtle text-text-muted border border-border">
                {sectorLabel}
              </span>
            )
        }
      </div>

      {/* Body */}
      <p className="text-sm text-text-secondary leading-relaxed">
        {bodyText}
      </p>

      {/* Impact stat */}
      {impactStat && (
        <p className="text-xs text-text-secondary leading-relaxed border-l-2 border-border pl-3 italic">
          {impactStat}
        </p>
      )}

      {/* Donate — omitted when donate_url is not yet available */}
      {org.donate_url && (
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
      )}
    </div>
  )
}
