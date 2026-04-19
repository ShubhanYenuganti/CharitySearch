import type { PipelineInterpretation } from '@/lib/types'

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-surface border border-border rounded-md px-5 py-4">
      <div className="text-2xl font-semibold tracking-tight text-foreground">{value}</div>
      {sub && <div className="text-xs text-text-muted mt-0.5">{sub}</div>}
      <div className="text-xs text-text-muted mt-1 uppercase tracking-wide font-medium">{label}</div>
    </div>
  )
}

function formatPop(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

export default function CrisisContext({ data }: { data: PipelineInterpretation }) {
  const needsPop = (data.needs_data as Array<Record<string, unknown>>).reduce(
    (sum, n) => sum + (typeof n.population_in_phase === 'number' ? n.population_in_phase : 0),
    0,
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">{data.country_name}</span>
        <span className="text-text-muted">·</span>
        <span className="text-sm text-text-secondary capitalize">{data.issue}</span>
        <span className="text-text-muted">·</span>
        <span className="text-xs text-text-muted capitalize">{data.crisis_type}</span>
        {data.sectors.map((s) => (
          <span key={s} className="px-2 py-0.5 text-xs rounded-full border border-border text-text-secondary bg-surface-subtle">
            {s}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Active organizations" value={data.presence_count > 0 ? data.presence_count : 'N/A'} sub="HAPI 3W operational presence" />
        {needsPop > 0 && <StatCard label="People in need" value={formatPop(needsPop)} sub="Humanitarian needs data" />}
        <StatCard label="Location code" value={data.location_code} sub="ISO 3166 alpha-3" />
      </div>

      <p className="text-xs text-text-muted">Reported by UN OCHA / HDX HAPI</p>
    </div>
  )
}
