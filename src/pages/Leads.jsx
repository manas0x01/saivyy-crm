import React, { useState, useMemo, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Search, Plus, ChevronDown, ChevronRight, ArrowUpDown,
  ArrowLeft, Mail, Phone, PhoneCall, CalendarPlus, StickyNote, Building, MapPin, Globe,
  Sparkles, ShieldAlert, TrendingUp, Check, X, Clock, Download, FileSpreadsheet,
  Users, UserCheck, LayoutGrid, List
} from "lucide-react";
import * as XLSX from "xlsx";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import { useAuth } from "../store/AuthContext";
import { useToast } from "../components/ToastContext";
import { Avatar, StatusBadge, PriorityDot, ScoreChip, fmtINR } from "../components/shared";
import Modal, { FormField, Input, Select, Textarea, SubmitBtn } from "../components/Modal";
import LeadDetailView from "./LeadDetailView";

const SAVED_VIEWS = ["All leads", "My priority leads", "Follow-ups due today", "Uncontacted", "Closing this month"];
const TABS = ["Overview", "Business Details", "Activity", "Calls", "Meetings", "Emails", "Tasks", "Notes", "Deals", "AI Insights"];
const STATUSES = ["New", "Contacted", "Not Picked", "Interested", "Qualified", "Meeting Scheduled", "Proposal Sent", "Negotiation", "Won", "Lost", "Non-Interested", "Custom..."];
const PRIORITIES = ["High", "Medium", "Normal", "Low"];
const SOURCES = ["Website", "Referral", "Outbound", "Partner", "Event", "LinkedIn"];

const TIMELINE = [
  { time: "Today, 10:30 AM", text: "Meeting scheduled for product walkthrough", tag: "Meeting" },
  { time: "Yesterday, 4:20 PM", text: "Follow-up call completed — discussed pricing tiers", tag: "Call" },
  { time: "Yesterday, 2:10 PM", text: "Proposal sent for annual contract", tag: "Proposal" },
  { time: "10 Aug, 11:00 AM", text: "Status changed from Contacted to Interested", tag: "Status" },
];

function exportLeads(leadsToExport, filenamePrefix = "leads", format = "csv") {
  if (!leadsToExport || leadsToExport.length === 0) return;
  
  const exportData = leadsToExport.map(l => ({
    "ID": l.id,
    "Lead Name": l.name,
    "Company": l.company,
    "Email": l.email || "",
    "Phone": l.phone || "",
    "Status": l.status,
    "Priority": l.priority,
    "Score": l.score,
    "Source": l.source,
    "Owner": l.owner || "Unassigned",
    "Deal Value": l.dealValue || "₹0",
    "Probability (%)": l.probability || 0,
    "Last Contact": l.lastContact || "",
    "Created Date": l.created || ""
  }));

  const filename = `crm_${filenamePrefix}_${new Date().toISOString().slice(0, 10)}`;

  if (format === "xlsx") {
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } else {
    const keys = Object.keys(exportData[0]);
    const csvRows = [
      keys.join(","),
      ...exportData.map(row => keys.map(k => `"${String(row[k] || '').replace(/"/g, '""')}"`).join(","))
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Helper to check if a lead belongs to a specific employee (strictly segregated by assignee / owner)
function isLeadBelongsToEmployee(lead, emp) {
  if (!lead || !emp) return false;

  const rawEmpName = emp.name || (typeof emp === "string" ? emp : "");
  // Clean off role suffix if any (e.g. "MANAS SAXENA (Leader)" -> "manas saxena")
  const cleanEmpName = rawEmpName.replace(/\s*\((Leader|Admin|Member)\)/i, "").trim().toLowerCase();

  const isUnassignedTarget = emp.isUnassigned || rawEmpName === "Unassigned" || cleanEmpName === "unassigned";

  const leadOwner = (lead.owner || "").trim();
  const isLeadUnassigned = !leadOwner || leadOwner.toLowerCase() === "unassigned" || leadOwner === "—" || leadOwner === "-";

  if (isUnassignedTarget) {
    return isLeadUnassigned;
  }

  // If lead is unassigned, it does not belong to any specific employee
  if (isLeadUnassigned) {
    return false;
  }

  const lOwner = leadOwner.toLowerCase();

  // 1. Direct Owner Name Matching (Exact match - case insensitive)
  if (lOwner === cleanEmpName) return true;

  // 2. Full Name Substring Matching (e.g. "Manas Saxena" vs "Manas")
  if (lOwner.includes(cleanEmpName) || cleanEmpName.includes(lOwner)) {
    return true;
  }

  // 3. First name match if at least 3 characters (e.g. "Vidushi" vs "Vidushi Singh")
  const eFirst = cleanEmpName.split(" ")[0];
  const lFirst = lOwner.split(" ")[0];
  if (eFirst && lFirst && eFirst.length >= 3 && eFirst === lFirst) {
    return true;
  }

  // 4. Exact match on initials ONLY if initials match and first character matches
  if (lead.ownerInitials && emp.initials) {
    if (lead.ownerInitials.trim().toUpperCase() === emp.initials.trim().toUpperCase()) {
      if (cleanEmpName[0] === lOwner[0]) return true;
    }
  }

  // 5. Explicit user account match ONLY if lead has no explicit owner
  const targetAccId = emp.accountUserId || emp.id;
  if (!leadOwner && targetAccId && lead.userId && String(lead.userId) === String(targetAccId)) {
    return true;
  }

  return false;
}

// Real-time "time since" for lastContact
function timeAgo(ts, created) {
  if (!ts || ts === "Just imported" || ts === "Never" || ts === "—") {
    if (created) {
      const d = new Date(created);
      if (!isNaN(d.getTime())) {
        const diff = Date.now() - d.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 30) return `${days}d ago`;
        return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      }
    }
    return "Not contacted";
  }
  if (ts === "Just now") return "Just now";
  if (typeof ts === "string" && (ts.endsWith("ago") || ts.endsWith("now"))) return ts;

  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  } catch {
    return ts;
  }
}

// Inline dropdown cell — click to open, select to save (supports predefined & custom status)
function InlineSelect({ value, options, onSave, renderDisplay }) {
  const [open, setOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customText, setCustomText] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) {
      setIsCustomMode(false);
      setCustomText("");
      return;
    }
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (opt) => {
    if (opt === "Custom..." || opt === "Custom") {
      setIsCustomMode(true);
      setCustomText(value && !options.includes(value) ? value : "");
    } else {
      onSave(opt);
      setOpen(false);
    }
  };

  const handleSaveCustom = () => {
    const trimmed = customText.trim();
    if (trimmed) {
      onSave(trimmed);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        onClick={() => setOpen(o => !o)}
        className="crm-focusable flex items-center gap-1 cursor-pointer group"
        title="Click to change"
      >
        {renderDisplay ? renderDisplay(value) : <span className="text-[12.5px]">{value}</span>}
        <ChevronDown size={10} className="opacity-40 group-hover:opacity-100" style={{ color: T.inkFaint }} />
      </button>
      {open && (
        <div
          className="absolute z-50 left-0 top-full mt-1 rounded-lg shadow-xl p-1 overflow-auto max-h-64"
          style={{ background: T.surface, border: `1px solid ${T.line}`, minWidth: 190 }}
        >
          {isCustomMode ? (
            <div className="p-2 flex flex-col gap-2 min-w-[210px]">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: T.inkFaint }}>Custom Status / Reason</span>
              <input
                type="text"
                autoFocus
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveCustom();
                  if (e.key === "Escape") setIsCustomMode(false);
                }}
                placeholder="e.g. Call back later, Busy..."
                className="w-full px-2.5 py-1.5 rounded text-[12px] outline-none border"
                style={{ background: T.canvas, borderColor: T.line, color: T.ink }}
              />
              <div className="flex items-center justify-end gap-1.5 mt-1">
                <button
                  onClick={() => setIsCustomMode(false)}
                  className="px-2 py-1 rounded text-[11px] font-medium hover:bg-gray-100"
                  style={{ color: T.inkFaint }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCustom}
                  className="px-2.5 py-1 rounded text-[11px] font-semibold"
                  style={{ background: T.accent, color: "#fff" }}
                >
                  Save Status
                </button>
              </div>
            </div>
          ) : (
            <>
              {options.map(opt => {
                const isSelected = opt === value;
                return (
                  <button
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    className="w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-gray-50 flex items-center justify-between rounded-md"
                    style={{ color: isSelected ? T.accent : T.ink, fontWeight: isSelected ? 600 : 400 }}
                  >
                    <span>{opt}</span>
                    {isSelected && <Check size={12} style={{ color: T.accent }} />}
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Inline text edit cell — click to edit, blur/enter to save
function InlineEdit({ value, onSave, prefix = "", placeholder = "", type = "text" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { if (!editing) setDraft(value ?? ""); }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== String(value || "")) onSave(trimmed);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value ?? ""); setEditing(false); } }}
        className="crm-mono text-[12.5px] outline-none rounded px-1 py-0.5 w-[90px]"
        style={{ background: T.accentSoft, color: T.accent, border: `1px solid ${T.accent}` }}
        type={type}
        placeholder={placeholder}
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(value ?? ""); setEditing(true); }}
      className="crm-focusable crm-mono text-[12.5px] font-semibold px-1.5 rounded hover:bg-gray-100 group"
      style={{ color: T.ink }}
      title="Click to edit"
    >
      {prefix}{value !== undefined && value !== null && value !== "" ? value : <span style={{ color: T.inkFaint, fontWeight: 400 }}>{placeholder || "—"}</span>}
    </button>
  );
}

