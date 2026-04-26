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
  XCircle,
  Server,
  ScrollText,
  History,
  Inbox,
  RefreshCw,
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
        <p className="text-stat-label">{label}</p>
        <p className="text-stat-value">{value}</p>
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

function parseTargetLabel(raw: string): { name: string; endpoint?: string } {
  const match = raw.match(/^([^()]+)\((.+)\)$/);
  if (!match) {
    return { name: raw };
  }

  return {
    name: match[1].trim(),
    endpoint: match[2].trim(),
  };
}

function targetBadgeStyle(targetName: string) {
  const normalized = targetName.trim().toLowerCase() || "target";
  let hash = 0;

  for (let i = 0; i < normalized.length; i += 1) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;

  return {
    background: `hsla(${hue}, 85%, 52%, 0.16)`,
    border: `1px solid hsla(${hue}, 90%, 62%, 0.46)`,
    color: `hsl(${hue}, 90%, 72%)`,
  };
}

function toneForLogLevel(level: string): {
  tone: "error" | "warning" | "debug" | "success" | "info";
} {
  if (level === "ERR" || level === "ERROR" || level === "CRT") {
    return { tone: "error" };
  }

  if (level === "WRN" || level === "WARNING") {
    return { tone: "warning" };
  }

  if (level === "DBG" || level === "DEBUG") {
    return { tone: "debug" };
  }

  if (level === "INF" || level === "INFO") {
    return { tone: "success" };
  }

  return { tone: "info" };
}

