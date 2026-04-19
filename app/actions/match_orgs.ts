"use server";

import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { fetchFromHapi } from "@/lib/hapi/client";
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema.mjs';

const MAX_TOOL_ROUNDS = 8;
const DEFAULT_MODEL: Anthropic.Model = "claude-sonnet-4-5";
const DEFAULT_MAX_TOKENS = 1200;
const DEFAULT_LIMIT = 15;

const POPULATION_GROUP_PAIRS = [
  ["REF", "Refugees"],
  ["ROC", "People in a refugee-like situation"],
  ["ASY", "Asylum seekers"],
  ["OIP", "Other people in need of international protection"],
  ["IDP", "Internally displaced persons"],
  ["IOC", "People in IDP-like situation"],
  ["STA", "Stateless people"],
  ["OOC", "Others of concern"],
  ["HST", "Host community"],
  ["RET", "Returned refugees"],
  ["RST", "Resettled refugees"],
  ["NAT", "Naturalized refugees"],
  ["RDP", "Returned IDPs"],
  [
    "RRI",
    "Umbrella term for returnees where returned refugees and returned IDPs are not distinguished",
  ],
  ["all", "No disaggregation"],
] as const;

const GENDER_PAIRS = [
  ["f", "Female"],
  ["m", "Male"],
  ["x", "Mixed or non-binary/other"],
  ["u", "Unknown"],
  ["o", "Other"],
  ["all", "No disaggregation"],
] as const;
const POPULATION_STATUS_PAIRS = [
  ["AFF", "Affected"],
  ["INN", "In-need"],
  ["TGT", "Targeted"],
  ["REA", "Reached"],
  ["all", 'No disaggregation ("population" in source data)'],
] as const;
const EVENT_TYPE_PAIRS = [
  ["civilian_targeting", "Violence against civilians"],
  ["demonstration", "Demonstration or protest event"],
  ["political_violence", "Political violence event"],
] as const;
const IPC_PHASE_PAIRS = [
  [
    "1",
    "None/Minimal: households meet essential needs without atypical strategies",
  ],
  [
    "2",
    "Stressed: minimally adequate food but some essential non-food needs unmet",
  ],
  [
    "3",
    "Crisis: food gaps or crisis coping to meet minimum food needs",
  ],
  [
    "4",
    "Emergency: large food gaps or emergency livelihood strategies",
  ],
  [
    "5",
    "Catastrophe/Famine: extreme lack of food/basic needs",
  ],
  [
    "3+",
    "In Need of Action: sum of phases 3, 4, and 5",
  ],
  ["all", "Population: total population"],
] as const;

const ORG_SECTORS = [
  ["Cash", "Cash programming"],
  ["CCM", "Camp Coordination / Management"],
  ["EDU", "Education"],
  ["ERY", "Early Recovery"],
  ["FSC", "Food Security"],
  ["HEA", "Health"],
  ["Hum", "Humanitarian assistance (unspecified)"],
  ["Intersectoral", "Intersectoral"],
  ["LOG", "Logistics"],
  ["Multi", "Multi-sector (unspecified)"],
  ["NUT", "Nutrition"],
  ["PRO", "Protection"],
  ["PRO-CPN", "Child Protection"],
  ["PRO-GBV", "Gender Based Violence"],
  ["PRO-HLP", "Housing, Land and Property"],
] as const;

type EnumPair = readonly [code: string, meaning: string];

function enumCodes<const T extends readonly EnumPair[]>(
  pairs: T,
): readonly T[number][0][] {
  return pairs.map((pair) => pair[0]) as readonly T[number][0][];
}

function formatEnumPairs<const T extends readonly EnumPair[]>(pairs: T): string {
  return pairs.map(([code, meaning]) => `${code} (${meaning})`).join(", ");
}

type RefugeesToolInput = {
  population_group?: (typeof POPULATION_GROUP_PAIRS)[number][0];
  gender?: (typeof GENDER_PAIRS)[number][0];
  age_range?: string;
  origin_location_code?: string;
  asylum_location_code?: string;
};

type HumanitarianNeedsToolInput = {
  population_status?: (typeof POPULATION_STATUS_PAIRS)[number][0];
  population_min?: number;
  population_max?: number;
  location_code?: string;
};

type ConflictEventsToolInput = {
  event_type?: (typeof EVENT_TYPE_PAIRS)[number][0];
  location_code?: string;
};

