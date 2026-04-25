import { type ReactNode } from "react";
import Sidebar from "./Sidebar";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-container">{children}</div>
      </main>
    </div>
  );
}
