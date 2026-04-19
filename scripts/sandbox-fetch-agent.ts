// scripts/sandbox-fetch-agent.ts

// Load .env.local before any other imports use process.env
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const envPath = resolve(__dirname, "../.env.local");
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
} catch { /* .env.local not present — rely on shell env */ }

import Anthropic from "@anthropic-ai/sdk";
import { fetchFromHapi } from "../lib/hapi/client.js";
import { getAnthropicClient } from "../lib/anthropic/client.js";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { queryMatchingOrganizations } from "../app/actions/match_orgs.js";
import type {
  PipelineCandidate,
  VerifiedOrg,
  ScoringInput,
  ScoringOutput,
  ScoredOrg,
} from "../lib/types.js";

// ── Config ────────────────────────────────────────────────────────────────────

const FETCH_AGENT_ID = process.env.FETCH_AGENT_ID;
if (!FETCH_AGENT_ID) {
  throw new Error("FETCH_AGENT_ID env var not set. Run scripts/create-agent.ts first.");
}

// Edit USER_QUERY to test different scenarios — location_code is derived automatically
const USER_QUERY = "donate to help refugees in Sudan — shelter and food assistance";
const MIN_FINAL_GRADE = 4.0;
const MAX_RESULTS = 6;
const SCORING_MODEL = "claude-sonnet-4-6";
const SCORING_MAX_TOKENS = 4096;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ToolCallEntry {
  agent: "fetch";
  tool: string;
  timestamp: number;
  duration?: number;
}

interface QueryInterpretation {
  issue: string;
  country_name: string;
  location_code: string;
  sectors: string[];
  crisis_type: string;
}

const QUERY_INTERPRETATION_SCHEMA = {
  type: "object" as const,
  properties: {
    issue:        { type: "string", description: "Primary humanitarian issue (e.g. displacement, food insecurity, health)" },
    country_name: { type: "string", description: "Full country name" },
    location_code: { type: "string", description: "ISO 3166 alpha-3 country code (e.g. SDN, SSD, UKR)" },
    sectors:      { type: "array", items: { type: "string" }, description: "Relevant humanitarian sectors (e.g. shelter, food, health, education)" },
    crisis_type:  { type: "string", description: "Type of crisis (e.g. displacement, conflict, natural disaster, famine)" },
  },
  required: ["issue", "country_name", "location_code", "sectors", "crisis_type"],
} as const;

