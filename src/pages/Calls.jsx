import React, { useState, useMemo } from "react";
import { Search, Plus, PhoneCall, Clock, Phone, Edit3, Trash2, X } from "lucide-react";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import { useAuth } from "../store/AuthContext";
import { useToast } from "../components/ToastContext";
import Modal, { FormField, Input, Select, Textarea, SubmitBtn } from "../components/Modal";
import { StatusBadge } from "../components/shared";

const OUTCOMES = ["Interested", "Callback scheduled", "Negotiation ongoing", "Follow-up required", "Proposal discussed", "Not answered"];

export default function Calls() {
  const { state, dispatch } = useCrm();
  const { user } = useAuth();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [editCall, setEditCall] = useState(null);

  const teamList = useMemo(() => {
    if (state.team && state.team.length > 0) return state.team.map(m => m.name);
    return [user?.name || "Unassigned"];
  }, [state.team, user]);

  const emptyForm = { contact: "", company: "", duration: "15 min", outcome: "Interested", notes: "", owner: user?.name || "" };
  const [form, setForm] = useState(emptyForm);

  const activeOwner = form.owner || user?.name || teamList[0] || "Unassigned";

  const filtered = useMemo(() => {
    let list = state.calls || [];
    if (outcomeFilter !== "All") list = list.filter(c => c.outcome === outcomeFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(c =>
        (c.contact || "").toLowerCase().includes(q) ||
        (c.company || "").toLowerCase().includes(q) ||
        (c.notes || "").toLowerCase().includes(q) ||
        (c.owner || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [state.calls, query, outcomeFilter]);

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    if (!form.contact.trim()) return toast.warning("Contact name is required", "Validation");
    const now = new Date();
    const id = `CL-${Date.now()}`;
    dispatch({
      type: "ADD_CALL",
      payload: {
        ...form,
        id,
        owner: activeOwner,
        date: now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        time: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      }
    });
    setShowAdd(false);
    setForm(emptyForm);
    toast.success(`Logged call with ${form.contact} (${form.outcome})`, "Call Logged");
  };

  const openEdit = (c) => {
    setEditCall(c);
    setForm({
      contact: c.contact,
      company: c.company || "",
      duration: c.duration || "15 min",
      outcome: c.outcome || "Interested",
      notes: c.notes || "",
      owner: c.owner || activeOwner
    });
  };

  const submitEdit = () => {
    if (!form.contact.trim()) return toast.warning("Contact name is required", "Validation");
    dispatch({
      type: "UPDATE_CALL",
      payload: {
        id: editCall.id,
        ...form,
        date: editCall.date,
        time: editCall.time,
      }
    });
    setEditCall(null);
    setForm(emptyForm);
    toast.success(`Updated call record for ${form.contact}`, "Call Updated");
  };

  const handleDial = (c) => {
    // Find matching lead phone or default prompt
    const lead = (state.leads || []).find(l => l.name.toLowerCase() === c.contact.toLowerCase());
    const phone = lead?.phone || "+91 98200 00000";
    window.location.href = `tel:${phone.replace(/[^0-9+]/g, "")}`;
    toast.info(`Dialing ${c.contact} (${phone})`, "Telephony");
  };

  return (
    <div className="p-5 flex flex-col gap-4 min-w-0 animate-fadeIn">
      {/* ADD CALL MODAL */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Log Phone Call">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Contact" required>
              <Input value={form.contact} onChange={setF("contact")} placeholder="Anjali Rao" />
            </FormField>
            <FormField label="Company">
              <Input value={form.company} onChange={setF("company")} placeholder="Meridian Textiles" />
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Duration">
              <Input value={form.duration} onChange={setF("duration")} placeholder="20 min" />
            </FormField>
            <FormField label="Outcome">
              <Select value={form.outcome} onChange={setF("outcome")}>
                {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
              </Select>
            </FormField>
            <FormField label="Sales Rep">
              <Select value={form.owner || activeOwner} onChange={setF("owner")}>
                {teamList.map(o => <option key={o} value={o}>{o}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Call notes">
            <Textarea value={form.notes} onChange={setF("notes")} placeholder="Key takeaways from call, pricing discussion, next steps…" rows={3} />
          </FormField>
          <SubmitBtn onClick={submit}>Log Call Record</SubmitBtn>
        </div>
      </Modal>

      {/* EDIT CALL MODAL */}
      <Modal open={!!editCall} onClose={() => setEditCall(null)} title="Edit Call Record">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Contact" required>
              <Input value={form.contact} onChange={setF("contact")} />
            </FormField>
            <FormField label="Company">
              <Input value={form.company} onChange={setF("company")} />
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Duration">
              <Input value={form.duration} onChange={setF("duration")} />
            </FormField>
            <FormField label="Outcome">
              <Select value={form.outcome} onChange={setF("outcome")}>
                {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
              </Select>
            </FormField>
            <FormField label="Sales Rep">
              <Select value={form.owner || activeOwner} onChange={setF("owner")}>
                {teamList.map(o => <option key={o} value={o}>{o}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Call notes">
            <Textarea value={form.notes} onChange={setF("notes")} rows={3} />
          </FormField>
          <SubmitBtn onClick={submitEdit}>Save Call Record</SubmitBtn>
        </div>
      </Modal>

      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="crm-display text-[20px] font-bold" style={{ color: T.ink }}>Telephony & Call Logs</h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>
            {(state.calls || []).length} total outbound & inbound conversations recorded
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold text-white shadow-sm"
          style={{ background: T.accent }}
        >
          <Plus size={14} /> Log call
        </button>
      </div>

      {/* Search & Outcome Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg max-w-sm flex-1" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <Search size={14} style={{ color: T.inkFaint }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search contact, company, notes, rep…"
            className="flex-1 text-[13px] outline-none bg-transparent"
            style={{ color: T.ink }}
          />
          {query && <button onClick={() => setQuery("")}><X size={13} className="text-gray-400" /></button>}
        </div>

        <div className="flex items-center gap-1 text-[12px]">
          <span className="text-gray-400 font-medium">Outcome:</span>
          <select
            value={outcomeFilter}
            onChange={e => setOutcomeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border text-[12px] bg-transparent outline-none font-medium"
            style={{ borderColor: T.line, color: T.ink }}
          >
            <option value="All">All Outcomes ({(state.calls || []).length})</option>
            {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {/* Calls Table */}
      <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <div className="overflow-x-auto crm-scroll">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.line}` }}>
                {["Contact", "Company", "Date & Time", "Duration", "Outcome", "Notes", "Rep", "Action"].map(c => (
                  <th key={c} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: T.inkFaint }}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="crm-row transition-colors hover:bg-gray-50" style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
                  <td className="px-3 py-2.5 text-[13px] font-semibold whitespace-nowrap" style={{ color: T.ink }}>
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <PhoneCall size={13} />
                      </span>
                      {c.contact}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[13px] whitespace-nowrap text-gray-700 font-medium">{c.company || "—"}</td>
                  <td className="px-3 py-2.5 crm-mono text-[12px] whitespace-nowrap text-gray-400">{c.date} · {c.time}</td>
                  <td className="px-3 py-2.5 crm-mono text-[12px] whitespace-nowrap font-medium text-gray-700">{c.duration}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={c.outcome} /></td>
                  <td className="px-3 py-2.5 text-[12.5px] max-w-xs truncate text-gray-600" title={c.notes}>{c.notes || "—"}</td>
                  <td className="px-3 py-2.5 crm-mono text-[12px] whitespace-nowrap text-gray-700 font-medium">{c.owner}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDial(c)}
                        className="crm-focusable p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                        title="Call Contact"
                      >
                        <Phone size={13} />
                      </button>
                      <button
                        onClick={() => openEdit(c)}
                        className="crm-focusable p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors"
                        title="Edit Record"
                      >
                        <Edit3 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 text-[13px]">
                    No calls found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

