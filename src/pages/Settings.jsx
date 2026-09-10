import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Save, Building, User, Database, RefreshCw, Shield, Bell, Check, AlertTriangle } from "lucide-react";
import { T } from "../tokens";
import { useAuth } from "../store/AuthContext";
import { useToast } from "../components/ToastContext";
import Modal, { FormField, Input, Select, SubmitBtn } from "../components/Modal";
import { resetCrmDatabase, saveSettings } from "../services/api";

export default function Settings() {
  const { user, updateUserSession } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({
    orgName: user?.orgName || "Saivyy Technologies Private Limited",
    currency: "INR (₹)",
    timezone: "IST (UTC+05:30)",
    userName: user?.name || "User",
    userEmail: user?.email || "",
    role: user?.role || "Leader",
  });

  const [saving, setSaving] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        orgName: user.orgName || prev.orgName,
        userName: user.name || prev.userName,
        userEmail: user.email || prev.userEmail,
        role: user.role || prev.role,
      }));
    }
  }, [user]);

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.userName.trim()) {
      return toast.warning("Display name is required");
    }
    if (!form.userEmail.trim()) {
      return toast.warning("Email address is required");
    }

    setSaving(true);
    try {
      const res = await saveSettings({
        orgName: form.orgName,
        userName: form.userName,
        userEmail: form.userEmail,
        currency: form.currency,
        timezone: form.timezone,
      });

      if (res.user) {
        updateUserSession(res.user);
      }
      toast.success("Workspace settings updated and synchronized successfully");
    } catch (err) {
      toast.error(`Failed to save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReset = async () => {
    setResetting(true);
    try {
      await resetCrmDatabase();
      toast.success("CRM operational data cleared. Teams and users preserved.");
      setShowResetConfirm(false);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (e) {
      toast.error("Failed to reset database: " + e.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="p-5 flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Reset Confirmation Modal */}
      <Modal open={showResetConfirm} onClose={() => setShowResetConfirm(false)} title="Reset CRM Operational Records">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 p-3.5 rounded-lg" style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
            <AlertTriangle size={20} className="shrink-0 mt-0.5 text-rose-500" />
            <div className="text-[13px]" style={{ color: T.ink }}>
              <div className="font-semibold text-rose-600 mb-1">Warning: Irreversible Action</div>
              This will clear all leads, pipeline deals, customer accounts, logged calls, meetings, and activities for a clean slate. Your organization structure, teams, and user credentials will be kept intact.
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-4 py-2 rounded-lg text-[13px] font-medium"
              style={{ background: T.bg, border: `1px solid ${T.line}`, color: T.ink }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmReset}
              disabled={resetting}
              className="px-4 py-2 rounded-lg text-[13px] font-semibold flex items-center gap-2 text-white transition hover:opacity-95"
              style={{ background: "#dc2626" }}
            >
              <RefreshCw size={14} className={resetting ? "animate-spin" : ""} />
              {resetting ? "Clearing..." : "Confirm & Reset Database"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="crm-display text-[22px] font-bold tracking-tight flex items-center gap-2" style={{ color: T.ink }}>
            <SettingsIcon size={22} style={{ color: T.accent }} /> Workspace & System Settings
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>
            Manage organization details, profile attributes, local SQLite storage, and team standards
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="crm-focusable px-4 py-2 rounded-lg text-[13px] font-semibold flex items-center gap-2 text-white shadow-sm transition hover:opacity-95"
          style={{ background: T.accent }}
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving Changes…" : "Save Changes"}
        </button>
      </div>

      {/* Organization Settings */}
      <div className="crm-card rounded-xl p-5 flex flex-col gap-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <div className="flex items-center justify-between">
          <h2 className="crm-display text-[15px] font-semibold flex items-center gap-2" style={{ color: T.ink }}>
            <Building size={16} style={{ color: T.accent }} /> Organization Profile
          </h2>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full" style={{ background: T.accentSoft, color: T.accent }}>
            Org ID: {user?.orgId || "ORG-primary"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Organization / Enterprise Name" required>
            <Input value={form.orgName} onChange={setF("orgName")} />
          </FormField>
          <FormField label="Currency Standard">
            <Select value={form.currency} onChange={setF("currency")}>
              {["INR (₹)", "USD ($)", "EUR (€)", "GBP (£)", "SGD (S$)"].map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="System Timezone">
            <Select value={form.timezone} onChange={setF("timezone")}>
              {["IST (UTC+05:30)", "EST (UTC-05:00)", "PST (UTC-08:00)", "GMT (UTC+00:00)", "SGT (UTC+08:00)"].map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Account Role Tier">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-semibold" style={{ background: T.bg, border: `1px solid ${T.line}`, color: T.ink }}>
              <Shield size={14} style={{ color: T.accent }} />
              {form.role} Account (Full Access)
            </div>
          </FormField>
        </div>
      </div>

      {/* Personal Profile Account */}
      <div className="crm-card rounded-xl p-5 flex flex-col gap-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <h2 className="crm-display text-[15px] font-semibold flex items-center gap-2" style={{ color: T.ink }}>
          <User size={16} style={{ color: T.accent }} /> Personal Account & Identity
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Display Name" required>
            <Input value={form.userName} onChange={setF("userName")} placeholder="Full Name" />
          </FormField>
          <FormField label="Email Address" required>
            <Input value={form.userEmail} onChange={setF("userEmail")} placeholder="user@company.com" />
          </FormField>
        </div>
      </div>

      {/* Database & Data Controls */}
      <div className="crm-card rounded-xl p-5 flex flex-col gap-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <h2 className="crm-display text-[15px] font-semibold flex items-center gap-2" style={{ color: T.ink }}>
          <Database size={16} style={{ color: T.accent }} /> SQLite Database Engine & Reset
        </h2>
        <div className="text-[12.5px] space-y-1" style={{ color: T.inkFaint }}>
          <p>
            Connected to local embedded SQLite database (<code className="font-mono text-[11.5px] px-1 py-0.5 rounded bg-gray-100">crm.sqlite</code>) with real-time transactional sync.
          </p>
          <p>
            You can clear all demo leads, deals, tasks, and calls to start with an authentic empty CRM for actual customer deployments.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="crm-focusable px-4 py-2.5 rounded-lg text-[12.5px] font-semibold flex items-center gap-2 transition hover:opacity-90"
            style={{ background: "rgba(239, 68, 68, 0.1)", color: "#dc2626", border: "1px solid rgba(239, 68, 68, 0.25)" }}
          >
            <RefreshCw size={14} /> Clear CRM Data (Start Clean)
          </button>
        </div>
      </div>

      {/* Save Button Bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="crm-focusable px-5 py-2.5 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2 text-white shadow-sm transition hover:opacity-95 min-w-[160px]"
          style={{ background: T.accent }}
        >
          {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Saving Changes…" : "Save Workspace Changes"}
        </button>
      </div>
    </div>
  );
}
