// A thin fetch wrapper: adds the bearer token, decodes JSON, and turns the
// backend's error shape {"error": {code, message, request_id}} into ApiError.

const BASE = "/api";
const TOKEN_KEY = "assetflow.token";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// The token lives in sessionStorage: it survives a reload but not a closed
// tab, and is never sent automatically the way a cookie would be.
export const tokenStore = {
  get: (): string | null => sessionStorage.getItem(TOKEN_KEY),
  set: (token: string) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

let onUnauthorized: () => void = () => {};

/** Registers what to do when the API rejects the token (signs the user out). */
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<ApiResponse<T>> {
  const url = new URL(BASE + path, window.location.origin);
  for (const [key, value] of Object.entries(opts.query ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = { Accept: "application/json", ...opts.headers };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: opts.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, "network", "Can't reach the AssetFlow server. Check that the API is running.");
  }

  if (res.status === 204) return { data: undefined as T, status: res.status, headers: res.headers };

  const text = await res.text();
  let json: unknown = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    // fall through: handled below as a non-JSON response
  }

  if (!res.ok) {
    const detail = (json as { error?: { code?: string; message?: string; request_id?: string } } | undefined)?.error;
    const error = new ApiError(
      res.status,
      detail?.code ?? "http_" + res.status,
      detail?.message ?? `The server answered ${res.status} ${res.statusText}.`,
      detail?.request_id,
    );
    if (res.status === 401 && tokenStore.get()) onUnauthorized();
    throw error;
  }
  return { data: json as T, status: res.status, headers: res.headers };
}

export async function get<T>(path: string, query?: RequestOptions["query"], signal?: AbortSignal): Promise<T> {
  return (await request<T>(path, { query, signal })).data;
}

export async function send<T>(method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  return (await request<T>(path, { method, body })).data;
}
