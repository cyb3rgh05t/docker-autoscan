import { type ReactNode } from "react";
import Sidebar from "./Sidebar";
import { UnsavedChangesProvider } from "./UnsavedChangesContext";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <UnsavedChangesProvider>
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <div className="page-container">{children}</div>
        </main>
      </div>
    </UnsavedChangesProvider>
  );
}
