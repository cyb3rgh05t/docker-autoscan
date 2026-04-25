import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  fetchStats,
  fetchHealth,
  fetchScans,
  fetchHistory,
  fetchLogs,
} from "../api/client";
import {
  ListTodo,
  CheckCircle2,
  Clock,
  Activity,
  LayoutDashboard,
  Circle,
  XCircle,
} from "lucide-react";
import PageHeader from "../components/PageHeader";

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconClass: string;
}) {
  return (
    <div
      className="card-stat"
      style={{ display: "flex", alignItems: "center", gap: "1rem" }}
    >
      <div
        className={`icon-wrapper ${iconClass}`}
        style={{ borderRadius: "var(--radius-lg)", padding: "0.75rem" }}
      >
        <Icon size={22} />
      </div>
      <div>
        <p className="text-stat-value">{value}</p>
        <p className="text-stat-label">{label}</p>
      </div>
    </div>
  );
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600)
    return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function timeAgo(iso: string): string {
  const diff = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    return `${h}h ${m}m ago`;
  }
  return `${Math.floor(diff / 86400)}d ago`;
}

function priorityTone(priority: number): {
  background: string;
  color: string;
  border: string;
  label: string;
} {
  if (priority >= 10) {
    return {
      background: "rgba(220, 38, 38, 0.12)",
      color: "#fca5a5",
      border: "1px solid rgba(248, 113, 113, 0.25)",
      label: `high · ${priority}`,
    };
  }

  if (priority > 0) {
    return {
      background: "rgba(245, 158, 11, 0.10)",
      color: "#fcd34d",
      border: "1px solid rgba(251, 191, 36, 0.22)",
      label: `medium · ${priority}`,
    };
  }

  return {
    background: "rgba(34, 197, 94, 0.08)",
    color: "#86efac",
    border: "1px solid rgba(74, 222, 128, 0.18)",
    label: `normal · ${priority}`,
  };
}

