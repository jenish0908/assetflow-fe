import { ArrowLeft } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useAllocate, useAsset, useDeleteAsset, useReturn, useSetStatus, useUpdateAsset, useUsersByIds } from "../api/hooks";
import type { AssetStatus, AssetWithAllocations, User } from "../api/types";
import { useSession } from "../auth";
import { AssetLabel } from "../components/AssetTag";
import { PersonPicker } from "../components/PersonPicker";
import { useToast } from "../components/toast";
import { Avatar, Dialog, EmptyState, ErrorNotice, Field, Notice, StatusBadge } from "../components/ui";
import { formatDate, formatDateTime, statusLabel } from "../lib/format";
import { NotFoundPage } from "./NotFoundPage";

type Action = "allocate" | "return" | "status" | "edit" | "delete" | null;

export function AssetDetailPage() {
  const id = Number(useParams().id);
  const asset = useAsset(id);
  const { allows } = useSession();
  const [action, setAction] = useState<Action>(null);
  const holders = useUsersByIds(asset.data?.allocations.map((a) => a.user_id) ?? []);

  if (asset.isError) {
    if ((asset.error as { status?: number }).status === 404) return <NotFoundPage what="asset" />;
    return <ErrorNotice error={asset.error} action="Couldn't load this asset" />;
  }
  if (!asset.data) return <p className="muted">Loading asset…</p>;

  const a = asset.data;
  const current = a.allocations.find((al) => !al.returned_at);
  const holder = current ? holders.get(current.user_id) : undefined;
  const close = () => setAction(null);

  return (
    <>
      <Link to="/assets" className="btn btn-ghost btn-sm" style={{ marginBottom: 16, paddingLeft: 0 }}>
        <ArrowLeft size={16} aria-hidden="true" /> All assets
      </Link>

      <div className="detail-top">
        <AssetLabel tag={a.tag} />
        <div className="detail-meta">
          <h1>{a.name}</h1>
          <dl>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={a.status} />
              </dd>
            </div>
            <div>
              <dt>With</dt>
              <dd>{current ? (holder?.name ?? `User #${current.user_id}`) : "Nobody"}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd className="capitalize">{a.category}</dd>
            </div>
            <div>
              <dt>Added</dt>
              <dd>{formatDate(a.created_at)}</dd>
            </div>
          </dl>
          {allows("manager") && (
            <div className="actions">
              {a.status === "available" && (
                <button type="button" className="btn btn-primary" onClick={() => setAction("allocate")}>
                  Allocate
                </button>
              )}
              {a.status === "allocated" && (
                <button type="button" className="btn btn-primary" onClick={() => setAction("return")}>
                  Mark as returned
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={() => setAction("status")}>
                Change status
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setAction("edit")}>
                Edit details
              </button>
              {allows("admin") && (
                <button type="button" className="btn btn-danger" onClick={() => setAction("delete")}>
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <section className="panel" aria-labelledby="history-title">
        <div className="panel-head">
          <h3 id="history-title">Allocation history</h3>
          <span className="cell-sub num">{a.allocations.length} total</span>
        </div>
        <div className="panel-body">
          {a.allocations.length === 0 ? (
            <EmptyState title="Never allocated">When someone receives this asset, it is recorded here.</EmptyState>
          ) : (
            <ol className="timeline">
              {a.allocations.map((al) => {
                const person = holders.get(al.user_id);
                return (
                  <li key={al.id}>
                    <span className="timeline-node" data-active={!al.returned_at} aria-hidden="true" />
                    <div className="cell-person">
                      <Avatar name={person?.name ?? "?"} />
                      <div>
                        <strong>{person?.name ?? `User #${al.user_id}`}</strong>
                        {person && <div className="cell-sub">{person.email}</div>}
                      </div>
                    </div>
                    <div className="timeline-when">
                      {formatDateTime(al.allocated_at)}
                      <br />
                      {al.returned_at ? `returned ${formatDateTime(al.returned_at)}` : <strong style={{ color: "var(--allocated)" }}>Has it now</strong>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>

      <Dialog open={action === "allocate"} onClose={close} title={`Allocate ${a.tag}`} intro="They'll get a notification once it's assigned.">
        <AllocateForm asset={a} onDone={close} />
      </Dialog>
      <Dialog open={action === "return"} onClose={close} title={`Mark ${a.tag} as returned`}>
        <ReturnForm asset={a} holderName={holder?.name} onDone={close} />
      </Dialog>
      <Dialog open={action === "status"} onClose={close} title={`Change status of ${a.tag}`}>
        <StatusForm asset={a} onDone={close} />
      </Dialog>
      <Dialog open={action === "edit"} onClose={close} title={`Edit ${a.tag}`}>
        <EditForm asset={a} onDone={close} />
      </Dialog>
      <Dialog open={action === "delete"} onClose={close} title={`Delete ${a.tag}?`}>
        <DeleteForm asset={a} onDone={close} />
      </Dialog>
    </>
  );
}

function AllocateForm({ asset, onDone }: { asset: AssetWithAllocations; onDone: () => void }) {
  const allocate = useAllocate(asset.id);
  const toast = useToast();
  const [person, setPerson] = useState<User>();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!person) return;
    const ok = await allocate.mutateAsync(person.id).then(() => true, () => false);
    if (ok) {
      toast(`${asset.tag} allocated to ${person.name}`);
      onDone();
    }
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      {allocate.isError && <ErrorNotice error={allocate.error} />}
      <PersonPicker selected={person} onSelect={setPerson} />
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={!person || allocate.isPending}>
          {person ? `Allocate to ${person.name}` : "Choose a person"}
        </button>
      </div>
    </form>
  );
}

function ReturnForm({ asset, holderName, onDone }: { asset: AssetWithAllocations; holderName?: string; onDone: () => void }) {
  const ret = useReturn(asset.id);
  const toast = useToast();
  return (
    <div className="form-grid">
      {ret.isError && <ErrorNotice error={ret.error} />}
      <p>
        {holderName ? `${holderName} no longer has ${asset.tag}.` : `${asset.tag} is back.`} It becomes available to allocate again.
      </p>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onDone}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={ret.isPending}
          onClick={() =>
            ret.mutate(undefined, {
              onSuccess: () => {
                toast(`${asset.tag} marked as returned`);
                onDone();
              },
            })
          }
        >
          Mark as returned
        </button>
      </div>
    </div>
  );
}

const settable: AssetStatus[] = ["available", "maintenance", "retired"];

function StatusForm({ asset, onDone }: { asset: AssetWithAllocations; onDone: () => void }) {
  const setStatus = useSetStatus(asset.id);
  const toast = useToast();
  const [status, setValue] = useState<AssetStatus>(asset.status === "allocated" ? "available" : asset.status);

  if (asset.status === "allocated") {
    return <Notice tone="warn">Someone has this asset. Mark it as returned before changing its status.</Notice>;
  }
  if (asset.status === "retired") {
    return <Notice tone="warn">Retired assets stay retired, so their history is kept as it was.</Notice>;
  }

  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        setStatus.mutate(status, {
          onSuccess: () => {
            toast(`${asset.tag} is now ${statusLabel[status].toLowerCase()}`);
            onDone();
          },
        });
      }}
    >
      {setStatus.isError && <ErrorNotice error={setStatus.error} />}
      <Field label="New status" hint="Retiring is permanent.">
        <select className="select" value={status} onChange={(e) => setValue(e.target.value as AssetStatus)}>
          {settable.map((s) => (
            <option key={s} value={s} disabled={s === asset.status}>
              {statusLabel[s]}
            </option>
          ))}
        </select>
      </Field>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={setStatus.isPending || status === asset.status}>
          Change status
        </button>
      </div>
    </form>
  );
}

function EditForm({ asset, onDone }: { asset: AssetWithAllocations; onDone: () => void }) {
  const update = useUpdateAsset(asset.id);
  const toast = useToast();
  const [name, setName] = useState(asset.name);
  const [category, setCategory] = useState(asset.category);

  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate(
          { name: name !== asset.name ? name : undefined, category: category !== asset.category ? category : undefined },
          {
            onSuccess: () => {
              toast(`Saved ${asset.tag}`);
              onDone();
            },
          },
        );
      }}
    >
      {update.isError && <ErrorNotice error={update.error} />}
      <Field label="Name">
        <input className="input" required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Category">
        <input className="input" required maxLength={100} value={category} onChange={(e) => setCategory(e.target.value)} />
      </Field>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={update.isPending || (name === asset.name && category === asset.category)}>
          Save changes
        </button>
      </div>
    </form>
  );
}

function DeleteForm({ asset, onDone }: { asset: AssetWithAllocations; onDone: () => void }) {
  const del = useDeleteAsset(asset.id);
  const toast = useToast();
  const navigate = useNavigate();
  return (
    <div className="form-grid">
      {del.isError && <ErrorNotice error={del.error} />}
      <p>
        This removes {asset.tag} for good. Assets with allocation history can't be deleted. Retire them instead, so the history is kept.
      </p>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onDone}>
          Keep it
        </button>
        <button
          type="button"
          className="btn btn-danger"
          disabled={del.isPending}
          onClick={() =>
            del.mutate(undefined, {
              onSuccess: () => {
                toast(`Deleted ${asset.tag}`);
                navigate("/assets");
              },
            })
          }
        >
          Delete {asset.tag}
        </button>
      </div>
    </div>
  );
}
