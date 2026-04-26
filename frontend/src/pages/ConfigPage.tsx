import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchConfig,
  saveConfig,
  fetchHealth,
  fetchStats,
  type AutoscanConfig,
} from "../api/client";
import { useState, useEffect, useRef } from "react";

import {
  Save,
  RefreshCw,
  AlertCircle,
  Settings,
  Info,
  BookOpen,
  FileCode2,
  Cpu,
  Database,
  GitBranch,
  ShieldCheck,
  Server,
  Workflow,
} from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../components/PageHeader";

const tabs = [
  {
    key: "about",
    label: "About",
    icon: Info,
    description: "Project overview and runtime details",
  },
  {
    key: "howto",
    label: "How To",
    icon: BookOpen,
    description: "Quick usage and setup guidance",
  },
  {
    key: "config",
    label: "Config",
    icon: FileCode2,
    description: "Complete raw configuration editor",
  },
] as const;

type SettingsTab = (typeof tabs)[number]["key"];

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600)
    return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function ConfigPage() {
  const qc = useQueryClient();
  const {
    data: config,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["config"],
    queryFn: fetchConfig,
  });

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    refetchInterval: 5000,
  });

  const [raw, setRaw] = useState("");
  const [parseError, setParseError] = useState("");
  const [tab, setTab] = useState<SettingsTab>("about");
  const [dirty, setDirty] = useState(false);
  const rawEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const lastSavedRawRef = useRef("");

  useEffect(() => {
    if (config) {
      const next = JSON.stringify(config, null, 2);
      setRaw(next);
      lastSavedRawRef.current = next;
      setDirty(false);
    }
  }, [config]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (tab !== "config" || !rawEditorRef.current) {
      return;
    }

    const editor = rawEditorRef.current;
    editor.style.height = "0px";
    editor.style.height = `${editor.scrollHeight}px`;
  }, [raw, tab]);

  const saveMut = useMutation({
    mutationFn: (data: AutoscanConfig) => saveConfig(data),
    onSuccess: (_result, variables) => {
      toast.success("Config saved");
      const pretty = JSON.stringify(variables, null, 2);
      setRaw(pretty);
      lastSavedRawRef.current = pretty;
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["config"] });
    },
    onError: () => toast.error("Failed to save config"),
  });

  const handleSave = () => {
    try {
      const parsed = JSON.parse(raw);
      setParseError("");
      saveMut.mutate(parsed);
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  if (isLoading) {
    return (
      <div className="flex-center" style={{ height: "16rem" }}>
        <RefreshCw
          size={24}
          className="animate-spin"
          style={{ color: "var(--color-text-muted)" }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="alert-error"
        style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
      >
        <AlertCircle size={20} />
        <span>Failed to load config. Is the backend running?</span>
      </div>
    );
  }

  return (
    <div
      className="page-wrapper"
      style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
    >
      <PageHeader
        title="Settings"
        subtitle="Documentation, setup help, and raw config editing"
        icon={Settings}
        actions={
          tab === "config" ? (
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saveMut.isPending || !!parseError}
            >
              {saveMut.isPending ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              Save Changes
            </button>
          ) : null
        }
      />

      <div className="tab-container">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={tab === key ? "tab tab-active" : "tab"}
          >
            <Icon size={15} />
            <span className="tab-label">{label}</span>
          </button>
        ))}
      </div>

      {tab === "config" && parseError && (
        <div
          className="infobox infobox-error"
          style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          {parseError}
        </div>
      )}

      {tab === "about" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1rem",
          }}
        >
          <div
            className="card"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              background:
                "radial-gradient(circle at 100% 0%, rgba(216,237,24,0.08), rgba(10,10,10,1) 50%)",
            }}
          >
            <div>
              <h2 className="heading-md" style={{ marginBottom: "0.35rem" }}>
                Autoscan Control Plane
              </h2>
              <p className="text-body">
                Autoscan verbindet Webhook-Events mit deinen Media-Zielen und
                steuert die Queue-Verarbeitung zentral. Die App kombiniert eine
                FastAPI Runtime mit einer React UI fur Monitoring, Debugging und
                Konfigurationspflege.
              </p>
            </div>
            <div
              className="card-nested"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              <div className="card-row">
                <span className="text-stat-label">Version</span>
                <span className="text-mono">
                  {health?.version ?? "unknown"}
                </span>
              </div>
              <div className="card-row">
                <span className="text-stat-label">Commit</span>
                <span className="text-mono">{health?.commit ?? "unknown"}</span>
              </div>
              <div className="card-row">
                <span className="text-stat-label">Uptime</span>
                <span className="text-mono">
                  {stats ? formatUptime(stats.uptime_seconds) : "unknown"}
                </span>
              </div>
              <div className="card-row">
                <span className="text-stat-label">Queue</span>
                <span className="text-mono">
                  {stats ? `${stats.scans_remaining} waiting` : "unknown"}
                </span>
              </div>
            </div>
          </div>

          <div
            className="card"
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <h2 className="heading-md">Core Modules</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: "0.7rem",
              }}
            >
              {[
                {
                  title: "Webhook Ingress",
                  body: "Sonarr, Radarr, Lidarr, Readarr und manuelle Trigger.",
                  Icon: Workflow,
                },
                {
                  title: "Target Dispatch",
                  body: "Plex, Emby, Jellyfin oder chained Autoscan Targets.",
                  Icon: Server,
                },
                {
                  title: "Queue + History",
                  body: "Priorisierte Queue, persistiert in SQLite, mit Verlauf.",
                  Icon: Database,
                },
                {
                  title: "Runtime API",
                  body: "FastAPI Endpunkte fur Stats, Health, Logs und Config.",
                  Icon: Cpu,
                },
              ].map(({ title, body, Icon }) => (
                <div key={title} className="card-nested">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.35rem",
                    }}
                  >
                    <Icon size={14} style={{ color: "var(--color-primary)" }} />
                    <p className="heading-sm">{title}</p>
                  </div>
                  <p className="text-small">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <div
            className="card"
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <h2 className="heading-md">How Autoscan Works</h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              {[
                "Trigger event arrives at /triggers/{name}",
                "Path and metadata are normalized and queued",
                "Processor picks next job based on priority",
                "Configured targets receive scan/update request",
                "Result is written into history and activity.log",
              ].map((step, index) => (
                <div key={step} className="card-row">
                  <span className="badge badge-primary badge-mini">
                    {index + 1}
                  </span>
                  <span className="text-body">{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="card"
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <h2 className="heading-md">Ops Quick Reference</h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              <div className="card-row">
                <span className="text-stat-label">Config path</span>
                <span className="text-mono">/config/config.yml</span>
              </div>
              <div className="card-row">
                <span className="text-stat-label">Database</span>
                <span className="text-mono">/config/autoscan.db</span>
              </div>
              <div className="card-row">
                <span className="text-stat-label">Log file</span>
                <span className="text-mono">/config/activity.log</span>
              </div>
              <div className="card-row">
                <span className="text-stat-label">Health API</span>
                <span className="text-mono">/api/health</span>
              </div>
              <div className="card-row">
                <span className="text-stat-label">Stats API</span>
                <span className="text-mono">/api/stats</span>
              </div>
            </div>
            <div
              className="infobox infobox-info"
              style={{ marginTop: "0.25rem" }}
            >
              <ShieldCheck size={14} style={{ marginRight: "0.4rem" }} />
              Tipp: Prufe nach Updates immer zuerst Version und Commit uber
              <span className="text-mono" style={{ marginLeft: "0.35rem" }}>
                /api/health
              </span>
              .
            </div>
            <div
              className="card-nested"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              <div>
                <p className="text-stat-label">Build Track</p>
                <p className="text-body">main, dev, nightly, manual dispatch</p>
              </div>
              <span className="badge badge-purple">
                <GitBranch size={12} /> GitHub Actions + GHCR
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "howto" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="infobox infobox-info">
            Open the service on{" "}
            <span className="text-mono">http://localhost:3030</span> when
            running in Docker, or use the Vite dev server on{" "}
            <span className="text-mono">http://localhost:5173</span> during
            local frontend development.
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1rem",
            }}
          >
            <div
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.9rem",
              }}
            >
              <h2 className="heading-md">Quick Start</h2>
              <div className="card-nested">
                <p className="text-mono">docker-compose up -d --build</p>
              </div>
              <p className="text-small">
                This builds the single image, mounts the config directory, and
                starts the API plus UI together.
              </p>
            </div>

            <div
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.9rem",
              }}
            >
              <h2 className="heading-md">Webhook Format</h2>
              <div className="card-nested">
                <p className="text-mono">POST /triggers/&#123;name&#125;</p>
              </div>
              <p className="text-small">
                The trigger name must match the configured trigger entry in your
                config.
              </p>
            </div>

            <div
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.9rem",
              }}
            >
              <h2 className="heading-md">Important Files</h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.65rem",
                }}
              >
                <div className="card-row">
                  <span className="text-mono">config/config.yml</span>
                  <span className="text-small">Runtime config</span>
                </div>
                <div className="card-row">
                  <span className="text-mono">config/autoscan.db</span>
                  <span className="text-small">Queue database</span>
                </div>
                <div className="card-row">
                  <span className="text-mono">config/activity.log</span>
                  <span className="text-small">Runtime log</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "config" ? (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            className="flex-between"
            style={{
              padding: "0.625rem 1rem",
              background: "rgba(255,255,255,0.02)",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              config.yml (JSON view)
            </span>
            <span
              style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}
            >
              {raw.split("\n").length} lines
            </span>
          </div>
          <textarea
            ref={rawEditorRef}
            className="input"
            style={{
              minHeight: "60vh",
              fontFamily: "var(--font-mono)",
              fontSize: "0.8125rem",
              borderRadius: 0,
              border: "none",
              resize: "vertical",
              width: "100%",
              display: "block",
              overflow: "hidden",
            }}
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setDirty(e.target.value !== lastSavedRawRef.current);
              setParseError("");
            }}
            spellCheck={false}
          />
        </div>
      ) : null}
    </div>
  );
}
