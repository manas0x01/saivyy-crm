import React, { useState, useMemo } from "react";
import { Search, Plus, ArrowUpDown, X, KanbanSquare, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import { fmtINR, PriorityDot, StatusBadge } from "../components/shared";
import Modal, { FormField, Input, Select, SubmitBtn } from "../components/Modal";

export default function Deals() {
  const { state, dispatch } = useCrm();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const teamList = useMemo(() => {
    if (state.team && state.team.length > 0) return state.team.map(m => m.name);
    return ["Unassigned"];
  }, [state.team]);

  const emptyForm = { deal: "", company: "", value: "", stage: "New", priority: "Medium", ownerFull: "", close: "" };
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    if (!query.trim()) return state.deals;
    const q = query.toLowerCase();
    return state.deals.filter(d => d.deal.toLowerCase().includes(q) || d.company.toLowerCase().includes(q));
  }, [state.deals, query]);

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = () => {
    if (!form.deal || !form.company) return alert("Deal name and company required");
    const ownerFull = form.ownerFull || teamList[0] || "Unassigned";
    const ownerInitials = ownerFull.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    dispatch({
      type: "ADD_DEAL",
      payload: {
        ...form,
        ownerFull,
        owner: ownerInitials,
        value: parseInt(String(form.value).replace(/[^0-9]/g, "")) || 0,
        score: 50, last: "Just now", next: "Not scheduled", probability: 20
      }
    });
    setShowAdd(false);
    setForm(emptyForm);
  };

  return (
    <div className="p-5 flex flex-col gap-4">
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add deal">
        <div className="flex flex-col gap-4">
          <FormField label="Deal name" required><Input value={form.deal} onChange={setF("deal")} placeholder="Enterprise rollout" /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Company" required><Input value={form.company} onChange={setF("company")} placeholder="Meridian Textiles" /></FormField>
            <FormField label="Value (₹)"><Input value={form.value} onChange={setF("value")} placeholder="18,40,000" /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Stage"><Select value={form.stage} onChange={setF("stage")}>{["New","Contacted","Interested","Qualified","Meeting","Proposal","Negotiation","Won","Lost"].map(s => <option key={s}>{s}</option>)}</Select></FormField>
            <FormField label="Priority"><Select value={form.priority} onChange={setF("priority")}>{["High","Medium","Normal","Low"].map(p => <option key={p}>{p}</option>)}</Select></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Close date"><Input value={form.close} onChange={setF("close")} type="date" /></FormField>
            <FormField label="Owner">
              <Select value={form.ownerFull || teamList[0]} onChange={e => setForm(f => ({ ...f, ownerFull: e.target.value }))}>
                {teamList.map(o => <option key={o} value={o}>{o}</option>)}
              </Select>
            </FormField>
          </div>
          <SubmitBtn onClick={submit}>Add Deal</SubmitBtn>
        </div>
      </Modal>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="crm-display text-[20px] font-semibold" style={{ color: T.ink }}>Deals List</h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>{state.deals.length} total deals recorded</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/pipeline")} className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium" style={{ border: `1px solid ${T.line}`, color: T.inkSoft }}>
            <KanbanSquare size={14} /> Kanban view
          </button>
          <button onClick={() => setShowAdd(true)} className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold" style={{ background: T.accent, color: "#fff" }}>
            <Plus size={14} /> Add deal
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg max-w-sm" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <Search size={14} style={{ color: T.inkFaint }} />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search deals…" className="flex-1 text-[13px] outline-none bg-transparent" style={{ color: T.ink }} />
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <div className="overflow-x-auto crm-scroll">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.line}` }}>
                {["Deal Name", "Company", "Stage", "Value", "Priority", "Score", "Probability", "Close Date", "Owner", "Actions"].map(c => (
                  <th key={c} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: T.inkFaint }}>
                    <span className="flex items-center gap-1">{c}{c !== "Actions" && <ArrowUpDown size={10} />}</span>
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
                        {query ? `No results for "${query}"` : "Add your first deal to get started"}
                      </p>
                      {!query && (
                        <button onClick={() => setShowAdd(true)} className="mt-2 crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold" style={{ background: T.accent, color: "#fff" }}>
                          <Plus size={12} /> Add first deal
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : filtered.map(d => (
                <tr key={d.id} className="crm-row" style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
                  <td className="px-3 py-2.5 text-[13px] font-medium whitespace-nowrap" style={{ color: T.ink }}>{d.deal}</td>
                  <td className="px-3 py-2.5 text-[13px] whitespace-nowrap" style={{ color: T.inkSoft }}>{d.company}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={d.stage} /></td>
                  <td className="px-3 py-2.5 crm-mono text-[12.5px] font-semibold whitespace-nowrap" style={{ color: T.ink }}>{fmtINR(d.value || 0)}</td>
                  <td className="px-3 py-2.5"><PriorityDot priority={d.priority} /></td>
                  <td className="px-3 py-2.5 crm-mono text-[12px] whitespace-nowrap" style={{ color: T.inkSoft }}>{d.score}</td>
                  <td className="px-3 py-2.5 crm-mono text-[12px] whitespace-nowrap" style={{ color: T.inkFaint }}>{d.probability}%</td>
                  <td className="px-3 py-2.5 text-[12.5px] whitespace-nowrap" style={{ color: T.inkFaint }}>{d.close || "—"}</td>
                  <td className="px-3 py-2.5 text-[12px] whitespace-nowrap" style={{ color: T.inkSoft }}>{d.ownerFull || d.owner || "—"}</td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => { if (window.confirm("Delete deal?")) dispatch({ type: "DELETE_DEAL", payload: d.id }); }} className="crm-focusable w-7 h-7 rounded-md flex items-center justify-center" style={{ color: T.negative }}>
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
