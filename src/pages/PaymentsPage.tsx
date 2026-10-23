import { CreditCard } from "lucide-react";
import { useState, type FormEvent } from "react";

import { useCreatePayment, usePayments, useUsersByIds } from "../api/hooks";
import { useSession } from "../auth";
import { useToast } from "../components/toast";
import { Avatar, Dialog, EmptyState, ErrorNotice, Field, Notice, PageHead, Pager, SkeletonRows, StatusBadge } from "../components/ui";
import { formatDateTime, formatMoney } from "../lib/format";

const PAGE = 20;
const paymentStatus: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  succeeded: "Paid",
  requires_payment_method: "Declined",
  canceled: "Canceled",
};

export function PaymentsPage() {
  const { features, allows } = useSession();
  const billing = features?.billing ?? "disabled";
  const [offset, setOffset] = useState(0);
  const [paying, setPaying] = useState(false);
  const payments = usePayments(offset, billing !== "disabled");
  const items = payments.data?.items ?? [];
  const isAdmin = allows("admin");
  const payers = useUsersByIds(isAdmin ? items.map((p) => p.user_id) : []);

  if (billing === "disabled") {
    return (
      <>
        <PageHead title="Payments" />
        <Notice tone="warn">
          Payments are switched off on this server. Start the API with <code>BILLING_MODE=fake</code> for simulated payments, or set your Stripe test keys.
        </Notice>
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Payments"
        intro={isAdmin ? "Every payment, newest first." : "Your payments, newest first."}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setPaying(true)}>
            <CreditCard size={18} aria-hidden="true" /> New payment
          </button>
        }
      />
      {billing === "fake" && (
        <div style={{ marginBottom: 16 }}>
          <Notice>Test mode: payments go through a simulated card processor and no money moves.</Notice>
        </div>
      )}

      {payments.isError ? (
        <ErrorNotice error={payments.error} action="Couldn't load payments" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Payment</th>
                {isAdmin && <th scope="col">Paid by</th>}
                <th scope="col" className="cell-right">
                  Amount
                </th>
                <th scope="col">Status</th>
                <th scope="col">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.isPending ? (
                <SkeletonRows cols={isAdmin ? 5 : 4} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4}>
                    <EmptyState
                      title="No payments yet"
                      action={
                        <button type="button" className="btn btn-primary" onClick={() => setPaying(true)}>
                          Make a payment
                        </button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                items.map((p) => {
                  const payer = payers.get(p.user_id);
                  return (
                    <tr key={p.id}>
                      <td>
                        <strong className="num">#{p.id}</strong>
                        <div className="cell-sub">{p.payment_intent_id ?? "Not sent to the processor yet"}</div>
                      </td>
                      {isAdmin && (
                        <td>
                          <span className="cell-person">
                            <Avatar name={payer?.name ?? "?"} />
                            {payer?.name ?? `User #${p.user_id}`}
                          </span>
                        </td>
                      )}
                      <td className="cell-right num" style={{ fontSize: "var(--fs-md)", fontWeight: 700 }}>
                        {formatMoney(p.amount_cents, p.currency)}
                      </td>
                      <td>
                        <StatusBadge status={p.status} label={paymentStatus[p.status]} />
                      </td>
                      <td className="cell-sub">{formatDateTime(p.created_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
      {payments.data && <Pager offset={offset} limit={PAGE} total={payments.data.total} noun="payments" onChange={setOffset} />}

      <Dialog open={paying} onClose={() => setPaying(false)} title="New payment" intro="Charges the saved company card.">
        <PaymentForm onDone={() => setPaying(false)} />
      </Dialog>
    </>
  );
}

function PaymentForm({ onDone }: { onDone: () => void }) {
  const create = useCreatePayment();
  const toast = useToast();
  const [amount, setAmount] = useState("25.00");
  const [currency, setCurrency] = useState("usd");
  // One key per attempt at this payment: pressing "Pay" again after a
  // network error retries the same payment instead of charging twice.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const cents = Math.round(Number(amount) * 100);
  const valid = Number.isFinite(cents) && cents >= 50 && cents <= 99_999_999;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const res = await create.mutateAsync({ amountCents: cents, currency, idempotencyKey }).catch(() => undefined);
    if (res) {
      toast(
        res.replayed
          ? `Payment #${res.payment.id} was already made. No second charge.`
          : `Paid ${formatMoney(res.payment.amount_cents, res.payment.currency)}`,
      );
      onDone();
    }
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      {create.isError && <ErrorNotice error={create.error} action="Payment not completed" />}
      <div className="form-row">
        <Field label="Amount" hint="At least 0.50">
          <input className="input num" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>
        <Field label="Currency">
          <select className="select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="usd">USD</option>
            <option value="eur">EUR</option>
            <option value="gbp">GBP</option>
            <option value="inr">INR</option>
          </select>
        </Field>
      </div>
      <p className="field-hint">
        Safe to retry: this form sends the same Idempotency-Key every time, so a retry after an error never charges twice.
      </p>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={!valid || create.isPending}>
          {create.isPending ? "Paying…" : valid ? `Pay ${formatMoney(cents, currency)}` : "Pay"}
        </button>
      </div>
    </form>
  );
}
