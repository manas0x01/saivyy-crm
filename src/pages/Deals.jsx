import React, { useState, useMemo, useEffect } from "react";
import {
  Search, Plus, ArrowUpDown, ArrowUp, ArrowDown, X, KanbanSquare, BarChart3,
  Calendar, Building, User, Clock, CheckCircle2, AlertCircle, Edit3, Trash2,
  Briefcase, TrendingUp, Sparkles, ExternalLink, ArrowRight
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import { useAuth } from "../store/AuthContext";
import { useToast } from "../components/ToastContext";
import { fmtINR, PriorityDot, StatusBadge, ScoreChip } from "../components/shared";
import Modal, { FormField, Input, Select, Textarea, SubmitBtn } from "../components/Modal";

const STAGES = ["New", "Contacted", "Interested", "Qualified", "Meeting", "Proposal", "Negotiation", "Won", "Lost"];

export default function Deals() {
  const { state, dispatch } = useCrm();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [sortField, setSortField] = useState("close");
  const [sortOrder, setSortOrder] = useState("asc");

  // Modals & Drawers
  const [showAdd, setShowAdd] = useState(false);
  const [openDeal, setOpenDeal] = useState(null);
  const [editDealModal, setEditDealModal] = useState(null);

  // Sync openDeal from URL query param (?id=D-...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dealId = params.get("id");
    if (dealId && state.deals.length > 0) {
      const match = state.deals.find(d => d.id === dealId);
      if (match) setOpenDeal(match);
    }
  }, [location.search, state.deals]);

  const teamList = useMemo(() => {
    if (state.team && state.team.length > 0) return state.team.map(m => m.name);
    return ["Unassigned"];
  }, [state.team]);

  const emptyForm = { deal: "", company: "", value: "", stage: "New", priority: "Medium", ownerFull: "", close: "", probability: 20 };
  const [form, setForm] = useState(emptyForm);

  // Sorting Handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(o => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Filtered and Sorted Deals
  const filtered = useMemo(() => {
    let list = state.deals || [];

    if (stageFilter !== "All") list = list.filter(d => d.stage === stageFilter);
    if (priorityFilter !== "All") list = list.filter(d => d.priority === priorityFilter);

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(d =>
        d.deal.toLowerCase().includes(q) ||
        d.company.toLowerCase().includes(q) ||
        String(d.ownerFull || d.owner || "").toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === "value") {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else if (sortField === "score" || sortField === "probability") {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else {
        aVal = String(aVal || "").toLowerCase();
        bVal = String(bVal || "").toLowerCase();
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [state.deals, query, stageFilter, priorityFilter, sortField, sortOrder]);

  // KPIs
  const totalValue = useMemo(() => filtered.reduce((sum, d) => sum + (Number(d.value) || 0), 0), [filtered]);
  const wonValue = useMemo(() => filtered.filter(d => d.stage === "Won").reduce((sum, d) => sum + (Number(d.value) || 0), 0), [filtered]);

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submitAdd = () => {
    if (!form.deal || !form.company) return toast.warning("Deal name and company are required", "Validation");
    const ownerFull = form.ownerFull || user?.name || teamList[0] || "Unassigned";
    const ownerInitials = ownerFull.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    const numValue = parseInt(String(form.value).replace(/[^0-9]/g, "")) || 0;

    dispatch({
      type: "ADD_DEAL",
      payload: {
        id: `D-${Date.now()}`,
        deal: form.deal,
        company: form.company,
        value: numValue,
        stage: form.stage,
        priority: form.priority,
        owner: ownerInitials,
        ownerFull,
        score: 50,
        probability: Number(form.probability) || 20,
        close: form.close,
        last: "Just created",
        next: "Discovery Call",
      }
    });

    setShowAdd(false);
    setForm(emptyForm);
    toast.success(`Created deal "${form.deal}" worth ${fmtINR(numValue)}`, "Deal Added");
  };

  const handleUpdateStage = (dealId, nextStage) => {
    dispatch({
      type: "UPDATE_DEAL",
      payload: {
        id: dealId,
        stage: nextStage,
        probability: nextStage === "Won" ? 100 : nextStage === "Lost" ? 0 : 60,
      }
    });
    if (openDeal && openDeal.id === dealId) {
      setOpenDeal(d => ({ ...d, stage: nextStage }));
    }
    toast.success(`Deal moved to stage: ${nextStage}`, "Stage Updated");
  };

  const handleDeleteDeal = (dealId, dealName) => {
    dispatch({ type: "DELETE_DEAL", payload: dealId });
    if (openDeal && openDeal.id === dealId) setOpenDeal(null);
    toast.info(`Deleted deal "${dealName}"`, "Deal Removed");
  };

  return (
    <div className="p-5 flex flex-col gap-4 min-w-0 animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="crm-display text-[20px] font-bold" style={{ color: T.ink }}>Deals Directory</h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>
            {state.deals.length} deals in pipeline · Total value: <strong className="crm-mono text-indigo-600 font-semibold">{fmtINR(totalValue)}</strong> · Won: <strong className="crm-mono text-emerald-600 font-semibold">{fmtINR(wonValue)}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/pipeline")} className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold border hover:bg-gray-50 transition-colors" style={{ borderColor: T.line, color: T.inkSoft }}>
            <KanbanSquare size={14} /> Kanban Board
          </button>
          <button onClick={() => setShowAdd(true)} className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold text-white shadow-sm" style={{ background: T.accent }}>
            <Plus size={14} /> Add Deal
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-2 flex-wrap" style={{ background: T.surface, padding: "10px 14px", borderRadius: 12, border: `1px solid ${T.line}` }}>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-1 min-w-[220px]" style={{ background: T.canvas, border: `1px solid ${T.line}` }}>
          <Search size={14} style={{ color: T.inkFaint }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search deals, company, or owner..."
            className="flex-1 text-[13px] outline-none bg-transparent"
            style={{ color: T.ink }}
          />
          {query && <button onClick={() => setQuery("")}><X size={13} className="text-gray-400" /></button>}
        </div>

        {/* Stage Filter */}
        <div className="flex items-center gap-1 text-[12px]">
          <span className="text-gray-400 font-medium">Stage:</span>
          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border text-[12px] bg-transparent outline-none font-medium"
            style={{ borderColor: T.line, color: T.ink }}
          >
            <option value="All">All Stages ({state.deals.length})</option>
            {STAGES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-1 text-[12px]">
          <span className="text-gray-400 font-medium">Priority:</span>
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border text-[12px] bg-transparent outline-none font-medium"
            style={{ borderColor: T.line, color: T.ink }}
          >
            <option value="All">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Normal">Normal</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <div className="overflow-x-auto crm-scroll">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.line}`, background: "#FAFAFC" }}>
                {[
                  { key: "deal", label: "Deal Name" },
                  { key: "company", label: "Company" },
                  { key: "stage", label: "Stage" },
                  { key: "value", label: "Value" },
                  { key: "priority", label: "Priority" },
                  { key: "score", label: "Score" },
                  { key: "probability", label: "Win Prob" },
                  { key: "close", label: "Target Close" },
                  { key: "ownerFull", label: "Owner" },
                  { key: "actions", label: "Actions" },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => col.key !== "actions" && handleSort(col.key)}
                    className={`px-3.5 py-3 text-left text-[11px] font-bold uppercase tracking-wider whitespace-nowrap select-none ${col.key !== "actions" ? "cursor-pointer hover:bg-gray-100" : ""}`}
                    style={{ color: T.inkFaint }}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.key !== "actions" && (
                        sortField === col.key ? (
                          sortOrder === "asc" ? <ArrowUp size={11} className="text-indigo-600" /> : <ArrowDown size={11} className="text-indigo-600" />
                        ) : (
                          <ArrowUpDown size={10} className="text-gray-300" />
                        )
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <BarChart3 size={32} style={{ color: T.lineSoft }} />
                      <p className="text-[13px] font-medium" style={{ color: T.inkSoft }}>No deals found</p>
                      <p className="text-[12px]" style={{ color: T.inkFaint }}>
                        {query ? `No deals matching "${query}"` : "Add your first pipeline deal to start tracking sales revenue"}
                      </p>
                      {!query && (
                        <button onClick={() => setShowAdd(true)} className="mt-2 crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: T.accent }}>
                          <Plus size={12} /> Add First Deal
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(d => (
                  <tr
                    key={d.id}
                    onClick={() => setOpenDeal(d)}
                    className="crm-row cursor-pointer transition-colors hover:bg-indigo-50/40"
                    style={{ borderBottom: `1px solid ${T.lineSoft}` }}
                  >
                    <td className="px-3.5 py-3 text-[13px] font-semibold whitespace-nowrap" style={{ color: T.ink }}>
                      <span className="hover:text-indigo-600 transition-colors">{d.deal}</span>
                    </td>
                    <td className="px-3.5 py-3 text-[13px] whitespace-nowrap text-gray-600 font-medium">{d.company}</td>
                    <td className="px-3.5 py-3 whitespace-nowrap"><StatusBadge status={d.stage} /></td>
                    <td className="px-3.5 py-3 crm-mono text-[13px] font-bold whitespace-nowrap" style={{ color: d.stage === "Won" ? T.positive : T.ink }}>
                      {fmtINR(d.value || 0)}
                    </td>
                    <td className="px-3.5 py-3 whitespace-nowrap"><PriorityDot priority={d.priority} /></td>
                    <td className="px-3.5 py-3 crm-mono text-[12px] whitespace-nowrap font-medium text-gray-600">{d.score || 50}</td>
                    <td className="px-3.5 py-3 crm-mono text-[12px] whitespace-nowrap text-gray-500">{d.probability ?? 20}%</td>
                    <td className="px-3.5 py-3 text-[12px] crm-mono whitespace-nowrap text-gray-500">{d.close || "—"}</td>
                    <td className="px-3.5 py-3 text-[12.5px] whitespace-nowrap font-medium text-gray-700">{d.ownerFull || d.owner || "—"}</td>
                    <td className="px-3.5 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleDeleteDeal(d.id, d.deal)}
                        className="crm-focusable p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete deal"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DEAL DETAIL SLIDE-OUT DRAWER */}
      {openDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-end" style={{ background: "rgba(18,20,28,0.35)" }} onClick={() => setOpenDeal(null)}>
          <div
            className="w-full max-w-lg h-full bg-white shadow-2xl p-6 flex flex-col gap-5 overflow-y-auto crm-scroll animate-slideInRight"
            onClick={e => e.stopPropagation()}
            style={{ borderLeft: `1px solid ${T.line}` }}
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Deal Inspection</span>
                <h2 className="crm-display text-[20px] font-bold mt-0.5" style={{ color: T.ink }}>{openDeal.deal}</h2>
                <p className="text-[13px] text-gray-500 font-medium">{openDeal.company} · ID: {openDeal.id}</p>
              </div>
              <button onClick={() => setOpenDeal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            {/* Stage Progress Stepper */}
            <div className="p-3.5 rounded-xl flex flex-col gap-2" style={{ background: T.canvas }}>
              <div className="flex items-center justify-between text-[11.5px] font-bold uppercase tracking-wider text-gray-500">
                <span>Stage Pipeline</span>
                <span className="text-indigo-600">{openDeal.stage}</span>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto crm-scroll py-1">
                {STAGES.map((st, idx) => {
                  const isCurrent = openDeal.stage === st;
                  const isWon = openDeal.stage === "Won";
                  return (
                    <button
                      key={st}
                      onClick={() => handleUpdateStage(openDeal.id, st)}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-md whitespace-nowrap transition-all ${
                        isCurrent
                          ? "bg-indigo-600 text-white shadow-sm scale-105"
                          : "bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 border"
                      }`}
                      style={{ borderColor: T.line }}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Financial Snapshot */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl text-center border" style={{ borderColor: T.line }}>
                <p className="text-[11px] uppercase font-bold text-gray-400">Deal Value</p>
                <p className="text-[20px] font-bold crm-mono text-emerald-600 mt-1">{fmtINR(openDeal.value || 0)}</p>
              </div>
              <div className="p-4 rounded-xl text-center border" style={{ borderColor: T.line }}>
                <p className="text-[11px] uppercase font-bold text-gray-400">Win Probability</p>
                <p className="text-[20px] font-bold crm-mono text-indigo-600 mt-1">{openDeal.probability ?? 20}%</p>
              </div>
            </div>

            {/* Deal Parameters */}
            <div className="p-4 rounded-xl flex flex-col gap-3 border" style={{ borderColor: T.line }}>
              <h4 className="font-bold text-[13px] text-gray-900">Key Parameters</h4>
              <div className="flex flex-col gap-2 text-[13px]">
                <div className="flex justify-between py-1 border-b" style={{ borderColor: T.lineSoft }}>
                  <span className="text-gray-500">Priority</span>
                  <PriorityDot priority={openDeal.priority} />
                </div>
                <div className="flex justify-between py-1 border-b" style={{ borderColor: T.lineSoft }}>
                  <span className="text-gray-500">Owner</span>
                  <span className="font-semibold text-gray-800">{openDeal.ownerFull || openDeal.owner}</span>
                </div>
                <div className="flex justify-between py-1 border-b" style={{ borderColor: T.lineSoft }}>
                  <span className="text-gray-500">Target Close Date</span>
                  <span className="crm-mono text-gray-800">{openDeal.close || "Not scheduled"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Next Action</span>
                  <span className="font-medium text-indigo-600">{openDeal.next || "Send Follow-up"}</span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-2 mt-auto pt-4 border-t" style={{ borderColor: T.line }}>
              {openDeal.stage !== "Won" && (
                <button
                  onClick={() => handleUpdateStage(openDeal.id, "Won")}
                  className="flex-1 py-2.5 rounded-xl font-bold text-[13px] text-white flex items-center justify-center gap-1.5 shadow-md bg-emerald-600 hover:bg-emerald-700 transition-all"
                >
                  <CheckCircle2 size={15} /> Mark as Won
                </button>
              )}
              {openDeal.stage !== "Lost" && (
                <button
                  onClick={() => handleUpdateStage(openDeal.id, "Lost")}
                  className="py-2.5 px-4 rounded-xl font-bold text-[13px] text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  Mark Lost
                </button>
              )}
              <button
                onClick={() => handleDeleteDeal(openDeal.id, openDeal.deal)}
                className="p-2.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-gray-100 transition-colors"
                title="Delete deal"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD DEAL MODAL */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Deal">
        <div className="flex flex-col gap-4">
          <FormField label="Deal Opportunity Name" required>
            <Input value={form.deal} onChange={setF("deal")} placeholder="Enterprise Expansion 2026" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Company Account" required>
              <Input value={form.company} onChange={setF("company")} placeholder="Meridian Textiles" />
            </FormField>
            <FormField label="Deal Value (₹)" required>
              <Input value={form.value} onChange={setF("value")} placeholder="18,40,000" />
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Pipeline Stage">
              <Select value={form.stage} onChange={setF("stage")}>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FormField>
            <FormField label="Priority">
              <Select value={form.priority} onChange={setF("priority")}>
                {["High", "Medium", "Normal", "Low"].map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
            </FormField>
            <FormField label="Win Prob (%)">
              <Input value={form.probability} onChange={setF("probability")} type="number" placeholder="50" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Target Close Date">
              <Input value={form.close} onChange={setF("close")} type="date" />
            </FormField>
            <FormField label="Deal Owner">
              <Select value={form.ownerFull || teamList[0]} onChange={e => setForm(f => ({ ...f, ownerFull: e.target.value }))}>
                {teamList.map(o => <option key={o} value={o}>{o}</option>)}
              </Select>
            </FormField>
          </div>
          <SubmitBtn onClick={submitAdd}>Add to Pipeline</SubmitBtn>
        </div>
      </Modal>
    </div>
  );
}
