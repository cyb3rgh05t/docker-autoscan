import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// ── Types ──────────────────────────────────────────────────────────────────

export interface Scan {
  folder: string;
  priority: number;
  time: string;
}

export interface ScanHistoryEntry {
  id: number;
  folder: string;
  priority: number;
  triggered_at: string;
  completed_at: string;
  target: string;
  status: "success" | "error";
  message: string;
}

export interface Stats {
  scans_remaining: number;
  scans_processed: number;
  uptime_seconds: number;
  targets_available: Record<string, boolean>;
}

export interface HealthInfo {
  status: string;
  version: string;
  commit: string;
}

export interface RuntimeLogs {
  lines: string[];
}

export type AutoscanConfig = Record<string, unknown>;

// ── Config ─────────────────────────────────────────────────────────────────

export const fetchConfig = () =>
  api.get<AutoscanConfig>("/config").then((r) => r.data);

export const saveConfig = (data: AutoscanConfig) =>
  api.put<{ message: string }>("/config", data).then((r) => r.data);

// ── Scans ──────────────────────────────────────────────────────────────────

export const fetchScans = () => api.get<Scan[]>("/scans").then((r) => r.data);

export const addScan = (folder: string, priority = 0) =>
  api.post<Scan>("/scans", { folder, priority }).then((r) => r.data);

export const deleteScan = (folder: string) =>
  api.delete(`/scans/${encodeURIComponent(folder)}`).then((r) => r.data);

export const clearScans = () => api.delete("/scans").then((r) => r.data);

export const fetchHistory = (limit = 100) =>
  api
    .get<ScanHistoryEntry[]>("/scans/history", { params: { limit } })
    .then((r) => r.data);

// ── Stats & Health ─────────────────────────────────────────────────────────

export const fetchStats = () => api.get<Stats>("/stats").then((r) => r.data);

export const fetchHealth = () =>
  api.get<HealthInfo>("/health").then((r) => r.data);

export const fetchLogs = (lines = 200) =>
  api
    .get<RuntimeLogs>("/logs", { params: { lines } })
    .then((r) => r.data.lines);
