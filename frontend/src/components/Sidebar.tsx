import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, useLocation } from "react-router-dom";
import { fetchConfig, fetchHealth } from "../api/client";
import {
  LayoutDashboard,
  ListTodo,
  ScrollText,
  Settings,
  Webhook,
  MonitorPlay,
  Info,
  UserRound,
  Menu,
  X,
} from "lucide-react";
import AutoscanLogo from "./AutoscanLogo";
import { useUnsavedChanges } from "./UnsavedChangesContext";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/scans", label: "Scan Queue", icon: ListTodo },
  { to: "/triggers", label: "Triggers", icon: Webhook },
  { to: "/targets", label: "Targets", icon: MonitorPlay },
  { to: "/logs", label: "Logs", icon: ScrollText },
  { to: "/config", label: "Settings", icon: Settings },
  { to: "/about", label: "About", icon: Info },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { requestNavigation } = useUnsavedChanges();
  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: fetchConfig,
  });
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 5000,
  });

  const configuredUsername =
    (
      config?.authentication as Record<string, string> | undefined
    )?.username?.trim() || "Local Instance";

  const badgeLabel =
    configuredUsername === "Local Instance"
      ? "NO USERNAME SET"
      : "CONFIG USERNAME";

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      <button
        type="button"
        className="sidebar-mobile-toggle"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      <div
        className={`sidebar-overlay ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        {/* Logo */}
        <div
          style={{
            height: "4rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0 1.25rem",
            borderBottom: "1px solid var(--color-border)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AutoscanLogo size={32} />
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: "1.1rem",
              color: "var(--color-text-white)",
              letterSpacing: "-0.02em",
            }}
          >
            Autoscan
          </span>
        </div>

        {/* Navigation */}
        <nav
          style={{
            flex: 1,
            padding: "1rem 0.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={(event) => {
                event.preventDefault();
                setMobileOpen(false);
                requestNavigation(to);
              }}
              className={({ isActive }) =>
                isActive ? "nav-item nav-item-active" : "nav-item"
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.25rem",
          }}
        >
          <div className="sidebar-user-badge">
            <div className="sidebar-user-avatar">
              <UserRound size={15} />
            </div>
            <div className="sidebar-user-meta">
              <div className="sidebar-user-name">{configuredUsername}</div>
              <div className="sidebar-user-role">{badgeLabel}</div>
              {health?.version ? (
                <div className="sidebar-user-role">v{health.version}</div>
              ) : null}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
