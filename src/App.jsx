import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./store/AuthContext";
import { CrmProvider } from "./store/CrmContext";
import Shell from "./components/Shell";
import Login from "./pages/Login";
import AdminRegister from "./pages/AdminRegister";

import Dashboard from "./pages/Dashboard";
import LeaderDashboard from "./pages/LeaderDashboard";
import Leads from "./pages/Leads";
import Customers from "./pages/Customers";
import Companies from "./pages/Companies";
import Deals from "./pages/Deals";
import Pipeline from "./pages/Pipeline";
import Activities from "./pages/Activities";
import Calls from "./pages/Calls";
import Meetings from "./pages/Meetings";
import Tasks from "./pages/Tasks";
import AiInsights from "./pages/AiInsights";
import Automations from "./pages/Automations";
import Campaigns from "./pages/Campaigns";
import Reports from "./pages/Reports";
import Team from "./pages/Team";
import ImportExport from "./pages/ImportExport";
import Integrations from "./pages/Integrations";
import Settings from "./pages/Settings";

// Protected wrapper — only renders children when logged in
function ProtectedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F5F6F9" }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "#3730E0" }}
          >
            <span className="text-white font-bold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>S</span>
          </div>
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#3730E0", borderTopColor: "transparent" }} />
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <CrmProvider>
      <Shell>
        <Routes>
          <Route path="/" element={user.role === "Leader" ? <LeaderDashboard /> : <Dashboard />} />
          <Route path="/my-dashboard" element={<Dashboard />} />
          <Route path="/leader" element={<LeaderDashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/calls" element={<Calls />} />
          <Route path="/meetings" element={<Meetings />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/ai" element={<AiInsights />} />
          <Route path="/automations" element={<Automations />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/team" element={<Team />} />
          <Route path="/importexport" element={<ImportExport />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </CrmProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Hidden admin-only registration route — accessible without login */}
          <Route path="/admin" element={<AdminRegisterGate />} />
          {/* All other routes go through normal auth */}
          <Route path="/*" element={<ProtectedApp />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

// AdminRegisterGate: if already logged in, redirect to home; else show admin register
function AdminRegisterGate() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <AdminRegister />;
}
