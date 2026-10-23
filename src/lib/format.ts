import type { AssetStatus, Notification, Role } from "../api/types";

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const dateOnly = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

export function formatDate(iso: string): string {
  return dateOnly.format(new Date(iso));
}

/** "3 minutes ago", "yesterday", or a date once it is older than a week. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const seconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "just now";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), "hour");
  if (abs < 7 * 86400) return relative.format(Math.round(seconds / 86400), "day");
  return formatDate(iso);
}

export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat().format(n);
}

export const statusLabel: Record<AssetStatus, string> = {
  available: "Available",
  allocated: "Allocated",
  maintenance: "In maintenance",
  retired: "Retired",
};

export const roleLabel: Record<Role, string> = {
  viewer: "Viewer",
  manager: "Manager",
  admin: "Admin",
};

export const roleRank: Record<Role, number> = { viewer: 1, manager: 2, admin: 3 };

export function can(role: Role | undefined, required: Role): boolean {
  return role !== undefined && roleRank[role] >= roleRank[required];
}

/**
 * A one-line, human description of a notification job. With a recipient name
 * it is written for an admin watching everyone's messages; without one it is
 * written to the person who received it.
 */
export function describeNotification(n: Notification, recipient?: string): string {
  const p = n.payload;
  if (n.kind === "asset_allocated") {
    const tag = String(p.asset_tag ?? "An asset");
    return recipient ? `${tag} allocated to ${recipient}` : `${tag} was allocated to you`;
  }
  if (n.kind === "payment_succeeded") {
    const amount = typeof p.amount_cents === "number" ? formatMoney(p.amount_cents, String(p.currency ?? "usd")) : "a payment";
    return recipient ? `Payment of ${amount} from ${recipient}` : `Your payment of ${amount} was received`;
  }
  return n.kind.replace(/_/g, " ");
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase() || "?";
}
