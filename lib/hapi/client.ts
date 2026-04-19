import type { paths } from "./types";

const DEFAULT_HAPI_BASE_URL = "https://hapi.humdata.org";

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

type OperationFor<
  P extends keyof paths,
  M extends HttpMethod,
> = M extends keyof paths[P] ? Exclude<paths[P][M], undefined | never> : never;

export type HapiGetPath = {
  [P in keyof paths]: OperationFor<P, "get"> extends never ? never : P;
}[keyof paths];

export type HapiQuery<P extends HapiGetPath> = OperationFor<
  P,
  "get"
> extends {
  parameters?: { query?: infer Q };
}
  ? Omit<Q, "app_identifier">
  : never;

export type HapiResponse<P extends HapiGetPath> = OperationFor<
  P,
  "get"
> extends {
  responses: {
    200: {
      content: {
        "application/json": infer R;
      };
    };
  };
}
  ? R
  : never;

export class HapiRequestError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly url: string;

  constructor(url: string, status: number, statusText: string) {
    super(`HAPI request failed (${status} ${statusText}) for ${url}`);
    this.name = "HapiRequestError";
    this.url = url;
    this.status = status;
    this.statusText = statusText;
  }
}

export interface FetchHapiOptions<P extends HapiGetPath> {
  query?: HapiQuery<P>;
  baseUrl?: string;
  headers?: HeadersInit;
  init?: Omit<RequestInit, "method" | "headers">;
}

export async function fetchFromHapi<P extends HapiGetPath>(
  path: P,
  options: FetchHapiOptions<P> = {},
): Promise<HapiResponse<P>> {
  const baseUrl = options.baseUrl ?? DEFAULT_HAPI_BASE_URL;
  const url = new URL(String(path), baseUrl);
  const appIdentifier = process.env.HAPI_APP_IDENTIFIER;
  if (!appIdentifier) {
    throw new Error("HAPI_APP_IDENTIFIER is not set.");
  }

  url.searchParams.append("app_identifier", appIdentifier);
  if (options.query && typeof options.query === "object") {
    for (const [key, rawValue] of Object.entries(options.query)) {
      if (rawValue === undefined || rawValue === null) {
        continue;
      }

      if (Array.isArray(rawValue)) {
        for (const value of rawValue) {
          url.searchParams.append(key, String(value));
        }
        continue;
      }

      url.searchParams.append(key, String(rawValue));
    }
  }

  const response = await fetch(url, {
    ...options.init,
    method: "GET",
    headers: options.headers,
  });

  if (!response.ok) {
    throw new HapiRequestError(url.toString(), response.status, response.statusText);
  }

  return (await response.json()) as HapiResponse<P>;
}
