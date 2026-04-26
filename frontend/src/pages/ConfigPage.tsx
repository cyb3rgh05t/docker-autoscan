import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchConfig, saveConfig, type AutoscanConfig } from "../api/client";
import { useState, useEffect } from "react";
import {
  Save,
  RefreshCw,
  AlertCircle,
  Settings,
  Shield,
  TimerReset,
  SlidersHorizontal,
  Workflow,
} from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../components/PageHeader";
import { useUnsavedChanges } from "../components/UnsavedChangesContext";

type DraftConfig = Record<string, unknown>;

export default function ConfigPage() {
  const qc = useQueryClient();
  const { setHasUnsavedChanges, requestNavigation } = useUnsavedChanges();

  const {
    data: config,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["config"],
    queryFn: fetchConfig,
  });

  const [draft, setDraft] = useState<DraftConfig>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (config) {
      setDraft(config as DraftConfig);
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
    setHasUnsavedChanges(dirty);
  }, [dirty, setHasUnsavedChanges]);

  useEffect(() => {
    return () => setHasUnsavedChanges(false);
  }, [setHasUnsavedChanges]);

  const saveMut = useMutation({
    mutationFn: (data: AutoscanConfig) => saveConfig(data),
    onSuccess: (_result, variables) => {
      toast.success("Config saved");
      setDraft(variables as DraftConfig);
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["config"] });
    },
    onError: () => toast.error("Failed to save config"),
  });

  const patchDraft = (patch: DraftConfig) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const authentication =
    (draft.authentication as Record<string, string> | undefined) || {};
  const triggers =
    (draft.triggers as Record<string, unknown> | undefined) || {};
  const targets = (draft.targets as Record<string, unknown> | undefined) || {};
  const manualTrigger =
    (triggers.manual as Record<string, unknown> | undefined) || {};
  const anchors = Array.isArray(draft.anchors)
    ? (draft.anchors as string[])
    : [];

  const triggerCount = Object.keys(triggers).length;
  const targetCount = Object.keys(targets).length;

  const updateAuthentication = (
    field: "username" | "password",
    value: string,
  ) => {
    patchDraft({ authentication: { ...authentication, [field]: value } });
  };

  const updateTopLevel = (field: string, value: unknown) => {
    patchDraft({ [field]: value });
  };

  const updateManualPriority = (value: number) => {
    patchDraft({
      triggers: {
        ...triggers,
        manual: {
          ...manualTrigger,
          priority: value,
        },
      },
    });
  };

  const updateStringList = (field: "anchors", value: string) => {
    const list = value
      .split(/\r?\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean);
    patchDraft({ [field]: list });
  };

  const handleSave = () => {
    saveMut.mutate(draft as AutoscanConfig);
  };

  const handleDiscard = () => {
    if (!config) {
      return;
    }
    setDraft(config as DraftConfig);
    setDirty(false);
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
        subtitle="Update core runtime, auth, and manual trigger settings"
        icon={Settings}
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
                onClick={handleDiscard}
                disabled={saveMut.isPending}
              >
                Discard
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saveMut.isPending || !dirty}
            >
              {saveMut.isPending ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              Save Changes
            </button>
          </div>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "1rem",
        }}
      >
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "0.9rem 1rem",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <div className="settings-section-head">
              <div className="settings-icon-chip settings-icon-primary">
                <TimerReset size={14} />
              </div>
              <h2 className="heading-md">Runtime</h2>
            </div>
          </div>

          <div style={{ padding: "1rem", display: "grid", gap: "0.8rem" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px minmax(0, 1fr)",
                gap: "0.8rem",
                alignItems: "center",
              }}
            >
              <label className="label" style={{ marginBottom: 0 }}>
                Port
              </label>
              <input
                className="input"
                type="number"
                min={1}
                value={Number(draft.port ?? 3030)}
                onChange={(e) => updateTopLevel("port", Number(e.target.value))}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px minmax(0, 1fr)",
                gap: "0.8rem",
                alignItems: "center",
              }}
            >
              <label className="label" style={{ marginBottom: 0 }}>
                Minimum Age
              </label>
              <input
                className="input"
                placeholder="10m"
                value={String(draft["minimum-age"] ?? "")}
                onChange={(e) => updateTopLevel("minimum-age", e.target.value)}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px minmax(0, 1fr)",
                gap: "0.8rem",
                alignItems: "center",
              }}
            >
              <label className="label" style={{ marginBottom: 0 }}>
                Scan Delay
              </label>
              <input
                className="input"
                placeholder="5s"
                value={String(draft["scan-delay"] ?? "")}
                onChange={(e) => updateTopLevel("scan-delay", e.target.value)}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px minmax(0, 1fr)",
                gap: "0.8rem",
                alignItems: "center",
              }}
            >
              <label className="label" style={{ marginBottom: 0 }}>
                Scan Stats Interval
              </label>
              <input
                className="input"
                placeholder="1h"
                value={String(draft["scan-stats"] ?? "")}
                onChange={(e) => updateTopLevel("scan-stats", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "0.9rem 1rem",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <div className="settings-section-head">
              <div className="settings-icon-chip settings-icon-blue">
                <Shield size={14} />
              </div>
              <h2 className="heading-md">Authentication</h2>
            </div>
          </div>

          <div style={{ padding: "1rem", display: "grid", gap: "0.8rem" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px minmax(0, 1fr)",
                gap: "0.8rem",
                alignItems: "center",
              }}
            >
              <label className="label" style={{ marginBottom: 0 }}>
                Username
              </label>
              <input
                className="input"
                value={authentication.username ?? ""}
                onChange={(e) =>
                  updateAuthentication("username", e.target.value)
                }
                placeholder="Leave empty to disable auth"
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px minmax(0, 1fr)",
                gap: "0.8rem",
                alignItems: "center",
              }}
            >
              <label className="label" style={{ marginBottom: 0 }}>
                Password
              </label>
              <input
                className="input"
                type="password"
                value={authentication.password ?? ""}
                onChange={(e) =>
                  updateAuthentication("password", e.target.value)
                }
                placeholder="Leave empty to disable auth"
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "0.9rem 1rem",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <div className="settings-section-head">
              <div className="settings-icon-chip settings-icon-emerald">
                <SlidersHorizontal size={14} />
              </div>
              <h2 className="heading-md">Manual Trigger</h2>
            </div>
          </div>

          <div style={{ padding: "1rem", display: "grid", gap: "0.8rem" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px minmax(0, 1fr)",
                gap: "0.8rem",
                alignItems: "center",
              }}
            >
              <label className="label" style={{ marginBottom: 0 }}>
                Default Priority
              </label>
              <input
                className="input"
                type="number"
                value={Number(manualTrigger.priority ?? 0)}
                onChange={(e) => updateManualPriority(Number(e.target.value))}
              />
            </div>
            <p className="text-small" style={{ marginLeft: "180px" }}>
              Controls the default priority used by the manual trigger endpoint.
            </p>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "0.9rem 1rem",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <div className="settings-section-head">
              <div className="settings-icon-chip settings-icon-blue">
                <Workflow size={14} />
              </div>
              <h2 className="heading-md">Targets & Triggers</h2>
            </div>
          </div>

          <div style={{ padding: "1rem", display: "grid", gap: "0.8rem" }}>
            <p className="text-small" style={{ margin: 0 }}>
              These config blocks are part of the full config.yml, but edited in
              their dedicated pages.
            </p>
            <p className="text-small" style={{ margin: 0 }}>
              Current config contains {triggerCount} trigger section(s) and{" "}
              {targetCount} target section(s).
            </p>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => requestNavigation("/triggers")}
              >
                Open Triggers
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => requestNavigation("/targets")}
              >
                Open Targets
              </button>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "0.9rem 1rem",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <div className="settings-section-head">
              <div className="settings-icon-chip settings-icon-amber">
                <Settings size={14} />
              </div>
              <h2 className="heading-md">Anchors / Checkfiles</h2>
            </div>
          </div>

          <div style={{ padding: "1rem", display: "grid", gap: "0.8rem" }}>
            <p className="text-small" style={{ margin: 0 }}>
              Enter one value per line. Comma-separated values are also
              supported.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px minmax(0, 1fr)",
                gap: "0.8rem",
                alignItems: "start",
              }}
            >
              <label
                className="label"
                style={{ marginBottom: 0, paddingTop: "0.45rem" }}
              >
                Anchor Files
              </label>
              <div style={{ display: "grid", gap: "0.45rem" }}>
                <textarea
                  className="input"
                  style={{ minHeight: "7rem" }}
                  value={anchors.join("\n")}
                  onChange={(e) => updateStringList("anchors", e.target.value)}
                  placeholder="/data/media/.autoscan-anchor"
                />
                <p className="text-small" style={{ margin: 0 }}>
                  All listed files must exist. If one anchor is missing, scan
                  processing pauses until it is available again.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
