"use server";

import Anthropic from "@anthropic-ai/sdk";
import type { OrganizationRecommendation } from "@/app/actions/match_orgs";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { fetchFromHapi } from "@/lib/hapi/client";

const OPUS_MODEL: Anthropic.Model = "claude-opus-4-7";
const MAX_TOKENS = 4096;
const HAPI_LIMIT = 25;

const ISO3_RE = /^[A-Za-z]{3}$/;

export interface CountryStatisticsBundle {
  national_risk: unknown;
  conflict_events: unknown;
  food_security: unknown;
  poverty_rate: unknown;
}

export interface CountryIssuesSummaryResult {
  country_codes: string[];
  stats_by_country: Record<string, CountryStatisticsBundle>;
  description: string;
}

function normalizeIso3(value: string): string | null {
  const trimmed = value.trim().toUpperCase();
  if (!trimmed || !ISO3_RE.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function uniqueCountryCodesFromRecommendations(
  organizations: OrganizationRecommendation[],
): string[] {
  const set = new Set<string>();
  for (const org of organizations) {
    const code = normalizeIso3(org.country);
    if (code) {
      set.add(code);
    }
  }
  return [...set].sort();
}

async function fetchCountryStatistics(
  locationCode: string,
): Promise<CountryStatisticsBundle> {
  const [nationalRisk, conflictEvents, foodSecurity, povertyRate] =
    await Promise.all([
      fetchFromHapi("/api/v2/coordination-context/national-risk", {
        query: { location_code: locationCode, limit: HAPI_LIMIT },
      }),
      fetchFromHapi("/api/v2/coordination-context/conflict-events", {
        query: { location_code: locationCode, limit: HAPI_LIMIT },
      }),
      fetchFromHapi("/api/v2/food-security-nutrition-poverty/food-security", {
        query: { location_code: locationCode, limit: HAPI_LIMIT },
      }),
      fetchFromHapi("/api/v2/food-security-nutrition-poverty/poverty-rate", {
        query: { location_code: locationCode, limit: HAPI_LIMIT },
      }),
    ]);

  return {
    national_risk: nationalRisk,
    conflict_events: conflictEvents,
    food_security: foodSecurity,
    poverty_rate: povertyRate,
  };
}

export async function summarizeCountryIssuesFromOrganizations(
  organizations: OrganizationRecommendation[],
): Promise<CountryIssuesSummaryResult> {
  const countryCodes = uniqueCountryCodesFromRecommendations(organizations);

  if (countryCodes.length === 0) {
    return {
      country_codes: [],
      stats_by_country: {},
      description:
        "No single-country ISO codes were present in the organization recommendations (country was empty for multi-country entries), so no country-level HAPI statistics were fetched.",
    };
  }

  const statsEntries = await Promise.all(
    countryCodes.map(async (code) => {
      const stats = await fetchCountryStatistics(code);
      return [code, stats] as const;
    }),
  );

  const statsByCountry = Object.fromEntries(statsEntries);

  const client = getAnthropicClient();
  const prompt = [
    "You are a senior humanitarian analyst.",
    "You will receive:",
    "1) A list of recommended organizations (with sector and per-org country when single-country).",
    "2) For each ISO-3166 alpha-3 country code, JSON bundles from HDX HAPI: national risk, conflict events, food security (IPC), and poverty rate.",
    "",
    "Write an in-depth narrative describing the main humanitarian issues affecting these countries.",
    "Prioritize national risk (INFORM) as the framing lens, then weave in conflict, food security, and poverty where supported by the data.",
    "Be explicit when data is sparse or missing for a dimension.",
    "Do not invent numeric facts; only infer qualitative conclusions consistent with the provided records.",
    "",
    "ORGANIZATIONS_JSON:",
    JSON.stringify(organizations, null, 2),
    "",
    "STATS_BY_COUNTRY_JSON:",
    JSON.stringify(statsByCountry, null, 2),
  ].join("\n");

  const response = await client.messages.create({
    model: OPUS_MODEL,
    max_tokens: MAX_TOKENS,
    system:
      "Produce a clear, structured analysis suitable for a donor-facing briefing. Use headings and bullets where helpful.",
    messages: [{ role: "user", content: prompt }],
  });

  const description = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!description) {
    throw new Error("Anthropic returned no text for the country issues summary.");
  }

  return {
    country_codes: countryCodes,
    stats_by_country: statsByCountry,
    description,
  };
}
