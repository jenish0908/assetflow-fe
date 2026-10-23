import { vi } from "vitest";

import { ApiError, get, setUnauthorizedHandler, tokenStore } from "./client";

function respond(status: number, body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
}

describe("api client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends the bearer token and returns JSON", async () => {
    tokenStore.set("abc");
    respond(200, { ok: true });
    await expect(get("/me")).resolves.toEqual({ ok: true });
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toMatch(/\/api\/me$/);
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer abc");
  });

  it("turns the backend error shape into an ApiError", async () => {
    respond(409, { error: { code: "conflict", message: "asset 1 is allocated, not available", request_id: "r1" } });
    const err = await get("/assets/1").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 409, code: "conflict", message: "asset 1 is allocated, not available", requestId: "r1" });
  });

  it("signs out when a stored token is rejected", async () => {
    tokenStore.set("expired");
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    respond(401, { error: { code: "unauthenticated", message: "invalid or expired token" } });
    await expect(get("/me")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it("explains a network failure in plain words", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    await expect(get("/me")).rejects.toMatchObject({ code: "network", message: expect.stringContaining("Can't reach") });
  });
});
