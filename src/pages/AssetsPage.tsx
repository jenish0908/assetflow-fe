import { Plus, Search } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAssets, useCreateAsset, useUsersByIds } from "../api/hooks";
import type { AssetStatus } from "../api/types";
import { useSession } from "../auth";
import { AssetTag } from "../components/AssetTag";
import { useToast } from "../components/toast";
import { Avatar, Dialog, EmptyState, ErrorNotice, Field, PageHead, Pager, SkeletonRows, StatusBadge } from "../components/ui";
import { useDebounced } from "../hooks/useDebounced";
import { currentHolder } from "../lib/assets";
import { timeAgo } from "../lib/format";

const PAGE = 25;
const filters: { value: AssetStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "available", label: "Available" },
  { value: "allocated", label: "Allocated" },
  { value: "maintenance", label: "Maintenance" },
  { value: "retired", label: "Retired" },
];

export function AssetsPage() {
  const { allows } = useSession();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") ?? "") as AssetStatus | "";
  const offset = Number(params.get("offset") ?? 0) || 0;
  const [search, setSearch] = useState(params.get("q") ?? "");
  const q = useDebounced(search.trim());
  const [adding, setAdding] = useState(false);

  // Keep the URL in step with the search box, so the view can be shared.
  useEffect(() => {
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (q) next.set("q", q);
        else next.delete("q");
        if (q !== (p.get("q") ?? "")) next.delete("offset");
        return next;
      },
      { replace: true },
    );
  }, [q, setParams]);

  const assets = useAssets({ q, status, offset, limit: PAGE });
  const items = assets.data?.items ?? [];
  const holders = useUsersByIds(items.flatMap((a) => (currentHolder(a) ? [currentHolder(a)!.user_id] : [])));

  function setParam(key: string, value: string) {
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "offset") next.delete("offset");
      return next;
    });
  }

  const filtered = q !== "" || status !== "";

  return (
    <>
      <PageHead
        title="Assets"
        intro="Every tracked device. Select one to allocate it, change its status or see its history."
        actions={
          allows("manager") && (
            <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
              <Plus size={18} aria-hidden="true" /> Add asset
            </button>
          )
        }
      />

      <div className="toolbar">
        <label className="search">
          <span className="visually-hidden">Search by tag or name</span>
          <Search size={17} aria-hidden="true" />
          <input className="input" type="search" placeholder="Search by tag or name" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <div className="segmented" role="group" aria-label="Filter by status">
          {filters.map((f) => (
            <button key={f.value} type="button" aria-pressed={status === f.value} onClick={() => setParam("status", f.value)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {assets.isError ? (
        <ErrorNotice error={assets.error} action="Couldn't load assets" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Tag</th>
                <th scope="col">Name</th>
                <th scope="col" className="col-optional">
                  Category
                </th>
                <th scope="col">Status</th>
                <th scope="col">With</th>
                <th scope="col" className="col-optional">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {assets.isPending ? (
                <SkeletonRows cols={6} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    {filtered ? (
                      <EmptyState title="No assets match">Try another search, or show all statuses.</EmptyState>
                    ) : (
                      <EmptyState
                        title="No assets yet"
                        action={
                          allows("manager") && (
                            <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
                              Add the first asset
                            </button>
                          )
                        }
                      >
                        Add laptops, monitors and phones to start tracking who has them.
                      </EmptyState>
                    )}
                  </td>
                </tr>
              ) : (
                items.map((a) => {
                  const holder = currentHolder(a);
                  const person = holder ? holders.get(holder.user_id) : undefined;
                  return (
                    <tr key={a.id} className="row-link" onClick={() => navigate(`/assets/${a.id}`)}>
                      <td>
                        <AssetTag tag={a.tag} to={`/assets/${a.id}`} />
                      </td>
                      <td>{a.name}</td>
                      <td className="muted capitalize col-optional">{a.category}</td>
                      <td>
                        <StatusBadge status={a.status} />
                      </td>
                      <td>
                        {holder ? (
                          <span className="cell-person">
                            <Avatar name={person?.name ?? "?"} />
                            {person?.name ?? `User #${holder.user_id}`}
                          </span>
                        ) : (
                          <span className="muted">Nobody</span>
                        )}
                      </td>
                      <td className="cell-sub col-optional">{timeAgo(a.updated_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {assets.data && (
        <Pager offset={offset} limit={PAGE} total={assets.data.total} noun="assets" onChange={(o) => setParam("offset", o ? String(o) : "")} />
      )}

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add asset" intro="The tag is what's printed on the device's label.">
        <AddAssetForm
          onDone={(id) => {
            setAdding(false);
            if (id) navigate(`/assets/${id}`);
          }}
        />
      </Dialog>
    </>
  );
}

function AddAssetForm({ onDone }: { onDone: (createdId?: number) => void }) {
  const create = useCreateAsset();
  const toast = useToast();
  const [tag, setTag] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("laptop");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const asset = await create.mutateAsync({ tag: tag.trim().toUpperCase(), name, category }).catch(() => undefined);
    if (asset) {
      toast(`Added ${asset.tag}`);
      onDone(asset.id);
    }
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      {create.isError && <ErrorNotice error={create.error} />}
      <div className="form-row">
        <Field label="Tag" hint="For example L-205">
          <input className="input" required maxLength={64} value={tag} onChange={(e) => setTag(e.target.value)} autoFocus />
        </Field>
        <Field label="Category">
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="laptop">Laptop</option>
            <option value="monitor">Monitor</option>
            <option value="phone">Phone</option>
            <option value="dock">Dock</option>
            <option value="tablet">Tablet</option>
            <option value="other">Other</option>
          </select>
        </Field>
      </div>
      <Field label="Name" hint="Make and model, so people recognise it">
        <input className="input" required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={() => onDone()}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={create.isPending}>
          {create.isPending ? "Adding…" : "Add asset"}
        </button>
      </div>
    </form>
  );
}
