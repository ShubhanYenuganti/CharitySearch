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

// ── Agent pipeline I/O ────────────────────────────────────────────────────────

/** One entry in the fetch agent's `results` array, derived from HAPI operational presence. */
export interface PipelineCandidate {
  org: string
  reason: string
}

/** A single org fact object returned by the fetch agent via `return_verified_orgs`. */
export interface VerifiedOrg {
  official_name: string
  donate_url: string
  geography: string[]
  programs: string[]
  impact_stats: string[]
  sources: string[]
  /** Set by the orchestration layer after matching against HAPI operational presence data. */
  found_in_hapi_operational_presence: boolean
  /** Passed through from the upstream `results[].reason` field. */
  upstream_reason?: string
  /** HAPI humanitarian needs stats slice for this org's geography, attached by the orchestration layer. */
  hapi_stats?: object[]
}

/** Input to the scoring phase (`messageAnthropic` call). */
export interface ScoringInput {
  user_query: string
  verified_orgs: VerifiedOrg[]
  constraints: {
    min_final_grade: number
    max_results: number
  }
}

/** One ranked org in the scoring output. */
export interface ScoredOrg {
  rank: number
  org_name: string
  donate_url: string
  verified_badge: string
  found_in_hapi_operational_presence: boolean
  alignment_score: number
  alignment_rationale: string
  impact_scope_score: number
  impact_rationale: string
  final_grade: number
  grade_label: string
  blurb: string
  hapi_stats: object[]
  org_impact_stats: string[]
  sources: string[]
  sector_tags: string[]
  geography_tags: string[]
  rating: string
}

/** Full output of the scoring phase. */
export interface ScoringOutput {
  organizations: ScoredOrg[]
  warning?: string
}