function LeadDetail({ lead, onBack }) {
  const [tab, setTab] = useState("Overview");
  const { dispatch } = useCrm();

  const update = (fields) => dispatch({ type: "UPDATE_LEAD", payload: { id: lead.id, ...fields } });

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-4 p-5">
      <button onClick={onBack} className="crm-focusable flex items-center gap-1.5 text-[12.5px] font-medium w-fit" style={{ color: T.inkSoft }}>
        <ArrowLeft size={14} /> Back to leads
      </button>

      {/* Header card */}
      <div className="rounded-xl p-5 flex items-start justify-between flex-wrap gap-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center crm-mono text-[15px] font-semibold shrink-0" style={{ background: T.accentSoft, color: T.accent }}>{lead.initials}</div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="crm-display text-[19px] font-semibold" style={{ color: T.ink }}>{lead.name}</h1>
              <StatusBadge status={lead.status} />
              <PriorityDot priority={lead.priority} />
            </div>
            <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>{lead.title} at {lead.company} · {lead.id}</p>
            <div className="flex items-center gap-4 mt-2 text-[12.5px]" style={{ color: T.inkSoft }}>
              <span className="flex items-center gap-1"><ScoreChip score={lead.score} /> lead score</span>
              <span className="crm-mono font-semibold" style={{ color: T.ink }}>{lead.dealValue}</span>
              <span>Assigned: {lead.owner}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[[PhoneCall, "Call"], [Mail, "Email"], [CalendarPlus, "Schedule"], [StickyNote, "Note"]].map(([Icon, label]) => (
            <button key={label} className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium" style={{ border: `1px solid ${T.line}`, color: T.inkSoft }}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 flex-wrap" style={{ borderBottom: `1px solid ${T.line}` }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className="crm-focusable px-3 py-2 text-[13px] font-medium relative" style={{ color: tab === t ? T.accent : T.inkFaint }}>
            {t}
            {tab === t && <span className="absolute left-0 right-0 -bottom-px h-[2px] rounded-full" style={{ background: T.accent }} />}
          </button>
        ))}
      </div>

      <div className="flex gap-5">
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {tab === "Overview" && (
            <>
              {/* Business Overview Preview Card */}
              <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building size={15} style={{ color: T.accent }} />
                    <h3 className="crm-display text-[13.5px] font-semibold" style={{ color: T.ink }}>Business Overview & Description</h3>
                  </div>
                  <button
                    onClick={() => setTab("Business Details")}
                    className="crm-focusable text-[12px] font-semibold hover:underline flex items-center gap-1"
                    style={{ color: T.accent }}
                  >
                    View / Edit Business Details →
                  </button>
                </div>
                <p className="text-[12.5px] leading-relaxed" style={{ color: lead.businessDescription ? T.ink : T.inkFaint }}>
                  {lead.businessDescription || "No business description provided yet. Click 'View / Edit Business Details' to add comprehensive company background, business model, and operational details."}
                </p>
                {(lead.companySize || lead.annualRevenue || lead.businessModel) && (
                  <div className="flex items-center gap-3 mt-1.5 pt-2 flex-wrap text-[12px]" style={{ borderTop: `1px dashed ${T.line}` }}>
                    {lead.businessModel && <span className="px-2 py-0.5 rounded font-medium" style={{ background: T.accentSoft, color: T.accent }}>{lead.businessModel}</span>}
                    {lead.companySize && <span className="px-2 py-0.5 rounded font-medium" style={{ background: T.lineSoft, color: T.inkSoft }}>{lead.companySize}</span>}
                    {lead.annualRevenue && <span className="px-2 py-0.5 rounded crm-mono font-medium" style={{ background: T.positiveSoft, color: T.positive }}>{lead.annualRevenue}</span>}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                  <h3 className="crm-display text-[13px] font-semibold mb-3">Contact information</h3>
                  <div className="flex flex-col gap-2.5 text-[13px]">
                    <span className="flex items-center gap-2" style={{ color: T.inkSoft }}><Mail size={14} style={{ color: T.inkFaint }} /> {lead.email || "—"}</span>
                    <span className="flex items-center gap-2 crm-mono" style={{ color: T.inkSoft }}><Phone size={14} style={{ color: T.inkFaint }} /> {lead.phone || "—"}</span>
                    <span className="flex items-center gap-2" style={{ color: T.inkSoft }}><Building size={14} style={{ color: T.inkFaint }} /> {lead.industry || "—"}</span>
                    <span className="flex items-center gap-2" style={{ color: T.inkSoft }}><MapPin size={14} style={{ color: T.inkFaint }} /> {lead.location || "—"}</span>
                    <span className="flex items-center gap-2" style={{ color: T.inkSoft }}><Globe size={14} style={{ color: T.inkFaint }} /> {lead.website || "—"}</span>
                  </div>
                </div>
                <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                  <h3 className="crm-display text-[13px] font-semibold mb-3">Deal snapshot</h3>
                  <div className="flex flex-col gap-2.5 text-[13px]">
                    <span className="flex justify-between"><span style={{ color: T.inkFaint }}>Estimated value</span><span className="crm-mono font-semibold">{lead.dealValue || "—"}</span></span>
                    <span className="flex justify-between"><span style={{ color: T.inkFaint }}>Probability</span><span className="crm-mono font-semibold">{lead.probability}%</span></span>
                    <span className="flex justify-between"><span style={{ color: T.inkFaint }}>Source</span><span>{lead.source}</span></span>
                    <span className="flex justify-between"><span style={{ color: T.inkFaint }}>Created</span><span>{lead.created}</span></span>
                    <span className="flex justify-between"><span style={{ color: T.inkFaint }}>Next follow-up</span><span style={{ color: lead.nextFollowup === "Overdue" ? T.negative : T.ink, fontWeight: 600 }}>{lead.nextFollowup}</span></span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                <h3 className="crm-display text-[13px] font-semibold mb-3">Timeline</h3>
                <div className="flex flex-col">
                  {TIMELINE.map((t, i) => (
                    <div key={i} className="flex gap-3 pb-4 relative">
                      {i !== TIMELINE.length - 1 && <span className="absolute left-[5px] top-3 bottom-0 w-px" style={{ background: T.line }} />}
                      <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: T.accent }} />
                      <div>
                        <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: T.inkFaint }}>{t.tag} · {t.time}</span>
                        <p className="text-[13px] mt-0.5" style={{ color: T.ink }}>{t.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          {tab === "Business Details" && <BusinessDetailsTab lead={lead} />}
          {tab === "Notes" && <NoteTab lead={lead} />}
          {tab !== "Overview" && tab !== "Business Details" && tab !== "Notes" && (
            <div className="rounded-xl p-10 flex flex-col items-center justify-center text-center gap-2" style={{ background: T.surface, border: `1px dashed ${T.line}` }}>
              <span className="text-[13px] font-medium" style={{ color: T.inkSoft }}>{tab} — coming soon</span>
              <span className="text-[12px]" style={{ color: T.inkFaint }}>Activity from this lead will appear here.</span>
            </div>
          )}
        </div>

        {/* AI sidebar */}
        <aside className="w-[280px] shrink-0 flex flex-col gap-4">
          <div className="rounded-xl p-4" style={{ background: T.ink, color: "#fff" }}>
            <div className="flex items-center gap-1.5 mb-3"><Sparkles size={14} /><span className="crm-display text-[13px] font-semibold">AI recommendations</span></div>
            <div className="flex flex-col gap-3">
              <div>
                <span className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "#B8B4FF" }}>Next best action</span>
                <p className="text-[12.5px] leading-snug mt-1" style={{ color: "rgba(255,255,255,0.88)" }}>Engagement rose this week — call within 24 hours to capitalize on momentum.</p>
              </div>
              <div>
                <span className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "#B8B4FF" }}>Conversion probability</span>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
                    <div className="h-full rounded-full" style={{ width: `${lead.probability}%`, background: "#B8B4FF" }} />
                  </div>
                  <span className="crm-mono text-[12px] font-semibold">{lead.probability}%</span>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
            <div className="flex items-center gap-1.5 mb-2"><ShieldAlert size={14} style={{ color: T.amber }} /><span className="crm-display text-[13px] font-semibold">Risk indicators</span></div>
            <p className="text-[12.5px]" style={{ color: T.inkSoft }}>{lead.nextFollowup === "Overdue" ? "⚠️ Overdue follow-up detected. Engage immediately." : "No stalling signals detected. Last touchpoint was recent."}</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
            <div className="flex items-center gap-1.5 mb-2"><TrendingUp size={14} style={{ color: T.positive }} /><span className="crm-display text-[13px] font-semibold">Suggested follow-up</span></div>
            <p className="text-[12.5px]" style={{ color: T.inkSoft }}>Share the enterprise pricing sheet and propose a demo slot.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function NoteTab({ lead }) {
  const [newNote, setNewNote] = useState("");
  const [outcome, setOutcome] = useState("Connected");
  const [duration, setDuration] = useState("3 min");
  const [savedMsg, setSavedMsg] = useState("");
  const { dispatch, state } = useCrm();
  const { user } = useAuth();

  // Find all call logs associated with this lead
  const leadCalls = useMemo(() => {
    return (state.calls || []).filter(c => c.contact === lead.name || c.contact === `Cold Call (${lead.phone})`);
  }, [state.calls, lead]);

  const saveCallNote = () => {
    if (!newNote.trim()) return;
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const nowIso = new Date().toISOString();

    const formattedNote = `[Call Note · ${dateStr} ${timeStr} · ${outcome} (${duration})]: ${newNote.trim()}`;
    const updatedNotes = lead.notes ? `${formattedNote}\n\n${lead.notes}` : formattedNote;
    const updatedStatus = lead.status === 'New' ? 'Contacted' : lead.status;

    dispatch({
      type: "UPDATE_LEAD",
      payload: {
        id: lead.id,
        notes: updatedNotes,
        status: updatedStatus,
        lastContact: nowIso
      }
    });

    dispatch({
      type: "ADD_CALL",
      payload: {
        id: `CL-${Date.now()}`,
        contact: lead.name,
        company: lead.company || 'Prospect Company',
        date: dateStr,
        time: timeStr,
        duration,
        outcome,
        notes: newNote.trim(),
        owner: user?.name || lead.owner || 'Sales Rep',
        userId: user?.id
      }
    });

    dispatch({
      type: "ADD_ACTIVITY",
      payload: {
        id: `ACT-${Date.now()}`,
        type: 'Call',
        contact: lead.name,
        company: lead.company || 'Prospect Company',
        description: `Call Note (${outcome}): ${newNote.trim()}`,
        date: dateStr,
        time: timeStr,
        owner: user?.name || lead.owner || 'Sales Rep',
        userId: user?.id
      }
    });

    setNewNote("");
    setSavedMsg("Call note saved & synced successfully!");
    setTimeout(() => setSavedMsg(""), 3000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Add New Call Note Form */}
      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StickyNote size={16} style={{ color: T.accent }} />
            <h3 className="crm-display text-[14px] font-semibold" style={{ color: T.ink }}>Log Call Note & What Happened</h3>
          </div>
          {savedMsg && <span className="text-[12px] font-medium" style={{ color: T.positive }}>{savedMsg}</span>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Call Outcome">
            <Select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
              <option value="Connected">Connected</option>
              <option value="Interested">Interested</option>
              <option value="Follow-up Required">Follow-up Required</option>
              <option value="Meeting Scheduled">Meeting Scheduled</option>
              <option value="No Answer / Busy">No Answer / Busy</option>
              <option value="Not Interested">Not Interested</option>
            </Select>
          </FormField>
          <FormField label="Call Duration">
            <Select value={duration} onChange={(e) => setDuration(e.target.value)}>
              <option value="1 min">1 min</option>
              <option value="2 min">2 min</option>
              <option value="3 min">3 min</option>
              <option value="5 min">5 min</option>
              <option value="10 min">10 min</option>
              <option value="15+ min">15+ min</option>
            </Select>
          </FormField>
        </div>

        <FormField label="Call Notes & Discussion Details" required>
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Write key takeaways from your call (e.g. Discussed pricing tiers, interested in demo, follow up on Friday at 3 PM)..."
            rows={4}
          />
        </FormField>

        <button
          onClick={saveCallNote}
          className="crm-focusable px-4 py-2 rounded-lg text-[12.5px] font-semibold w-fit flex items-center gap-1.5 transition-all"
          style={{ background: T.accent, color: "#fff" }}
        >
          <Check size={13} /> Save Call Note & Sync CRM
        </button>
      </div>

      {/* Call History & Saved Notes */}
      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <h3 className="crm-display text-[14px] font-semibold" style={{ color: T.ink }}>Call History & Saved Notes</h3>
        {leadCalls.length === 0 && !lead.notes ? (
          <p className="text-[12.5px] py-4 text-center" style={{ color: T.inkFaint }}>No call notes logged yet for this lead.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {leadCalls.map((c) => (
              <div key={c.id} className="p-3 rounded-lg flex flex-col gap-1 text-[12.5px]" style={{ background: T.canvas, border: `1px solid ${T.lineSoft}` }}>
                <div className="flex items-center justify-between font-semibold">
                  <span style={{ color: T.ink }}>{c.outcome} ({c.duration})</span>
                  <span className="text-[11px]" style={{ color: T.inkFaint }}>{c.date} · {c.time}</span>
                </div>
                {c.notes && <p className="mt-0.5 leading-snug" style={{ color: T.inkSoft }}>{c.notes}</p>}
                <span className="text-[10.5px] mt-0.5" style={{ color: T.inkFaint }}>Logged by {c.owner || "Sales Rep"}</span>
              </div>
            ))}
            {lead.notes && (
              <div className="p-3 rounded-lg flex flex-col gap-1 text-[12.5px]" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                <span className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: T.inkFaint }}>All Saved Notes</span>
                <p className="leading-relaxed whitespace-pre-wrap mt-0.5" style={{ color: T.inkSoft }}>{lead.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BusinessDetailsTab({ lead }) {
  const { dispatch } = useCrm();
  const [desc, setDesc] = useState(lead.businessDescription || "");
  const [companySize, setCompanySize] = useState(lead.companySize || "11–50 employees");
  const [revenue, setRevenue] = useState(lead.annualRevenue || "");
  const [model, setModel] = useState(lead.businessModel || "B2B");
  const [industry, setIndustry] = useState(lead.industry || "");
  const [location, setLocation] = useState(lead.location || "");
  const [website, setWebsite] = useState(lead.website || "");
  const [savedMsg, setSavedMsg] = useState("");

  const saveBusinessDetails = () => {
    dispatch({
      type: "UPDATE_LEAD",
      payload: {
        id: lead.id,
        businessDescription: desc,
        companySize,
        annualRevenue: revenue,
        businessModel: model,
        industry,
        location,
        website
      }
    });
    setSavedMsg("Business details saved successfully!");
    setTimeout(() => setSavedMsg(""), 3000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Business Overview & Description */}
      <div className="rounded-xl p-5 flex flex-col gap-3" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building size={16} style={{ color: T.accent }} />
            <h3 className="crm-display text-[14px] font-semibold" style={{ color: T.ink }}>Business Description & Overview</h3>
          </div>
          {savedMsg && (
            <span className="text-[12px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1" style={{ background: T.positiveSoft, color: T.positive }}>
              <Check size={12} /> {savedMsg}
            </span>
          )}
        </div>
        <p className="text-[12px]" style={{ color: T.inkFaint }}>
          Enter a detailed description of {lead.company}'s operations, offerings, target markets, and business goals.
        </p>
        <Textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder={`Describe ${lead.company}'s core business model, key services/products, target clients, and industry positioning…`}
          rows={6}
        />
        <div className="flex justify-end">
          <button
            onClick={saveBusinessDetails}
            className="crm-focusable px-4 py-2 rounded-lg text-[12.5px] font-semibold flex items-center gap-1.5 shadow-sm"
            style={{ background: T.accent, color: "#fff" }}
          >
            <Check size={14} /> Save Business Details
          </button>
        </div>
      </div>

      {/* Profile Parameters Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Company Parameters */}
        <div className="rounded-xl p-5 flex flex-col gap-3.5" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <h3 className="crm-display text-[13.5px] font-semibold" style={{ color: T.ink }}>Company Parameters</h3>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-bold uppercase tracking-wider" style={{ color: T.inkSoft }}>Industry & Sector</label>
            <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Enterprise Software / Fintech" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-bold uppercase tracking-wider" style={{ color: T.inkSoft }}>Business Model</label>
            <Select value={model} onChange={(e) => setModel(e.target.value)}>
              <option value="B2B">B2B (Business to Business)</option>
              <option value="B2C">B2C (Business to Consumer)</option>
              <option value="SaaS / Software">SaaS / Cloud Software</option>
              <option value="Enterprise Services">Enterprise Services & Consulting</option>
              <option value="D2C / E-commerce">D2C / E-Commerce</option>
              <option value="Marketplace / Platform">Marketplace / Platform</option>
              <option value="Manufacturing & Industrial">Manufacturing & Industrial</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-bold uppercase tracking-wider" style={{ color: T.inkSoft }}>Company Size / Workforce</label>
            <Select value={companySize} onChange={(e) => setCompanySize(e.target.value)}>
              <option value="1–10 employees">1–10 employees (Startup)</option>
              <option value="11–50 employees">11–50 employees (Small Business)</option>
              <option value="51–200 employees">51–200 employees (Mid-Market)</option>
              <option value="201–500 employees">201–500 employees (Growing Enterprise)</option>
              <option value="500+ employees">500+ employees (Large Enterprise)</option>
            </Select>
          </div>
        </div>

        {/* Financials & Presence */}
        <div className="rounded-xl p-5 flex flex-col gap-3.5" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <h3 className="crm-display text-[13.5px] font-semibold" style={{ color: T.ink }}>Financials & Location</h3>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-bold uppercase tracking-wider" style={{ color: T.inkSoft }}>Annual Revenue / Turnover</label>
            <Input value={revenue} onChange={(e) => setRevenue(e.target.value)} placeholder="e.g. ₹5 Crore - ₹10 Crore" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-bold uppercase tracking-wider" style={{ color: T.inkSoft }}>Headquarters / Location</label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Mumbai, MH, India" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-bold uppercase tracking-wider" style={{ color: T.inkSoft }}>Official Website</label>
            <div className="flex gap-2">
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" />
              {website && (
                <a
                  href={website.startsWith("http") ? website : `https://${website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-lg text-[12px] font-semibold flex items-center gap-1 shrink-0"
                  style={{ background: T.accentSoft, color: T.accent }}
                >
                  <Globe size={13} /> Visit
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function createLeadId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `L-${crypto.randomUUID()}`;
  return `L-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function Leads() {
  const { state, dispatch } = useCrm();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const isLeader = user?.role === "Leader";

  const [openLead, setOpenLead] = useState(null);

  // Sync openLead from URL search params (e.g. from GlobalSearch / direct links)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const leadId = params.get("id");
    if (leadId && state.leads.length > 0) {
      const match = state.leads.find(l => l.id === leadId);
      if (match) setOpenLead(match);
    }
  }, [location.search, state.leads]);

  const [selected, setSelected] = useState([]);
  const [view, setView] = useState("All leads");
  const [query, setQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Quick Call Note Modal state
  const [callNoteLead, setCallNoteLead] = useState(null);
  const [quickNote, setQuickNote] = useState("");
  const [quickOutcome, setQuickOutcome] = useState("Connected");
  const [quickDuration, setQuickDuration] = useState("3 min");

  const submitQuickCallNote = () => {
    if (!callNoteLead || !quickNote.trim()) return;
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const nowIso = new Date().toISOString();

    const formattedNote = `[Call Note · ${dateStr} ${timeStr} · ${quickOutcome} (${quickDuration})]: ${quickNote.trim()}`;
    const updatedNotes = callNoteLead.notes ? `${formattedNote}\n\n${callNoteLead.notes}` : formattedNote;
    const updatedStatus = callNoteLead.status === 'New' ? 'Contacted' : callNoteLead.status;

    dispatch({
      type: "UPDATE_LEAD",
      payload: {
        id: callNoteLead.id,
        notes: updatedNotes,
        status: updatedStatus,
        lastContact: nowIso
      }
    });

    dispatch({
      type: "ADD_CALL",
      payload: {
        id: `CL-${Date.now()}`,
        contact: callNoteLead.name,
        company: callNoteLead.company || 'Prospect Company',
        date: dateStr,
        time: timeStr,
        duration: quickDuration,
        outcome: quickOutcome,
        notes: quickNote.trim(),
        owner: user?.name || callNoteLead.owner || 'Sales Rep',
        userId: user?.id
      }
    });

    dispatch({
      type: "ADD_ACTIVITY",
      payload: {
        id: `ACT-${Date.now()}`,
        type: 'Call',
        contact: callNoteLead.name,
        company: callNoteLead.company || 'Prospect Company',
        description: `Call Note (${quickOutcome}): ${quickNote.trim()}`,
        date: dateStr,
        time: timeStr,
        owner: user?.name || callNoteLead.owner || 'Sales Rep',
        userId: user?.id
      }
    });

    setCallNoteLead(null);
    setQuickNote("");
  };

  // Active Header Filters State
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [employeeFilter, setEmployeeFilter] = useState("All"); // "All" | employee ID or name
  const [groupByEmployee, setGroupByEmployee] = useState(false);

  // Open Popover Menu Controls
  const [openFilterMenu, setOpenFilterMenu] = useState(null); // 'status' | 'priority' | 'owner' | 'source' | 'export'
  const [openBulkMenu, setOpenBulkMenu] = useState(null);     // 'status' | 'priority' | 'assign' | 'export'

  const containerRef = useRef(null);

  // Close open dropdown popovers on click outside
  useEffect(() => {
    if (!openFilterMenu && !openBulkMenu) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenFilterMenu(null);
        setOpenBulkMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openFilterMenu, openBulkMenu]);

  // Employee list for segregation tabs and filters
  const employeeList = useMemo(() => {
    const list = [];
    if (state.team && state.team.length > 0) {
      state.team.forEach(m => {
        list.push({
          id: m.id,
          userId: m.userId || null,
          accountUserId: m.accountUserId || m.userId || null,
          name: m.name,
          initials: m.initials || m.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2),
          email: m.email
        });
      });
    }

    if (user?.name && !list.some(m => m.name.trim().toLowerCase() === user.name.trim().toLowerCase())) {
      list.unshift({
        id: user.id || "leader-me",
        userId: user.id,
        accountUserId: user.id,
        name: user.name,
        initials: user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2),
        isLeader: true
      });
    }

    list.push({
      id: "unassigned",
      name: "Unassigned",
      initials: "UA",
      isUnassigned: true
    });

    return list;
  }, [state.team, user]);

  // Dynamic Team Members list from state.team
  const teamList = useMemo(() => {
    const names = new Set();
    names.add("Unassigned");
    if (state.team && state.team.length > 0) {
      state.team.forEach(m => {
        if (m.name && m.name.trim()) names.add(m.name.trim());
      });
    }
    if (user?.name && user.name.trim()) {
      names.add(user.name.trim());
    }
    return Array.from(names);
  }, [state.team, user]);

  const emptyForm = { name: "", company: "", email: "", phone: "", status: "New", priority: "Medium", source: "Website", owner: "", dealValue: "0", probability: "100", score: "50", industry: "", location: "", businessDescription: "", companySize: "11–50 employees", annualRevenue: "", businessModel: "B2B" };
  const [addForm, setAddForm] = useState(emptyForm);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const activeOwner = addForm.owner || teamList[0] || "Unassigned";
  const currentLead = openLead
    ? typeof openLead === "string"
      ? state.leads.find((l) => l.id === openLead) || null
      : state.leads.find((l) => l.id === openLead.id) || openLead
    : null;

  // Dynamic list of all statuses present in database + standard statuses
  const availableStatuses = useMemo(() => {
    const list = [...STATUSES.filter(s => s !== "Custom...")];
    (state.leads || []).forEach(l => {
      if (l.status && typeof l.status === "string" && l.status.trim() && !list.includes(l.status.trim())) {
        list.push(l.status.trim());
      }
    });
    list.push("Custom...");
    return list;
  }, [state.leads]);

  const filtered = useMemo(() => {
    let rows = state.leads;
    if (view === "My priority leads") rows = rows.filter(l => l.priority === "High");
    if (view === "Follow-ups due today") rows = rows.filter(l => l.nextFollowup?.startsWith("Today") || l.nextFollowup === "Overdue");
    if (view === "Uncontacted") rows = rows.filter(l => l.status === "New");
    if (view === "Closing this month") rows = rows.filter(l => l.probability >= 50);

    if (statusFilter !== "All") {
      if (statusFilter === "Custom...") {
        rows = rows.filter(l => !STATUSES.slice(0, -1).includes(l.status));
      } else {
        rows = rows.filter(l => (l.status || "").trim().toLowerCase() === statusFilter.trim().toLowerCase());
      }
    }
    if (priorityFilter !== "All") rows = rows.filter(l => l.priority === priorityFilter);
    if (sourceFilter !== "All") rows = rows.filter(l => l.source === sourceFilter);

    // Unified Employee / Owner Filter (smart matching by userId, name, first name, or initials)
    const activeEmpFilter = employeeFilter !== "All" ? employeeFilter : ownerFilter;
    if (activeEmpFilter !== "All") {
      const targetEmp = employeeList.find(e => e.id === activeEmpFilter || e.name === activeEmpFilter) || { name: activeEmpFilter };
      rows = rows.filter(l => isLeadBelongsToEmployee(l, targetEmp));
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(l => l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q) || l.phone?.includes(q));
    }
    return rows;
  }, [state.leads, view, query, statusFilter, priorityFilter, ownerFilter, sourceFilter, employeeFilter, employeeList]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = (checked) => setSelected(checked ? paginated.map(l => l.id) : []);

  const setF = (k) => (e) => setAddForm(f => ({ ...f, [k]: e.target.value }));

  const updateLead = (id, fields) => {
    const lastContact = new Date().toISOString();
    dispatch({ type: "UPDATE_LEAD", payload: { id, ...fields, lastContact } });
  };

  // Bulk Actions
  const handleBulkStatusChange = (newStatus) => {
    let statusToSave = newStatus;
    if (newStatus === "Custom..." || newStatus === "Custom") {
      const customVal = window.prompt("Enter custom status or reason:");
      if (!customVal || !customVal.trim()) return;
      statusToSave = customVal.trim();
    }
    selected.forEach(id => updateLead(id, { status: statusToSave }));
    setOpenBulkMenu(null);
  };

  const handleBulkPriorityChange = (newPriority) => {
    selected.forEach(id => updateLead(id, { priority: newPriority }));
    setOpenBulkMenu(null);
  };

  const handleBulkAssign = (newOwner) => {
    const targetMember = (state.team || []).find(m => m.name === newOwner);
    const targetUserId = targetMember?.accountUserId || targetMember?.userId || (newOwner === user?.name ? user?.id : null);
    const ownerInitials = newOwner === "Unassigned" ? "UA" : newOwner.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    selected.forEach(id => updateLead(id, { 
      owner: newOwner, 
      ownerInitials,
      ...(targetUserId ? { userId: targetUserId } : {})
    }));
    setOpenBulkMenu(null);
  };

  const handleBulkExport = (format) => {
    const selectedLeads = state.leads.filter(l => selected.includes(l.id));
    exportLeads(selectedLeads, `selected_${selectedLeads.length}_leads`, format);
    setOpenBulkMenu(null);
  };

  const activeFilterCount = (statusFilter !== "All" ? 1 : 0) + 
                            (priorityFilter !== "All" ? 1 : 0) + 
                            (ownerFilter !== "All" || employeeFilter !== "All" ? 1 : 0) + 
                            (sourceFilter !== "All" ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter("All");
    setPriorityFilter("All");
    setOwnerFilter("All");
    setEmployeeFilter("All");
    setSourceFilter("All");
    setQuery("");
    setPage(1);
  };

  const submitAdd = () => {
    if (!addForm.name || !addForm.company) return toast.warning("Name and company are required", "Validation");
    const ownerToSave = activeOwner;
    const targetMember = (state.team || []).find(m => m.name === ownerToSave);
    const targetUserId = targetMember?.accountUserId || targetMember?.userId || (ownerToSave === user?.name ? user?.id : user?.id);
    const initials = addForm.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    const ownerInitials = ownerToSave === "Unassigned" ? "UA" : ownerToSave.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    const score = parseInt(addForm.score, 10) || 50;
    const probability = Math.min(100, Math.max(0, parseInt(addForm.probability, 10) || 100));
    const dealValueNum = parseInt(String(addForm.dealValue).replace(/[^0-9]/g, ""), 10) || 0;
    const dealValueDisplay = String(addForm.dealValue).trim();
    
    const finalStatus = (addForm.status === "Custom..." || addForm.status === "Custom")
      ? (addForm.customStatus?.trim() || "Custom")
      : addForm.status;

    dispatch({
      type: "ADD_LEAD",
      payload: {
        id: createLeadId(),
        ...addForm,
        status: finalStatus,
        owner: ownerToSave,
        initials,
        ownerInitials,
        userId: targetUserId,
        score,
        probability,
        dealValueNum,
        dealValue: dealValueDisplay ? (dealValueDisplay.startsWith("₹") ? dealValueDisplay : `₹${dealValueDisplay}`) : "₹0",
        lastContact: new Date().toISOString(),
        nextFollowup: "Not scheduled",
        created: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        notes: "",
        website: ""
      }
    });
    setShowAddModal(false);
    setAddForm(emptyForm);
    toast.success(`Created lead "${addForm.name}" assigned to ${ownerToSave}`, "Lead Added");
  };

  // Table columns
  const cols = ["Lead Name", "Phone", "Email", "Company", "Status", "Priority", "Score", "Source", "Assign To", "Last Contact", "Deal Value", "Probability", "Actions"];

  if (currentLead) return <LeadDetailView lead={currentLead} onBack={() => setOpenLead(null)} />;

  return (
    <div ref={containerRef} className="p-5 flex flex-col gap-4 min-w-0">
      {/* Add Lead Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add new lead">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Full name" required><Input value={addForm.name} onChange={setF("name")} placeholder="Anjali Rao" /></FormField>
            <FormField label="Company" required><Input value={addForm.company} onChange={setF("company")} placeholder="Meridian Textiles" /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email"><Input value={addForm.email} onChange={setF("email")} type="email" placeholder="anjali@example.com" /></FormField>
            <FormField label="Phone"><Input value={addForm.phone} onChange={setF("phone")} placeholder="+91 98000 00000" /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Status"><Select value={addForm.status} onChange={setF("status")}>{availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}</Select></FormField>
            <FormField label="Priority"><Select value={addForm.priority} onChange={setF("priority")}>{PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</Select></FormField>
          </div>
          {(addForm.status === "Custom..." || addForm.status === "Custom") && (
            <FormField label="Custom Status / Reason" required>
              <Input
                value={addForm.customStatus || ""}
                onChange={setF("customStatus")}
                placeholder="e.g. Call back at 5 PM, Out of station, Busy..."
              />
            </FormField>
          )}
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Score (0–100)"><Input value={addForm.score} onChange={setF("score")} placeholder="50" type="number" /></FormField>
            <FormField label="Deal Value (₹)"><Input value={addForm.dealValue} onChange={setF("dealValue")} placeholder="18,40,000" /></FormField>
            <FormField label="Probability (%)"><Input value={addForm.probability} onChange={setF("probability")} placeholder="20" type="number" /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Source"><Select value={addForm.source} onChange={setF("source")}>{SOURCES.map(s => <option key={s}>{s}</option>)}</Select></FormField>
            <FormField label="Assign to">
              <Select value={activeOwner} onChange={setF("owner")}>
                {teamList.map(o => <option key={o} value={o}>{o}</option>)}
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Industry"><Input value={addForm.industry} onChange={setF("industry")} placeholder="Enterprise Software" /></FormField>
            <FormField label="Location"><Input value={addForm.location} onChange={setF("location")} placeholder="Mumbai, MH" /></FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Business Model">
              <Select value={addForm.businessModel} onChange={setF("businessModel")}>
                <option value="B2B">B2B</option>
                <option value="B2C">B2C</option>
                <option value="SaaS / Software">SaaS / Software</option>
                <option value="Enterprise Services">Enterprise Services</option>
                <option value="D2C / E-commerce">D2C / E-Commerce</option>
                <option value="Marketplace / Platform">Marketplace</option>
              </Select>
            </FormField>
            <FormField label="Company Size">
              <Select value={addForm.companySize} onChange={setF("companySize")}>
                <option value="1–10 employees">1–10 employees</option>
                <option value="11–50 employees">11–50 employees</option>
                <option value="51–200 employees">51–200 employees</option>
                <option value="201–500 employees">201–500 employees</option>
                <option value="500+ employees">500+ employees</option>
              </Select>
            </FormField>
            <FormField label="Annual Revenue"><Input value={addForm.annualRevenue} onChange={setF("annualRevenue")} placeholder="e.g. ₹5 Crore" /></FormField>
          </div>
          <FormField label="Business Description & Overview">
            <Textarea value={addForm.businessDescription} onChange={setF("businessDescription")} placeholder="Briefly describe what this company does, key offerings, and target clients…" rows={3} />
          </FormField>
          <SubmitBtn onClick={submitAdd}>Add Lead</SubmitBtn>
        </div>
      </Modal>

      {/* Log Call Note Modal */}
      {callNoteLead && (
        <Modal open={Boolean(callNoteLead)} onClose={() => setCallNoteLead(null)} title={`Log Call Note for ${callNoteLead.name}`}>
          <div className="flex flex-col gap-4">
            <div className="p-3 rounded-lg flex items-center justify-between text-[12px]" style={{ background: T.canvas, border: `1px solid ${T.lineSoft}` }}>
              <div>
                <span className="font-semibold block" style={{ color: T.ink }}>{callNoteLead.name} ({callNoteLead.company})</span>
                <span style={{ color: T.inkFaint }}>{callNoteLead.phone || "No phone"}</span>
              </div>
              <StatusBadge status={callNoteLead.status} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Call Outcome">
                <Select value={quickOutcome} onChange={(e) => setQuickOutcome(e.target.value)}>
                  <option value="Connected">Connected</option>
                  <option value="Interested">Interested</option>
                  <option value="Follow-up Required">Follow-up Required</option>
                  <option value="Meeting Scheduled">Meeting Scheduled</option>
                  <option value="No Answer / Busy">No Answer / Busy</option>
                  <option value="Not Interested">Not Interested</option>
                </Select>
              </FormField>
              <FormField label="Duration">
                <Select value={quickDuration} onChange={(e) => setQuickDuration(e.target.value)}>
                  <option value="1 min">1 min</option>
                  <option value="2 min">2 min</option>
                  <option value="3 min">3 min</option>
                  <option value="5 min">5 min</option>
                  <option value="10 min">10 min</option>
                  <option value="15+ min">15+ min</option>
                </Select>
              </FormField>
            </div>

            <FormField label="What happened on the call?" required>
              <Textarea
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="Write call takeaways (e.g. Spoke about budget, interested in annual plan, send proposal by email)..."
                rows={4}
              />
            </FormField>

            <SubmitBtn onClick={submitQuickCallNote}>Save Call Note & Sync CRM</SubmitBtn>
          </div>
        </Modal>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="crm-display text-[20px] font-semibold" style={{ color: T.ink }}>Leads</h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>
            {state.leads.length} total · {state.leads.filter(l => l.status === "New").length} uncontacted ·{" "}
            <span className="text-[11.5px] font-medium" style={{ color: T.inkFaint }}>Click any cell to edit inline</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/importexport")}
            className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition hover:opacity-90"
            style={{ background: T.surface, color: T.ink, border: `1px solid ${T.line}` }}
          >
            <FileSpreadsheet size={14} className="text-emerald-600" /> Import Excel
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold shadow-sm transition hover:opacity-90"
            style={{ background: T.accent, color: "#fff" }}
          >
            <Plus size={14} /> Add lead
          </button>
        </div>
      </div>

      {/* Saved views — scrollable horizontal pill bar on mobile */}
      <div className="flex items-center gap-1.5 overflow-x-auto crm-scroll py-1 max-w-full">
        {SAVED_VIEWS.map((v) => (
          <button key={v} onClick={() => { setView(v); setPage(1); }} className="crm-focusable px-3 py-1.5 rounded-full text-[12.5px] font-medium shrink-0 whitespace-nowrap"
            style={{ background: view === v ? T.ink : T.surface, color: view === v ? "#fff" : T.inkSoft, border: `1px solid ${view === v ? T.ink : T.line}` }}>
            {v}
          </button>
        ))}
      </div>

      {/* ── EMPLOYEE-WISE LEAD SEGREGATION BAR (For Leaders) ── */}
      {isLeader && (
        <div className="crm-card rounded-xl p-3.5 flex flex-col gap-2.5" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Users size={16} style={{ color: T.accent }} />
              <span className="text-[13px] font-semibold" style={{ color: T.ink }}>Employee-wise Lead Segregation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setGroupByEmployee(false)}
                className="crm-focusable px-2.5 py-1 rounded-md text-[11.5px] font-medium flex items-center gap-1.5 transition-all"
                style={{
                  background: !groupByEmployee ? T.accent : T.canvas,
                  color: !groupByEmployee ? "#fff" : T.inkSoft,
                  border: `1px solid ${!groupByEmployee ? T.accent : T.line}`
                }}
              >
                <List size={13} /> Flat List View
              </button>
              <button
                onClick={() => setGroupByEmployee(true)}
                className="crm-focusable px-2.5 py-1 rounded-md text-[11.5px] font-medium flex items-center gap-1.5 transition-all"
                style={{
                  background: groupByEmployee ? T.accent : T.canvas,
                  color: groupByEmployee ? "#fff" : T.inkSoft,
                  border: `1px solid ${groupByEmployee ? T.accent : T.line}`
                }}
              >
                <LayoutGrid size={13} /> Group by Employee
              </button>
            </div>
          </div>

          {/* Employee Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto crm-scroll py-1">
            <button
              onClick={() => { setEmployeeFilter("All"); setOwnerFilter("All"); setPage(1); }}
              className="crm-focusable px-3 py-1.5 rounded-lg text-[12px] font-semibold shrink-0 flex items-center gap-1.5"
              style={{
                background: employeeFilter === "All" ? T.accent : T.canvas,
                color: employeeFilter === "All" ? "#fff" : T.inkSoft,
                border: `1px solid ${employeeFilter === "All" ? T.accent : T.line}`
              }}
            >
              <span>All Employees</span>
              <span className="crm-mono text-[10.5px] px-1.5 py-0.2 rounded-full font-bold"
                style={{ background: employeeFilter === "All" ? "rgba(255,255,255,0.25)" : T.lineSoft, color: employeeFilter === "All" ? "#fff" : T.inkFaint }}>
                {state.leads.length}
              </span>
            </button>

            {employeeList.map(emp => {
              const empCount = state.leads.filter(l => isLeadBelongsToEmployee(l, emp)).length;
              const isSel = employeeFilter === emp.id || employeeFilter === emp.name;
              return (
                <button
                  key={emp.id}
                  onClick={() => { setEmployeeFilter(emp.id); setOwnerFilter("All"); setPage(1); }}
                  className="crm-focusable px-3 py-1.5 rounded-lg text-[12px] font-medium shrink-0 flex items-center gap-1.5 transition-all"
                  style={{
                    background: isSel ? T.accentSoft : T.canvas,
                    color: isSel ? T.accent : T.inkSoft,
                    border: `1px solid ${isSel ? T.accent : T.line}`,
                    fontWeight: isSel ? 600 : 400
                  }}
                >
                  <Avatar initials={emp.initials} size={18} bg={isSel ? T.accent : T.lineSoft} fg={isSel ? "#fff" : T.inkSoft} />
                  <span>{emp.name}</span>
                  <span className="crm-mono text-[10.5px] px-1.5 py-0.2 rounded-full font-bold"
                    style={{ background: isSel ? T.accent : T.lineSoft, color: isSel ? "#fff" : T.inkFaint }}>
                    {empCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search & Filter bar */}
      <div className="flex items-center gap-2 flex-wrap relative z-20">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-1 min-w-[220px]" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <Search size={14} style={{ color: T.inkFaint }} />
          <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search by name, company, phone, email…" className="flex-1 text-[13px] outline-none bg-transparent" style={{ color: T.ink }} />
          {query && <button onClick={() => setQuery("")}><X size={13} style={{ color: T.inkFaint }} /></button>}
        </div>

        {/* Status Filter */}
        <div className="relative">
          <button
            onClick={() => setOpenFilterMenu(openFilterMenu === "status" ? null : "status")}
            className="crm-focusable flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium"
            style={{
              background: statusFilter !== "All" ? T.accentSoft : T.surface,
              border: `1px solid ${statusFilter !== "All" ? T.accent : T.line}`,
              color: statusFilter !== "All" ? T.accent : T.inkSoft
            }}
          >
            <span>Status: <strong>{statusFilter}</strong></span>
            <ChevronDown size={12} />
          </button>
          {openFilterMenu === "status" && (
            <div className="absolute left-0 top-full mt-1 w-48 rounded-lg shadow-xl py-1 text-left z-50 overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
              <button
                onClick={() => { setStatusFilter("All"); setOpenFilterMenu(null); setPage(1); }}
                className="w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-gray-50 flex items-center justify-between"
                style={{ color: statusFilter === "All" ? T.accent : T.ink, fontWeight: statusFilter === "All" ? 600 : 400 }}
              >
                <span>All Statuses</span>
                {statusFilter === "All" && <Check size={12} style={{ color: T.accent }} />}
              </button>
              <div className="h-px my-1" style={{ background: T.lineSoft }} />
              {availableStatuses.map(s => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setOpenFilterMenu(null); setPage(1); }}
                  className="w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-gray-50 flex items-center justify-between"
                  style={{ color: statusFilter === s ? T.accent : T.ink, fontWeight: statusFilter === s ? 600 : 400 }}
                >
                  <span>{s === "Custom..." ? "Custom Statuses" : s}</span>
                  {statusFilter === s && <Check size={12} style={{ color: T.accent }} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Priority Filter */}
        <div className="relative">
          <button
            onClick={() => setOpenFilterMenu(openFilterMenu === "priority" ? null : "priority")}
            className="crm-focusable flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium"
            style={{
              background: priorityFilter !== "All" ? T.accentSoft : T.surface,
              border: `1px solid ${priorityFilter !== "All" ? T.accent : T.line}`,
              color: priorityFilter !== "All" ? T.accent : T.inkSoft
            }}
          >
            <span>Priority: <strong>{priorityFilter}</strong></span>
            <ChevronDown size={12} />
          </button>
          {openFilterMenu === "priority" && (
            <div className="absolute left-0 top-full mt-1 w-44 rounded-lg shadow-xl py-1 text-left z-50 overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
              <button
                onClick={() => { setPriorityFilter("All"); setOpenFilterMenu(null); setPage(1); }}
                className="w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-gray-50 flex items-center justify-between"
                style={{ color: priorityFilter === "All" ? T.accent : T.ink, fontWeight: priorityFilter === "All" ? 600 : 400 }}
              >
                <span>All Priorities</span>
                {priorityFilter === "All" && <Check size={12} style={{ color: T.accent }} />}
              </button>
              <div className="h-px my-1" style={{ background: T.lineSoft }} />
              {PRIORITIES.map(p => (
                <button
                  key={p}
                  onClick={() => { setPriorityFilter(p); setOpenFilterMenu(null); setPage(1); }}
                  className="w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-gray-50 flex items-center justify-between"
                  style={{ color: priorityFilter === p ? T.accent : T.ink, fontWeight: priorityFilter === p ? 600 : 400 }}
                >
                  <span>{p}</span>
                  {priorityFilter === p && <Check size={12} style={{ color: T.accent }} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Assign / Owner Filter */}
        <div className="relative">
          <button
            onClick={() => setOpenFilterMenu(openFilterMenu === "owner" ? null : "owner")}
            className="crm-focusable flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium"
            style={{
              background: ownerFilter !== "All" ? T.accentSoft : T.surface,
              border: `1px solid ${ownerFilter !== "All" ? T.accent : T.line}`,
              color: ownerFilter !== "All" ? T.accent : T.inkSoft
            }}
          >
            <span>Assignee: <strong>{ownerFilter}</strong></span>
            <ChevronDown size={12} />
          </button>
          {openFilterMenu === "owner" && (
            <div className="absolute left-0 top-full mt-1 w-48 rounded-lg shadow-xl py-1 text-left z-50 overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
              <button
                onClick={() => { setOwnerFilter("All"); setEmployeeFilter("All"); setOpenFilterMenu(null); setPage(1); }}
                className="w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-gray-50 flex items-center justify-between"
                style={{ color: ownerFilter === "All" && employeeFilter === "All" ? T.accent : T.ink, fontWeight: ownerFilter === "All" ? 600 : 400 }}
              >
                <span>All Owners</span>
                {ownerFilter === "All" && employeeFilter === "All" && <Check size={12} style={{ color: T.accent }} />}
              </button>
              <div className="h-px my-1" style={{ background: T.lineSoft }} />
              {teamList.map(t => (
                <button
                  key={t}
                  onClick={() => { setOwnerFilter(t); setEmployeeFilter(t); setOpenFilterMenu(null); setPage(1); }}
                  className="w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-gray-50 flex items-center justify-between"
                  style={{ color: ownerFilter === t || employeeFilter === t ? T.accent : T.ink, fontWeight: ownerFilter === t ? 600 : 400 }}
                >
                  <span>{t}</span>
                  {(ownerFilter === t || employeeFilter === t) && <Check size={12} style={{ color: T.accent }} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Source Filter */}
        <div className="relative">
          <button
            onClick={() => setOpenFilterMenu(openFilterMenu === "source" ? null : "source")}
            className="crm-focusable flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium"
            style={{
              background: sourceFilter !== "All" ? T.accentSoft : T.surface,
              border: `1px solid ${sourceFilter !== "All" ? T.accent : T.line}`,
              color: sourceFilter !== "All" ? T.accent : T.inkSoft
            }}
          >
            <span>Source: <strong>{sourceFilter}</strong></span>
            <ChevronDown size={12} />
          </button>
          {openFilterMenu === "source" && (
            <div className="absolute left-0 top-full mt-1 w-44 rounded-lg shadow-xl py-1 text-left z-50 overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
              <button
                onClick={() => { setSourceFilter("All"); setOpenFilterMenu(null); setPage(1); }}
                className="w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-gray-50 flex items-center justify-between"
                style={{ color: sourceFilter === "All" ? T.accent : T.ink, fontWeight: sourceFilter === "All" ? 600 : 400 }}
              >
                <span>All Sources</span>
                {sourceFilter === "All" && <Check size={12} style={{ color: T.accent }} />}
              </button>
              <div className="h-px my-1" style={{ background: T.lineSoft }} />
              {SOURCES.map(s => (
                <button
                  key={s}
                  onClick={() => { setSourceFilter(s); setOpenFilterMenu(null); setPage(1); }}
                  className="w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-gray-50 flex items-center justify-between"
                  style={{ color: sourceFilter === s ? T.accent : T.ink, fontWeight: sourceFilter === s ? 600 : 400 }}
                >
                  <span>{s}</span>
                  {sourceFilter === s && <Check size={12} style={{ color: T.accent }} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear Filters Button */}
        {(activeFilterCount > 0 || query) && (
          <button
            onClick={clearFilters}
            className="crm-focusable flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-medium"
            style={{ background: T.surface, border: `1px solid ${T.line}`, color: T.negative }}
            title="Reset all filters"
          >
            <X size={13} /> Reset filters
          </button>
        )}

        {/* Header Export Button */}
        <div className="relative ml-auto">
          <button
            onClick={() => setOpenFilterMenu(openFilterMenu === "export" ? null : "export")}
            className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium"
            style={{ background: T.surface, border: `1px solid ${T.line}`, color: T.inkSoft }}
          >
            <Download size={13} /> Export ({filtered.length})
          </button>
          {openFilterMenu === "export" && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg shadow-xl py-1 text-left z-50 overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
              <button
                onClick={() => { exportLeads(filtered, `filtered_${filtered.length}_leads`, "csv"); setOpenFilterMenu(null); }}
                className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-gray-50 flex items-center gap-2"
                style={{ color: T.ink }}
              >
                <Download size={13} style={{ color: T.accent }} />
                <span>Export Filtered (CSV)</span>
              </button>
              <button
                onClick={() => { exportLeads(filtered, `filtered_${filtered.length}_leads`, "xlsx"); setOpenFilterMenu(null); }}
                className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-gray-50 flex items-center gap-2"
                style={{ color: T.ink }}
              >
                <FileSpreadsheet size={13} style={{ color: T.positive }} />
                <span>Export Filtered (Excel)</span>
              </button>
              <div className="h-px my-1" style={{ background: T.lineSoft }} />
              <button
                onClick={() => { exportLeads(state.leads, "all_leads", "csv"); setOpenFilterMenu(null); }}
                className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-gray-50 flex items-center gap-2"
                style={{ color: T.inkFaint }}
              >
                <Download size={13} />
                <span>Export All ({state.leads.length} leads)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bulk bar */}
      {selected.length > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg relative z-30 shadow-md" style={{ background: T.ink, color: "#fff" }}>
          <span className="text-[12.5px] font-medium">{selected.length} selected</span>
          <div className="w-px h-4" style={{ background: "rgba(255,255,255,0.2)" }} />

          {/* Bulk Change Status */}
          <div className="relative">
            <button
              onClick={() => setOpenBulkMenu(openBulkMenu === "status" ? null : "status")}
              className="crm-focusable flex items-center gap-1 text-[12.5px] font-medium hover:text-white"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              Change status <ChevronDown size={12} />
            </button>
            {openBulkMenu === "status" && (
              <div className="absolute left-0 top-full mt-2 w-48 rounded-lg shadow-xl py-1 text-left z-50 overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                {availableStatuses.filter(s => s !== "Custom...").map(s => (
                  <button
                    key={s}
                    onClick={() => handleBulkStatusChange(s)}
                    className="w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-gray-50 flex items-center justify-between"
                    style={{ color: T.ink }}
                  >
                    <span>{s}</span>
                    <StatusBadge status={s} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bulk Change Priority */}
          <div className="relative">
            <button
              onClick={() => setOpenBulkMenu(openBulkMenu === "priority" ? null : "priority")}
              className="crm-focusable flex items-center gap-1 text-[12.5px] font-medium hover:text-white"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              Change priority <ChevronDown size={12} />
            </button>
            {openBulkMenu === "priority" && (
              <div className="absolute left-0 top-full mt-2 w-44 rounded-lg shadow-xl py-1 text-left z-50 overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                {PRIORITIES.map(p => (
                  <button
                    key={p}
                    onClick={() => handleBulkPriorityChange(p)}
                    className="w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-gray-50 flex items-center justify-between"
                    style={{ color: T.ink }}
                  >
                    <span>{p}</span>
                    <PriorityDot priority={p} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bulk Assign */}
          <div className="relative">
            <button
              onClick={() => setOpenBulkMenu(openBulkMenu === "assign" ? null : "assign")}
              className="crm-focusable flex items-center gap-1 text-[12.5px] font-medium hover:text-white"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              Assign <ChevronDown size={12} />
            </button>
            {openBulkMenu === "assign" && (
              <div className="absolute left-0 top-full mt-2 w-48 rounded-lg shadow-xl py-1 text-left z-50 overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                {teamList.map(t => (
                  <button
                    key={t}
                    onClick={() => handleBulkAssign(t)}
                    className="w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-gray-50 flex items-center gap-2"
                    style={{ color: T.ink }}
                  >
                    <Avatar initials={t.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)} size={18} bg={T.lineSoft} fg={T.inkSoft} />
                    <span>{t}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bulk Export */}
          <div className="relative">
            <button
              onClick={() => setOpenBulkMenu(openBulkMenu === "export" ? null : "export")}
              className="crm-focusable flex items-center gap-1 text-[12.5px] font-medium hover:text-white"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              Export <ChevronDown size={12} />
            </button>
            {openBulkMenu === "export" && (
              <div className="absolute left-0 top-full mt-2 w-44 rounded-lg shadow-xl py-1 text-left z-50 overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                <button
                  onClick={() => handleBulkExport("csv")}
                  className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-gray-50 flex items-center gap-2"
                  style={{ color: T.ink }}
                >
                  <Download size={13} style={{ color: T.accent }} />
                  <span>Export as CSV</span>
                </button>
                <button
                  onClick={() => handleBulkExport("xlsx")}
                  className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-gray-50 flex items-center gap-2"
                  style={{ color: T.ink }}
                >
                  <FileSpreadsheet size={13} style={{ color: T.positive }} />
                  <span>Export as Excel (.xlsx)</span>
                </button>
              </div>
            )}
          </div>

          <button onClick={() => toggleAll(false)} className="crm-focusable ml-auto hover:opacity-80"><X size={15} /></button>
        </div>
      )}

      {/* Hint banner */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]" style={{ background: T.accentSoft, color: T.accent }}>
        <Check size={13} />
        <span><strong>Inline editing:</strong> Click <strong>Status</strong>, <strong>Priority</strong>, <strong>Score</strong>, <strong>Deal Value</strong>, or <strong>Probability %</strong> directly in the table to edit instantly.</span>
      </div>

      {/* ── LEADS DISPLAY: Grouped by Employee OR Standard Table List ── */}
      {groupByEmployee && isLeader ? (
        <div className="flex flex-col gap-5">
          {employeeList.map(emp => {
            const empLeads = filtered.filter(l => isLeadBelongsToEmployee(l, emp));
            if (empLeads.length === 0 && employeeFilter !== "All" && (employeeFilter === emp.id || employeeFilter === emp.name)) {
              return (
                <div key={emp.id} className="crm-card rounded-xl p-8 text-center" style={{ background: T.surface, border: `1px dashed ${T.line}` }}>
                  <p className="text-[13px] font-medium" style={{ color: T.inkFaint }}>No leads assigned to {emp.name}</p>
                </div>
              );
            }
            if (empLeads.length === 0) return null;

            const empTotalValue = empLeads.reduce((s, l) => s + (l.dealValueNum || 0), 0);

            return (
              <div key={emp.id} className="rounded-xl overflow-hidden shadow-sm" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                {/* Employee Header */}
                <div className="p-3.5 flex items-center justify-between flex-wrap gap-2" style={{ background: T.canvas, borderBottom: `1px solid ${T.line}` }}>
                  <div className="flex items-center gap-3">
                    <Avatar initials={emp.initials} size={34} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="crm-display text-[14.5px] font-semibold" style={{ color: T.ink }}>{emp.name}</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.accentSoft, color: T.accent }}>
                          {empLeads.length} leads
                        </span>
                      </div>
                      {emp.email && <p className="text-[11.5px]" style={{ color: T.inkFaint }}>{emp.email}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[12.5px]">
                    <div>
                      <span style={{ color: T.inkFaint }}>Total Deal Value: </span>
                      <span className="crm-mono font-bold" style={{ color: T.positive }}>{fmtINR(empTotalValue)}</span>
                    </div>
                  </div>
                </div>

                {/* Table for this employee */}
                <div className="overflow-x-auto crm-scroll">
                  <table className="w-full border-collapse min-w-[1300px]">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${T.line}` }}>
                        <th className="px-3 py-2.5 text-left">
                          <input
                            type="checkbox"
                            checked={empLeads.every(l => selected.includes(l.id)) && empLeads.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelected(s => Array.from(new Set([...s, ...empLeads.map(l => l.id)])));
                              } else {
                                const idsToRemove = new Set(empLeads.map(l => l.id));
                                setSelected(s => s.filter(id => !idsToRemove.has(id)));
                              }
                            }}
                            className="w-3.5 h-3.5"
                          />
                        </th>
                        {cols.map(c => (
                          <th key={c} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: T.inkFaint }}>
                            <span className="flex items-center gap-1">{c}{c !== "Actions" && <ArrowUpDown size={10} />}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {empLeads.map(l => (
                        <tr key={l.id} className="crm-row" style={{ borderBottom: `1px solid ${T.lineSoft}` }}
                          onMouseEnter={e => e.currentTarget.style.background = T.canvas}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggle(l.id)} className="w-3.5 h-3.5" />
                          </td>

                          {/* Lead Name */}
                          <td className="px-3 py-2">
                            <button onClick={() => setOpenLead(l)} className="crm-focusable flex items-center gap-2 text-left">
                              <Avatar initials={l.initials} size={28} />
                              <span className="text-[13px] font-medium whitespace-nowrap" style={{ color: T.ink }}>{l.name}</span>
                            </button>
                          </td>

                          {/* Phone */}
                          <td className="px-3 py-2 crm-mono text-[12.5px] whitespace-nowrap" style={{ color: T.ink }}>
                            {l.phone && String(l.phone).trim() !== "" && String(l.phone).trim() !== "0"
                              ? String(l.phone)
                              : <span style={{ color: T.inkFaint }}>—</span>
                            }
                          </td>

                          {/* Email */}
                          <td className="px-3 py-2 text-[12.5px] whitespace-nowrap max-w-[220px] truncate" style={{ color: T.inkSoft }}>
                            {l.email ? <a href={`mailto:${l.email}`} className="hover:underline">{l.email}</a> : <span style={{ color: T.inkFaint }}>—</span>}
                          </td>

                          {/* Company */}
                          <td className="px-3 py-2 text-[13px] whitespace-nowrap" style={{ color: T.inkSoft }}>{l.company}</td>

                          {/* Status */}
                          <td className="px-3 py-2">
                            <InlineSelect
                              value={l.status}
                              options={availableStatuses}
                              onSave={(val) => updateLead(l.id, { status: val })}
                              renderDisplay={(v) => <StatusBadge status={v} />}
                            />
                          </td>

                          {/* Priority */}
                          <td className="px-3 py-2">
                            <InlineSelect
                              value={l.priority}
                              options={PRIORITIES}
                              onSave={(val) => updateLead(l.id, { priority: val })}
                              renderDisplay={(v) => <PriorityDot priority={v} />}
                            />
                          </td>

                          {/* Score */}
                          <td className="px-3 py-2">
                            <InlineEdit
                              value={String(l.score || 0)}
                              onSave={(val) => updateLead(l.id, { score: Math.min(100, Math.max(0, parseInt(val, 10) || 0)) })}
                              placeholder="0–100"
                              type="number"
                            />
                          </td>

                          {/* Source */}
                          <td className="px-3 py-2 text-[12.5px] whitespace-nowrap" style={{ color: T.inkSoft }}>{l.source}</td>

                          {/* Assign To */}
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <Avatar
                                initials={(!l.owner || l.owner === "Unassigned" || l.owner === "Assignee") ? "UA" : (l.ownerInitials || l.owner.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2))}
                                bg={T.lineSoft}
                                fg={T.inkSoft}
                                size={22}
                              />
                              <InlineSelect
                                value={l.owner || "Unassigned"}
                                options={teamList}
                                onSave={(val) => {
                                  const targetMember = (state.team || []).find(m => m.name === val);
                                  const targetUserId = targetMember?.accountUserId || targetMember?.userId || (val === user?.name ? user?.id : null);
                                  const ownerInitials = val === "Unassigned" ? "UA" : val.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
                                  updateLead(l.id, { 
                                    owner: val, 
                                    ownerInitials,
                                    ...(targetUserId ? { userId: targetUserId } : {})
                                  });
                                }}
                                renderDisplay={(v) => (
                                  <span className="text-[12.5px] whitespace-nowrap" style={{ color: T.inkSoft }}>{v}</span>
                                )}
                              />
                            </div>
                          </td>

                          {/* Last Contact */}
                          <td className="px-3 py-2">
                            <span className="flex items-center gap-1 text-[12px] whitespace-nowrap" style={{ color: T.inkFaint }}>
                              <Clock size={11} />
                              {timeAgo(l.lastContact, l.created)}
                            </span>
                          </td>

                          {/* Deal Value */}
                          <td className="px-3 py-2">
                            <InlineEdit
                              key={`deal-${l.id}`}
                              value={l.dealValueNum ?? l.dealValue ?? 0}
                              onSave={(val) => {
                                const num = parseInt(val.replace(/[^0-9]/g, ""), 10) || 0;
                                updateLead(l.id, { dealValue: val.startsWith("₹") ? val : "₹" + val, dealValueNum: num });
                              }}
                              prefix="₹"
                              placeholder="0"
                            />
                          </td>

                          {/* Probability */}
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <InlineEdit
                                key={`prob-${l.id}`}
                                value={String(l.probability || 0)}
                                onSave={(val) => updateLead(l.id, { probability: Math.min(100, Math.max(0, parseInt(val, 10) || 0)) })}
                                placeholder="0–100"
                                type="number"
                              />
                              <span className="text-[11px]" style={{ color: T.inkFaint }}>%</span>
                              <div className="w-10 h-1.5 rounded-full overflow-hidden" style={{ background: T.lineSoft }}>
                                <div className="h-full rounded-full" style={{ width: `${l.probability}%`, background: T.accent }} />
                              </div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-2">
                            <button
                              onClick={() => {
                                dispatch({ type: "DELETE_LEAD", payload: l.id });
                                toast.success(`Lead "${l.name}" removed`);
                              }}
                              title="Delete Lead"
                              className="crm-focusable w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-rose-50"
                              style={{ color: T.negative }}
                            >
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {/* ── Mobile Lead Card List (Visible on mobile screens < 640px) ── */}
      <div className="flex flex-col gap-3 sm:hidden">
        {paginated.length === 0 ? (
          <div className="p-8 text-center rounded-xl" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
            <p className="text-[13px]" style={{ color: T.inkFaint }}>No leads found matching current filters.</p>
          </div>
        ) : (
          paginated.map(l => (
            <div key={l.id} className="crm-card rounded-xl p-3.5 flex flex-col gap-2.5 text-left w-full" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => setOpenLead(l)} className="flex items-center gap-2.5 min-w-0 text-left">
                  <Avatar initials={l.initials} size={32} />
                  <div className="min-w-0">
                    <h3 className="text-[13.5px] font-semibold truncate" style={{ color: T.ink }}>{l.name}</h3>
                    <p className="text-[11.5px] truncate" style={{ color: T.inkFaint }}>{l.company || "No company"}</p>
                  </div>
                </button>
                <div className="shrink-0 flex items-center gap-1">
                  <StatusBadge status={l.status} />
                  <PriorityDot priority={l.priority} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-2 rounded-lg text-[11.5px]" style={{ background: T.canvas }}>
                <div>
                  <span className="text-[9.5px] uppercase font-bold tracking-wider block" style={{ color: T.inkFaint }}>Phone</span>
                  {l.phone && String(l.phone).trim() !== "" && String(l.phone).trim() !== "0" ? (
                    <a href={`tel:${l.phone}`} className="crm-mono font-medium hover:underline flex items-center gap-1 mt-0.5" style={{ color: T.accent }}>
                      <Phone size={11} /> {String(l.phone)}
                    </a>
                  ) : (
                    <span className="text-[11px]" style={{ color: T.inkFaint }}>—</span>
                  )}
                </div>
                <div>
                  <span className="text-[9.5px] uppercase font-bold tracking-wider block" style={{ color: T.inkFaint }}>Value</span>
                  <span className="crm-mono font-bold block mt-0.5" style={{ color: T.positive }}>{l.dealValue || "₹0"}</span>
                </div>
                <div>
                  <span className="text-[9.5px] uppercase font-bold tracking-wider block" style={{ color: T.inkFaint }}>Assignee</span>
                  <span className="font-medium truncate block mt-0.5" style={{ color: T.inkSoft }}>{l.owner || "Unassigned"}</span>
                </div>
                <div>
                  <span className="text-[9.5px] uppercase font-bold tracking-wider block" style={{ color: T.inkFaint }}>Last Contact</span>
                  <span className="flex items-center gap-1 text-[10.5px] mt-0.5" style={{ color: T.inkFaint }}>
                    <Clock size={10} /> {timeAgo(l.lastContact, l.created)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[12px]">
                <button onClick={() => setOpenLead(l)} className="crm-focusable text-[12px] font-semibold flex items-center gap-1" style={{ color: T.accent }}>
                  View Details <ChevronRight size={13} />
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCallNoteLead(l)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                    style={{ background: T.accentSoft, color: T.accent }}
                  >
                    <StickyNote size={11} /> Call Note
                  </button>
                  {l.phone && String(l.phone).trim() !== "" && String(l.phone).trim() !== "0" && (
                    <a href={`tel:${l.phone}`} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold" style={{ background: T.positiveSoft, color: T.positive }}>
                      <Phone size={11} /> Call
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Standard Table List View (Visible on Tablet & Desktop) */}
      <div className="hidden sm:block rounded-xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <div className="overflow-x-auto crm-scroll">
          <table className="w-full border-collapse min-w-[1300px]">
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.line}` }}>
                  <th className="px-3 py-2.5 text-left">
                    <input type="checkbox" checked={selected.length === paginated.length && paginated.length > 0} onChange={(e) => toggleAll(e.target.checked)} className="w-3.5 h-3.5" />
                  </th>
                  {cols.map(c => (
                    <th key={c} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: T.inkFaint }}>
                      <span className="flex items-center gap-1">{c}{c !== "Actions" && <ArrowUpDown size={10} />}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(l => (
                  <tr key={l.id} className="crm-row" style={{ borderBottom: `1px solid ${T.lineSoft}` }}
                    onMouseEnter={e => e.currentTarget.style.background = T.canvas}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggle(l.id)} className="w-3.5 h-3.5" />
                    </td>

                    {/* Lead Name */}
                    <td className="px-3 py-2">
                      <button onClick={() => setOpenLead(l)} className="crm-focusable flex items-center gap-2 text-left">
                        <Avatar initials={l.initials} size={28} />
                        <span className="text-[13px] font-medium whitespace-nowrap" style={{ color: T.ink }}>{l.name}</span>
                      </button>
                    </td>

                  {/* Phone — visible column, handles numeric values from Excel */}
                  <td className="px-3 py-2 crm-mono text-[12.5px] whitespace-nowrap" style={{ color: T.ink }}>
                    {l.phone && String(l.phone).trim() !== "" && String(l.phone).trim() !== "0"
                      ? String(l.phone)
                      : <span style={{ color: T.inkFaint }}>—</span>
                    }
                  </td>

                  {/* Email */}
                  <td className="px-3 py-2 text-[12.5px] whitespace-nowrap max-w-[220px] truncate" style={{ color: T.inkSoft }}>
                    {l.email ? <a href={`mailto:${l.email}`} className="hover:underline">{l.email}</a> : <span style={{ color: T.inkFaint }}>—</span>}
                  </td>

                  {/* Company */}
                  <td className="px-3 py-2 text-[13px] whitespace-nowrap" style={{ color: T.inkSoft }}>{l.company}</td>

                  {/* Status — inline dropdown */}
                  <td className="px-3 py-2">
                    <InlineSelect
                      value={l.status}
                      options={availableStatuses}
                      onSave={(val) => updateLead(l.id, { status: val })}
                      renderDisplay={(v) => <StatusBadge status={v} />}
                    />
                  </td>

                  {/* Priority — inline dropdown */}
                  <td className="px-3 py-2">
                    <InlineSelect
                      value={l.priority}
                      options={PRIORITIES}
                      onSave={(val) => updateLead(l.id, { priority: val })}
                      renderDisplay={(v) => <PriorityDot priority={v} />}
                    />
                  </td>

                  {/* Score — inline text edit */}
                  <td className="px-3 py-2">
                    <InlineEdit
                      value={String(l.score || 0)}
                      onSave={(val) => updateLead(l.id, { score: Math.min(100, Math.max(0, parseInt(val, 10) || 0)) })}
                      placeholder="0–100"
                      type="number"
                    />
                  </td>

                  {/* Source */}
                  <td className="px-3 py-2 text-[12.5px] whitespace-nowrap" style={{ color: T.inkSoft }}>{l.source}</td>

                  {/* Assign To — inline dropdown from enrolled team members */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <Avatar
                        initials={(!l.owner || l.owner === "Unassigned" || l.owner === "Assignee") ? "UA" : (l.ownerInitials || l.owner.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2))}
                        bg={T.lineSoft}
                        fg={T.inkSoft}
                        size={22}
                      />
                      <InlineSelect
                        value={l.owner || "Unassigned"}
                        options={teamList}
                        onSave={(val) => {
                          const targetMember = (state.team || []).find(m => m.name === val);
                          const targetUserId = targetMember?.accountUserId || targetMember?.userId || (val === user?.name ? user?.id : null);
                          const ownerInitials = val === "Unassigned" ? "UA" : val.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
                          updateLead(l.id, { 
                            owner: val, 
                            ownerInitials,
                            ...(targetUserId ? { userId: targetUserId } : {})
                          });
                        }}
                        renderDisplay={(v) => (
                          <span className="text-[12.5px] whitespace-nowrap" style={{ color: T.inkSoft }}>{v}</span>
                        )}
                      />
                    </div>
                  </td>

                  {/* Last Contact — real-time display */}
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1 text-[12px] whitespace-nowrap" style={{ color: T.inkFaint }}>
                      <Clock size={11} />
                      {timeAgo(l.lastContact, l.created)}
                    </span>
                  </td>

                  {/* Deal Value — inline text edit */}
                  <td className="px-3 py-2">
                    <InlineEdit
                      key={`deal-${l.id}`}
                      value={l.dealValueNum ?? l.dealValue ?? 0}
                      onSave={(val) => {
                        const num = parseInt(val.replace(/[^0-9]/g, ""), 10) || 0;
                        updateLead(l.id, { dealValue: val.startsWith("₹") ? val : "₹" + val, dealValueNum: num });
                      }}
                      prefix="₹"
                      placeholder="0"
                    />
                  </td>

                  {/* Probability — inline text edit */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <InlineEdit
                        key={`prob-${l.id}`}
                        value={String(l.probability || 0)}
                        onSave={(val) => updateLead(l.id, { probability: Math.min(100, Math.max(0, parseInt(val, 10) || 0)) })}
                        placeholder="0–100"
                        type="number"
                      />
                      <span className="text-[11px]" style={{ color: T.inkFaint }}>%</span>
                      <div className="w-10 h-1.5 rounded-full overflow-hidden" style={{ background: T.lineSoft }}>
                        <div className="h-full rounded-full" style={{ width: `${l.probability}%`, background: T.accent }} />
                      </div>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCallNoteLead(l)}
                        title="Log Call Note"
                        className="crm-focusable w-7 h-7 rounded-md flex items-center justify-center transition-colors"
                        style={{ background: T.accentSoft, color: T.accent }}
                      >
                        <StickyNote size={13} />
                      </button>
                      <button
                        onClick={() => {
                          dispatch({ type: "DELETE_LEAD", payload: l.id });
                          toast.success(`Lead "${l.name}" removed`);
                        }}
                        title="Delete Lead"
                        className="crm-focusable w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-rose-50"
                        style={{ color: T.negative }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: `1px solid ${T.line}` }}>
          <span className="text-[12px]" style={{ color: T.inkFaint }}>Showing {paginated.length} of {filtered.length} leads</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="crm-focusable px-2.5 py-1 rounded-md text-[12px]" style={{ border: `1px solid ${T.line}`, color: T.inkSoft, opacity: page === 1 ? 0.4 : 1 }}>Previous</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 3), page + 2).map(p => (
              <button key={p} onClick={() => setPage(p)} className="crm-focusable px-2.5 py-1 rounded-md text-[12px] font-semibold" style={{ background: p === page ? T.accent : "transparent", color: p === page ? "#fff" : T.inkSoft, border: p === page ? "none" : `1px solid ${T.line}` }}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="crm-focusable px-2.5 py-1 rounded-md text-[12px]" style={{ border: `1px solid ${T.line}`, color: T.inkSoft, opacity: page === totalPages ? 0.4 : 1 }}>Next</button>
          </div>
        </div>
      </div>
    </>
  )}
</div>
  );
}
