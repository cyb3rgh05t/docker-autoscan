import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchConfig, saveConfig } from "../api/client";
import { useEffect, useState } from "react";
import { unstable_useBlocker as useBlocker } from "react-router-dom";
import {
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  MonitorPlay,
} from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../components/PageHeader";

type PlexConfig = {
  url: string;
  token: string;
  rewrite: { from: string; to: string }[];
};
type EmbyConfig = {
  url: string;
  token: string;
  rewrite: { from: string; to: string }[];
};
type JFConfig = {
  url: string;
  token: string;
  rewrite: { from: string; to: string }[];
};
type ASTConfig = {
  url: string;
  username: string;
  password: string;
  rewrite: { from: string; to: string }[];
};

function TargetSection<T extends { url: string }>({
  title,
  dotColor,
  targets,
  fields,
  emptyTarget,
  onChange,
}: {
  title: string;
  dotColor: string;
  targets: T[];
  fields: {
    key: keyof T;
    label: string;
    type?: string;
    placeholder?: string;
  }[];
  emptyTarget: T;
  onChange: (targets: T[]) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}
    >
      <button
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 1rem",
          background: "rgba(255,255,255,0.02)",
          border: "none",
          cursor: "pointer",
          color: "var(--color-text-white)",
          textAlign: "left",
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <span
            className={`status-dot`}
            style={{
              background: dotColor,
              width: "0.625rem",
              height: "0.625rem",
              borderRadius: "50%",
              flexShrink: 0,
            }}
          />
          <span style={{ fontWeight: 600 }}>{title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span
            style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}
          >
            {targets.length} configured
          </span>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {open && (
        <div
          style={{
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {targets.map((t, i) => (
            <div
              key={i}
              className="card-nested"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                }}
              >
                {fields.map(({ key, label, type = "text", placeholder }) => (
                  <div key={String(key)} className="form-group">
                    <label className="label">{label}</label>
                    <input
                      className="input"
                      type={type}
                      placeholder={placeholder}
                      value={String(t[key] ?? "")}
                      onChange={(e) => {
                        const updated = [...targets];
                        updated[i] = { ...t, [key]: e.target.value };
                        onChange(updated);
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Rewrite rules */}
              <div>
                <div
                  className="flex-between"
                  style={{ marginBottom: "0.5rem" }}
                >
                  <label
                    className="label"
                    style={{ marginBottom: 0, fontSize: "0.75rem" }}
                  >
                    Rewrite Rules
                  </label>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                    onClick={() => {
                      const updated = [...targets];
                      const rw = [
                        ...((
                          t as unknown as {
                            rewrite: { from: string; to: string }[];
                          }
                        ).rewrite || []),
                        { from: "", to: "" },
                      ];
                      updated[i] = { ...t, rewrite: rw } as T;
                      onChange(updated);
                    }}
                  >
                    + Add rule
                  </button>
                </div>
                {(
                  (t as unknown as { rewrite: { from: string; to: string }[] })
                    .rewrite || []
                ).map((rw, ri) => (
                  <div
                    key={ri}
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <input
                      className="input"
                      style={{ fontSize: "0.75rem" }}
                      placeholder="from (regex)"
                      value={rw.from}
                      onChange={(e) => {
                        const updated = [...targets];
                        const rules = [
                          ...(
                            t as unknown as {
                              rewrite: { from: string; to: string }[];
                            }
                          ).rewrite,
                        ];
                        rules[ri] = { ...rules[ri], from: e.target.value };
                        updated[i] = { ...t, rewrite: rules } as T;
                        onChange(updated);
                      }}
                    />
                    <input
                      className="input"
                      style={{ fontSize: "0.75rem" }}
                      placeholder="to"
                      value={rw.to}
                      onChange={(e) => {
                        const updated = [...targets];
                        const rules = [
                          ...(
                            t as unknown as {
                              rewrite: { from: string; to: string }[];
                            }
                          ).rewrite,
                        ];
                        rules[ri] = { ...rules[ri], to: e.target.value };
                        updated[i] = { ...t, rewrite: rules } as T;
                        onChange(updated);
                      }}
                    />
                    <button
                      className="btn-icon btn-icon-delete"
                      onClick={() => {
                        const updated = [...targets];
                        const rules = (
                          t as unknown as {
                            rewrite: { from: string; to: string }[];
                          }
                        ).rewrite.filter((_, idx) => idx !== ri);
                        updated[i] = { ...t, rewrite: rules } as T;
                        onChange(updated);
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                className="btn btn-danger"
                style={{
                  alignSelf: "flex-start",
                  fontSize: "0.75rem",
                  padding: "0.35rem 0.75rem",
                }}
                onClick={() => onChange(targets.filter((_, idx) => idx !== i))}
              >
                <Trash2 size={12} />
                Remove instance
              </button>
            </div>
          ))}

          <button
            className="btn"
            style={{ alignSelf: "flex-start" }}
            onClick={() => onChange([...targets, { ...emptyTarget }])}
          >
            <Plus size={14} />
            Add {title} instance
          </button>
        </div>
      )}
    </div>
  );
}

export default function TargetsPage() {
  const qc = useQueryClient();
  const { data: config, isLoading } = useQuery({
    queryKey: ["config"],
    queryFn: fetchConfig,
  });

  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (config && !dirty) {
      setDraft(config as Record<string, unknown>);
    }
  }, [config, dirty]);

  const blocker = useBlocker(dirty);

  useEffect(() => {
    if (blocker.state !== "blocked") {
      return;
    }

    const shouldLeave = window.confirm(
      "You have unsaved target changes. Leave this page without saving?",
    );

    if (shouldLeave) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

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

  const saveMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => saveConfig(payload),
    onSuccess: () => {
      toast.success("Targets saved");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["config"] });
    },
    onError: () => toast.error("Failed to save"),
  });

  if (isLoading && !draft.targets) {
    return (
      <div style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
        Loading…
      </div>
    );
  }

  const targets = (draft.targets as Record<string, unknown[]>) || {};

  const patchDraft = (patch: Record<string, unknown>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const update = (key: string, value: unknown[]) => {
    patchDraft({ targets: { ...targets, [key]: value } });
  };

  const saveAll = () => {
    saveMut.mutate(draft);
  };

  const discard = () => {
    if (!config) {
      return;
    }
    setDraft(config as Record<string, unknown>);
    setDirty(false);
  };

  return (
    <div
      className="page-wrapper"
      style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
    >
      <PageHeader
        title="Targets"
        subtitle="Configure media servers to receive scan requests"
        icon={MonitorPlay}
        actions={
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            {dirty && (
              <span
                className="text-small"
                style={{ color: "var(--color-text-muted)" }}
              >
                Unsaved changes
              </span>
            )}
            {dirty && (
              <button
                className="btn btn-ghost"
                onClick={discard}
                disabled={saveMut.isPending}
              >
                Discard
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={saveAll}
              disabled={saveMut.isPending || !dirty}
            >
              <Save size={15} />
              {saveMut.isPending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        }
      />

      <TargetSection<PlexConfig>
        title="Plex"
        dotColor="#e5a00d"
        targets={(targets.plex || []) as PlexConfig[]}
        emptyTarget={{ url: "", token: "", rewrite: [] }}
        fields={[
          { key: "url", label: "Plex URL", placeholder: "http://plex:32400" },
          {
            key: "token",
            label: "X-Plex-Token",
            type: "password",
            placeholder: "your-plex-token",
          },
        ]}
        onChange={(v) => update("plex", v)}
      />

      <TargetSection<EmbyConfig>
        title="Emby"
        dotColor="#52b54b"
        targets={(targets.emby || []) as EmbyConfig[]}
        emptyTarget={{ url: "", token: "", rewrite: [] }}
        fields={[
          { key: "url", label: "Emby URL", placeholder: "http://emby:8096" },
          { key: "token", label: "API Key", type: "password" },
        ]}
        onChange={(v) => update("emby", v)}
      />

      <TargetSection<JFConfig>
        title="Jellyfin"
        dotColor="#aa5cc3"
        targets={(targets.jellyfin || []) as JFConfig[]}
        emptyTarget={{ url: "", token: "", rewrite: [] }}
        fields={[
          {
            key: "url",
            label: "Jellyfin URL",
            placeholder: "http://jellyfin:8096",
          },
          { key: "token", label: "API Key", type: "password" },
        ]}
        onChange={(v) => update("jellyfin", v)}
      />

      <TargetSection<ASTConfig>
        title="Autoscan (chain)"
        dotColor="var(--color-primary)"
        targets={(targets.autoscan || []) as ASTConfig[]}
        emptyTarget={{ url: "", username: "", password: "", rewrite: [] }}
        fields={[
          {
            key: "url",
            label: "Autoscan URL",
            placeholder: "http://autoscan2:3030",
          },
          { key: "username", label: "Username" },
          { key: "password", label: "Password", type: "password" },
        ]}
        onChange={(v) => update("autoscan", v)}
      />
    </div>
  );
}
