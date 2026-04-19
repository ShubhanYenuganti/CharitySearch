"use server";

import { messageAnthropic } from "@/lib/anthropic/client";

const ALLOWED_SECTORS = {
  "Cash": "Cash programming",
  "CCM": "Camp Coordination / Management",
  "EDU": "Education",
  "ERY": "Early Recovery",
  "FSC": "Food Security",
} as const;
export type DonationSector = keyof typeof ALLOWED_SECTORS;

export interface DonationIntentExtraction {
  country: string;
  sector: DonationSector;
  constraints: string[];
}

export async function extractDonationIntent(
  userPrompt: string,
): Promise<DonationIntentExtraction> {
  if (!userPrompt.trim()) {
    throw new Error("A user prompt is required for intent extraction.");
  }

  const llmResponse = await messageAnthropic(userPrompt, {
    model: "claude-haiku-4-5",
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        country: { type: "string" },
        sector: { type: "string", enum: Object.keys(ALLOWED_SECTORS) },
        constraints: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["country", "sector", "constraints"],
    },
    system: [
      "You extract donation-search intent for humanitarian giving.",
      "Rules:",
      "- Only use ISO 3166 alpha-3 country codes in the `country` property.",
      "- Only use the following sectors in the `sector` property: "
        + Object.entries(ALLOWED_SECTORS)
          .map(([key, value]) => `${key} (${value})`)
          .join(", "),
      "- If not specified, return empty string for country.",
      "- Constraints must always be an array of short strings.",
    ].join("\n"),
  });

  return llmResponse as DonationIntentExtraction;
}
