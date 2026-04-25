import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.tsx";
import Dashboard from "./pages/Dashboard";
import ScansPage from "./pages/ScansPage.tsx";
import ConfigPage from "./pages/ConfigPage.tsx";
import TriggersPage from "./pages/TriggersPage.tsx";
import TargetsPage from "./pages/TargetsPage.tsx";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/scans" element={<ScansPage />} />
        <Route path="/config" element={<ConfigPage />} />
        <Route path="/triggers" element={<TriggersPage />} />
        <Route path="/targets" element={<TargetsPage />} />
      </Routes>
    </Layout>
  );
}
