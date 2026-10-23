import { Link } from "react-router-dom";

import { useOverview } from "../api/hooks";
import type { AssetStatus, Stats } from "../api/types";
import { AssetTag } from "../components/AssetTag";
import { Avatar, EmptyState, ErrorNotice, PageHead } from "../components/ui";
import { formatCount, formatMoney, statusLabel, timeAgo } from "../lib/format";

const statusOrder: AssetStatus[] = ["available", "allocated", "maintenance", "retired"];
const statusColor: Record<AssetStatus, string> = {
  available: "var(--available)",
  allocated: "var(--allocated)",
  maintenance: "var(--maintenance)",
  retired: "var(--retired)",
};

/** One bar for the whole fleet: where every device is right now. */
function FleetBar({ stats }: { stats: Stats }) {
  const total = stats.assets;
  return (
    <section className="panel fleet" aria-labelledby="fleet-title">
      <div className="fleet-head">
        <div>
          <h2 id="fleet-title" className="visually-hidden">
            Fleet by status
          </h2>
          <span className="fleet-total num">{formatCount(total)}</span> <span className="muted">assets tracked</span>
        </div>
        <Link to="/assets" className="btn btn-ghost btn-sm">
          Open asset list
        </Link>
      </div>
      <div className="fleet-bar" role="img" aria-label={statusOrder.map((s) => `${statusLabel[s]}: ${stats.assets_by_status[s] ?? 0}`).join(", ")}>
        {statusOrder.map((s) => {
          const n = stats.assets_by_status[s] ?? 0;
          return n > 0 ? <span key={s} style={{ flexGrow: n, background: statusColor[s] }} /> : null;
        })}
      </div>
      <ul className="fleet-legend">
        {statusOrder.map((s) => (
          <li key={s}>
            <Link to={`/assets?status=${s}`}>
              <span className="fleet-legend-swatch" style={{ background: statusColor[s] }} aria-hidden="true" />
              <span className="num">{formatCount(stats.assets_by_status[s] ?? 0)}</span>
              <span className="fleet-legend-name">{statusLabel[s]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function OverviewPage() {
  const overview = useOverview();

  if (overview.isError) return <ErrorNotice error={overview.error} action="Couldn't load the overview" />;
  if (!overview.data) {
    return (
      <>
        <PageHead title="Overview" />
        <div className="panel fleet">
          <div className="skeleton" style={{ height: 22 }} />
        </div>
      </>
    );
  }

  const { stats, recent_allocations: recent } = overview.data;
  const jobs = stats.jobs_by_status;
  const paid = stats.payments_by_status.succeeded;
  const waiting = (jobs.pending ?? 0) + (jobs.running ?? 0);

  return (
    <>
      <PageHead title="Overview" intro="Where your equipment is, and what has happened to it lately." />
      <FleetBar stats={stats} />

      <div className="figures">
        <div className="figure">
          <span className="num">{formatCount(stats.active_allocations)}</span>
          <span className="figure-label">devices with someone right now</span>
        </div>
        <div className="figure">
          <span className="num">{formatCount(stats.users)}</span>
          <span className="figure-label">people</span>
        </div>
        <div className="figure">
          <span className="num">{paid ? formatMoney(paid.amount_cents, "usd") : "$0.00"}</span>
          <span className="figure-label">collected in {formatCount(paid?.count ?? 0)} payments</span>
        </div>
        <div className="figure">
          <span className="num">{formatCount(waiting)}</span>
          <span className="figure-label">notifications waiting to send</span>
        </div>
      </div>

      <div className="overview-grid">
        <section className="panel" aria-labelledby="recent-title">
          <div className="panel-head">
            <h3 id="recent-title">Recent allocations</h3>
          </div>
          {recent.length === 0 ? (
            <EmptyState title="Nothing allocated yet">Allocate an asset and it shows up here.</EmptyState>
          ) : (
            <ul className="activity">
              {recent.map((e) => (
                <li key={e.id}>
                  <AssetTag tag={e.asset_tag} to={`/assets/${e.asset_id}`} />
                  <div style={{ minWidth: 0 }}>
                    <div className="cell-person">
                      <Avatar name={e.user_name} />
                      <span>
                        {e.returned_at ? "Returned by " : "With "}
                        <strong>{e.user_name}</strong>
                      </span>
                    </div>
                  </div>
                  <span className="cell-sub">{timeAgo(e.returned_at ?? e.allocated_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel" aria-labelledby="queue-title">
          <div className="panel-head">
            <h3 id="queue-title">Notification queue</h3>
            <Link to="/notifications" className="btn btn-ghost btn-sm">
              View feed
            </Link>
          </div>
          <div className="panel-body">
            <dl className="queue">
              {(["pending", "running", "done", "dead"] as const).map((s) => (
                <div key={s}>
                  <dt>
                    <span className="status" data-status={s}>
                      {{ pending: "Waiting", running: "Sending", done: "Delivered", dead: "Failed" }[s]}
                    </span>
                  </dt>
                  <dd className="num">{formatCount(jobs[s] ?? 0)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </div>
    </>
  );
}
