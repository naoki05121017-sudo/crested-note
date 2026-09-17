import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchWithJwtClockSkewRetry,
  isJwtIssuedAtFutureError,
  isOpaqueSupabaseApiKey,
  retryOnJwtIssuedAtFuture,
  stripOpaqueApiKeyBearer,
} from "./clock-skew-fetch";

describe("opaque API keys", () => {
  it("does not treat sb_secret as a JWT", () => {
    expect(isOpaqueSupabaseApiKey("sb_secret_example")).toBe(true);
    expect(isOpaqueSupabaseApiKey("sb_publishable_example")).toBe(true);
    expect(isOpaqueSupabaseApiKey("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb")).toBe(
      false,
    );
  });

  it("removes Bearer when the token is an opaque API key", () => {
    const headers = new Headers({
      Authorization: "Bearer sb_secret_example",
      apikey: "sb_secret_example",
    });
    stripOpaqueApiKeyBearer(headers);
    expect(headers.get("Authorization")).toBeNull();
    expect(headers.get("apikey")).toBe("sb_secret_example");
  });

  it("keeps a real JWT Bearer header", () => {
    const headers = new Headers({
      Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb",
    });
    stripOpaqueApiKeyBearer(headers);
    expect(headers.get("Authorization")?.startsWith("Bearer eyJ")).toBe(true);
  });
});

describe("jwt clock skew helper", () => {
  it("detects the PostgREST future-iat message", () => {
    expect(isJwtIssuedAtFutureError("JWT issued at future")).toBe(true);
    expect(isJwtIssuedAtFutureError('{"code":"PGRST303"}')).toBe(true);
    expect(isJwtIssuedAtFutureError("Invalid API key", "PGRST301")).toBe(false);
    expect(isJwtIssuedAtFutureError("", "PGRST303")).toBe(true);
  });
});

describe("fetchWithJwtClockSkewRetry", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("strips opaque Bearer and retries future-iat without caching", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response("JWT issued at future", { status: 401 }),
      )
      .mockResolvedValueOnce(new Response("[]", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const pending = fetchWithJwtClockSkewRetry("https://example.test/rest/v1/breedings", {
      headers: { Authorization: "Bearer sb_secret_example", apikey: "sb_secret_example" },
    });
    await vi.advanceTimersByTimeAsync(250);
    const response = await pending;

    expect(response.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const sent = new Headers(firstInit.headers);
    expect(sent.get("Authorization")).toBeNull();
    expect(sent.get("apikey")).toBe("sb_secret_example");
    expect(firstInit.cache).toBe("no-store");
  });
});

describe("retryOnJwtIssuedAtFuture", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("re-runs a query until the clock-skew error is gone", async () => {
    vi.useFakeTimers();
    const run = vi
      .fn()
      .mockResolvedValueOnce({ error: { message: "JWT issued at future", code: "PGRST303" } })
      .mockResolvedValueOnce({ error: null, data: [{ id: "1" }] });

    const pending = retryOnJwtIssuedAtFuture(run);
    await vi.advanceTimersByTimeAsync(250);
    const result = await pending;
    expect(result.error).toBeNull();
    expect(run).toHaveBeenCalledTimes(2);
  });
});
