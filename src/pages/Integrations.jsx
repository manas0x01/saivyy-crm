import React, { useState, useMemo } from "react";
import {
  Plug, Check, Plus, Settings2, Trash2, RefreshCw, Search, Key, Link as LinkIcon,
  CheckCircle2, AlertCircle, ShieldCheck, MessageSquare, PhoneCall, Mail, Calendar,
  CreditCard, Bot, Zap, Share2, Sparkles, Database, Send, Radio
} from "lucide-react";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import { useToast } from "../components/ToastContext";
import Modal, { FormField, Input, Select, Textarea, SubmitBtn } from "../components/Modal";
import * as api from "../services/api";

const CATEGORIES = [
  "All",
  "Connected",
  "Messaging",
  "Lead Capture",
  "Social Selling",
  "Telephony",
  "Email & Calendar",
  "Billing",
  "AI & Intelligence",
  "Workflow",
  "Data Sync",
  "Custom"
];

// Helper to get matching category icon
function getCategoryIcon(category, id) {
  if (id === "whatsapp" || category === "Messaging") return MessageSquare;
  if (category === "Telephony") return PhoneCall;
  if (category === "Lead Capture") return Send;
  if (category === "Social Selling") return Share2;
  if (category === "Email & Calendar" || category === "Email Sync") return Mail;
  if (category === "Calendar") return Calendar;
  if (category === "Billing") return CreditCard;
  if (category === "AI & Intelligence") return Sparkles;
  if (category === "Workflow") return Zap;
  if (category === "Data Sync") return Database;
  return Plug;
}

