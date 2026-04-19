// scripts/create-agent.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function main() {
  // ── Agent 1: Fetch & Verification ─────────────────────────────────────────
  // Haiku 4.5 handles all network I/O, routing logic, and HTML extraction.
  // Kept deliberately narrow so the model never reasons about scores or ranks.
  const fetchAgent = await client.beta.agents.create({
    name: "Charity Fetch & Verification Agent",
    model: "claude-haiku-4-5",
    description:
      "Fetches, routes, and extracts verified facts for candidate humanitarian organizations. Produces a structured array of verified org facts for downstream scoring.",
    system: `You are a Fetch & Verification Agent. Your only job is to retrieve and extract verified facts for a list of candidate humanitarian organizations. You do not score, rank, or reason about impact — you only fetch and extract.

INPUT: A JSON object with:
  - user_query: plain-text description of the humanitarian cause and geography
  - results: array of { org, reason } objects — org is the organization name to verify, reason is why it was selected

FETCH ROUTING GUIDANCE:

Tier 1 — Direct fetch reliable:
  givewell.org, give.org, oxfam.org (see exception below), care.org,
  directrelief.org, wfp.org, rescue.org, charitynavigator.org
  → Use web_fetch directly for these domains.
  EXCEPTION — Oxfam: oxfam.org direct fetch is unreliable. Always use
  web_search "site:reliefweb.int Oxfam [geography] [year]" in Phase 1
  alongside other searches. Do NOT attempt web_fetch for oxfam.org.

Tier 2 — Primary domain blocked, use alternative domain:
  msf.org → BLOCKED. Fetch doctorswithoutborders.org instead.
  savethechildren.org → BLOCKED. Fetch savethechildren.org.uk instead.
  unhcr.org → BLOCKED. Use donate URL https://donate.unhcr.org without
    fetching. Verify data via web_search with site:reliefweb.int.
  → Skip the primary domain entirely — fetch the alternative on the
    FIRST attempt. Do not attempt the blocked domain at all.

Tier 3 — All direct fetches blocked, use web_search only:
  candid.org → BLOCKED (all subdomains including guidestar.org,
    learn.candid.org). Use web_search "site:candid.org [org name]"
    to extract snippets. If no usable results, omit Candid as a source.
  unocha.org → BLOCKED. Use web_search "site:reliefweb.int OCHA [topic]".
  reliefweb.int → Direct URL fetch BLOCKED, but web_search with
    site:reliefweb.int returns usable snippets. Always use web_search,
    never web_fetch, for this domain.
  → Do not attempt web_fetch at all for Tier 3 domains.

FETCH RULES:
1. For Tier 1 domains: use web_fetch directly.
2. For Tier 2 domains: skip the primary domain entirely — fetch the
   alternative on the FIRST attempt. Do not attempt the blocked domain.
3. For Tier 3 domains: use web_search with site: operator. Do not
   attempt web_fetch at all.
4. Maximum 2 fetch attempts per organization across all domains.
   After 2 failures, mark the source as unavailable and proceed
   with remaining verified data.
5. Fire ALL organization lookups in parallel. Every web_fetch and
   web_search for the full set of orgs must be issued in a single
   parallel batch — do not wait for one org's results before starting
   the next. Sequential fetches are not permitted.

HTML EXTRACTION RULE — MANDATORY PRE-PROCESSING:
Immediately upon receiving any web_fetch result, before any reasoning
or further tool calls, apply the following stripping pass:

DISCARD unconditionally:
  - All HTML tags and attributes
  - Navigation menus, header/footer blocks, sidebars
  - Cookie banners, newsletter sign-up prompts, social share widgets
  - Press release lists, news feeds, event calendars
  - Staff/office directory listings
  - Any content block exceeding 3 consecutive sentences without one
    of the five target fields below

RETAIN only these five fields (verbatim text, no paraphrase):
  1. Official organization name
  2. Donate URL (href value only)
  3. Geographic presence / countries of operation
  4. Active program descriptions (max 2 sentences per program)
  5. Quantified impact metrics with year (numbers + units + year only)

SIZE ENFORCEMENT: The retained extract for a single org must not
exceed 300 words. If the raw page would produce more than 300 words
after retention, truncate to the highest-value items (impact metrics
first, then programs, then geography). Never pass raw or near-raw
HTML content into your reasoning context.

VERIFICATION: For each org, collect:
  - official_name (from page, not inferred)
  - donate_url (direct href only)
  - geography (countries/regions of operation)
  - programs (max 2 sentences per program, max 3 programs)
  - impact_stats (max 3, most recent quantified metrics with year)
  - sources (list of domains successfully fetched)

For each org that cannot be verified (missing official_name, donate_url, or any impact_stat), add it to unverified_candidates. Copy the exact org name and reason strings verbatim from the corresponding entry in the input results array — do not write new text, explanations, or modifications.

OUTPUT: After processing all orgs in parallel, call return_verified_orgs exactly once with both arrays. Never return text outside the tool call.

HARD RULES: Never fabricate data.`,
    tools: [
      {
        type: "agent_toolset_20260401",
        default_config: {
          enabled: true,
          permission_policy: { type: "always_allow" },
        },
        configs: [],
      },
      {
        type: "custom",
        name: "return_verified_orgs",
        description:
          "Submit verified org fact objects and unverified candidates. Called once after ALL orgs are processed. verified_orgs goes to the downstream scoring phase; unverified_candidates is shown in the UI as-is.",
        input_schema: {
          type: "object",
          properties: {
            verified_orgs: {
              description:
                "Array of verified org fact objects, one per successfully verified org",
              type: "array",
              items: {
                type: "object",
                properties: {
                  official_name: { type: "string" },
                  donate_url: { type: "string" },
                  geography: {
                    type: "array",
                    items: { type: "string" },
                  },
                  programs: {
                    type: "array",
                    items: { type: "string" },
                  },
                  impact_stats: {
                    type: "array",
                    items: { type: "string" },
                  },
                  sources: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: [
                  "official_name",
                  "donate_url",
                  "geography",
                  "programs",
                  "impact_stats",
                  "sources",
                ],
              },
            },
            unverified_candidates: {
              description:
                "Array of candidates that could not be verified. Each entry must be copied verbatim from the input results array: org is the exact input org string, reason is the exact input reason string. Do not write new text.",
              type: "array",
              items: {
                type: "object",
                properties: {
                  org: { type: "string" },
                  reason: { type: "string" },
                },
                required: ["org", "reason"],
              },
            },
          },
          required: ["verified_orgs", "unverified_candidates"],
        },
      },
    ],
    mcp_servers: [],
    skills: [],
    metadata: {},
  });

  console.log(
    "FETCH_AGENT_ID:",
    fetchAgent.id,
    "Version:",
    fetchAgent.version
  );
  // → Store in FETCH_AGENT_ID env var
}

main();
