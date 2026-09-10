import React, { useState, useMemo } from "react";
import {
  Search, Plus, ChevronDown, GripVertical, Clock,
  X, Trash2, Edit3, Check, BarChart3, TrendingUp, CheckCircle2, ExternalLink
} from "lucide-react";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import { useAuth } from "../store/AuthContext";
import { useToast } from "../components/ToastContext";
import { fmtINR, StatusBadge, PriorityDot } from "../components/shared";
import Modal, { FormField, Input, Select, Textarea, SubmitBtn } from "../components/Modal";

const STAGES = [
  { key: "New",         label: "New",         accent: T.inkFaint  },
  { key: "Contacted",   label: "Contacted",   accent: T.accent    },
  { key: "Interested",  label: "Interested",  accent: T.accent    },
  { key: "Qualified",   label: "Qualified",   accent: T.positive  },
  { key: "Meeting",     label: "Meeting",     accent: T.accent    },
  { key: "Proposal",    label: "Proposal",    accent: T.amber     },
  { key: "Negotiation", label: "Negotiation", accent: T.amber     },
  { key: "Won",         label: "Won ✓",       accent: T.positive  },
  { key: "Lost",        label: "Lost",        accent: T.negative  },
];

const PRIORITIES = ["High", "Medium", "Normal", "Low"];
const PRIORITY_COLOR = { High: T.negative, Medium: T.amber, Normal: T.accent, Low: T.inkFaint };

// ---- Deal Card (Kanban) — interactive with click to inspect ----
function DealCard({ d, onDragStart, onSelect, onEdit, onDelete }) {
  const isOverdue = String(d.next || "").toLowerCase().includes("overdue");

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, d.id)}
      onClick={() => onSelect(d)}
      className="crm-drag-card rounded-lg p-3 flex flex-col gap-2 group cursor-pointer transition-all hover:shadow-md hover:border-indigo-300"
      style={{ background: T.surface, border: `1px solid ${T.line}` }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold truncate group-hover:text-indigo-600 transition-colors" style={{ color: T.ink }}>{d.deal}</p>
          <p className="text-[11.5px] truncate" style={{ color: T.inkFaint }}>{d.company}</p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onEdit(d); }} className="crm-focusable p-1 rounded hover:bg-gray-100" style={{ color: T.accent }} title="Edit">
              <Edit3 size={11} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(d.id, d.deal); }} className="crm-focusable p-1 rounded hover:bg-gray-100" style={{ color: T.negative }} title="Delete">
              <Trash2 size={11} />
            </button>
          </div>
          <GripVertical size={13} style={{ color: T.lineSoft }} />
        </div>
      </div>

      {/* Value + score */}
      <div className="flex items-center justify-between">
        <span className="crm-mono text-[13px] font-semibold" style={{ color: T.ink }}>
          {fmtINR(d.value || 0)}
        </span>
        <span
          className="crm-mono text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{
            background: (d.score || 0) >= 75 ? T.positiveSoft : (d.score || 0) >= 45 ? T.amberSoft : T.negativeSoft,
            color:       (d.score || 0) >= 75 ? T.positive     : (d.score || 0) >= 45 ? T.amber     : T.negative,
          }}
        >
          {d.score || 0}
        </span>
      </div>

      {/* Priority + close date + owner avatar */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-[11px]" style={{ color: T.inkFaint }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_COLOR[d.priority] || T.inkFaint }} />
          {d.priority} · closes {d.close || "—"}
        </span>
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center crm-mono text-[9px] font-semibold"
          style={{ background: T.lineSoft, color: T.inkSoft }}
          title={d.ownerFull || d.owner}
        >
          {(d.owner || "?").slice(0, 2)}
        </div>
      </div>

      {/* Next action footer */}
      <div
        className="flex items-center gap-1 pt-1.5 text-[11px]"
        style={{ borderTop: `1px solid ${T.lineSoft}`, color: isOverdue ? T.negative : T.inkFaint, fontWeight: isOverdue ? 600 : 400 }}
      >
        <Clock size={11} /> {d.next || "Not scheduled"}
      </div>
    </div>
  );
}

