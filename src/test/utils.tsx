import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";

import { tokenStore } from "../api/client";
import { SessionProvider } from "../auth";
import { ToastProvider } from "../components/toast";

type Handler = (url: URL, init: RequestInit) => unknown;

export interface FakeApi {
  calls: { method: string; path: string; search: string; body?: unknown }[];
}

/**
 * Replaces fetch with a tiny router: routes map "GET /assets" to a handler
 * returning the JSON body. A handler can return `{ status, body }` to send
 * an error. Every call is recorded.
 */
export function fakeApi(routes: Record<string, Handler>): FakeApi {
  const api: FakeApi = { calls: [] };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL | string, init: RequestInit = {}) => {
      const url = new URL(String(input));
      const method = init.method ?? "GET";
      const path = url.pathname.replace(/^\/api/, "");
      const body = init.body ? JSON.parse(String(init.body)) : undefined;
      api.calls.push({ method, path, search: url.search, body });

      const handler = routes[`${method} ${path}`];
      if (!handler) return new Response(JSON.stringify({ error: { code: "not_found", message: `no fake for ${method} ${path}` } }), { status: 404 });
      const result = handler(url, init) as { status?: number; body?: unknown; headers?: Record<string, string> } | unknown;
      if (result && typeof result === "object" && "status" in (result as object)) {
        const r = result as { status: number; body?: unknown; headers?: Record<string, string> };
        return new Response(JSON.stringify(r.body ?? {}), { status: r.status, headers: r.headers });
      }
      return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
    }),
  );
  return api;
}

export const adminMe = {
  user: { id: 1, email: "admin@assetflow.dev", name: "Aarav Mehta", role: "admin", created_at: "2026-01-01T00:00:00Z" },
  features: { billing: "fake", agent: "fake" },
};

export function renderApp(ui: ReactNode, { path = "/", route = "/", signedIn = true } = {}) {
  if (signedIn) tokenStore.set("test-token");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SessionProvider>
          <ToastProvider>
            <Routes>
              <Route path={path} element={ui} />
              <Route path="*" element={<div>other page</div>} />
            </Routes>
          </ToastProvider>
        </SessionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