type FoodSecurityToolInput = {
  ipc_phase?: (typeof IPC_PHASE_PAIRS)[number][0];
  location_code?: string;
};

type OperationalPresenceToolInput = {
  location_code?: string;
  sector_code?: (typeof ORG_SECTORS)[number][0];
};

function normalizeIso3(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim().toUpperCase();
  if (!trimmed) {
    return undefined;
  }

  return trimmed;
}

function getToolDefinitions(): Anthropic.Tool[] {
  return [
    {
      name: "query_refugees",
      description:
        "Query HAPI refugees/persons of concern by demographic filters and origin/asylum ISO-3 codes. "
        + `population_group values: ${formatEnumPairs(POPULATION_GROUP_PAIRS)}. `
        + `gender values: ${formatEnumPairs(GENDER_PAIRS)}.`,
      strict: true,
      input_schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          population_group: {
            type: "string",
            enum: [...enumCodes(POPULATION_GROUP_PAIRS)],
          },
          gender: { type: "string", enum: [...enumCodes(GENDER_PAIRS)] },
          age_range: { type: "string" },
          origin_location_code: { type: "string", pattern: "^[A-Za-z]{3}$" },
          asylum_location_code: { type: "string", pattern: "^[A-Za-z]{3}$" },
        },
      },
    },
    {
      name: "query_humanitarian_needs",
      description:
        "Query HAPI humanitarian-needs by population status, population size bounds, and ISO-3 location code. "
        + `population_status values: ${formatEnumPairs(POPULATION_STATUS_PAIRS)}.`,
      strict: true,
      input_schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          population_status: {
            type: "string",
            enum: [...enumCodes(POPULATION_STATUS_PAIRS)],
          },
          population_min: { type: "number" },
          population_max: { type: "number" },
          location_code: { type: "string", pattern: "^[A-Za-z]{3}$" },
        },
      },
    },
    {
      name: "query_conflict_events",
      description:
        "Query HAPI conflict-events by ACLED event type and ISO-3 location code. "
        + `event_type values: ${formatEnumPairs(EVENT_TYPE_PAIRS)}.`,
      strict: true,
      input_schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          event_type: { type: "string", enum: [...enumCodes(EVENT_TYPE_PAIRS)] },
          location_code: { type: "string", pattern: "^[A-Za-z]{3}$" },
        },
      },
    },
    {
      name: "query_food_security",
      description:
        "Query HAPI food-security by IPC phase code and ISO-3 location code. "
        + `ipc_phase values: ${formatEnumPairs(IPC_PHASE_PAIRS)}.`,
      strict: true,
      input_schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          ipc_phase: { type: "string", enum: [...enumCodes(IPC_PHASE_PAIRS)] },
          location_code: { type: "string", pattern: "^[A-Za-z]{3}$" },
        },
      },
    },
    {
      name: "query_operational_presence",
      description:
        "Query HAPI operational-presence by ISO-3 country code and organization sector code. "
        + `sector_code values: ${formatEnumPairs(ORG_SECTORS)}. `
        + "Use this tool when you need organization names operating in countries/sectors of interest.",
      strict: true,
      input_schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          location_code: { type: "string", pattern: "^[A-Za-z]{3}$" },
          sector_code: { type: "string", enum: [...enumCodes(ORG_SECTORS)] },
        },
      },
    },
  ];
}

function asObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  return input as Record<string, unknown>;
}

async function queryRefugees(input: RefugeesToolInput) {
  console.log("Querying refugees with input:", input);
  return fetchFromHapi("/api/v2/affected-people/refugees-persons-of-concern", {
    query: {
      population_group: input.population_group,
      gender: input.gender,
      age_range: input.age_range,
      origin_location_code: normalizeIso3(input.origin_location_code),
      asylum_location_code: normalizeIso3(input.asylum_location_code),
      limit: DEFAULT_LIMIT,
    },
  });
}

async function queryHumanitarianNeeds(
  input: HumanitarianNeedsToolInput,
) {
  console.log("Querying humanitarian needs with input:", input);
  return fetchFromHapi("/api/v2/affected-people/humanitarian-needs", {
    query: {
      population_status: input.population_status,
      population_min: input.population_min,
      population_max: input.population_max,
      location_code: normalizeIso3(input.location_code),
      limit: DEFAULT_LIMIT,
    },
  });
}

