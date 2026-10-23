// Shapes returned by assetflow-be. Field names match the JSON exactly.

export type Role = "viewer" | "manager" | "admin";
export type AssetStatus = "available" | "allocated" | "maintenance" | "retired";

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  created_at: string;
}

export interface Features {
  billing: "stripe" | "fake" | "disabled";
  agent: "openai" | "fake";
}

export interface Me {
  user: User;
  features: Features;
}

export interface Allocation {
  id: number;
  asset_id: number;
  user_id: number;
  allocated_at: string;
  returned_at?: string;
}

export interface Asset {
  id: number;
  tag: string;
  name: string;
  category: string;
  status: AssetStatus;
  created_at: string;
  updated_at: string;
}

export interface AssetWithAllocations extends Asset {
  allocations: Allocation[];
}

export interface Page<T> {
  items: T[];
  limit: number;
  offset: number;
  total: number;
}

export interface PaymentSummary {
  count: number;
  amount_cents: number;
}

export interface Stats {
  assets: number;
  assets_by_status: Partial<Record<AssetStatus, number>>;
  active_allocations: number;
  users: number;
  jobs_by_status: Record<string, number>;
  payments_by_status: Record<string, PaymentSummary>;
}

export interface AllocationEvent {
  id: number;
  asset_id: number;
  asset_tag: string;
  asset_name: string;
  user_id: number;
  user_name: string;
  allocated_at: string;
  returned_at?: string;
}

export interface Overview {
  stats: Stats;
  recent_allocations: AllocationEvent[];
}

export type JobStatus = "pending" | "running" | "done" | "dead";

export interface Notification {
  id: number;
  kind: "payment_succeeded" | "asset_allocated" | string;
  payload: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  max_attempts: number;
  run_at: string;
  last_error?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  user_id: number;
  payment_intent_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ToolTrace {
  step: number;
  name: string;
  arguments: string;
  ok: boolean;
  error?: string;
  duration_ms: number;
}

export interface AgentReply {
  reply: string;
  tool_calls: ToolTrace[];
}