export default function Dashboard() {
  const runtimeLogContainerRef = useRef<HTMLDivElement | null>(null);

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    refetchInterval: 5000,
  });

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 30000,
  });

  const { data: scans = [] } = useQuery({
    queryKey: ["scans"],
    queryFn: fetchScans,
    refetchInterval: 5000,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["history"],
    queryFn: () => fetchHistory(50),
    refetchInterval: 5000,
  });

  const { data: runtimeLogs = [] } = useQuery({
    queryKey: ["runtime-logs"],
    queryFn: () => fetchLogs(220),
    refetchInterval: 5000,
  });

  useEffect(() => {
    const container = runtimeLogContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [runtimeLogs]);

  return (
    <div
      className="page-wrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        width: "100%",
      }}
    >
      <PageHeader
        title="Dashboard"
        subtitle={
          health?.version
            ? `v${health.version} · ${health.commit}`
            : "Connecting…"
        }
        icon={LayoutDashboard}
        actions={
          <div
            className={
              health?.status === "ok"
                ? "badge badge-success"
                : "badge badge-error"
            }
          >
            <Circle size={7} style={{ fill: "currentColor" }} />
            {health?.status === "ok" ? "Online" : "Offline"}
          </div>
        }
      />

      <div className="grid-stats">
        <StatCard
          label="Scans Remaining"
          value={stats?.scans_remaining ?? "–"}
          icon={ListTodo}
          iconClass="icon-wrapper-primary"
        />
        <StatCard
          label="Scans Processed"
          value={stats?.scans_processed ?? "–"}
          icon={CheckCircle2}
          iconClass="icon-wrapper-success"
        />
        <StatCard
          label="Uptime"
          value={stats ? formatUptime(stats.uptime_seconds) : "–"}
          icon={Clock}
          iconClass="icon-wrapper-warning"
        />
        <StatCard
          label="Targets"
          value={
            stats
              ? `${Object.values(stats.targets_available).filter(Boolean).length} / ${Object.keys(stats.targets_available).length}`
              : "–"
          }
          icon={Activity}
          iconClass="icon-wrapper-purple"
        />
      </div>

      {stats && Object.keys(stats.targets_available).length > 0 && (
        <div className="card">
          <h2 className="heading-md" style={{ marginBottom: "1rem" }}>
            Target Status
          </h2>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            {Object.entries(stats.targets_available).map(([name, ok]) => (
              <div key={name} className="card-row">
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.8125rem",
                    color: "var(--color-text)",
                  }}
                >
                  {name}
                </span>
                <span
                  className={ok ? "badge badge-success" : "badge badge-error"}
                >
                  {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  {ok ? "Available" : "Unavailable"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1.5rem",
        }}
      >
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 className="heading-md">Pending Scans</h2>
              <p className="text-small">
                {scans.length === 0
                  ? "No folders waiting right now"
                  : `${scans.length} folder${scans.length === 1 ? "" : "s"} currently queued`}
              </p>
            </div>
            <Link
              to="/scans"
              className="btn btn-ghost"
              style={{ textDecoration: "none" }}
            >
              Open Queue
            </Link>
          </div>
          {scans.length === 0 ? (
            <p className="text-small">Queue is empty</p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {scans.slice(0, 8).map((s) => (
                <div
                  key={s.folder}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.85rem 0.95rem",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-lg)",
                    background: "rgba(255, 255, 255, 0.01)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      className="truncate"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--color-text)",
                        fontSize: "0.78rem",
                        marginBottom: "0.35rem",
                      }}
                    >
                      {s.folder}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.65rem",
                        alignItems: "center",
                        flexWrap: "wrap",
                        fontSize: "0.72rem",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      <span>queued {timeAgo(s.time)}</span>
                      <span>
                        scheduled {new Date(s.time).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      ...priorityTone(s.priority),
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      borderRadius: "999px",
                      padding: "0.35rem 0.6rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {priorityTone(s.priority).label}
                  </span>
                </div>
              ))}
              {scans.length > 8 && (
                <div className="text-small" style={{ paddingTop: "0.15rem" }}>
                  +{scans.length - 8} more in queue
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="heading-md" style={{ marginBottom: "1rem" }}>
            Queue Summary
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                background: "rgba(255, 255, 255, 0.01)",
                padding: "1rem",
              }}
            >
              <p className="text-stat-label">Queued</p>
              <p className="text-stat-value">{scans.length}</p>
            </div>
            <div
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                background: "rgba(255, 255, 255, 0.01)",
                padding: "1rem",
              }}
            >
              <p className="text-stat-label">History Entries</p>
              <p className="text-stat-value">{history.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ width: "100%" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1rem",
            flexWrap: "wrap",
          }}
        >
          <h2 className="heading-md">Scan History</h2>
          <p className="text-small">Last {history.length} events</p>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            background: "rgba(255, 255, 255, 0.01)",
          }}
        >
          {history.length === 0 ? (
            <p className="text-small" style={{ padding: "1rem 1.1rem" }}>
              No history yet
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {history.map((h, index) => (
                <div
                  key={h.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto minmax(0, 1fr) auto",
                    alignItems: "center",
                    gap: "0.9rem",
                    padding: "0.85rem 1.1rem",
                    borderBottom:
                      index === history.length - 1
                        ? "none"
                        : "1px solid var(--color-border)",
                    fontSize: "0.75rem",
                  }}
                >
                  {h.status === "success" ? (
                    <CheckCircle2
                      size={14}
                      color="var(--color-success)"
                      style={{ flexShrink: 0 }}
                    />
                  ) : (
                    <XCircle
                      size={14}
                      color="var(--color-error)"
                      style={{ flexShrink: 0 }}
                    />
                  )}
                  <span
                    className="truncate"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--color-text)",
                    }}
                  >
                    [
                    {new Date(
                      h.completed_at || h.triggered_at,
                    ).toLocaleTimeString()}
                    ] {h.target} :: {h.folder}
                    {h.message ? ` :: ${h.message}` : ""}
                  </span>
                  <span
                    style={{
                      color: "var(--color-text-muted)",
                      flexShrink: 0,
                    }}
                  >
                    {h.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ width: "100%" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1rem",
            flexWrap: "wrap",
          }}
        >
          <h2 className="heading-md">Runtime Logs</h2>
          <p className="text-small">
            Tail of activity.log ({runtimeLogs.length} lines)
          </p>
        </div>

        <div
          ref={runtimeLogContainerRef}
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            background: "#070707",
            padding: "0.9rem 1rem",
            maxHeight: "22rem",
            overflow: "auto",
          }}
        >
          {runtimeLogs.length === 0 ? (
            <p className="text-small">No runtime logs yet.</p>
          ) : (
            <pre
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                lineHeight: 1.55,
                color: "var(--color-text)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {runtimeLogs.join("\n")}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