// ── Generic session runner ────────────────────────────────────────────────────
// Opens a stream, sends a user message, and processes all events until the
// session terminates or reaches a clean idle. Returns whatever the custom
// output tool captured, plus per-tool timing.

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function runFetchSession(
  agentId: string,
  environmentId: string,
  inputPayload: object,
  elapsed: () => string
): Promise<{ output: unknown; toolCallLog: ToolCallEntry[] }> {
  const toolCallLog: ToolCallEntry[] = [];
  const activeToolCalls = new Map<string, { tool: string; startTime: number }>();
  let output: unknown = null;

  const session = await (client.beta.sessions as any).create({
    agent: agentId,
    environment_id: environmentId,
    title: "Fetch Agent Run",
  });
  console.log(`[${elapsed()}s] [fetch] Session: ${session.id}`);

  // Open stream BEFORE sending the message
  const stream = (client.beta.sessions as any).events.stream(session.id);

  await (client.beta.sessions as any).events.send(session.id, {
    events: [
      {
        type: "user.message",
        content: [{ type: "text", text: JSON.stringify(inputPayload, null, 2) }],
      },
    ],
  });
  console.log(`[${elapsed()}s] [fetch] Input sent.\n`);

  for await (const event of await stream) {
    const t = elapsed();
    const label = `[${t}s] [fetch]`;

    switch (event.type) {
      case "agent.tool_use": {
        const toolName = (event as any).name ?? "unknown";
        console.log(`${label} → ${toolName} (${event.id})`);
        activeToolCalls.set(event.id, { tool: toolName, startTime: Date.now() });
        break;
      }

      case "agent.tool_result": {
        const toolUseId = (event as any).tool_use_id ?? "";
        const active = activeToolCalls.get(toolUseId);
        if (active) {
          const duration = Date.now() - active.startTime;
          toolCallLog.push({ agent: "fetch", tool: active.tool, timestamp: active.startTime, duration });
          activeToolCalls.delete(toolUseId);
          console.log(`${label} ✓ ${active.tool} (${duration}ms)`);
        }
        break;
      }

      case "agent.custom_tool_use": {
        const toolName = (event as any).name ?? "unknown";
        console.log(`${label} → custom: ${toolName} (${event.id})`);

        if (toolName === "return_verified_orgs") {
          output = (event as any).input;
          const count = ((output as any)?.verified_orgs ?? []).length;
          console.log(`${label}   └─ return_verified_orgs → ${count} org(s)`);
        }

        // Always respond to unblock the agent
        await (client.beta.sessions as any).events.send(session.id, {
          events: [
            {
              type: "user.custom_tool_result",
              custom_tool_use_id: event.id,
              content: [{ type: "text", text: "return_verified_orgs received." }],
            },
          ],
        });
        break;
      }

      case "agent.message": {
        for (const block of (event as any).content ?? []) {
          if (block.type === "text" && block.text?.trim()) {
            console.log(`${label} ${block.text.slice(0, 200)}`);
          }
        }
        break;
      }

      case "session.error":
        console.error(`${label} Error:`, event);
        break;

      case "session.status_terminated":
        console.log(`${label} Session terminated.`);
        break;
    }

    if (event.type === "session.status_terminated") break;
    if (event.type === "session.status_idle") {
      if ((event as any).stop_reason?.type !== "requires_action") break;
    }
  }

  await (client.beta.sessions as any).archive(session.id).catch(() => {});
  return { output, toolCallLog };
}

// ── Scoring prompt builder ────────────────────────────────────────────────────

function buildScoringPrompt(input: ScoringInput): string {
  return `You are a humanitarian charity scoring agent. You receive pre-verified facts about humanitarian organizations and produce a ranked donation recommendation list.

USER QUERY: "${input.user_query}"

CONSTRAINTS:
- min_final_grade: ${input.constraints.min_final_grade}
- max_results: ${input.constraints.max_results}

VERIFIED ORGANIZATIONS:
${JSON.stringify(input.verified_orgs, null, 2)}

SCORING INSTRUCTIONS:
For each organization, holistically assess across these principles:
  1. Geographic relevance — does the org actively operate in the affected region?
  2. Program fit — do the org's programs directly address the crisis type and sectors in the query?
  3. Operational scale — what is the breadth and recency of the org's beneficiary reach?
  4. Evidence quality — how recent, quantified, and credible are the impact stats?
  5. Source credibility — Tier 1 allowlisted source + HAPI presence = highest credibility

Assign:
  - alignment_score (0–10): geographic + program relevance to the query
  - alignment_rationale: ~10 words, specific to this org's geography and sector match
  - impact_scope_score (0–10): operational scale, beneficiary volume, recency of evidence
  - impact_rationale: ~10 words, specific to this org's impact stats and scale
  - final_grade (0–10): your holistic overall assessment — this is NOT a formula result.
    It may be higher or lower than a simple weighted average when operational credibility,
    contextual fit, or unusual circumstances warrant. Use your judgment.

GRADE LABELS (apply to final_grade):
  9.0–10.0 → "Exceptional"
  7.5–8.9  → "Strong"
  6.0–7.4  → "Good"
  4.0–5.9  → "Adequate"
  < 4.0    → discard (omit from output)

CREDIBILITY INDICATORS for verified_badge:
  - "HAPI + Tier 1 Source" if found_in_hapi_operational_presence is true AND sources includes a Tier 1 domain
  - "HAPI Verified" if found_in_hapi_operational_presence is true only
  - "Source Verified" if sources is non-empty but found_in_hapi_operational_presence is false
  - "Unverified" — should not appear; these orgs should have been discarded upstream

FILTERING:
  - Discard orgs with final_grade < ${input.constraints.min_final_grade}
  - When evidence is partial but credible, INCLUDE the org with a lower score and note the
    uncertainty in impact_rationale (e.g., "Limited 2024 data; presence confirmed via reliefweb")
  - Silent discard is only appropriate for orgs with no verifiable facts at all

OUTPUT:
  - Rank orgs by final_grade descending (rank 1 = highest)
  - Include at most ${input.constraints.max_results} orgs
  - For each org, write a blurb: 1–2 sentence plain-English donor-facing summary explaining
    why this org is recommended for this specific query
  - hapi_stats: pass through the org's hapi_stats field unmodified
  - org_impact_stats: select the most relevant 3 impact stats from impact_stats
  - sector_tags: array of sector strings derived from programs
  - geography_tags: array of geography strings derived from org geography
  - rating: human-readable string combining grade_label and final_grade (e.g., "Strong (8.2)")
  - If fewer than 3 orgs qualify, include a "warning" string in the output

RATIONALE RULES:
  - alignment_rationale and impact_rationale MUST be specific — reference actual org facts
  - Do NOT write generic phrases like "good match", "relevant organization", "strong presence"
  - Each rationale should name specific geography, sector, year, or metric

Score all qualifying organizations now and call the output tool once with the complete array.`;
}

