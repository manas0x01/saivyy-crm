import React, { useState, useMemo } from "react";
import { Search, Plus, PhoneCall, Clock } from "lucide-react";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import Modal, { FormField, Input, Select, Textarea, SubmitBtn } from "../components/Modal";
import { StatusBadge } from "../components/shared";

export default function Calls() {
  const { state, dispatch } = useCrm();
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const teamList = useMemo(() => {
    if (state.team && state.team.length > 0) return state.team.map(m => m.name);
    return ["Unassigned"];
  }, [state.team]);

  const emptyForm = { contact: "", company: "", duration: "15 min", outcome: "Interested", notes: "", owner: "" };
  const [form, setForm] = useState(emptyForm);

  const activeOwner = form.owner || teamList[0] || "Unassigned";

  const filtered = useMemo(() => {
    if (!query.trim()) return state.calls;
    const q = query.toLowerCase();
    return state.calls.filter(c => c.contact.toLowerCase().includes(q) || c.company.toLowerCase().includes(q));
  }, [state.calls, query]);

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = () => {
    if (!form.contact) return alert("Contact required");
    const now = new Date();
    dispatch({ type: "ADD_CALL", payload: { ...form, owner: activeOwner, date: now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), time: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) } });
    setShowAdd(false);
    setForm(emptyForm);
  };

  return (
    <div className="p-5 flex flex-col gap-4">
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Log call">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Contact" required><Input value={form.contact} onChange={setF("contact")} placeholder="Anjali Rao" /></FormField>
            <FormField label="Company"><Input value={form.company} onChange={setF("company")} placeholder="Meridian Textiles" /></FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Duration"><Input value={form.duration} onChange={setF("duration")} placeholder="20 min" /></FormField>
            <FormField label="Outcome"><Select value={form.outcome} onChange={setF("outcome")}>{["Interested","Callback scheduled","Negotiation ongoing","Follow-up required","Proposal discussed","Not answered"].map(o => <option key={o}>{o}</option>)}</Select></FormField>
            <FormField label="Sales Rep"><Select value={activeOwner} onChange={setF("owner")}>{teamList.map(o => <option key={o} value={o}>{o}</option>)}</Select></FormField>
          </div>
          <FormField label="Call notes"><Textarea value={form.notes} onChange={setF("notes")} placeholder="Key takeaways from call…" rows={3} /></FormField>
          <SubmitBtn onClick={submit}>Log Call</SubmitBtn>
        </div>
      </Modal>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="crm-display text-[20px] font-semibold" style={{ color: T.ink }}>Call Log</h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>{state.calls.length} outbound & inbound call records</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold" style={{ background: T.accent, color: "#fff" }}>
          <Plus size={14} /> Log call
        </button>
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg max-w-sm" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <Search size={14} style={{ color: T.inkFaint }} />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search calls…" className="flex-1 text-[13px] outline-none bg-transparent" style={{ color: T.ink }} />
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <div className="overflow-x-auto crm-scroll">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.line}` }}>
                {["Contact", "Company", "Date & Time", "Duration", "Outcome", "Notes", "Rep"].map(c => (
                  <th key={c} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: T.inkFaint }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="crm-row" style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
                  <td className="px-3 py-2.5 text-[13px] font-medium whitespace-nowrap" style={{ color: T.ink }}>
                    <span className="flex items-center gap-2"><PhoneCall size={14} style={{ color: T.accent }} />{c.contact}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[13px] whitespace-nowrap" style={{ color: T.inkSoft }}>{c.company}</td>
                  <td className="px-3 py-2.5 crm-mono text-[12px] whitespace-nowrap" style={{ color: T.inkFaint }}>{c.date} · {c.time}</td>
                  <td className="px-3 py-2.5 crm-mono text-[12px] whitespace-nowrap" style={{ color: T.inkSoft }}>{c.duration}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={c.outcome} /></td>
                  <td className="px-3 py-2.5 text-[12.5px] max-w-xs truncate" style={{ color: T.inkSoft }}>{c.notes}</td>
                  <td className="px-3 py-2.5 crm-mono text-[12px] whitespace-nowrap" style={{ color: T.inkFaint }}>{c.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
