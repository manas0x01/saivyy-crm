import React, { useState, useMemo } from "react";
import { Search, Plus, CalendarDays, Clock, Users, Video } from "lucide-react";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import Modal, { FormField, Input, Select, SubmitBtn } from "../components/Modal";
import { StatusBadge } from "../components/shared";

export default function Meetings() {
  const { state, dispatch } = useCrm();
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const teamList = useMemo(() => {
    if (state.team && state.team.length > 0) return state.team.map(m => m.name);
    return ["Unassigned"];
  }, [state.team]);

  const emptyForm = { title: "", contact: "", company: "", date: "", time: "", duration: "60 min", type: "Demo", owner: "" };
  const [form, setForm] = useState(emptyForm);

  const activeOwner = form.owner || teamList[0] || "Unassigned";

  const filtered = useMemo(() => {
    if (!query.trim()) return state.meetings;
    const q = query.toLowerCase();
    return state.meetings.filter(m => m.title.toLowerCase().includes(q) || m.contact.toLowerCase().includes(q) || m.company.toLowerCase().includes(q));
  }, [state.meetings, query]);

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = () => {
    if (!form.title || !form.contact) return alert("Title and contact required");
    dispatch({ type: "ADD_MEETING", payload: { ...form, owner: activeOwner, outcome: "Pending", attendees: [activeOwner, form.contact] } });
    setShowAdd(false);
    setForm(emptyForm);
  };

  return (
    <div className="p-5 flex flex-col gap-4">
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Schedule meeting">
        <div className="flex flex-col gap-4">
          <FormField label="Meeting title" required><Input value={form.title} onChange={setF("title")} placeholder="Product Walkthrough" /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Contact" required><Input value={form.contact} onChange={setF("contact")} placeholder="Anjali Rao" /></FormField>
            <FormField label="Company"><Input value={form.company} onChange={setF("company")} placeholder="Meridian Textiles" /></FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Date"><Input value={form.date} onChange={setF("date")} type="date" /></FormField>
            <FormField label="Time"><Input value={form.time} onChange={setF("time")} placeholder="10:30 AM" /></FormField>
            <FormField label="Duration"><Input value={form.duration} onChange={setF("duration")} placeholder="60 min" /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Type"><Select value={form.type} onChange={setF("type")}>{["Demo","Discovery","Review","Negotiation","Kickoff"].map(t => <option key={t}>{t}</option>)}</Select></FormField>
            <FormField label="Organizer"><Select value={activeOwner} onChange={setF("owner")}>{teamList.map(o => <option key={o} value={o}>{o}</option>)}</Select></FormField>
          </div>
          <SubmitBtn onClick={submit}>Schedule Meeting</SubmitBtn>
        </div>
      </Modal>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="crm-display text-[20px] font-semibold" style={{ color: T.ink }}>Meetings Calendar</h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>{state.meetings.length} scheduled product demos & reviews</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold" style={{ background: T.accent, color: "#fff" }}>
          <Plus size={14} /> Schedule meeting
        </button>
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg max-w-sm" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <Search size={14} style={{ color: T.inkFaint }} />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search meetings…" className="flex-1 text-[13px] outline-none bg-transparent" style={{ color: T.ink }} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filtered.map(m => (
          <div key={m.id} className="crm-card rounded-xl p-4 flex flex-col gap-3" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full uppercase" style={{ background: T.accentSoft, color: T.accent }}>{m.type}</span>
                <h3 className="crm-display text-[15px] font-semibold mt-1" style={{ color: T.ink }}>{m.title}</h3>
                <p className="text-[12px]" style={{ color: T.inkFaint }}>{m.contact} · {m.company}</p>
              </div>
              <StatusBadge status={m.outcome === "Pending" ? "Contacted" : "Won"} />
            </div>

            <div className="flex items-center gap-4 text-[12px] crm-mono" style={{ color: T.inkSoft }}>
              <span className="flex items-center gap-1"><CalendarDays size={13} style={{ color: T.inkFaint }} />{m.date}</span>
              <span className="flex items-center gap-1"><Clock size={13} style={{ color: T.inkFaint }} />{m.time} ({m.duration})</span>
            </div>

            <div className="flex items-center justify-between pt-2 text-[12px]" style={{ borderTop: `1px solid ${T.lineSoft}` }}>
              <span className="flex items-center gap-1" style={{ color: T.inkFaint }}><Users size={13} />{m.attendees?.join(", ")}</span>
              <button className="crm-focusable flex items-center gap-1 text-[11.5px] font-medium" style={{ color: T.accent }}>
                <Video size={13} /> Join Link
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