// ---- Add / Edit Modal ----
function DealModal({ open, onClose, onSubmit, form, setForm, teamList, title }) {
  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const activeOwnerFull = form.ownerFull || teamList[0] || "Unassigned";

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-4">
        <FormField label="Deal name" required>
          <Input value={form.deal} onChange={setF("deal")} placeholder="Enterprise rollout — Meridian" />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Company" required>
            <Input value={form.company} onChange={setF("company")} placeholder="Meridian Textiles" />
          </FormField>
          <FormField label="Value (₹)">
            <Input value={form.value} onChange={setF("value")} placeholder="18,40,000" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Stage">
            <Select value={form.stage} onChange={setF("stage")}>
              {STAGES.map(s => <option key={s.key}>{s.key}</option>)}
            </Select>
          </FormField>
          <FormField label="Priority">
            <Select value={form.priority} onChange={setF("priority")}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </Select>
          </FormField>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Score (0–100)">
            <Input value={form.score} onChange={setF("score")} placeholder="50" type="number" />
          </FormField>
          <FormField label="Probability (%)">
            <Input value={form.probability} onChange={setF("probability")} placeholder="20" type="number" />
          </FormField>
          <FormField label="Close date">
            <Input value={form.close} onChange={setF("close")} type="date" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Next action">
            <Input value={form.next} onChange={setF("next")} placeholder="Schedule demo call" />
          </FormField>
          <FormField label="Owner">
            <Select
              value={activeOwnerFull}
              onChange={e => setForm(f => ({ ...f, ownerFull: e.target.value }))}
            >
              {teamList.map(o => <option key={o} value={o}>{o}</option>)}
            </Select>
          </FormField>
        </div>
        <SubmitBtn onClick={onSubmit}>{title}</SubmitBtn>
      </div>
    </Modal>
  );
}