// ── Scoring JSON schema ───────────────────────────────────────────────────────

const SCORING_OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    organizations: {
      type: "array",
      description: "Ranked array of scored org objects",
      items: {
        type: "object",
        properties: {
          rank:                          { type: "number" },
          org_name:                      { type: "string" },
          donate_url:                    { type: "string" },
          verified_badge:                { type: "string" },
          found_in_hapi_operational_presence: { type: "boolean" },
          alignment_score:               { type: "number" },
          alignment_rationale:           { type: "string" },
          impact_scope_score:            { type: "number" },
          impact_rationale:              { type: "string" },
          final_grade:                   { type: "number" },
          grade_label:                   { type: "string" },
          blurb:                         { type: "string" },
          hapi_stats:                    { type: "array", items: { type: "object" } },
          org_impact_stats:              { type: "array", items: { type: "string" } },
          sources:                       { type: "array", items: { type: "string" } },
          sector_tags:                   { type: "array", items: { type: "string" } },
          geography_tags:                { type: "array", items: { type: "string" } },
          rating:                        { type: "string" },
        },
        required: [
          "rank", "org_name", "donate_url", "verified_badge",
          "found_in_hapi_operational_presence", "alignment_score",
          "alignment_rationale", "impact_scope_score", "impact_rationale",
          "final_grade", "grade_label", "blurb", "hapi_stats",
          "org_impact_stats", "sources", "sector_tags", "geography_tags", "rating",
        ],
      },
    },
    warning: { type: "string" },
  },
  required: ["organizations"],
} as const;

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  const elapsed = () => ((Date.now() - startTime) / 1000).toFixed(1);

  const anthropic = getAnthropicClient();

  // ── Step 0a: Start org-matching and query interpretation in parallel ────────
  // queryMatchingOrganizations runs a multi-turn HAPI tool-calling loop and
  // returns [{ org_name, reason }] — this is the authoritative candidate list.
  // Interpretation runs concurrently (fast) to extract location_code, which
  // is needed for enrichment HAPI calls.
  console.log(`[${elapsed()}s] Starting org matching + query interpretation in parallel...`);

  const matchPromise = queryMatchingOrganizations(USER_QUERY);
  const interpResponse = await anthropic.messages.parse({
    model: "claude-sonnet-4-5",
    max_tokens: 256,
    messages: [{ role: "user", content:
      `You are a humanitarian query interpreter. Extract structured information from the following donation query.\nReturn only the JSON object — no explanation.\n\nQuery: "${USER_QUERY}"` }],
    output_config: { format: jsonSchemaOutputFormat(QUERY_INTERPRETATION_SCHEMA) },
  });
  const interpretation = interpResponse.parsed_output as QueryInterpretation;

  const LOCATION_CODE = interpretation.location_code;
  console.log(`[${elapsed()}s] Interpreted: ${interpretation.country_name} (${LOCATION_CODE}) — ${interpretation.issue} [${interpretation.sectors.join(", ")}]`);

  // ── Step 0b: Fetch HAPI enrichment data while match_orgs is still running ──
  // Operational presence → found_in_hapi_operational_presence matching
  // Humanitarian needs   → hapi_stats per org
  console.log(`[${elapsed()}s] Fetching HAPI enrichment data for ${LOCATION_CODE}...`);

  const [presenceResult, needsResult] = await Promise.allSettled([
    fetchFromHapi("/api/v2/coordination-context/operational-presence", {
      query: { location_code: LOCATION_CODE },
    }),
    fetchFromHapi("/api/v2/affected-people/humanitarian-needs", {
      query: { location_code: LOCATION_CODE },
    }),
  ]);

  const presenceData = presenceResult.status === "fulfilled" ? (presenceResult.value.data ?? []) : [];
  const needsData    = needsResult.status    === "fulfilled" ? (needsResult.value.data    ?? []) : [];

  if (presenceResult.status === "rejected") console.warn(`[${elapsed()}s] HAPI operational-presence unavailable: ${presenceResult.reason?.message ?? presenceResult.reason}`);
  if (needsResult.status    === "rejected") console.warn(`[${elapsed()}s] HAPI humanitarian-needs unavailable: ${needsResult.reason?.message    ?? needsResult.reason}`);

  console.log(
    `[${elapsed()}s] HAPI enrichment: ${presenceData.length} operational presence entries, ${needsData.length} humanitarian needs entries`
  );

  // ── Step 0c: Await org matching result ────────────────────────────────────
  const orgMatches = await matchPromise;
  console.log(`[${elapsed()}s] Org matching complete — ${orgMatches.length} candidate(s) returned\n`);

  if (orgMatches.length === 0) {
    throw new Error("queryMatchingOrganizations returned no candidates. Aborting.");
  }

  // Map OrganizationRecommendation → PipelineCandidate (org_name → org)
  const candidates: PipelineCandidate[] = orgMatches.map(({ org_name, reason }) => ({
    org: org_name,
    reason,
  }));

  // ── Build HAPI org name lookup for found_in_hapi matching ─────────────────
  const hapiOrgNames = new Set<string>(
    presenceData.flatMap((e) => [
      (e.org_name ?? "").toLowerCase(),
      (e.org_acronym ?? "").toLowerCase(),
    ]).filter(Boolean)
  );

  // ── Phase 1: Fetch & Verification ──────────────────────────────────────────
  console.log("=".repeat(60));
  console.log("PHASE 1 — Fetch & Verification Agent");
  console.log("=".repeat(60));

  const environment = await (client.beta.environments as any).create({
    name: `charity-sandbox-${Date.now()}`,
    config: { type: "cloud", networking: { type: "unrestricted" } },
  });
  console.log(`[${elapsed()}s] Environment: ${environment.id}\n`);

  const fetchInput = {
    user_query: USER_QUERY,
    results: candidates,
  };

  const fetchPhaseStart = Date.now();
  const { output: fetchOutput, toolCallLog: fetchToolLog } = await runFetchSession(
    FETCH_AGENT_ID!,
    environment.id,
    fetchInput,
    elapsed
  );
  const fetchPhaseMs = Date.now() - fetchPhaseStart;

  await (client.beta.environments as any).delete(environment.id).catch(() => {});

  const rawVerifiedOrgs: unknown[] = (fetchOutput as any)?.verified_orgs ?? [];
  console.log(
    `\n[${elapsed()}s] Phase 1 complete — ${rawVerifiedOrgs.length} org(s) verified (${(fetchPhaseMs / 1000).toFixed(2)}s)\n`
  );

  if (rawVerifiedOrgs.length === 0) {
    console.error("No verified orgs returned by fetch agent. Aborting.");
    process.exit(1);
  }

  // ── Enrich verified orgs: set found_in_hapi and attach hapi_stats ──────────
  const verifiedOrgs: VerifiedOrg[] = rawVerifiedOrgs.map((raw) => {
    const org = raw as VerifiedOrg;

    // Match against HAPI operational presence (case-insensitive on name or acronym)
    const nameKey = (org.official_name ?? "").toLowerCase();
    const found_in_hapi_operational_presence = hapiOrgNames.has(nameKey) ||
      // also try matching individual words for partial acronym matches
      Array.from(hapiOrgNames).some(
        (n) => n && nameKey && (n.includes(nameKey) || nameKey.includes(n))
      );

    // Attach relevant HAPI humanitarian needs stats for this org's geography
    const orgGeographies = new Set(
      (org.geography ?? []).map((g: string) => g.toLowerCase())
    );
    const hapi_stats = needsData
      .filter((n) => {
        const loc = (n.location_name ?? "").toLowerCase();
        return Array.from(orgGeographies).some((g) => loc.includes(g) || g.includes(loc));
      })
      .slice(0, 5); // cap at 5 entries

    // Pass through upstream_reason from candidates
    const candidate = candidates.find(
      (c) => c.org.toLowerCase() === (org.official_name ?? "").toLowerCase()
    );

    return {
      ...org,
      found_in_hapi_operational_presence,
      hapi_stats,
      upstream_reason: candidate?.reason,
    };
  });

  // ── Phase 2: Scoring via messageAnthropic ──────────────────────────────────
  console.log("=".repeat(60));
  console.log("PHASE 2 — Scoring & Ranking (messageAnthropic)");
  console.log("=".repeat(60));

  const scoringInput: ScoringInput = {
    user_query: USER_QUERY,
    verified_orgs: verifiedOrgs,
    constraints: {
      min_final_grade: MIN_FINAL_GRADE,
      max_results: MAX_RESULTS,
    },
  };

  const scoringPhaseStart = Date.now();
  const scoringResponse = await anthropic.messages.parse({
    model: SCORING_MODEL as Anthropic.Model,
    max_tokens: SCORING_MAX_TOKENS,
    messages: [{ role: "user", content: buildScoringPrompt(scoringInput) }],
    output_config: { format: jsonSchemaOutputFormat(SCORING_OUTPUT_SCHEMA) },
  });
  const scoringResult = scoringResponse.parsed_output as ScoringOutput;
  const scoringPhaseMs = Date.now() - scoringPhaseStart;

  const rankedOrgs: ScoredOrg[] = scoringResult.organizations ?? [];
  console.log(
    `\n[${elapsed()}s] Phase 2 complete — ${rankedOrgs.length} ranked org(s) (${(scoringPhaseMs / 1000).toFixed(2)}s)\n`
  );

  // ── Final report ───────────────────────────────────────────────────────────
  const totalMs = Date.now() - startTime;

  console.log("=".repeat(60));
  console.log("RESULTS");
  console.log("=".repeat(60));
  console.log(`Total runtime:          ${(totalMs / 1000).toFixed(2)}s`);
  console.log(`  HAPI fetch:           (included in setup)`);
  console.log(`  Phase 1 (fetch):      ${(fetchPhaseMs / 1000).toFixed(2)}s`);
  console.log(`  Phase 2 (score):      ${(scoringPhaseMs / 1000).toFixed(2)}s`);

  console.log(`\nFetch tool calls (${fetchToolLog.length} total):`);
  fetchToolLog.forEach((entry, i) =>
    console.log(`  ${i + 1}. ${entry.tool.padEnd(24)} ${entry.duration}ms`)
  );

  console.log(`\nRanked recommendations (${rankedOrgs.length}):`);
  console.log(JSON.stringify(rankedOrgs, null, 2));

  if (scoringResult.warning) {
    console.warn(`\nWarning from scoring: ${scoringResult.warning}`);
  }
}

main().catch(console.error);
