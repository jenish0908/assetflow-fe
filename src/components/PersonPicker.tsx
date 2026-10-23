import { Search } from "lucide-react";
import { useState } from "react";

import { useUsers } from "../api/hooks";
import type { User } from "../api/types";
import { useDebounced } from "../hooks/useDebounced";
import { Avatar, RoleBadge } from "./ui";

/** Search the directory and pick one person. */
export function PersonPicker({ selected, onSelect }: { selected?: User; onSelect: (u: User) => void }) {
  const [text, setText] = useState("");
  const q = useDebounced(text.trim(), 200);
  const users = useUsers(q, 0, 8);
  const items = users.data?.items ?? [];

  return (
    <div>
      <label className="search" style={{ maxWidth: "none" }}>
        <span className="visually-hidden">Search people by name or email</span>
        <Search size={17} aria-hidden="true" />
        <input className="input" type="search" placeholder="Search by name or email" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      </label>
      <ul className="picker-list" role="listbox" aria-label="People">
        {items.map((u) => (
          <li key={u.id}>
            <button type="button" role="option" aria-selected={selected?.id === u.id} className="picker-option" onClick={() => onSelect(u)}>
              <Avatar name={u.name} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <div>{u.name}</div>
                <div className="cell-sub">{u.email}</div>
              </span>
              <RoleBadge role={u.role} />
            </button>
          </li>
        ))}
        {users.data && items.length === 0 && <li className="cell-sub" style={{ padding: 10 }}>Nobody matches “{q}”.</li>}
      </ul>
    </div>
  );
}
