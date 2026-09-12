import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./store/AuthContext";
import { CrmProvider } from "./store/CrmContext";
import { ToastProvider } from "./components/ToastContext";
import Shell from "./components/Shell";
import Login from "./pages/Login";
import AdminRegister from "./pages/AdminRegister";

import Dashboard from "./pages/Dashboard";
import LeaderDashboard from "./pages/LeaderDashboard";
import Leads from "./pages/Leads";
import SocialLeads from "./pages/SocialLeads";
import Customers from "./pages/Customers";
import Companies from "./pages/Companies";
import Deals from "./pages/Deals";
import Pipeline from "./pages/Pipeline";
import Activities from "./pages/Activities";
import Calls from "./pages/Calls";
import Meetings from "./pages/Meetings";
import Tasks from "./pages/Tasks";
import AiInsights from "./pages/AiInsights";
import Reports from "./pages/Reports";
import Team from "./pages/Team";
import ImportExport from "./pages/ImportExport";
import Settings from "./pages/Settings";

// Protected wrapper — only renders children when logged in
function ProtectedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FAF9F6" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shrink-0 bg-[#1C1917] p-2 shadow-sm border border-[#292524]">
            <img src="/logo.png" alt="Saivyy Logo" className="w-full h-full object-contain" />
          </div>
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#BC5A1B", borderTopColor: "transparent" }} />
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
          <Route path="/social-leads" element={<SocialLeads />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/calls" element={<Calls />} />
          <Route path="/meetings" element={<Meetings />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/ai" element={<AiInsights />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/team" element={<Team />} />
          <Route path="/importexport" element={<ImportExport />} />
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
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Hidden admin-only registration route — accessible without login */}
            <Route path="/admin" element={<AdminRegisterGate />} />
            {/* All other routes go through normal auth */}
            <Route path="/*" element={<ProtectedApp />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
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
