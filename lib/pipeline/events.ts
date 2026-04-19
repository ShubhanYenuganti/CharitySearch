import type { PipelineCandidate, ScoredOrg } from '@/lib/types'

export type PipelineEvent =
  | { type: 'stage';           stage: 'matching' | 'enriching' | 'fetching' | 'scoring' | 'narrating' }
  | { type: 'hapi_query';      tool: string; params: Record<string, unknown> }
  | { type: 'hapi_result';     tool: string; count: number }
  | { type: 'hapi_warning';    endpoint: string; message: string }
  | { type: 'interpretation';  country_name: string; location_code: string; issue: string; sectors: string[]; crisis_type: string; presence_count: number; needs_data: object[] }
  | { type: 'candidates';      count: number; orgs: PipelineCandidate[] }
  | { type: 'tool_call';       tool: string; url: string; id: string }
  | { type: 'tool_result';     tool: string; url: string; duration_ms: number }
  | { type: 'verified';        count: number; org_names: string[] }
  | { type: 'scored';          organizations: ScoredOrg[] }
  | { type: 'narration_chunk'; text: string }
  | { type: 'done' }
  | { type: 'error';           message: string; stage: string }

export interface LogEntry {
  id: string
  elapsed_ms: number
  event: PipelineEvent
}

export type EventPrefix = '◌' | '→' | '⇡' | '✓' | '!'

export function eventToPrefix(event: PipelineEvent): EventPrefix {
  switch (event.type) {
    case 'stage':          return '◌'
    case 'hapi_query':     return '→'
    case 'hapi_result':    return '✓'
    case 'hapi_warning':   return '!'
    case 'interpretation': return '◌'
    case 'candidates':     return '✓'
    case 'tool_call':      return '⇡'
    case 'tool_result':    return '✓'
    case 'verified':       return '✓'
    case 'scored':         return '✓'
    case 'error':          return '!'
    default:               return '◌'
  }
}

export function eventToLogMessage(event: PipelineEvent): string | null {
  switch (event.type) {
    case 'stage':
      return ({
        matching:  'Matching organizations against HAPI data…',
        enriching: 'Fetching HAPI enrichment data…',
        fetching:  'Verifying organizations against web sources…',
        scoring:   'Scoring and ranking organizations…',
        narrating: 'Writing analysis report…',
      } as Record<string, string>)[event.stage] ?? null
    case 'hapi_query': {
      const p = event.params
      const parts = [event.tool.replace('query_', '')]
      if (p.location_code) parts.push(String(p.location_code))
      if (p.sector_code)   parts.push(String(p.sector_code))
      if (p.ipc_phase)     parts.push(`phase:${p.ipc_phase}`)
      if (p.event_type)    parts.push(String(p.event_type))
      return `HAPI: ${parts.join('  ')}`
    }
    case 'hapi_result':
      return `HAPI: ${event.tool.replace('query_', '')} → ${event.count} result(s)`
    case 'hapi_warning':
      return `HAPI ${event.endpoint} unavailable`
    case 'interpretation':
      return `Interpreted: ${event.country_name} (${event.location_code}) — ${event.issue} [${event.sectors.join(', ')}]`
    case 'candidates':
      return `${event.count} candidate(s) selected for verification`
    case 'tool_call':
      return `${event.tool}  ${event.url}`
    case 'tool_result':
      return `${event.tool}  ${event.url}  ${event.duration_ms}ms`
    case 'verified':
      return `${event.count} org(s) verified: ${event.org_names.join(', ')}`
    case 'scored':
      return `Scored: ${event.organizations.map((o) => o.org_name).join(', ')}`
    case 'error':
      return `Error (${event.stage}): ${event.message}`
    case 'narration_chunk':
    case 'done':
      return null
  }
}
