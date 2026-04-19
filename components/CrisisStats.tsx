import { InterpreterOutput } from '@/lib/types'

interface CrisisStatsProps {
  data: InterpreterOutput
}

export default function CrisisStats({ data }: CrisisStatsProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm leading-relaxed text-text-secondary max-w-3xl">
        {data.severity_summary}
      </p>
      <p className="text-xs text-text-muted">
        Reported by UN OCHA / HDX HAPI
      </p>
    </div>
  )
}
