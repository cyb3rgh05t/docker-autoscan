import { useQuery } from "@tanstack/react-query";
import { fetchHealth, fetchStats } from "../api/client";
import {
  Webhook,
  FolderSync,
  GitMerge,
  Shield,
  Activity,
  Bell,
  Database,
  Github,
} from "lucide-react";
import PageHeader from "../components/PageHeader";

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600)
    return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function AboutPage() {
  const repoUrl = "https://github.com/cyb3rgh05t/docker-autoscan";

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

  const features = [
    {
      title: "Trigger Connectors",
      text: "Sonarr, Radarr, Lidarr, Readarr, and manual triggers feed the queue.",
      Icon: FolderSync,
      tone: "about-tone-primary",
    },
    {
      title: "Target Dispatch",
      text: "Scans are dispatched in parallel to Plex, Jellyfin, Emby, and Autoscan targets.",
      Icon: GitMerge,
      tone: "about-tone-purple",
    },
    {
      title: "Priority Queue",
      text: "Folders are prioritized in the queue for deterministic processing.",
      Icon: Shield,
      tone: "about-tone-blue",
    },
    {
      title: "Runtime Monitoring",
      text: "Dashboard metrics, history, and runtime logs show current system state.",
      Icon: Activity,
      tone: "about-tone-emerald",
    },
    {
      title: "Notifications",
      text: "Execution status and failures are visible through logs and history.",
      Icon: Bell,
      tone: "about-tone-amber",
    },
    {
      title: "REST API",
      text: "Health, stats, queue, config, and logs are available via API endpoints.",
      Icon: Database,
      tone: "about-tone-red",
    },
  ];

  return (
    <div
      className="page-wrapper"
      style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
    >
      <section className="about-hero">
        <div className="about-hero-icon">
          <Webhook size={20} />
        </div>
        <h2 className="about-hero-title">Autoscan</h2>
        <p className="about-hero-version">v{health?.version ?? "unknown"}</p>
        <p className="about-hero-text">
          Self-hosted control plane for trigger-based media scans with queue
          control, target dispatching, and operational transparency.
        </p>
        <a
          className="about-hero-link"
          href={repoUrl}
          target="_blank"
          rel="noreferrer"
        >
          <Github size={13} />
          <span>GitHub</span>
          <span className="about-hero-link-arrow">→</span>
        </a>
      </section>

      <section className="about-section">
        <p className="about-section-label">Features</p>
        <div className="about-feature-grid">
          {features.map(({ title, text, Icon, tone }) => (
            <div key={title} className="about-feature-card">
              <div className="about-feature-head">
                <span className={`about-feature-icon ${tone}`}>
                  <Icon size={13} />
                </span>
                <p className="about-feature-title">{title}</p>
              </div>
              <p className="about-feature-text">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="about-section">
        <p className="about-section-label">Tech Stack</p>
        <div className="about-tech-grid">
          <div className="about-tech-card">
            <p className="about-tech-title">Backend</p>
            <div className="about-tech-row">
              <span>Python</span>
              <span>FastAPI</span>
            </div>
            <div className="about-tech-row">
              <span>SQLAlchemy</span>
              <span>ORM</span>
            </div>
            <div className="about-tech-row">
              <span>Uvicorn</span>
              <span>ASGI Server</span>
            </div>
            <div className="about-tech-row">
              <span>Pydantic</span>
              <span>Validation</span>
            </div>
          </div>

          <div className="about-tech-card">
            <p className="about-tech-title">Frontend</p>
            <div className="about-tech-row">
              <span>React</span>
              <span>UI</span>
            </div>
            <div className="about-tech-row">
              <span>TypeScript</span>
              <span>Typing</span>
            </div>
            <div className="about-tech-row">
              <span>Vite</span>
              <span>Build Tool</span>
            </div>
            <div className="about-tech-row">
              <span>Lucide</span>
              <span>Icons</span>
            </div>
          </div>

          <div className="about-tech-card">
            <p className="about-tech-title">Infrastructure</p>
            <div className="about-tech-row">
              <span>Docker</span>
              <span>Container Runtime</span>
            </div>
            <div className="about-tech-row">
              <span>SQLite</span>
              <span>Database</span>
            </div>
            <div className="about-tech-row">
              <span>GHCR</span>
              <span>Image Registry</span>
            </div>
            <div className="about-tech-row">
              <span>GitHub Actions</span>
              <span>CI/CD</span>
            </div>
          </div>
        </div>
      </section>

      <section className="about-section">
        <p className="about-section-label">System</p>
        <div className="about-system-grid">
          <div className="about-system-cell">
            <p className="about-system-key">Status</p>
            <p className="about-system-value">{health?.status ?? "unknown"}</p>
          </div>
          <div className="about-system-cell">
            <p className="about-system-key">Version</p>
            <p className="about-system-value">{health?.version ?? "unknown"}</p>
          </div>
          <div className="about-system-cell">
            <p className="about-system-key">Commit</p>
            <p className="about-system-value about-system-mono">
              {health?.commit ?? "unknown"}
            </p>
          </div>
          <div className="about-system-cell">
            <p className="about-system-key">Uptime</p>
            <p className="about-system-value">
              {stats ? formatUptime(stats.uptime_seconds) : "unknown"}
            </p>
          </div>
          <div className="about-system-cell">
            <p className="about-system-key">Queue</p>
            <p className="about-system-value">
              {stats ? `${stats.scans_remaining} pending` : "unknown"}
            </p>
          </div>
        </div>
      </section>

      <p className="about-page-footer">
        Made with <span className="about-footer-heart">❤</span> by{" "}
        <a
          href={repoUrl}
          target="_blank"
          rel="noreferrer"
          className="about-footer-link"
        >
          cyb3rgh05t
        </a>
      </p>
    </div>
  );
}
