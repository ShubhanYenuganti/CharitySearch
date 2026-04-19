import Anthropic from '@anthropic-ai/sdk'
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import { fetchFromHapi } from '@/lib/hapi/client'
import { queryMatchingOrganizations } from '@/app/actions/match_orgs'
import type { PipelineCandidate, VerifiedOrg, ScoringInput, ScoringOutput, ScoredOrg } from '@/lib/types'
import type { PipelineEvent } from '@/lib/pipeline/events'

// ── Constants ─────────────────────────────────────────────────────────────────

const SCORING_MODEL    = 'claude-sonnet-4-6'
const NARRATION_MODEL  = 'claude-sonnet-4-5'
const SCORING_MAX_TOKENS   = 4096
const NARRATION_MAX_TOKENS = 1024
const MIN_FINAL_GRADE = 4.0
const MAX_RESULTS     = 6

// ── JSON schemas ──────────────────────────────────────────────────────────────

const QUERY_INTERPRETATION_SCHEMA = {
  type: 'object' as const,
  properties: {
    issue:         { type: 'string' },
    country_name:  { type: 'string' },
    location_code: { type: 'string' },
    sectors:       { type: 'array', items: { type: 'string' } },
    crisis_type:   { type: 'string' },
  },
  required: ['issue', 'country_name', 'location_code', 'sectors', 'crisis_type'],
} as const

const SCORING_OUTPUT_SCHEMA = {
  type: 'object' as const,
  properties: {
    organizations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          rank:                               { type: 'number' },
          org_name:                           { type: 'string' },
          donate_url:                         { type: 'string' },
          verified_badge:                     { type: 'string' },
          found_in_hapi_operational_presence: { type: 'boolean' },
          alignment_score:                    { type: 'number' },
          alignment_rationale:                { type: 'string' },
          impact_scope_score:                 { type: 'number' },
          impact_rationale:                   { type: 'string' },
          final_grade:                        { type: 'number' },
          grade_label:                        { type: 'string' },
          blurb:                              { type: 'string' },
          hapi_stats:       { type: 'array', items: { type: 'object' } },
          org_impact_stats: { type: 'array', items: { type: 'string' } },
          sources:          { type: 'array', items: { type: 'string' } },
          sector_tags:      { type: 'array', items: { type: 'string' } },
          geography_tags:   { type: 'array', items: { type: 'string' } },
          rating:           { type: 'string' },
        },
        required: [
          'rank', 'org_name', 'donate_url', 'verified_badge',
          'found_in_hapi_operational_presence', 'alignment_score', 'alignment_rationale',
          'impact_scope_score', 'impact_rationale', 'final_grade', 'grade_label',
          'blurb', 'hapi_stats', 'org_impact_stats', 'sources',
          'sector_tags', 'geography_tags', 'rating',
        ],
      },
    },
    warning: { type: 'string' },
  },
  required: ['organizations'],
} as const

// ── Prompt builders ───────────────────────────────────────────────────────────

function buildScoringPrompt(input: ScoringInput): string {
  return `You are a humanitarian charity scoring agent. Produce a ranked donation recommendation list from the verified org facts below.

USER QUERY: "${input.user_query}"
CONSTRAINTS: min_final_grade=${input.constraints.min_final_grade}, max_results=${input.constraints.max_results}

VERIFIED ORGANIZATIONS:
${JSON.stringify(input.verified_orgs, null, 2)}

SCORING: For each org holistically assess:
1. Geographic relevance — confirmed operations in affected region
2. Program fit — direct match to crisis sectors in query
3. Operational scale — beneficiary volume and recency
4. Evidence quality — quantified, dated impact stats
5. Source credibility — Tier 1 allowlisted + HAPI presence

Assign: alignment_score (0–10), alignment_rationale (~10 words specific to org facts), impact_scope_score (0–10), impact_rationale (~10 words), final_grade (0–10, holistic — not a formula).

GRADE LABELS: 9–10 Exceptional | 7.5–8.9 Strong | 6–7.4 Good | 4–5.9 Adequate | <4 discard
VERIFIED_BADGE: "HAPI + Tier 1 Source" | "HAPI Verified" | "Source Verified"
FILTERING: include partial-evidence orgs with low score + noted uncertainty rather than silently discarding.
OUTPUT: rank, blurb (1–2 donor-facing sentences), hapi_stats (pass through), org_impact_stats (max 3), sector_tags, geography_tags, rating (e.g. "Strong (8.2)").`
}

function buildNarrationPrompt(
  query: string,
  issue: string,
  country_name: string,
  sectors: string[],
  organizations: ScoredOrg[],
): string {
  const top = organizations.slice(0, 3)
  return `You are a humanitarian donation advisor. Write a concise 3–4 paragraph markdown briefing for a donor.

QUERY: "${query}"
CRISIS: ${issue} in ${country_name} (sectors: ${sectors.join(', ')})

TOP ORGANIZATIONS:
${top.map((o, i) => `${i + 1}. ${o.org_name} (${o.rating}) — ${o.blurb}`).join('\n')}

DONATE LINKS:
${top.map((o) => `- [${o.org_name}](${o.donate_url})`).join('\n')}

Write:
1. 1–2 sentences on crisis severity and why donations matter now
2. Brief intro to top 1–2 orgs and what makes them the right fit
3. Direct, actionable donation recommendation

Use **bold** for org names. Be specific, not generic.`
}

