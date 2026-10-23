// One TanStack Query hook per backend resource. Queries cache by key;
// mutations invalidate the keys whose data they change.
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { get, request, send } from "./client";
import type {
  AgentReply,
  Allocation,
  Asset,
  AssetStatus,
  AssetWithAllocations,
  Me,
  Notification,
  Overview,
  Page,
  Payment,
  Role,
  User,
} from "./types";

export const keys = {
  me: ["me"] as const,
  overview: ["overview"] as const,
  assets: (filter: AssetQuery) => ["assets", filter] as const,
  asset: (id: number) => ["asset", id] as const,
  users: (q: string, offset: number) => ["users", q, offset] as const,
  usersByIds: (ids: number[]) => ["users-by-ids", ids] as const,
  payments: (offset: number) => ["payments", offset] as const,
  notifications: ["notifications"] as const,
};

// ---- session -------------------------------------------------------------

export function useMe(enabled: boolean) {
  return useQuery({ queryKey: keys.me, queryFn: () => get<Me>("/me"), enabled, staleTime: 60_000 });
}

export async function login(email: string, password: string): Promise<string> {
  const { token } = await send<{ token: string }>("POST", "/auth/login", { email, password });
  return token;
}

// ---- overview ------------------------------------------------------------

export function useOverview() {
  return useQuery({ queryKey: keys.overview, queryFn: () => get<Overview>("/stats"), refetchInterval: 15_000 });
}

// ---- assets --------------------------------------------------------------

export interface AssetQuery {
  q: string;
  status: AssetStatus | "";
  offset: number;
  limit: number;
}

export function useAssets(query: AssetQuery) {
  return useQuery({
    queryKey: keys.assets(query),
    queryFn: ({ signal }) => get<Page<AssetWithAllocations>>("/assets", { ...query }, signal),
    placeholderData: keepPreviousData, // keep the table on screen while the next page loads
  });
}

export function useAsset(id: number) {
  return useQuery({ queryKey: keys.asset(id), queryFn: () => get<AssetWithAllocations>(`/assets/${id}`) });
}

function useInvalidateAssets() {
  const qc = useQueryClient();
  return (id?: number) => {
    void qc.invalidateQueries({ queryKey: ["assets"] });
    void qc.invalidateQueries({ queryKey: keys.overview });
    void qc.invalidateQueries({ queryKey: keys.notifications });
    if (id !== undefined) void qc.invalidateQueries({ queryKey: keys.asset(id) });
  };
}

export function useCreateAsset() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: (input: { tag: string; name: string; category: string }) => send<Asset>("POST", "/assets", input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateAsset(id: number) {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: (patch: { name?: string; category?: string }) => send<Asset>("PATCH", `/assets/${id}`, patch),
    onSuccess: () => invalidate(id),
  });
}

export function useDeleteAsset(id: number) {
  const invalidate = useInvalidateAssets();
  return useMutation({ mutationFn: () => send<void>("DELETE", `/assets/${id}`), onSuccess: () => invalidate() });
}

export function useAllocate(id: number) {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: (userId: number) => send<Allocation>("POST", `/assets/${id}/allocate`, { user_id: userId }),
    onSuccess: () => invalidate(id),
  });
}

export function useReturn(id: number) {
  const invalidate = useInvalidateAssets();
  return useMutation({ mutationFn: () => send<Allocation>("POST", `/assets/${id}/return`), onSuccess: () => invalidate(id) });
}

export function useSetStatus(id: number) {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: (status: AssetStatus) => send<Asset>("PATCH", `/assets/${id}/status`, { status }),
    onSuccess: () => invalidate(id),
  });
}

// ---- people --------------------------------------------------------------

export function useUsers(q: string, offset: number, limit = 25) {
  return useQuery({
    queryKey: keys.users(q, offset),
    queryFn: ({ signal }) => get<Page<User>>("/users", { q, offset, limit }, signal),
    placeholderData: keepPreviousData,
  });
}

/**
 * Resolves user IDs to people in one request (GET /users?ids=…), so a table
 * that mentions 50 holders costs one call, not 50: the frontend version of
 * the backend's N+1 fix.
 */
export function useUsersByIds(ids: number[]) {
  const unique = [...new Set(ids)].sort((a, b) => a - b);
  const query = useQuery({
    queryKey: keys.usersByIds(unique),
    queryFn: () => get<{ items: User[] }>("/users", { ids: unique.join(",") }),
    enabled: unique.length > 0,
    staleTime: 60_000,
  });
  const byId = new Map<number, User>();
  for (const u of query.data?.items ?? []) byId.set(u.id, u);
  return byId;
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; name: string; password: string; role: Role }) => send<User>("POST", "/users", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["users"] });
      void qc.invalidateQueries({ queryKey: keys.overview });
    },
  });
}

// ---- payments ------------------------------------------------------------

export function usePayments(offset: number, enabled: boolean) {
  return useQuery({
    queryKey: keys.payments(offset),
    queryFn: () => get<Page<Payment>>("/payments", { offset, limit: 20 }),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export interface PaymentResult {
  payment: Payment;
  replayed: boolean;
}

/**
 * Creates a payment with an Idempotency-Key chosen by the caller. Retrying
 * with the same key returns the original payment instead of charging again.
 */
export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { amountCents: number; currency: string; idempotencyKey: string }): Promise<PaymentResult> => {
      const res = await request<Payment>("/payments", {
        method: "POST",
        body: { amount_cents: input.amountCents, currency: input.currency },
        headers: { "Idempotency-Key": input.idempotencyKey },
      });
      return { payment: res.data, replayed: res.headers.get("Idempotent-Replayed") === "true" };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["payments"] });
      void qc.invalidateQueries({ queryKey: keys.overview });
      void qc.invalidateQueries({ queryKey: keys.notifications });
    },
  });
}

// ---- notifications -------------------------------------------------------

export function useNotifications() {
  return useQuery({
    queryKey: keys.notifications,
    queryFn: () => get<{ items: Notification[] }>("/notifications", { limit: 50 }),
    refetchInterval: 3_000, // the worker usually delivers within a second
  });
}

// ---- assistant -----------------------------------------------------------

export function useAgentChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => send<AgentReply>("POST", "/agent/chat", { message }),
    onSuccess: (reply) => {
      // The assistant may have changed assets or people.
      if (reply.tool_calls.some((t) => t.ok && t.name !== "getAssetInfo")) {
        void qc.invalidateQueries({ queryKey: ["assets"] });
        void qc.invalidateQueries({ queryKey: ["asset"] });
        void qc.invalidateQueries({ queryKey: ["users"] });
        void qc.invalidateQueries({ queryKey: keys.overview });
        void qc.invalidateQueries({ queryKey: keys.notifications });
      }
    },
  });
}