function parseRuntimeLogLine(line: string): {
  timestamp?: string;
  level?: string;
  message: string;
  tone: "error" | "warning" | "debug" | "success" | "info";
} {
  const match = line.match(
    /^(?<ts>\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(?<level>[A-Z]{3,8})\s+(?<msg>.*)$/,
  );

  if (!match || !match.groups) {
    return {
      message: line,
      tone: "info",
    };
  }

  const level = match.groups.level;
  const tone = toneForLogLevel(level);

  return {
    timestamp: match.groups.ts,
    level,
    message: match.groups.msg,
    tone: tone.tone,
  };
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

  const {
    data: stats,
    refetch: refetchStats,
    isFetching: statsFetching,
  } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    refetchInterval: 5000,
  });

  const {
    data: health,
    refetch: refetchHealth,
    isFetching: healthFetching,
  } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 30000,
  });

  const {
    data: scans = [],
    refetch: refetchScans,
    isFetching: scansFetching,
  } = useQuery({
    queryKey: ["scans"],
    queryFn: fetchScans,
    refetchInterval: 5000,
  });

  const {
    data: history = [],
    refetch: refetchHistory,
    isFetching: historyFetching,
  } = useQuery({
    queryKey: ["history"],
    queryFn: () => fetchHistory(10),
    refetchInterval: 5000,
  });

  const {
    data: runtimeLogs = [],
    refetch: refetchRuntimeLogs,
    isFetching: runtimeLogsFetching,
  } = useQuery({
    queryKey: ["runtime-logs"],
    queryFn: () => fetchLogs(50),
    refetchInterval: 5000,
  });

  const isRefreshing =
    statsFetching ||
    healthFetching ||
    scansFetching ||
    historyFetching ||
    runtimeLogsFetching;

  const refreshDashboard = async () => {
    await Promise.all([
      refetchStats(),
      refetchHealth(),
      refetchScans(),
      refetchHistory(),
      refetchRuntimeLogs(),
    ]);
  };

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
        subtitle="System status and scan activity"
        icon={LayoutDashboard}
        actions={
          <div className="dashboard-header-actions">
            <button
              type="button"
              className="btn btn-primary dashboard-refresh-btn"
              onClick={refreshDashboard}
              disabled={isRefreshing}
            >
              <RefreshCw
                size={14}
                className={isRefreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
            <div
              className={
                health?.status === "ok"
                  ? "dashboard-status-badge dashboard-status-online"
                  : "dashboard-status-badge dashboard-status-offline"
              }
            >
              <span className="dashboard-status-dot" />
              {health?.status === "ok" ? "Online" : "Offline"}
            </div>
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
        <StatCard
          label="In Queue"
          value={scans.length}
          icon={Inbox}
          iconClass="icon-wrapper-primary"
        />
        <StatCard
          label="History Entries"
          value={history.length}
          icon={History}
          iconClass="icon-wrapper-success"
        />
      </div>

      {stats && Object.keys(stats.targets_available).length > 0 && (
        <div className="card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.65rem",
              marginBottom: "1rem",
            }}
          >
            <span className="card-icon-chip card-icon-blue">
              <Server size={19} />
            </span>
            <h2 className="heading-md">Target Status</h2>
          </div>
          <div className="dashboard-target-grid">
            {Object.entries(stats.targets_available).map(([rawName, ok]) => {
              const parsed = parseTargetLabel(rawName);

              return (
                <div key={rawName} className="dashboard-target-card">
                  <div className="dashboard-target-head">
                    <div className="dashboard-target-name-wrap">
                      <span className="dashboard-target-icon">
                        <Server size={13} />
                      </span>
                      <span className="dashboard-target-name">
                        {parsed.name}
                      </span>
                    </div>
                    <span
                      className={
                        ok ? "badge badge-success" : "badge badge-error"
                      }
                    >
                      {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {ok ? "Available" : "Unavailable"}
                    </span>
                  </div>
                  {parsed.endpoint ? (
                    <div className="dashboard-target-endpoint">
                      {parsed.endpoint}
                    </div>
                  ) : null}
                </div>
              );
            })}
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
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}
            >
              <span className="card-icon-chip card-icon-primary">
                <ListTodo size={19} />
              </span>
              <div>
                <h2 className="heading-md">Pending Scans</h2>
                <p className="text-small">
                  {scans.length === 0
                    ? "No folders waiting right now"
                    : `${scans.length} folder${scans.length === 1 ? "" : "s"} currently queued`}
                </p>
              </div>
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
            <p className="text-small dashboard-empty-hint">Queue is empty</p>
          ) : (
            <div className="dashboard-pending-list">
              {scans.slice(0, 8).map((s) => (
                <div key={s.folder} className="dashboard-pending-item">
                  <div style={{ minWidth: 0 }}>
                    <div className="dashboard-pending-path truncate">
                      {s.folder}
                    </div>
                    <div className="dashboard-pending-meta">
                      <span className="dashboard-mini-chip">
                        queued {timeAgo(s.time)}
                      </span>
                      <span className="dashboard-mini-chip">
                        scheduled {new Date(s.time).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <span
                    style={{ ...priorityTone(s.priority) }}
                    className="dashboard-priority-pill"
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
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}
          >
            <span className="card-icon-chip card-icon-success">
              <CheckCircle2 size={19} />
            </span>
            <h2 className="heading-md">Scan History</h2>
          </div>
          <p className="text-small">Last {history.length} events</p>
        </div>
        <div className="dashboard-history-shell">
          {history.length === 0 ? (
            <p className="text-small" style={{ padding: "1rem 1.1rem" }}>
              No history yet
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {history.map((h, index) => {
                const targetName = parseTargetLabel(h.target).name;

                return (
                  <div
                    key={h.id}
                    className="dashboard-history-row"
                    style={{
                      borderBottom:
                        index === history.length - 1 ? "none" : undefined,
                    }}
                  >
                    {h.status === "success" ? (
                      <CheckCircle2
                        size={14}
                        color="var(--color-success)"
                        style={{ flexShrink: 0, marginTop: "0.1rem" }}
                      />
                    ) : (
                      <XCircle
                        size={14}
                        color="var(--color-error)"
                        style={{ flexShrink: 0, marginTop: "0.1rem" }}
                      />
                    )}
                    <div className="dashboard-history-content">
                      <div className="dashboard-history-meta">
                        <span className="dashboard-mini-chip">
                          {new Date(
                            h.completed_at || h.triggered_at,
                          ).toLocaleTimeString()}
                        </span>
                        <span
                          className="badge badge-mini"
                          style={targetBadgeStyle(targetName)}
                        >
                          {targetName}
                        </span>
                        <span
                          className={
                            h.status === "success"
                              ? "badge badge-success badge-mini"
                              : "badge badge-error badge-mini"
                          }
                        >
                          {h.status}
                        </span>
                      </div>
                      <div className="dashboard-history-folder">{h.folder}</div>
                      {h.message ? (
                        <div className="dashboard-history-message">
                          {h.message}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ width: "100%" }}>
        <div className="dashboard-logs-card-head">
          <div className="dashboard-recent-title-wrap">
            <span className="dashboard-recent-icon">
              <ScrollText size={18} />
            </span>
            <h2 className="heading-md">Recent Logs</h2>
            <span className="dashboard-recent-meta">
              Last {runtimeLogs.length} entries
            </span>
          </div>
          <Link to="/logs" className="dashboard-recent-link">
            View All
          </Link>
        </div>

        <div ref={runtimeLogContainerRef} className="dashboard-logs-shell">
          {runtimeLogs.length === 0 ? (
            <p className="text-small">No runtime logs yet.</p>
          ) : (
            <div className="dashboard-log-list">
              {runtimeLogs.map((line, index) => {
                const parsed = parseRuntimeLogLine(line);

                return (
                  <div
                    key={`${line}-${index}`}
                    className={`dashboard-log-row dashboard-log-${parsed.tone}`}
                  >
                    {parsed.timestamp ? (
                      <span className="dashboard-log-ts">
                        {parsed.timestamp}
                      </span>
                    ) : null}
                    {parsed.level ? (
                      <span
                        className={`dashboard-log-level dashboard-log-level-${parsed.tone}`}
                      >
                        {parsed.level}
                      </span>
                    ) : null}
                    <span className="dashboard-log-message">
                      {parsed.message}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
