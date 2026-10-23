import { AlertCircle, Info, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { ApiError } from "../api/client";
import type { AssetStatus, Role } from "../api/types";
import { initials, roleLabel, statusLabel } from "../lib/format";

export function StatusBadge({ status, label }: { status: AssetStatus | string; label?: string }) {
  const text = label ?? statusLabel[status as AssetStatus] ?? status.replace(/_/g, " ");
  return (
    <span className="status" data-status={status}>
      {text}
    </span>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span className="role" data-role={role}>
      {roleLabel[role]}
    </span>
  );
}

export function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar" aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function PageHead({ title, intro, actions }: { title: string; intro?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  );
}

type Tone = "info" | "warn" | "error";
const toneIcon: Record<Tone, ReactNode> = {
  info: <Info size={18} aria-hidden="true" />,
  warn: <TriangleAlert size={18} aria-hidden="true" />,
  error: <AlertCircle size={18} aria-hidden="true" />,
};

export function Notice({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div className="notice" data-tone={tone} role={tone === "error" ? "alert" : "status"}>
      {toneIcon[tone]}
      <div>{children}</div>
    </div>
  );
}

/** Shows what went wrong, using the server's message when there is one. */
export function ErrorNotice({ error, action }: { error: unknown; action?: string }) {
  const message = error instanceof Error ? error.message : "Something unexpected happened.";
  const requestId = error instanceof ApiError ? error.requestId : undefined;
  return (
    <Notice tone="error">
      {action && <strong>{action}: </strong>}
      {message}
      {requestId && <div className="cell-sub">Request ID {requestId}</div>}
    </Notice>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function SkeletonRows({ rows = 6, cols }: { rows?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} aria-hidden="true">
          {Array.from({ length: cols }, (_, c) => (
            <td key={c}>
              <div className="skeleton" style={{ width: `${50 + ((r * 7 + c * 13) % 40)}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function Pager({
  offset,
  limit,
  total,
  onChange,
  noun,
}: {
  offset: number;
  limit: number;
  total: number;
  onChange: (offset: number) => void;
  noun: string;
}) {
  if (total === 0) return null;
  const from = offset + 1;
  const to = Math.min(offset + limit, total);
  return (
    <nav className="pager" aria-label="Pagination">
      <span className="num">
        {from}–{to} of {total} {noun}
      </span>
      <div className="pager-buttons">
        <button type="button" className="btn btn-secondary btn-sm" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - limit))}>
          Previous
        </button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={to >= total} onClick={() => onChange(offset + limit)}>
          Next
        </button>
      </div>
    </nav>
  );
}

/** A modal built on the native <dialog>: focus trapping and Esc come free. */
export function Dialog({
  open,
  onClose,
  title,
  intro,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // click on the backdrop
      }}
    >
      <div className="dialog-head">
        <div>
          <h2 id="dialog-title">{title}</h2>
          {intro && <p>{intro}</p>}
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div className="dialog-body">{open && children}</div>
    </dialog>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
