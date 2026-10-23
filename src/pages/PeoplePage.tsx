import { Search, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";

import { useCreateUser, useUsers } from "../api/hooks";
import type { Role } from "../api/types";
import { useSession } from "../auth";
import { useToast } from "../components/toast";
import { Avatar, Dialog, EmptyState, ErrorNotice, Field, PageHead, Pager, RoleBadge, SkeletonRows } from "../components/ui";
import { useDebounced } from "../hooks/useDebounced";
import { formatDate } from "../lib/format";

const PAGE = 25;

export function PeoplePage() {
  const { allows } = useSession();
  const [text, setText] = useState("");
  const q = useDebounced(text.trim());
  const [offset, setOffset] = useState(0);
  const [adding, setAdding] = useState(false);
  const users = useUsers(q, offset, PAGE);
  const items = users.data?.items ?? [];

  return (
    <>
      <PageHead
        title="People"
        intro="Everyone who can sign in and receive equipment."
        actions={
          allows("admin") && (
            <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
              <UserPlus size={18} aria-hidden="true" /> Add person
            </button>
          )
        }
      />

      <div className="toolbar">
        <label className="search">
          <span className="visually-hidden">Search people</span>
          <Search size={17} aria-hidden="true" />
          <input
            className="input"
            type="search"
            placeholder="Search by name or email"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setOffset(0);
            }}
          />
        </label>
      </div>

      {users.isError ? (
        <ErrorNotice error={users.error} action="Couldn't load people" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col" className="col-optional">
                  Email
                </th>
                <th scope="col">Role</th>
                <th scope="col" className="col-optional">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {users.isPending ? (
                <SkeletonRows cols={4} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState title="Nobody matches">Check the spelling, or search by email.</EmptyState>
                  </td>
                </tr>
              ) : (
                items.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <span className="cell-person">
                        <Avatar name={u.name} />
                        <strong>{u.name}</strong>
                      </span>
                    </td>
                    <td className="muted col-optional">{u.email}</td>
                    <td>
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="cell-sub col-optional">{formatDate(u.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {users.data && <Pager offset={offset} limit={PAGE} total={users.data.total} noun="people" onChange={setOffset} />}

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add person" intro="They can sign in straight away with this password.">
        <AddPersonForm onDone={() => setAdding(false)} />
      </Dialog>
    </>
  );
}

const roleHelp: Record<Role, string> = {
  viewer: "Can see assets and their own payments.",
  manager: "Can also add, allocate and update assets.",
  admin: "Can also add people and delete assets.",
};

function AddPersonForm({ onDone }: { onDone: () => void }) {
  const create = useCreateUser();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("viewer");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const user = await create.mutateAsync({ name, email, password, role }).catch(() => undefined);
    if (user) {
      toast(`Added ${user.name}`);
      onDone();
    }
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      {create.isError && <ErrorNotice error={create.error} />}
      <Field label="Full name">
        <input className="input" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <Field label="Email">
        <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Password" hint="8 to 72 characters.">
        <input
          className="input"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Field label="Role" hint={roleHelp[role]}>
        <select className="select" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="viewer">Viewer</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
      </Field>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={create.isPending}>
          {create.isPending ? "Adding…" : "Add person"}
        </button>
      </div>
    </form>
  );
}
