import http from "node:http";
import https from "node:https";

/** Opaque API keys are not JWTs. Sending them as Bearer makes the gateway mint a JWT. */

export function isOpaqueSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_secret_") || value.startsWith("sb_publishable_");
}

export function isJwtIssuedAtFutureError(body: string, code = ""): boolean {
  if (code.toUpperCase() === "PGRST303") return true;
  const text = `${body} ${code}`.toLowerCase();
  return text.includes("jwt issued at future") || text.includes("pgrst303");
}

export function stripOpaqueApiKeyBearer(headers: Headers): void {
  const authorization = headers.get("Authorization") ?? headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(\S+)/i);
  if (!match || !isOpaqueSupabaseApiKey(match[1])) return;
  headers.delete("Authorization");
  headers.delete("authorization");
  if (!headers.get("apikey")) {
    headers.set("apikey", match[1]);
  }
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function mergeHeaders(input: RequestInfo | URL, init?: RequestInit): Headers {
  const headers = new Headers();
  if (typeof input !== "string" && !(input instanceof URL)) {
    new Headers(input.headers).forEach((value, key) => headers.set(key, value));
  }
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
  return headers;
}

function rebuildResponse(text: string, response: Response): Response {
  return new Response(text, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

/** Bypass Next.js patched fetch, which can cache/replay Supabase 401s as JWT errors. */
function nodeHttpFetch(url: string, init: RequestInit): Promise<Response> {
  const target = new URL(url);
  const lib = target.protocol === "http:" ? http : https;
  const method = init.method ?? "GET";
  const headers = headersToRecord(new Headers(init.headers));
  const body =
    typeof init.body === "string" || init.body instanceof Uint8Array || Buffer.isBuffer(init.body)
      ? init.body
      : undefined;

  return new Promise((resolve, reject) => {
    const request = lib.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || undefined,
        path: `${target.pathname}${target.search}`,
        method,
        headers,
      },
      (incoming) => {
        const chunks: Buffer[] = [];
        incoming.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        incoming.on("end", () => {
          const responseHeaders = new Headers();
          for (const [key, value] of Object.entries(incoming.headers)) {
            if (value == null) continue;
            responseHeaders.set(key, Array.isArray(value) ? value.join(", ") : value);
          }
          const status = incoming.statusCode ?? 500;
          const raw = Buffer.concat(chunks);
          const noBody = status === 204 || status === 205 || status === 304;
          resolve(
            new Response(noBody ? null : raw, {
              status,
              statusText: incoming.statusMessage,
              headers: responseHeaders,
            }),
          );
        });
      },
    );
    request.on("error", reject);
    init.signal?.addEventListener("abort", () => request.destroy(), { once: true });
    if (body) request.write(body);
    request.end();
  });
}

function transportFetch(url: string, init: RequestInit): Promise<Response> {
  if (process.env.VITEST) {
    return fetch(url, init);
  }
  return nodeHttpFetch(url, init);
}

/**
 * REST must send sb_secret_ only as `apikey`, never as a JWT Bearer token.
 * Next.js fetch is not used here; it can cache a 401 as "JWT issued at future".
 */
export async function fetchWithJwtClockSkewRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = requestUrl(input);
  const method =
    init?.method ??
    (typeof input !== "string" && !(input instanceof URL) ? input.method : "GET");
  const body =
    init?.body ??
    (typeof input !== "string" && !(input instanceof URL) ? input.body : undefined);
  const signal =
    init?.signal ??
    (typeof input !== "string" && !(input instanceof URL) ? input.signal : undefined);

  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const headers = mergeHeaders(input, init);
    stripOpaqueApiKeyBearer(headers);
    const response = await transportFetch(url, {
      method,
      headers,
      body,
      signal,
      cache: "no-store",
    });
    if (response.ok) return response;
    const text = await response.text();
    const rebuilt = rebuildResponse(text, response);
    const retryable =
      isJwtIssuedAtFutureError(text) && attempt < maxAttempts;
    if (!retryable) return rebuilt;
    await sleep(250 * attempt);
  }
  throw new Error("Supabase への再試行に失敗しました。");
}

export async function retryOnJwtIssuedAtFuture<T extends { error: { message: string; code?: string } | null }>(
  run: () => PromiseLike<T>,
): Promise<T> {
  const maxAttempts = 4;
  let last: T | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    last = await run();
    const error = last.error;
    if (!error || !isJwtIssuedAtFutureError(error.message, error.code ?? "")) {
      return last;
    }
    if (attempt < maxAttempts) await sleep(250 * attempt);
  }
  return last as T;
}
