import { InterpreterOutput } from '@/lib/types'

interface CrisisStatsProps {
  data: InterpreterOutput
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  tooltip?: string
}

function StatCard({ label, value, sub, tooltip }: StatCardProps) {
  return (
    <div className="relative group bg-surface border border-border rounded-md px-5 py-4">
      <div className="text-2xl font-semibold tracking-tight text-foreground">
        {value}
        {tooltip && (
          <span className="inline-flex items-center justify-center w-4 h-4 ml-1.5 mb-0.5 rounded-full border border-border text-[10px] text-text-muted align-middle cursor-default select-none leading-none">
            ?
          </span>
        )}
      </div>
      {sub && (
        <div className="text-xs text-text-muted mt-0.5">{sub}</div>
      )}
      <div className="text-xs text-text-muted mt-1 uppercase tracking-wide font-medium">
        {label}
      </div>

      {tooltip && (
        <div
          role="tooltip"
          className="
            pointer-events-none absolute z-10 bottom-full left-0 mb-2
            w-64 rounded-md border border-border bg-surface shadow-md
            px-3 py-2.5 text-xs text-text-secondary leading-relaxed
            opacity-0 group-hover:opacity-100
            transition-opacity duration-150
          "
        >
          {tooltip}
        </div>
      )}
    </div>
  )
}

function formatPopulation(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

export default function CrisisStats({ data }: CrisisStatsProps) {
  const nationalRisk = data.hdx_data.national_risk as Record<string, unknown> | null

  const overallRisk =
    nationalRisk && typeof nationalRisk.overall_risk === 'number'
      ? nationalRisk.overall_risk.toFixed(1)
      : 'N/A'

  const needsPopulation = (data.hdx_data.humanitarian_needs as Record<string, unknown>[])
    .filter(
      (n) =>
        typeof n.sector_name === 'string' &&
        n.sector_name.toLowerCase().includes(data.issue.toLowerCase())
    )
    .reduce((sum, n) => sum + (typeof n.population === 'number' ? n.population : 0), 0)

  const conflictCount = (data.hdx_data.conflict_events as Record<string, unknown>[]).reduce(
    (sum, e) => sum + (typeof e.events === 'number' ? e.events : 0),
    0
  )

  const orgCount = data.hdx_data.operational_presence.length

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Severity score"
          value={overallRisk !== 'N/A' ? `${overallRisk} / 10` : 'N/A'}
          sub="National risk index"
          tooltip="This is the UN OCHA Inform Risk Index — a composite measure of a country's vulnerability to humanitarian crisis, based on hazard exposure, societal fragility, and coping capacity. It is not a ranking of how severe one crisis is compared to another."
        />
        <StatCard
          label="People in need"
          value={needsPopulation > 0 ? formatPopulation(needsPopulation) : 'N/A'}
          sub={`${data.issue} sector`}
        />
        <StatCard
          label="Conflict events"
          value={conflictCount > 0 ? conflictCount.toLocaleString() : 'N/A'}
          sub="Recorded incidents"
        />
        <StatCard
          label="Active organizations"
          value={orgCount > 0 ? orgCount : 'N/A'}
          sub="Operational presence"
        />
      </div>

      <p className="text-sm leading-relaxed text-text-secondary max-w-3xl">
        {data.severity_summary}
      </p>

      <p className="text-xs text-text-muted">
        Reported by UN OCHA / HDX HAPI
      </p>
    </div>
  )
}
