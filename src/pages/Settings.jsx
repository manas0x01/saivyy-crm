import React, { useState } from "react";
import { Settings as SettingsIcon, Save, Building, User, Database, RefreshCw } from "lucide-react";
import { T } from "../tokens";
import { FormField, Input, Select } from "../components/Modal";
import { resetCrmDatabase } from "../services/api";

export default function Settings() {
  const [saved, setSaved] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState("");
  const [form, setForm] = useState({
    orgName: "Saivyy Technologies Private Limited",
    currency: "INR (₹)",
    timezone: "IST (UTC+05:30)",
    userName: "Rahul Kapoor",
    userEmail: "rahul.k@saivyy.in",
    role: "Senior Account Executive",
  });

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to reset the database? All records will be cleared for fresh real data entry.")) return;
    setResetting(true);
    try {
      await resetCrmDatabase();
      setResetMsg("Database reset successfully! Reloading page...");
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      alert("Failed to reset database: " + e.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="p-5 flex flex-col gap-5 max-w-3xl">
      <div>
        <h1 className="crm-display text-[20px] font-semibold flex items-center gap-2" style={{ color: T.ink }}>
          <SettingsIcon size={20} style={{ color: T.accent }} /> Workspace Settings
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>Manage company profile, user preferences, and SQLite database settings</p>
      </div>

      <div className="crm-card rounded-xl p-5 flex flex-col gap-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <h2 className="crm-display text-[15px] font-semibold flex items-center gap-2" style={{ color: T.ink }}>
          <Building size={16} /> Organization Profile
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Organization Name"><Input value={form.orgName} onChange={setF("orgName")} /></FormField>
          <FormField label="Currency Standard"><Select value={form.currency} onChange={setF("currency")}>{["INR (₹)", "USD ($)", "EUR (€)"].map(c => <option key={c}>{c}</option>)}</Select></FormField>
        </div>
        <FormField label="Timezone"><Select value={form.timezone} onChange={setF("timezone")}>{["IST (UTC+05:30)", "EST (UTC-05:00)", "PST (UTC-08:00)"].map(tz => <option key={tz}>{tz}</option>)}</Select></FormField>
      </div>

      <div className="crm-card rounded-xl p-5 flex flex-col gap-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <h2 className="crm-display text-[15px] font-semibold flex items-center gap-2" style={{ color: T.ink }}>
          <User size={16} /> Personal Account
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Display Name"><Input value={form.userName} onChange={setF("userName")} /></FormField>
          <FormField label="Email Address"><Input value={form.userEmail} onChange={setF("userEmail")} /></FormField>
        </div>
      </div>

      {/* Database Management */}
      <div className="crm-card rounded-xl p-5 flex flex-col gap-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <h2 className="crm-display text-[15px] font-semibold flex items-center gap-2" style={{ color: T.ink }}>
          <Database size={16} style={{ color: T.accent }} /> Database & Data Control
        </h2>
        <p className="text-[12.5px]" style={{ color: T.inkFaint }}>
          Connected to local SQLite database (<code>crm.sqlite</code>). You can clear all data to start with a 100% fresh empty CRM.
        </p>

        {resetMsg && (
          <div className="p-3 rounded-lg text-[13px] font-medium" style={{ background: T.positiveSoft, color: T.positive }}>
            {resetMsg}
          </div>
        )}

        <button onClick={handleReset} disabled={resetting} className="crm-focusable px-4 py-2.5 rounded-lg text-[12.5px] font-semibold flex items-center gap-2 w-fit" style={{ background: T.negativeSoft, color: T.negative, border: `1px solid ${T.negativeSoft}` }}>
          <RefreshCw size={14} className={resetting ? "animate-spin" : ""} /> Clear Database (Start Clean)
        </button>
      </div>

      {saved && (
        <div className="p-3 rounded-lg text-[13px] font-medium" style={{ background: T.positiveSoft, color: T.positive }}>
          ✓ Settings saved successfully!
        </div>
      )}

      <button onClick={save} className="crm-focusable py-2.5 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2 w-48" style={{ background: T.accent, color: "#fff" }}>
        <Save size={14} /> Save Changes
      </button>
    </div>
  );
}
