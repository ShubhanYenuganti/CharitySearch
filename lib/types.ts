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