// ---- Main Pipeline Page ----
export default function Pipeline() {
  const { state, dispatch } = useCrm();
  const { user } = useAuth();
  const toast = useToast();
  const [dragOverStage, setDragOverStage] = useState(null);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editDeal, setEditDeal] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [stageFilter, setStageFilter] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState("All");

  const teamList = useMemo(() => {
    if (state.team && state.team.length > 0) return state.team.map(m => m.name);
    return ["Unassigned"];
  }, [state.team]);

  const emptyForm = { deal: "", company: "", value: "", stage: "New", priority: "Medium", ownerFull: "", score: "50", probability: "20", close: "", next: "" };
  const [form, setForm] = useState(emptyForm);

  // Keep selectedDeal in sync with state.deals
  const activeSelected = useMemo(() => {
    if (!selectedDeal) return null;
    return (state.deals || []).find(d => d.id === selectedDeal.id) || selectedDeal;
  }, [selectedDeal, state.deals]);

  // ---- Computed filtered deals ----
  const filtered = useMemo(() => {
    let rows = state.deals || [];
    if (stageFilter !== "All") rows = rows.filter(d => d.stage === stageFilter);
    if (ownerFilter !== "All") rows = rows.filter(d => d.ownerFull === ownerFilter || d.owner === ownerFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(d =>
        d.deal.toLowerCase().includes(q) ||
        d.company.toLowerCase().includes(q) ||
        String(d.ownerFull || d.owner || "").toLowerCase().includes(q)
      );
    }
    return rows;
  }, [state.deals, query, stageFilter, ownerFilter]);

  const byStage = useMemo(() => {
    const m = {};
    STAGES.forEach(s => (m[s.key] = []));
    filtered.forEach(d => { if (m[d.stage]) m[d.stage].push(d); });
    return m;
  }, [filtered]);

  // ---- Summary KPIs ----
  const totals = useMemo(() => {
    const all   = state.deals || [];
    const open  = all.filter(d => d.stage !== "Lost" && d.stage !== "Won");
    const won   = all.filter(d => d.stage === "Won");
    const lost  = all.filter(d => d.stage === "Lost");
    const pv    = open.reduce((s, d) => s + (d.value || 0), 0);
    const wv    = won.reduce((s, d) => s + (d.value || 0), 0);
    const wr    = all.length > 0 ? Math.round((won.length / all.length) * 100) : 0;
    return {
      total: all.length, open: open.length, won: won.length, lost: lost.length,
      pipelineValue: pv, wonValue: wv, winRate: wr,
      avg: open.length > 0 ? Math.round(pv / open.length) : 0,
    };
  }, [state.deals]);

  // ---- Drag & Drop ----
  const onDragStart = (e, id) => e.dataTransfer.setData("dealId", id);
  const onDrop = (e, stageKey) => {
    e.preventDefault();
    setDragOverStage(null);
    const id = e.dataTransfer.getData("dealId");
    if (id) {
      const deal = (state.deals || []).find(d => d.id === id);
      dispatch({ type: "MOVE_DEAL", payload: { id, stage: stageKey } });
      toast.success(`Moved ${deal ? `"${deal.deal}"` : "deal"} to ${stageKey}`, "Pipeline Updated");
    }
  };

  // ---- Update Stage via Drawer ----
  const handleUpdateStage = (dealId, nextStage) => {
    dispatch({
      type: "UPDATE_DEAL",
      payload: {
        id: dealId,
        stage: nextStage,
        probability: nextStage === "Won" ? 100 : nextStage === "Lost" ? 0 : 60,
      }
    });
    toast.success(`Deal moved to stage: ${nextStage}`, "Stage Updated");
  };

  // ---- Add Deal ----
  const submitAdd = () => {
    if (!form.deal || !form.company) return toast.warning("Deal name and company are required", "Validation");
    const ownerFull = form.ownerFull || user?.name || teamList[0] || "Unassigned";
    const ownerInitials = ownerFull.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    const numValue = parseInt(String(form.value).replace(/[^0-9]/g, "")) || 0;
    dispatch({
      type: "ADD_DEAL",
      payload: {
        id: `D-${Date.now()}`,
        ...form,
        ownerFull,
        owner: ownerInitials,
        value: numValue,
        score: parseInt(form.score) || 50,
        probability: parseInt(form.probability) || 20,
        last: "Just now",
        next: form.next || "Discovery call",
      },
    });
    setShowAdd(false);
    setForm(emptyForm);
    toast.success(`Added deal "${form.deal}" to pipeline (${fmtINR(numValue)})`, "Deal Created");
  };

  // ---- Edit Deal ----
  const openEdit = (d) => {
    setEditDeal(d);
    setForm({
      deal: d.deal, company: d.company,
      value: String(d.value || ""), stage: d.stage, priority: d.priority || "Medium",
      ownerFull: d.ownerFull || d.owner || "", score: String(d.score || 50),
      probability: String(d.probability || 20), close: d.close || "", next: d.next || "",
    });
  };

  const submitEdit = () => {
    if (!form.deal || !form.company) return toast.warning("Deal name and company are required", "Validation");
    const ownerFull = form.ownerFull || teamList[0] || "Unassigned";
    const ownerInitials = ownerFull.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    dispatch({
      type: "UPDATE_DEAL",
      payload: {
        id: editDeal.id,
        ...form,
        ownerFull,
        owner: ownerInitials,
        value: parseInt(String(form.value).replace(/[^0-9]/g, "")) || 0,
        score: parseInt(form.score) || 50,
        probability: parseInt(form.probability) || 20,
      },
    });
    setEditDeal(null);
    setForm(emptyForm);
    toast.success(`Updated deal "${form.deal}"`, "Deal Saved");
  };

  // ---- Delete Deal ----
  const deleteDeal = (id, name) => {
    dispatch({ type: "DELETE_DEAL", payload: id });
    if (selectedDeal && selectedDeal.id === id) setSelectedDeal(null);
    toast.info(`Removed deal "${name || 'Deal'}"`, "Deal Deleted");
  };

  const totalDeals = (state.deals || []).length;

  return (
    <div className="flex flex-col min-w-0 p-5 gap-4" style={{ height: "calc(100vh - 64px)" }}>

      {/* Add Deal Modal */}
      <DealModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={submitAdd}
        form={form} setForm={setForm} teamList={teamList} title="Add Deal" />

      {/* Edit Deal Modal */}
      <DealModal open={!!editDeal} onClose={() => setEditDeal(null)} onSubmit={submitEdit}
        form={form} setForm={setForm} teamList={teamList} title="Edit Deal" />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 shrink-0">
        <div>
          <h1 className="crm-display text-[20px] font-semibold" style={{ color: T.ink }}>Sales Pipeline</h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>
            {totalDeals} total deal{totalDeals !== 1 ? "s" : ""} · Drag cards between stages to update
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold"
          style={{ background: T.accent, color: "#fff" }}
        >
          <Plus size={14} /> Add deal
        </button>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-5 gap-3 shrink-0">
        {[
          { label: "Total Deals",     value: totals.total,                icon: BarChart3  },
          { label: "Pipeline Value",  value: fmtINR(totals.pipelineValue), icon: TrendingUp },
          { label: "Won Revenue",     value: fmtINR(totals.wonValue),      icon: Check      },
          { label: "Avg Deal Size",   value: fmtINR(totals.avg),           icon: BarChart3  },
          { label: "Win Rate",        value: `${totals.winRate}%`,         icon: TrendingUp },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-3.5" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
            <span className="text-[10.5px] font-medium uppercase tracking-wide" style={{ color: T.inkFaint }}>{k.label}</span>
            <p className="crm-mono text-[18px] font-bold mt-1" style={{ color: T.ink }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: T.surface, border: `1px solid ${T.line}`, minWidth: 220 }}>
          <Search size={14} style={{ color: T.inkFaint }} />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search deals, companies, owners…"
            className="flex-1 text-[13px] outline-none bg-transparent" style={{ color: T.ink }}
          />
          {query && <button onClick={() => setQuery("")}><X size={13} style={{ color: T.inkFaint }} /></button>}
        </div>

        {/* Stage quick filter */}
        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
          className="text-[12.5px] px-2.5 py-1.5 rounded-lg outline-none"
          style={{ background: stageFilter !== "All" ? T.accentSoft : T.surface, border: `1px solid ${stageFilter !== "All" ? T.accent : T.line}`, color: stageFilter !== "All" ? T.accent : T.inkSoft }}
        >
          <option value="All">All Stages</option>
          {STAGES.map(s => <option key={s.key} value={s.key}>{s.key}</option>)}
        </select>

        {/* Owner filter */}
        <select
          value={ownerFilter}
          onChange={e => setOwnerFilter(e.target.value)}
          className="text-[12.5px] px-2.5 py-1.5 rounded-lg outline-none"
          style={{ background: ownerFilter !== "All" ? T.accentSoft : T.surface, border: `1px solid ${ownerFilter !== "All" ? T.accent : T.line}`, color: ownerFilter !== "All" ? T.accent : T.inkSoft }}
        >
          <option value="All">All Owners</option>
          {teamList.map(o => <option key={o} value={o}>{o}</option>)}
        </select>

        {(stageFilter !== "All" || ownerFilter !== "All" || query) && (
          <button
            onClick={() => { setStageFilter("All"); setOwnerFilter("All"); setQuery(""); }}
            className="crm-focusable text-[12px] px-2.5 py-1.5 rounded-lg flex items-center gap-1"
            style={{ border: `1px solid ${T.line}`, color: T.negative }}
          >
            <X size={12} /> Reset
          </button>
        )}

        <p className="ml-auto text-[12px]" style={{ color: T.inkFaint }}>
          {filtered.length} deal{filtered.length !== 1 ? "s" : ""} shown
        </p>
      </div>

      {/* Empty state */}
      {totalDeals === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 rounded-xl"
          style={{ border: `2px dashed ${T.lineSoft}`, background: T.canvas }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: T.accentSoft, color: T.accent }}>
            <BarChart3 size={26} />
          </div>
          <p className="text-[15px] font-semibold" style={{ color: T.ink }}>No deals in pipeline yet</p>
          <p className="text-[13px]" style={{ color: T.inkFaint }}>Add your first deal to start tracking the sales pipeline</p>
          <button
            onClick={() => setShowAdd(true)}
            className="crm-focusable mt-1 flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-semibold"
            style={{ background: T.accent, color: "#fff" }}
          >
            <Plus size={13} /> Add your first deal
          </button>
        </div>
      )}

      {/* Kanban board */}
      {totalDeals > 0 && (
        <div className="flex gap-3 overflow-x-auto crm-scroll pb-2 flex-1 min-h-0">
          {STAGES.map(stage => {
            const cards = byStage[stage.key] || [];
            const stageValue = cards.reduce((s, d) => s + (d.value || 0), 0);
            const isWonStage  = stage.key === "Won";
            const isLostStage = stage.key === "Lost";

            return (
              <div
                key={stage.key}
                onDragOver={e => { e.preventDefault(); setDragOverStage(stage.key); }}
                onDragLeave={() => setDragOverStage(s => s === stage.key ? null : s)}
                onDrop={e => onDrop(e, stage.key)}
                className="shrink-0 w-[240px] rounded-xl flex flex-col transition-all"
                style={{
                  background: dragOverStage === stage.key ? T.accentSoft : T.lineSoft,
                  border: `1px solid ${dragOverStage === stage.key ? T.accent : T.lineSoft}`,
                }}
              >
                {/* Column header */}
                <div className="px-3 pt-3 pb-2 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: T.ink }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: stage.accent }} />
                      {stage.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="crm-mono text-[11px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: T.surface, color: T.inkSoft }}>
                        {cards.length}
                      </span>
                    </div>
                  </div>
                  <p className="crm-mono text-[11px] mt-1" style={{ color: T.inkFaint }}>
                    {fmtINR(stageValue)}
                  </p>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto crm-scroll px-2 pb-2 flex flex-col gap-2">
                  {cards.map(d => (
                    <DealCard
                      key={d.id}
                      d={d}
                      onDragStart={onDragStart}
                      onSelect={setSelectedDeal}
                      onEdit={openEdit}
                      onDelete={deleteDeal}
                    />
                  ))}
                  {cards.length === 0 && (
                    <div
                      className="flex-1 flex items-center justify-center text-[11.5px] py-8 rounded-lg"
                      style={{ color: T.inkFaint, border: `1px dashed ${T.lineSoft}` }}
                    >
                      Drop deal here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DEAL DETAIL SLIDE-OUT DRAWER */}
      {activeSelected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={() => setSelectedDeal(null)}>
          <div
            className="w-[450px] max-w-[95vw] h-full shadow-2xl flex flex-col gap-5 p-6 overflow-y-auto crm-scroll animate-slideInRight"
            style={{ background: T.surface }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b pb-4" style={{ borderColor: T.lineSoft }}>
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Deal Opportunity</span>
                <h2 className="crm-display text-[18px] font-bold text-gray-900 mt-0.5 leading-snug">{activeSelected.deal}</h2>
                <p className="text-[13px] text-gray-500 font-medium">{activeSelected.company}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { openEdit(activeSelected); setSelectedDeal(null); }}
                  className="crm-focusable p-1.5 rounded-lg border hover:bg-gray-100 text-gray-600"
                  title="Edit Deal"
                  style={{ borderColor: T.line }}
                >
                  <Edit3 size={15} />
                </button>
                <button
                  onClick={() => setSelectedDeal(null)}
                  className="crm-focusable p-1.5 rounded-lg border hover:bg-gray-100 text-gray-600"
                  style={{ borderColor: T.line }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Stage Pipeline Interactive Stepper */}
            <div className="p-3.5 rounded-xl flex flex-col gap-2" style={{ background: T.canvas }}>
              <div className="flex items-center justify-between text-[11.5px] font-bold uppercase tracking-wider text-gray-500">
                <span>Stage Pipeline</span>
                <span className="text-indigo-600">{activeSelected.stage}</span>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto crm-scroll py-1">
                {STAGES.map(s => {
                  const isCurrent = activeSelected.stage === s.key;
                  return (
                    <button
                      key={s.key}
                      onClick={() => handleUpdateStage(activeSelected.id, s.key)}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-md whitespace-nowrap transition-all ${
                        isCurrent
                          ? "bg-indigo-600 text-white shadow-sm scale-105"
                          : "bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 border"
                      }`}
                      style={{ borderColor: T.line }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Financial Snapshot */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl text-center border" style={{ borderColor: T.line }}>
                <p className="text-[11px] uppercase font-bold text-gray-400">Deal Value</p>
                <p className="text-[20px] font-bold crm-mono text-emerald-600 mt-1">{fmtINR(activeSelected.value || 0)}</p>
              </div>
              <div className="p-4 rounded-xl text-center border" style={{ borderColor: T.line }}>
                <p className="text-[11px] uppercase font-bold text-gray-400">Win Probability</p>
                <p className="text-[20px] font-bold crm-mono text-indigo-600 mt-1">{activeSelected.probability ?? 20}%</p>
              </div>
            </div>

            {/* Deal Parameters */}
            <div className="p-4 rounded-xl flex flex-col gap-3 border" style={{ borderColor: T.line }}>
              <h4 className="font-bold text-[13px] text-gray-900">Key Parameters</h4>
              <div className="flex flex-col gap-2 text-[13px]">
                <div className="flex justify-between py-1 border-b" style={{ borderColor: T.lineSoft }}>
                  <span className="text-gray-500">Priority</span>
                  <PriorityDot priority={activeSelected.priority} />
                </div>
                <div className="flex justify-between py-1 border-b" style={{ borderColor: T.lineSoft }}>
                  <span className="text-gray-500">Owner</span>
                  <span className="font-semibold text-gray-800">{activeSelected.ownerFull || activeSelected.owner}</span>
                </div>
                <div className="flex justify-between py-1 border-b" style={{ borderColor: T.lineSoft }}>
                  <span className="text-gray-500">Target Close Date</span>
                  <span className="crm-mono text-gray-800">{activeSelected.close || "Not scheduled"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Next Action</span>
                  <span className="font-medium text-indigo-600">{activeSelected.next || "Send Follow-up"}</span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-2 mt-auto pt-4 border-t" style={{ borderColor: T.line }}>
              {activeSelected.stage !== "Won" && (
                <button
                  onClick={() => handleUpdateStage(activeSelected.id, "Won")}
                  className="flex-1 py-2.5 rounded-xl font-bold text-[13px] text-white flex items-center justify-center gap-1.5 shadow-md bg-emerald-600 hover:bg-emerald-700 transition-all"
                >
                  <CheckCircle2 size={15} /> Mark Won
                </button>
              )}
              {activeSelected.stage !== "Lost" && (
                <button
                  onClick={() => handleUpdateStage(activeSelected.id, "Lost")}
                  className="py-2.5 px-4 rounded-xl font-bold text-[13px] text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  Mark Lost
                </button>
              )}
              <button
                onClick={() => deleteDeal(activeSelected.id, activeSelected.deal)}
                className="p-2.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-gray-100 transition-colors"
                title="Delete deal"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
