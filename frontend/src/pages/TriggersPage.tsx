import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchConfig, saveConfig } from "../api/client";
import { useState, useEffect } from "react";

import {
  Plus,
  Trash2,
  Save,
  ChevronDown,
  ChevronUp,
  Webhook,
} from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../components/PageHeader";

type ArrTrigger = {
  name: string;
  priority: number;
  rewrite: { from: string; to: string }[];
};

function ArrSection({
  title,
  triggers,
  onChange,
}: {
  title: string;
  triggers: ArrTrigger[];
  onChange: (triggers: ArrTrigger[]) => void;
}) {
  const [open, setOpen] = useState(true);

  const add = () =>
    onChange([
      ...triggers,
      { name: title.toLowerCase(), priority: 0, rewrite: [] },
    ]);

  const remove = (i: number) =>
    onChange(triggers.filter((_, idx) => idx !== i));

  const update = (i: number, field: keyof ArrTrigger, value: unknown) =>
    onChange(
      triggers.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)),
    );

  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden">
      <button
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 1rem",
          background: "var(--color-card-hover, rgba(255,255,255,0.03))",
          border: "none",
          cursor: "pointer",
          color: "var(--color-text-white)",
          textAlign: "left",
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <span style={{ fontWeight: 600 }}>{title}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span
            style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}
          >
            {triggers.length} configured
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
          {triggers.map((t, i) => (
            <div
              key={i}
              className="card-nested"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="label">Webhook name (URL slug)</label>
                  <input
                    className="input"
                    value={t.name}
                    onChange={(e) => update(i, "name", e.target.value)}
                    placeholder="sonarr-main"
                  />
                </div>
                <div className="form-group" style={{ width: "7rem" }}>
                  <label className="label">Priority</label>
                  <input
                    className="input"
                    type="number"
                    value={t.priority}
                    onChange={(e) =>
                      update(i, "priority", Number(e.target.value))
                    }
                  />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button
                    className="btn btn-danger"
                    style={{ padding: "0.5rem 0.75rem" }}
                    onClick={() => remove(i)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Rewrite rules */}
              <div>
                <div
                  className="flex-between"
                  style={{ marginBottom: "0.5rem" }}
                >
                  <label className="label" style={{ marginBottom: 0 }}>
                    Rewrite Rules
                  </label>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                    onClick={() =>
                      update(i, "rewrite", [
                        ...(t.rewrite ?? []),
                        { from: "", to: "" },
                      ])
                    }
                  >
                    + Add rule
                  </button>
                </div>
                {(t.rewrite ?? []).map((rw, ri) => (
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
                        const rules = [...(t.rewrite ?? [])];
                        rules[ri] = { ...rules[ri], from: e.target.value };
                        update(i, "rewrite", rules);
                      }}
                    />
                    <input
                      className="input"
                      style={{ fontSize: "0.75rem" }}
                      placeholder="to"
                      value={rw.to}
                      onChange={(e) => {
                        const rules = [...(t.rewrite ?? [])];
                        rules[ri] = { ...rules[ri], to: e.target.value };
                        update(i, "rewrite", rules);
                      }}
                    />
                    <button
                      className="btn-icon btn-icon-delete"
                      onClick={() => {
                        const rules = (t.rewrite ?? []).filter(
                          (_, idx) => idx !== ri,
                        );
                        update(i, "rewrite", rules);
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--color-text-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Webhook URL:{" "}
                <span style={{ color: "var(--color-text)" }}>
                  /triggers/{t.name || "…"}
                </span>
              </p>
            </div>
          ))}

          <button
            className="btn"
            onClick={add}
            style={{ alignSelf: "flex-start" }}
          >
            <Plus size={14} />
            Add {title} instance
          </button>
        </div>
      )}
    </div>
  );
}

export default function TriggersPage() {
  const qc = useQueryClient();
  const { data: config, isLoading } = useQuery({
    queryKey: ["config"],
    queryFn: fetchConfig,
  });

  // ── Local draft state – edited in-memory, saved only on button click ──
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [dirty, setDirty] = useState(false);

  // Initialise / sync draft when server config loads (but NOT while user is editing)
  useEffect(() => {
    if (config && !dirty) {
      setDraft(config as Record<string, unknown>);
    }
  }, [config, dirty]);

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
    mutationFn: saveConfig,
    onSuccess: () => {
      toast.success("Triggers saved");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["config"] });
    },
    onError: () => toast.error("Failed to save"),
  });

  if (isLoading && !draft.triggers) {
    return (
      <div style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
        Loading…
      </div>
    );
  }

  const triggers = (draft.triggers as Record<string, ArrTrigger[]>) || {};

  const patchDraft = (patch: Record<string, unknown>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const handleTriggersChange = (key: string, value: ArrTrigger[]) => {
    patchDraft({ triggers: { ...triggers, [key]: value } });
  };

  const handleAuthChange = (field: "username" | "password", value: string) => {
    const auth = (draft.authentication as Record<string, string>) || {};
    patchDraft({ authentication: { ...auth, [field]: value } });
  };

  const arrTypes = ["sonarr", "radarr", "lidarr", "readarr"] as const;

  return (
    <div
      className="page-wrapper"
      style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
    >
      <PageHeader
        title="Triggers"
        subtitle="Configure webhook endpoints for *arr apps"
        icon={Webhook}
        actions={
          <div
            style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
          >
            {dirty && (
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--color-text-muted)",
                }}
              >
                Unsaved changes
              </span>
            )}
            {dirty && (
              <button
                className="btn btn-ghost"
                onClick={() => {
                  if (config) {
                    setDraft(config as Record<string, unknown>);
                  }
                  setDirty(false);
                }}
              >
                Discard
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={() => saveMut.mutate(draft as Record<string, unknown>)}
              disabled={saveMut.isPending || !dirty}
            >
              <Save size={15} />
              {saveMut.isPending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        }
      />

      {/* Auth section */}
      <div
        className="card"
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <h2 className="heading-md">Webhook Authentication</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
          }}
        >
          <div className="form-group">
            <label className="label">Username</label>
            <input
              className="input"
              value={
                (draft.authentication as Record<string, string>)?.username || ""
              }
              onChange={(e) => handleAuthChange("username", e.target.value)}
              placeholder="Leave empty to disable auth"
            />
          </div>
          <div className="form-group">
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={
                (draft.authentication as Record<string, string>)?.password || ""
              }
              onChange={(e) => handleAuthChange("password", e.target.value)}
            />
          </div>
        </div>
      </div>

      {arrTypes.map((type) => (
        <ArrSection
          key={type}
          title={type.charAt(0).toUpperCase() + type.slice(1)}
          triggers={(triggers[type] as ArrTrigger[]) || []}
          onChange={(v) => handleTriggersChange(type, v)}
        />
      ))}
    </div>
  );
}
