import type { UnverifiedCandidate } from '@/lib/types'

export default function UnverifiedOrgCards({ candidates }: { candidates: UnverifiedCandidate[] }) {
  if (candidates.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {candidates.map((c) => (
        <div
          key={c.org}
          className="flex flex-col gap-3 bg-surface-subtle border border-border rounded-md p-5 h-full opacity-70"
        >
          <div className="flex items-start gap-2">
            <h3 className="text-sm font-semibold text-foreground leading-snug">{c.org}</h3>
          </div>

          <p className="text-xs text-text-muted leading-relaxed flex-1">{c.reason}</p>

          <p className="text-xs text-text-muted italic">
            Could not retrieve organization information.
          </p>
        </div>
      ))}
    </div>
  )
}
