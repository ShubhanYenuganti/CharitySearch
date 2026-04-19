export interface HdxOperationalPresence {
  org_name: string
  org_acronym: string
  sector_name: string
  admin1_name: string
}

export interface InterpreterOutput {
  issue: string
  country_name: string
  location_code: string
  hdx_data: {
    humanitarian_needs: object[]
    national_risk: object | null
    conflict_events: object[]
    operational_presence: HdxOperationalPresence[]
  }
  severity_summary: string
  /** Set by the route handler when HDX HAPI was unreachable and cached data was used. */
  hapi_stale?: boolean
}

export interface OrgResult {
  name: string
  acronym: string
  description: string
  sector: string
  country: string
  evidence_quality: 'high' | 'medium' | 'low'
  donate_url: string
  recent_context: string
  source: 'givewell' | 'globalgiving' | 'operational_presence'
}

export interface ResearcherOutput {
  orgs: OrgResult[]
}

export type AgentStep =
  | 'idle'
  | 'interpreting'
  | 'researching'
  | 'narrating'
  | 'complete'
  | 'error'

export type PipelineError =
  | { stage: 'interpreter'; kind: 'bad_query';  message: string }
  | { stage: 'interpreter'; kind: 'hapi_down';  message: string }
  | { stage: 'researcher';  kind: 'failed';     message: string }
  | { stage: 'narrator';    kind: 'timeout';    message: string }