export default function Integrations() {
  const { state, dispatch } = useCrm();
  const toast = useToast();
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  
  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [configItem, setConfigItem] = useState(null);

  // Add form state
  const [addForm, setAddForm] = useState({ name: "", category: "Messaging", desc: "", apiKey: "", webhookUrl: "" });
  
  // Config form state
  const [editForm, setEditForm] = useState({ name: "", category: "", desc: "", apiKey: "", webhookUrl: "", config: "{}" });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Filtered List
  const filtered = useMemo(() => {
    let list = state.integrations || [];
    if (filter === "Connected") list = list.filter(i => i.status);
    else if (filter !== "All") list = list.filter(i => i.category === filter || (filter === "Email & Calendar" && i.category === "Email Sync"));

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.desc?.toLowerCase().includes(q) || i.category?.toLowerCase().includes(q));
    }
    return list;
  }, [state.integrations, filter, query]);

  // Handle Add Integration
  const setAdd = k => e => setAddForm(f => ({ ...f, [k]: e.target.value }));
  const submitAdd = () => {
    if (!addForm.name.trim()) return toast.warning("Integration name is required");
    dispatch({
      type: "ADD_INTEGRATION",
      payload: { ...addForm, status: true, lastSync: "Just connected", config: "{}" }
    });
    toast.success(`Integration "${addForm.name}" added`);
    setShowAdd(false);
    setAddForm({ name: "", category: "Messaging", desc: "", apiKey: "", webhookUrl: "" });
  };

  // Handle Configure Modal open
  const openConfig = (item) => {
    setConfigItem(item);
    setTestResult(null);
    setEditForm({
      name: item.name,
      category: item.category,
      desc: item.desc || "",
      apiKey: item.apiKey || "",
      webhookUrl: item.webhookUrl || "",
      config: typeof item.config === "object" ? JSON.stringify(item.config, null, 2) : item.config || "{}"
    });
  };

  // Handle Configure Save
  const setEdit = k => e => setEditForm(f => ({ ...f, [k]: e.target.value }));
  const submitEdit = () => {
    if (!configItem) return;
    dispatch({
      type: "UPDATE_INTEGRATION",
      payload: {
        id: configItem.id,
        ...editForm,
        status: configItem.status
      }
    });
    toast.success(`Configuration for "${configItem.name}" updated`);
    setConfigItem(null);
  };

  // Handle Test Connection
  const runTestConnection = async () => {
    if (!configItem) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testIntegration(configItem.id);
      setTestResult({ success: true, message: res.message || "Connection test successful! API handshake verified." });
      dispatch({ type: "UPDATE_INTEGRATION", payload: { id: configItem.id, lastSync: "Synced just now" } });
    } catch (err) {
      setTestResult({ success: false, message: "Connection failed: " + err.message });
    } finally {
      setTesting(false);
    }
  };

  // Mask API key for security
  const maskKey = key => {
    if (!key) return "Not configured";
    if (key.length <= 8) return "••••••••";
    return key.slice(0, 4) + "••••••••" + key.slice(-4);
  };

  return (
    <div className="p-5 flex flex-col gap-4 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="crm-display text-[20px] font-semibold flex items-center gap-2" style={{ color: T.ink }}>
            <Plug size={22} style={{ color: T.accent }} /> Integration Catalog ({state.integrations?.length || 0})
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>
            Connect WhatsApp, Meta Lead Ads, Twilio, Gmail, Razorpay, OpenAI, and custom webhooks
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="crm-focusable flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold shadow-sm"
          style={{ background: T.accent, color: "#fff" }}
        >
          <Plus size={15} /> Add Custom Integration
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex items-center gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className="crm-focusable px-3 py-1.5 rounded-lg text-[12px] font-medium"
            style={{
              background: filter === cat ? T.ink : T.surface,
              color: filter === cat ? "#fff" : T.inkSoft,
              border: `1px solid ${filter === cat ? T.ink : T.line}`
            }}
          >
            {cat}
          </button>
        ))}

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-1 min-w-[200px] ml-auto" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <Search size={14} style={{ color: T.inkFaint }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search WhatsApp, Gmail, Twilio, OpenAI…"
            className="flex-1 text-[13px] outline-none bg-transparent"
            style={{ color: T.ink }}
          />
        </div>
      </div>

      {/* Grid of Integration Cards */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map(item => {
          const IconComponent = getCategoryIcon(item.category, item.id);
          return (
            <div
              key={item.id}
              className="crm-card rounded-xl p-5 flex flex-col justify-between gap-4"
              style={{ background: T.surface, border: `1px solid ${T.line}` }}
            >
              {/* Top Row: Icon + Name + Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold"
                    style={{
                      background: item.id === "whatsapp" ? "#DCFCE7" : item.status ? T.accentSoft : T.lineSoft,
                      color: item.id === "whatsapp" ? "#166534" : item.status ? T.accent : T.inkFaint
                    }}
                  >
                    <IconComponent size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="crm-display text-[15px] font-semibold" style={{ color: T.ink }}>{item.name}</h3>
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: T.lineSoft, color: T.inkFaint }}>
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[12.5px] leading-relaxed mt-1" style={{ color: T.inkSoft }}>{item.desc}</p>
                  </div>
                </div>
              </div>

              {/* Middle Info: Keys & Sync info */}
              <div className="p-3 rounded-lg flex flex-col gap-1.5 text-[11.5px] crm-mono" style={{ background: T.canvas }}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5" style={{ color: T.inkFaint }}>
                    <Key size={12} /> API Credential:
                  </span>
                  <span className="font-semibold" style={{ color: item.apiKey ? T.ink : T.inkFaint }}>
                    {maskKey(item.apiKey)}
                  </span>
                </div>
                {item.webhookUrl && (
                  <div className="flex items-center justify-between truncate">
                    <span className="flex items-center gap-1.5" style={{ color: T.inkFaint }}>
                      <LinkIcon size={12} /> Webhook URL:
                    </span>
                    <span className="truncate max-w-[200px]" style={{ color: T.accent }}>
                      {item.webhookUrl}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1" style={{ borderTop: `1px solid ${T.lineSoft}` }}>
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: T.inkFaint }}>
                    <Radio size={11} /> Last sync activity:
                  </span>
                  <span className="text-[11px] font-semibold" style={{ color: item.status ? T.positive : T.inkFaint }}>
                    {item.lastSync || "Never"}
                  </span>
                </div>
              </div>

              {/* Actions: Configure, Test, Toggle Connection */}
              <div className="flex items-center justify-between pt-2" style={{ borderTop: `1px solid ${T.lineSoft}` }}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openConfig(item)}
                    className="crm-focusable px-3 py-1.5 rounded-lg text-[12px] font-semibold flex items-center gap-1.5"
                    style={{ border: `1px solid ${T.line}`, color: T.inkSoft }}
                  >
                    <Settings2 size={13} /> Configure API
                  </button>
                  <button
                    onClick={() => {
                      dispatch({ type: "DELETE_INTEGRATION", payload: item.id });
                      toast.success(`Integration "${item.name}" deleted`);
                    }}
                    className="crm-focusable p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete integration"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <button
                  onClick={() => {
                    dispatch({ type: "TOGGLE_INTEGRATION", payload: item.id });
                    toast.info(item.status ? `Disconnected "${item.name}"` : `Connected "${item.name}"`);
                  }}
                  className="crm-focusable px-3.5 py-1.5 rounded-lg text-[12px] font-semibold flex items-center gap-1.5"
                  style={{
                    background: item.status ? T.positiveSoft : T.accentSoft,
                    color: item.status ? T.positive : T.accent
                  }}
                >
                  {item.status ? <><CheckCircle2 size={13} /> Connected</> : "Connect Now"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Configure Integration Modal */}
      {configItem && (
        <Modal open={Boolean(configItem)} onClose={() => setConfigItem(null)} title={`Configure ${configItem.name}`} width={540}>
          <div className="flex flex-col gap-4">
            <div className="p-3 rounded-lg flex items-center gap-2 text-[12px]" style={{ background: T.accentSoft, color: T.accent }}>
              <ShieldCheck size={16} /> Enter your production API credentials or webhook listener endpoint.
            </div>

            <FormField label="Integration Name">
              <Input value={editForm.name} onChange={setEdit("name")} />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Category">
                <Select value={editForm.category} onChange={setEdit("category")}>
                  {CATEGORIES.filter(c => c !== "All" && c !== "Connected").map(c => <option key={c}>{c}</option>)}
                </Select>
              </FormField>
              <FormField label="API Key / Secret Token">
                <Input value={editForm.apiKey} onChange={setEdit("apiKey")} placeholder="sk_live_..." type="password" />
              </FormField>
            </div>

            <FormField label="Webhook Listener URL">
              <Input value={editForm.webhookUrl} onChange={setEdit("webhookUrl")} placeholder="https://api.yourdomain.com/v1/webhook" />
            </FormField>

            <FormField label="Description">
              <Textarea value={editForm.desc} onChange={setEdit("desc")} rows={2} />
            </FormField>

            {/* Test Connection Button */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200" style={{ background: T.canvas }}>
              <div>
                <p className="text-[12.5px] font-semibold" style={{ color: T.ink }}>Test API Handshake</p>
                <p className="text-[11px]" style={{ color: T.inkFaint }}>Verify authentication headers and server latency</p>
              </div>
              <button
                onClick={runTestConnection}
                disabled={testing}
                className="crm-focusable px-3 py-1.5 rounded-lg text-[12px] font-semibold flex items-center gap-1.5"
                style={{ background: T.ink, color: "#fff", opacity: testing ? 0.6 : 1 }}
              >
                <RefreshCw size={12} className={testing ? "animate-spin" : ""} /> {testing ? "Testing..." : "Test Connection"}
              </button>
            </div>

            {testResult && (
              <div className="p-3 rounded-lg text-[12.5px] flex items-center gap-2" style={{ background: testResult.success ? T.positiveSoft : T.negativeSoft, color: testResult.success ? T.positive : T.negative }}>
                {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {testResult.message}
              </div>
            )}

            <SubmitBtn onClick={submitEdit}>Save Configuration</SubmitBtn>
          </div>
        </Modal>
      )}

      {/* Add Custom Integration Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Custom Integration">
        <div className="flex flex-col gap-4">
          <FormField label="Integration Name" required>
            <Input value={addForm.name} onChange={setAdd("name")} placeholder="e.g. WhatsApp Cloud API, Segment, Twilio SMS" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Category">
              <Select value={addForm.category} onChange={setAdd("category")}>
                {CATEGORIES.filter(c => c !== "All" && c !== "Connected").map(c => <option key={c}>{c}</option>)}
              </Select>
            </FormField>
            <FormField label="API Key">
              <Input value={addForm.apiKey} onChange={setAdd("apiKey")} placeholder="API token or secret" />
            </FormField>
          </div>
          <FormField label="Webhook URL">
            <Input value={addForm.webhookUrl} onChange={setAdd("webhookUrl")} placeholder="https://api.service.com/webhook" />
          </FormField>
          <FormField label="Description">
            <Textarea value={addForm.desc} onChange={setAdd("desc")} placeholder="Briefly describe what this integration syncs..." rows={2} />
          </FormField>
          <SubmitBtn onClick={submitAdd}>Connect Integration</SubmitBtn>
        </div>
      </Modal>
    </div>
  );
}