async function queryConflictEvents(
  input: ConflictEventsToolInput,
) {
  console.log("Querying conflict events with input:", input);
  return fetchFromHapi("/api/v2/coordination-context/conflict-events", {
    query: {
      event_type: input.event_type,
      location_code: normalizeIso3(input.location_code),
      limit: DEFAULT_LIMIT,
    },
  });
}

async function queryFoodSecurity(input: FoodSecurityToolInput) {
  console.log("Querying food security with input:", input);
  return fetchFromHapi("/api/v2/food-security-nutrition-poverty/food-security", {
    query: {
      ipc_phase: input.ipc_phase,
      location_code: normalizeIso3(input.location_code),
      limit: DEFAULT_LIMIT,
    },
  });
}

async function queryOperationalPresence(input: OperationalPresenceToolInput) {
  console.log("Querying operational presence with input:", input);
  return fetchFromHapi("/api/v2/coordination-context/operational-presence", {
    query: {
      location_code: normalizeIso3(input.location_code),
      sector_code: input.sector_code,
      limit: DEFAULT_LIMIT,
    },
  });
}

async function executeTool(
  toolName: string,
  rawInput: unknown,
): Promise<unknown> {
  const input = asObject(rawInput);

  switch (toolName) {
    case "query_refugees":
      return queryRefugees(input as RefugeesToolInput);
    case "query_humanitarian_needs":
      return queryHumanitarianNeeds(input as HumanitarianNeedsToolInput);
    case "query_conflict_events":
      return queryConflictEvents(input as ConflictEventsToolInput);
    case "query_food_security":
      return queryFoodSecurity(input as FoodSecurityToolInput);
    case "query_operational_presence":
      return queryOperationalPresence(input as OperationalPresenceToolInput);
    default:
      throw new Error(`Unknown tool requested: ${toolName}`);
  }
}

export interface OrganizationRecommendation {
  org_name: string;
  sector: string;
  country: string;
  reason: string;
}

export async function queryMatchingOrganizations(
  userPrompt: string,
): Promise<OrganizationRecommendation[]> {
  if (!userPrompt.trim()) {
    throw new Error("A user prompt is required.");
  }

  const client = getAnthropicClient();
  const tools = getToolDefinitions();
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userPrompt },
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await client.messages.parse({
      model: DEFAULT_MODEL,
      max_tokens: DEFAULT_MAX_TOKENS,
      system: [
        "You are a humanitarian donation research assistant.",
        "Use the provided HAPI tools whenever they are needed.",
        "Location codes are ISO 3166 alpha-3 codes.",
        "When the user asks by need (not by country), you may run broad queries and synthesize findings from returned data.",
        "If the user specifies a country or set of countries, prefer organizations specific to those countries.",
        "Use operational-presence to identify organizations active in relevant countries and sectors.",
        "When done, return organizations with name, specialization sector, country, and why they fit the user's need.",
        'For country: use an ISO-3 code (e.g. "AFG") only when the recommendation is specific to one country; otherwise return an empty string "".',
      ].join("\n"),
      messages,
      output_config: {
        format: jsonSchemaOutputFormat({
          type: "object",
          properties: {
            organizations: {
              type: "array",
              items: {
                type: "object",
                properties: { 
                  org_name: { type: "string" },
                  sector: { type: "string" },
                  country: { type: "string", pattern: "^$|^[A-Z]{3}$" },
                  reason: { type: "string" },
                },
                required: ["org_name", "sector", "country", "reason"],
              },
            },
          },
          required: ["organizations"],
        }),
      },
      tools,
      tool_choice: { type: "auto" },
    });

    messages.push({
      role: "assistant",
      content: response.content,
    });

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    if (toolUseBlocks.length === 0) {
      return (response.parsed_output?.organizations as OrganizationRecommendation[]) ?? [];
    }

    const toolResults = await Promise.all(
      toolUseBlocks.map(async (toolUse) => {
        try {
          const result = await executeTool(toolUse.name, toolUse.input);
          return {
            type: "tool_result" as const,
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            type: "tool_result" as const,
            tool_use_id: toolUse.id,
            is_error: true,
            content: message,
          };
        }
      }),
    );

    messages.push({
      role: "user",
      content: toolResults,
    });
  }

  throw new Error("Tool-calling loop exceeded maximum rounds.");
}