// ── Fetch session runner ───────────────────────────────────────────────────────

async function* runFetchSession(
  client: Anthropic,
  agentId: string,
  environmentId: string,
  inputPayload: object,
): AsyncGenerator<PipelineEvent, unknown, unknown> {
  const activeToolCalls = new Map<string, { tool: string; url: string; startTime: number }>()
  let fetchOutput: unknown = null

  const session = await (client.beta.sessions as any).create({
    agent: agentId,
    environment_id: environmentId,
    title: 'Fetch Agent Run',
  })

  const stream = (client.beta.sessions as any).events.stream(session.id)

  await (client.beta.sessions as any).events.send(session.id, {
    events: [{ type: 'user.message', content: [{ type: 'text', text: JSON.stringify(inputPayload, null, 2) }] }],
  })

  for await (const event of await stream) {
    switch (event.type) {
      case 'agent.tool_use': {
        const toolName: string = (event as any).name ?? 'unknown'
        const input = (event as any).input ?? {}
        const url: string = input.url ?? input.query ?? toolName
        activeToolCalls.set(event.id, { tool: toolName, url, startTime: Date.now() })
        yield { type: 'tool_call', tool: toolName, url, id: event.id }
        break
      }
      case 'agent.tool_result': {
        const id: string = (event as any).tool_use_id ?? ''
        const active = activeToolCalls.get(id)
        if (active) {
          const duration_ms = Date.now() - active.startTime
          activeToolCalls.delete(id)
          yield { type: 'tool_result', tool: active.tool, url: active.url, duration_ms }
        }
        break
      }
      case 'agent.custom_tool_use': {
        const toolName: string = (event as any).name ?? 'unknown'
        if (toolName === 'return_verified_orgs') fetchOutput = (event as any).input
        await (client.beta.sessions as any).events.send(session.id, {
          events: [{ type: 'user.custom_tool_result', custom_tool_use_id: event.id, content: [{ type: 'text', text: 'received.' }] }],
        })
        break
      }
    }
    if (event.type === 'session.status_terminated') break
    if (event.type === 'session.status_idle' && (event as any).stop_reason?.type !== 'requires_action') break
  }

  await (client.beta.sessions as any).archive(session.id).catch(() => {})
  return fetchOutput
}

// ── Main pipeline generator ────────────────────────────────────────────────────

