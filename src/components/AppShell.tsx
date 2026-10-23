import { useQuery } from "@tanstack/react-query";
import { Bell, Bot, CreditCard, LayoutGrid, LogOut, Package, Users } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { useSession } from "../auth";
import { roleLabel } from "../lib/format";
import { Avatar } from "./ui";

function BrandMark() {
  return (
    <svg width="30" height="22" viewBox="0 0 30 20" aria-hidden="true">
      <rect x="0" y="0" width="30" height="20" rx="3" fill="#F5C518" />
      <circle cx="5.5" cy="10" r="2" fill="#16233F" />
      <rect x="10" y="4" width="2" height="12" fill="#16233F" />
      <rect x="13.5" y="4" width="1" height="12" fill="#16233F" />
      <rect x="16" y="4" width="3" height="12" fill="#16233F" />
      <rect x="20.5" y="4" width="1" height="12" fill="#16233F" />
      <rect x="23" y="4" width="2" height="12" fill="#16233F" />
    </svg>
  );
}

function Item({ to, icon, children, end }: { to: string; icon: ReactNode; children: ReactNode; end?: boolean }) {
  return (
    <NavLink to={to} end={end} className="nav-link">
      {icon}
      <span className="nav-label">{children}</span>
    </NavLink>
  );
}

/** Polls the API's readiness probe so a dead backend is visible at a glance. */
function Health() {
  const ready = useQuery({
    queryKey: ["readyz"],
    queryFn: async () => (await fetch("/api/readyz")).ok,
    refetchInterval: 15_000,
    retry: false,
  });
  const state = ready.isPending ? "unknown" : ready.data ? "ok" : "down";
  const text = { unknown: "Checking API…", ok: "API and database up", down: "API unreachable" }[state];
  return (
    <div className="health" role="status">
      <span className="health-dot" data-state={state} aria-hidden="true" />
      {text}
    </div>
  );
}

export function AppShell() {
  const { user, signOut } = useSession();
  return (
    <div className="shell">
      <aside className="sidebar">
        <NavLink to="/" className="brand" aria-label="AssetFlow overview">
          <BrandMark />
          AssetFlow
        </NavLink>
        <nav className="nav" aria-label="Main">
          <Item to="/" end icon={<LayoutGrid size={18} aria-hidden="true" />}>
            Overview
          </Item>
          <Item to="/assets" icon={<Package size={18} aria-hidden="true" />}>
            Assets
          </Item>
          <Item to="/people" icon={<Users size={18} aria-hidden="true" />}>
            People
          </Item>
          <Item to="/payments" icon={<CreditCard size={18} aria-hidden="true" />}>
            Payments
          </Item>
          <Item to="/notifications" icon={<Bell size={18} aria-hidden="true" />}>
            Notifications
          </Item>
          <Item to="/assistant" icon={<Bot size={18} aria-hidden="true" />}>
            Assistant
          </Item>
        </nav>
        <div className="sidebar-foot">
          {user && (
            <div className="whoami">
              <Avatar name={user.name} />
              <div className="whoami-text" style={{ minWidth: 0 }}>
                <div className="whoami-name">{user.name}</div>
                <div className="whoami-role">{roleLabel[user.role]}</div>
              </div>
              <button type="button" className="signout" onClick={signOut} aria-label="Sign out" title="Sign out">
                <LogOut size={18} />
              </button>
            </div>
          )}
          <Health />
        </div>
      </aside>
      <main className="main" id="main">
        <div className="page">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
