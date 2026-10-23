import { CreditCard, Package } from "lucide-react";

import { useNotifications, useUsersByIds } from "../api/hooks";
import type { Notification } from "../api/types";
import { useSession } from "../auth";
import { EmptyState, ErrorNotice, PageHead, StatusBadge } from "../components/ui";
import { describeNotification, timeAgo } from "../lib/format";

const statusText: Record<string, string> = {
  pending: "Waiting",
  running: "Sending",
  done: "Delivered",
  dead: "Failed",
};

function recipientId(n: Notification): number | undefined {
  return typeof n.payload.user_id === "number" ? n.payload.user_id : undefined;
}

export function NotificationsPage() {
  const { allows } = useSession();
  const feed = useNotifications();
  const items = feed.data?.items ?? [];
  const isAdmin = allows("admin");
  const recipients = useUsersByIds(isAdmin ? items.flatMap((n) => recipientId(n) ?? []) : []);

  return (
    <>
      <PageHead
        title="Notifications"
        intro={
          isAdmin
            ? "Everything the background worker has sent or is about to send. Updates live."
            : "Messages sent to you. Updates live."
        }
      />
      {feed.isError ? (
        <ErrorNotice error={feed.error} action="Couldn't load notifications" />
      ) : (
        <section className="panel" aria-live="polite">
          {feed.isPending ? (
            <div className="panel-body">
              <div className="skeleton" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState title="No notifications yet">Allocating an asset or making a payment sends one.</EmptyState>
          ) : (
            <ul className="feed">
              {items.map((n) => {
                const to = recipientId(n);
                const recipient = isAdmin && to !== undefined ? (recipients.get(to)?.name ?? `user #${to}`) : undefined;
                return (
                  <li key={n.id}>
                    <span className="feed-icon" aria-hidden="true">
                      {n.kind === "payment_succeeded" ? <CreditCard size={18} /> : <Package size={18} />}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <strong>{describeNotification(n, recipient)}</strong>
                      <div className="cell-sub">
                        {timeAgo(n.created_at)}
                        {n.attempts > 1 && `, attempt ${n.attempts} of ${n.max_attempts}`}
                      </div>
                      {n.last_error && n.status !== "done" && <div className="feed-error">{n.last_error}</div>}
                    </div>
                    <StatusBadge status={n.status} label={statusText[n.status]} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
