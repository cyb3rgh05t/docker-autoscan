import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchScans,
  fetchHistory,
  addScan,
  deleteScan,
  clearScans,
  type Scan,
  type ScanHistoryEntry,
} from "../api/client";
import {
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ListX,
  ListTodo,
  FolderInput,
} from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../components/PageHeader";

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function ScansPage() {
  const qc = useQueryClient();
  const [folder, setFolder] = useState("");
  const [priority, setPriority] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const { data: scans = [], refetch: refetchScans } = useQuery({
    queryKey: ["scans"],
    queryFn: fetchScans,
    refetchInterval: 5000,
  });

  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ["history"],
    queryFn: () => fetchHistory(100),
    refetchInterval: 10000,
  });

  const addMut = useMutation({
    mutationFn: () => addScan(folder, priority),
    onSuccess: () => {
      toast.success("Scan queued");
      setFolder("");
      setPriority(0);
      qc.invalidateQueries({ queryKey: ["scans"] });
    },
    onError: () => toast.error("Failed to add scan"),
  });

  const delMut = useMutation({
    mutationFn: deleteScan,
    onSuccess: () => {
      toast.success("Scan removed");
      qc.invalidateQueries({ queryKey: ["scans"] });
    },
    onError: () => toast.error("Failed to delete scan"),
  });

  const clearMut = useMutation({
    mutationFn: clearScans,
    onSuccess: () => {
      toast.success("Queue cleared");
      qc.invalidateQueries({ queryKey: ["scans"] });
    },
    onError: () => toast.error("Failed to clear queue"),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchScans(), refetchHistory()]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div
      className="page-wrapper"
      style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
    >
      <PageHeader
        title="Scan Queue"
        subtitle="Manage queued scans and inspect recent processing history"
        icon={ListTodo}
        actions={
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="btn"
              onClick={handleRefresh}
              disabled={refreshing}
              style={
                refreshing
                  ? {
                      color: "var(--color-text-muted)",
                      borderColor: "var(--color-border)",
                      opacity: 0.75,
                    }
                  : undefined
              }
            >
              <RefreshCw
                size={15}
                className={refreshing ? "animate-spin" : ""}
                style={{ color: "var(--color-primary)" }}
              />
              Refresh
            </button>
            {scans.length > 0 && (
              <button
                className="btn btn-danger"
                onClick={() => clearMut.mutate()}
              >
                <ListX size={15} />
                Clear All
              </button>
            )}
          </div>
        }
      />

      {/* Add scan form */}
      <div className="card">
        <div className="settings-section-head" style={{ marginBottom: "1rem" }}>
          <div className="settings-icon-chip settings-icon-primary">
            <FolderInput size={14} />
          </div>
          <h2 className="heading-sm">Add Manual Scan</h2>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <input
            className="input"
            style={{ flex: 1 }}
            placeholder="/media/movies/Interstellar"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && folder && addMut.mutate()}
          />
          <input
            className="input"
            style={{ width: "6rem" }}
            type="number"
            placeholder="Priority"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
          />
          <button
            className="btn btn-primary"
            onClick={() => addMut.mutate()}
            disabled={!folder || addMut.isPending}
          >
            <Plus size={16} />
            Add
          </button>
        </div>
      </div>

      <div className="card">
        <div className="settings-section-head" style={{ marginBottom: "1rem" }}>
          <div className="settings-icon-chip settings-icon-blue">
            <ListTodo size={14} />
          </div>
          <h2 className="heading-sm">Scan Queue</h2>
          <span className="tab-count" style={{ marginLeft: "auto" }}>
            {scans.length}
          </span>
        </div>
        <div className="table-container">
          {scans.length === 0 ? (
            <div
              style={{
                padding: "3rem",
                textAlign: "center",
                color: "var(--color-text-muted)",
              }}
            >
              <ListX
                size={32}
                style={{ margin: "0 auto 0.75rem", opacity: 0.3 }}
              />
              <p>Queue is empty</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Folder</th>
                  <th style={{ width: "5rem" }}>Priority</th>
                  <th style={{ width: "7rem" }}>Queued</th>
                  <th style={{ width: "3rem" }}></th>
                </tr>
              </thead>
              <tbody>
                {scans.map((s: Scan) => (
                  <tr key={s.folder}>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.75rem",
                      }}
                    >
                      {s.folder}
                    </td>
                    <td>{s.priority}</td>
                    <td
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {timeAgo(s.time)}
                    </td>
                    <td>
                      <button
                        className="btn-icon btn-icon-delete"
                        onClick={() => delMut.mutate(s.folder)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <div className="settings-section-head" style={{ marginBottom: "1rem" }}>
          <div className="settings-icon-chip settings-icon-emerald">
            <CheckCircle2 size={14} />
          </div>
          <h2 className="heading-sm">History</h2>
          <span className="tab-count" style={{ marginLeft: "auto" }}>
            {history.length}
          </span>
        </div>
        <div className="table-container">
          {history.length === 0 ? (
            <div
              style={{
                padding: "3rem",
                textAlign: "center",
                color: "var(--color-text-muted)",
              }}
            >
              No history yet
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: "2rem" }}></th>
                  <th>Folder</th>
                  <th style={{ width: "8rem" }}>Target</th>
                  <th style={{ width: "7rem" }}>Completed</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h: ScanHistoryEntry) => (
                  <tr key={h.id}>
                    <td>
                      {h.status === "success" ? (
                        <CheckCircle2 size={14} color="var(--color-success)" />
                      ) : (
                        <XCircle size={14} color="var(--color-error)" />
                      )}
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.75rem",
                      }}
                    >
                      {h.folder}
                      {h.message && (
                        <p
                          style={{
                            color: "var(--color-error)",
                            fontSize: "0.7rem",
                            marginTop: "0.15rem",
                          }}
                        >
                          {h.message}
                        </p>
                      )}
                    </td>
                    <td
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {h.target}
                    </td>
                    <td
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {timeAgo(h.completed_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
