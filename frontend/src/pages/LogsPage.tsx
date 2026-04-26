import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ScrollText,
  RefreshCw,
  Download,
  Filter,
  ArrowDown,
  Pause,
  Play,
  ChevronDown,
} from "lucide-react";
import { fetchLogs } from "../api/client";

type ParsedLog = {
  timestamp: string;
  level: string;
  message: string;
};

const LEVEL_OPTIONS = ["ALL", "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"];
const LINE_OPTIONS = [100, 250, 500, 1000];

function ThemedDropdown({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div
      className={`logs-dropdown logs-select ${className ?? ""}`.trim()}
      ref={rootRef}
    >
      <button
        type="button"
        className={`logs-dropdown-trigger ${open ? "open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      >
        <span>{value}</span>
        <ChevronDown size={14} />
      </button>

      {open ? (
        <div
          className="logs-dropdown-menu"
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={value === option}
              className={`logs-dropdown-option ${value === option ? "active" : ""}`}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function normalizeLevel(raw: string): string {
  const level = raw.toUpperCase();

  if (level === "INF") return "INFO";
  if (level === "WRN") return "WARNING";
  if (level === "ERR") return "ERROR";
  if (level === "DBG") return "DEBUG";
  if (level === "CRT") return "CRITICAL";

  return level;
}

function parseLogLine(line: string): ParsedLog {
  const match = line.match(
    /^(?<ts>\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(?<level>[A-Z]{3,8})\s+(?<msg>.*)$/,
  );

  if (!match || !match.groups) {
    return {
      timestamp: "",
      level: "INFO",
      message: line,
    };
  }

  return {
    timestamp: match.groups.ts,
    level: normalizeLevel(match.groups.level),
    message: match.groups.msg,
  };
}

function levelTone(level: string): string {
  if (level === "ERROR" || level === "CRITICAL") {
    return "logs-level-error";
  }

  if (level === "WARNING") {
    return "logs-level-warning";
  }

  if (level === "DEBUG") {
    return "logs-level-debug";
  }

  if (level === "INFO") {
    return "logs-level-info";
  }

  return "logs-level-default";
}

export default function LogsPage() {
  const [lines, setLines] = useState(500);
  const [level, setLevel] = useState("ALL");
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  const {
    data: logs = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["logs-page", lines],
    queryFn: () => fetchLogs(lines),
    refetchInterval: autoRefresh ? 10000 : false,
    refetchIntervalInBackground: false,
  });

  const parsedLogs = useMemo(() => logs.map(parseLogLine), [logs]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();

    return parsedLogs.filter((entry) => {
      const levelMatch = level === "ALL" || entry.level === level;
      const searchMatch =
        q.length === 0 ||
        entry.message.toLowerCase().includes(q) ||
        entry.level.toLowerCase().includes(q) ||
        entry.timestamp.toLowerCase().includes(q);

      return levelMatch && searchMatch;
    });
  }, [parsedLogs, level, search]);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filteredLogs, autoScroll]);

  const errorCount = filteredLogs.filter(
    (log) => log.level === "ERROR" || log.level === "CRITICAL",
  ).length;

  const warningCount = filteredLogs.filter(
    (log) => log.level === "WARNING",
  ).length;

  const handleExport = () => {
    const payload = filteredLogs
      .map((entry) =>
        `${entry.timestamp} ${entry.level} ${entry.message}`.trim(),
      )
      .join("\n");

    const blob = new Blob([payload], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `autoscan-logs-${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="page-wrapper"
      style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}
    >
      <div className="logs-page-header">
        <div className="logs-title-wrap">
          <div className="logs-title-row">
            <span className="logs-title-icon">
              <ScrollText size={19} />
            </span>
            <h1 className="heading-lg">Container Logs</h1>
          </div>
          <p className="logs-title-subtext">
            Live application logs from docker-autoscan
          </p>
        </div>

        <div className="logs-actions">
          <button
            type="button"
            className="btn btn-primary logs-btn"
            onClick={handleExport}
          >
            <Download size={13} />
            Export
          </button>
          <button
            type="button"
            className="btn btn-primary logs-btn"
            onClick={() => refetch()}
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="logs-toolbar">
        <div className="logs-controls-row">
          <div className="logs-inline-filter">
            <Filter size={13} style={{ color: "#8f9aab" }} />
            <ThemedDropdown
              value={level}
              options={LEVEL_OPTIONS}
              onChange={setLevel}
              ariaLabel="Log level"
              className="logs-dropdown-level"
            />
          </div>

          <div className="logs-inline-filter">
            <span className="logs-inline-filter-label">Lines:</span>
            <ThemedDropdown
              value={String(lines)}
              options={LINE_OPTIONS.map(String)}
              onChange={(next) => setLines(Number(next))}
              ariaLabel="Log line limit"
              className="logs-dropdown-lines"
            />
          </div>

          <input
            type="text"
            className="logs-search"
            placeholder="Search logs..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <button
            type="button"
            className={`logs-pill-toggle ${autoRefresh ? "logs-pill-live-on" : "logs-pill-live-off"}`}
            onClick={() => setAutoRefresh((value) => !value)}
          >
            {autoRefresh ? <Pause size={12} /> : <Play size={12} />}
            {autoRefresh ? "Live" : "Paused"}
          </button>

          <button
            type="button"
            className={`logs-pill-toggle ${autoScroll ? "logs-pill-scroll-on" : "logs-pill-scroll-off"}`}
            onClick={() => setAutoScroll((value) => !value)}
          >
            <ArrowDown size={12} />
            Auto-scroll
          </button>
        </div>
      </div>

      <div className="logs-stats-line">
        <span>
          Showing {filteredLogs.length} of {logs.length} entries
        </span>
        <span className="logs-severity-error">{errorCount} errors</span>
        <span className="logs-severity-warning">{warningCount} warnings</span>
      </div>

      <div className="logs-shell">
        {isLoading ? (
          <div className="flex-center" style={{ minHeight: "12rem" }}>
            <RefreshCw size={18} className="animate-spin" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-small" style={{ padding: "0.6rem 0.5rem" }}>
            No log entries found.
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.08rem" }}
          >
            {filteredLogs.map((entry, index) => (
              <div
                key={`${entry.timestamp}-${entry.level}-${index}`}
                className="logs-row"
              >
                <span className="logs-ts">{entry.timestamp || "-"}</span>
                <span className={`logs-level ${levelTone(entry.level)}`}>
                  {entry.level}
                </span>
                <span className="logs-message">{entry.message}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
