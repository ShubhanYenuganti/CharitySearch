import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import type { JSONSchema } from "json-schema-to-ts";

const DEFAULT_MODEL = "claude-sonnet-4-5";
const DEFAULT_MAX_TOKENS = 1024;

let anthropicClient: Anthropic | null = null;

function getAnthropicApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }

  return apiKey;
}

export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: getAnthropicApiKey(),
    });
  }

  return anthropicClient;
}

export interface AnthropicMessageOptions {
  model?: Anthropic.Model;
  system?: string;
  maxTokens?: number;
  temperature?: number;
  jsonSchema?: Exclude<JSONSchema, boolean> & { type: "object" };
}

export async function messageAnthropic(
  prompt: string,
  options: AnthropicMessageOptions & { jsonSchema: NonNullable<AnthropicMessageOptions["jsonSchema"]> },
): Promise<unknown>;

export async function messageAnthropic(
  prompt: string,
  options: AnthropicMessageOptions = {},
): Promise<string | unknown> {
  const client = getAnthropicClient();
  const createParams = {
    model: options.model ?? DEFAULT_MODEL,
    max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    ...(options.system ? { system: options.system } : {}),
    ...(options.temperature !== undefined
      ? { temperature: options.temperature }
      : {}),
    messages: [{ role: "user" as const, content: prompt }],
  };

  if (options.jsonSchema) {
    const parsedResponse = await client.messages.parse({
      ...createParams,
      output_config: {
        format: jsonSchemaOutputFormat(options.jsonSchema),
      },
    });

    if (parsedResponse.parsed_output === null || parsedResponse.parsed_output === undefined) {
      throw new Error("Anthropic returned no parsed structured output.");
    }

    return parsedResponse.parsed_output;
  }

  const response = await client.messages.create(createParams);

  const text = response.content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Anthropic returned no text content.");
  }

  return text;
}