export async function* runPipeline(
  query: string,
  fetchAgentId: string,
): AsyncGenerator<PipelineEvent> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let currentStage = 'init'

  try {
    // ── Stage: matching ────────────────────────────────────────────────────────
    currentStage = 'matching'
    yield { type: 'stage', stage: 'matching' }

    const hapiEventBuffer: Array<{ tool: string; params: Record<string, unknown> }> = []
    const matchPromise = queryMatchingOrganizations(query, (e) => hapiEventBuffer.push(e))

    // Interpretation runs concurrently (fast) to extract location_code
    const interpResponse = await client.messages.parse({
      model: 'claude-sonnet-4-5',
      max_tokens: 256,
      messages: [{ role: 'user', content: `Extract structured info from this humanitarian donation query. Return JSON only.\n\nQuery: "${query}"` }],
      output_config: { format: jsonSchemaOutputFormat(QUERY_INTERPRETATION_SCHEMA) },
    })
    const interp = interpResponse.parsed_output as {
      issue: string; country_name: string; location_code: string; sectors: string[]; crisis_type: string
    }

    // ── Stage: enriching ───────────────────────────────────────────────────────
    currentStage = 'enriching'
    yield { type: 'stage', stage: 'enriching' }

    const [presenceResult, needsResult] = await Promise.allSettled([
      fetchFromHapi('/api/v2/coordination-context/operational-presence', { query: { location_code: interp.location_code } }),
      fetchFromHapi('/api/v2/affected-people/humanitarian-needs',        { query: { location_code: interp.location_code } }),
    ])

    const presenceData = presenceResult.status === 'fulfilled' ? (presenceResult.value.data ?? []) : []
    const needsData    = needsResult.status    === 'fulfilled' ? (needsResult.value.data    ?? []) : []

    if (presenceResult.status === 'rejected')
      yield { type: 'hapi_warning', endpoint: 'operational-presence', message: String((presenceResult as any).reason?.message ?? presenceResult.reason) }
    if (needsResult.status === 'rejected')
      yield { type: 'hapi_warning', endpoint: 'humanitarian-needs',   message: String((needsResult as any).reason?.message    ?? needsResult.reason) }

    yield {
      type: 'interpretation',
      country_name:   interp.country_name,
      location_code:  interp.location_code,
      issue:          interp.issue,
      sectors:        interp.sectors,
      crisis_type:    interp.crisis_type,
      presence_count: presenceData.length,
      needs_data:     (needsData as object[]).slice(0, 10),
    }

    // Await match_orgs, then flush buffered HAPI events
    const orgMatches = await matchPromise
    for (const e of hapiEventBuffer) yield { type: 'hapi_query', tool: e.tool, params: e.params }
    yield { type: 'hapi_result', tool: 'match_orgs', count: orgMatches.length }

    if (orgMatches.length === 0) {
      yield { type: 'error', message: 'No candidate organizations found for this query.', stage: 'matching' }
      return
    }

    const candidates: PipelineCandidate[] = orgMatches.map(({ org_name, reason }) => ({ org: org_name, reason }))
    yield { type: 'candidates', count: candidates.length, orgs: candidates }

    // HAPI org name lookup for found_in_hapi matching
    const hapiOrgNames = new Set<string>(
      (presenceData as any[]).flatMap((e) => [
        (e.org_name ?? '').toLowerCase(),
        (e.org_acronym ?? '').toLowerCase(),
      ]).filter(Boolean)
    )

    // ── Stage: fetching ────────────────────────────────────────────────────────
    currentStage = 'fetching'
    yield { type: 'stage', stage: 'fetching' }

    const environment = await (client.beta.environments as any).create({
      name: `charity-pipeline-${Date.now()}`,
      config: { type: 'cloud', networking: { type: 'unrestricted' } },
    })

    let fetchOutput: unknown = null
    const fetchGen = runFetchSession(client, fetchAgentId, environment.id, { user_query: query, results: candidates })
    let fetchNext = await fetchGen.next()
    while (!fetchNext.done) {
      yield fetchNext.value as PipelineEvent
      fetchNext = await fetchGen.next()
    }
    fetchOutput = fetchNext.value

    await (client.beta.environments as any).delete(environment.id).catch(() => {})

    const rawVerifiedOrgs: unknown[] = (fetchOutput as any)?.verified_orgs ?? []
    if (rawVerifiedOrgs.length === 0) {
      yield { type: 'error', message: 'Fetch agent returned no verified organizations.', stage: 'fetching' }
      return
    }

    // Enrich: found_in_hapi + hapi_stats
    const verifiedOrgs: VerifiedOrg[] = rawVerifiedOrgs.map((raw) => {
      const org = raw as VerifiedOrg
      const nameKey = (org.official_name ?? '').toLowerCase()
      const found_in_hapi_operational_presence =
        hapiOrgNames.has(nameKey) ||
        Array.from(hapiOrgNames).some((n) => n && nameKey && (n.includes(nameKey) || nameKey.includes(n)))

      const orgGeos = new Set((org.geography ?? []).map((g: string) => g.toLowerCase()))
      const hapi_stats = (needsData as any[])
        .filter((n) => {
          const loc = (n.location_name ?? '').toLowerCase()
          return Array.from(orgGeos).some((g) => loc.includes(g as string) || (g as string).includes(loc))
        })
        .slice(0, 5)

      const candidate = candidates.find((c) => c.org.toLowerCase() === nameKey)
      return { ...org, found_in_hapi_operational_presence, hapi_stats, upstream_reason: candidate?.reason }
    })

    yield { type: 'verified', count: verifiedOrgs.length, org_names: verifiedOrgs.map((o) => o.official_name) }

    // ── Stage: scoring ─────────────────────────────────────────────────────────
    currentStage = 'scoring'
    yield { type: 'stage', stage: 'scoring' }

    const scoringResponse = await client.messages.parse({
      model: SCORING_MODEL as Anthropic.Model,
      max_tokens: SCORING_MAX_TOKENS,
      messages: [{ role: 'user', content: buildScoringPrompt({ user_query: query, verified_orgs: verifiedOrgs, constraints: { min_final_grade: MIN_FINAL_GRADE, max_results: MAX_RESULTS } }) }],
      output_config: { format: jsonSchemaOutputFormat(SCORING_OUTPUT_SCHEMA) },
    })
    const scoringResult = scoringResponse.parsed_output as ScoringOutput
    const organizations: ScoredOrg[] = scoringResult.organizations ?? []

    yield { type: 'scored', organizations }

    // ── Stage: narrating ───────────────────────────────────────────────────────
    currentStage = 'narrating'
    yield { type: 'stage', stage: 'narrating' }

    const narrationStream = client.messages.stream({
      model: NARRATION_MODEL as Anthropic.Model,
      max_tokens: NARRATION_MAX_TOKENS,
      messages: [{ role: 'user', content: buildNarrationPrompt(query, interp.issue, interp.country_name, interp.sectors, organizations) }],
    })

    for await (const chunk of narrationStream) {
      if (chunk.type === 'content_block_delta' && (chunk as any).delta?.type === 'text_delta') {
        yield { type: 'narration_chunk', text: (chunk as any).delta.text }
      }
    }

    yield { type: 'done' }

  } catch (err) {
    yield { type: 'error', message: err instanceof Error ? err.message : String(err), stage: currentStage }
  }
}
