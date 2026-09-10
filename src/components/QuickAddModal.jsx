import React, { useState, useMemo } from "react";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import { useToast } from "./ToastContext";
import Modal, { FormField, Input, Select, Textarea, SubmitBtn } from "./Modal";

const TABS = ["Lead", "Deal", "Task", "Activity"];

function createLeadId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `L-${crypto.randomUUID()}`;
  return `L-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function QuickAddModal({ open, onClose }) {
  const [tab, setTab] = useState("Lead");
  const { state, dispatch } = useCrm();
  const toast = useToast();

  const teamList = useMemo(() => {
    if (state.team && state.team.length > 0) return state.team.map(m => m.name);
    return ["Unassigned"];
  }, [state.team]);

  return (
    <Modal open={open} onClose={onClose} title="Quick Add" width={500}>
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-lg mb-5" style={{ background: T.lineSoft }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="crm-focusable flex-1 py-1.5 rounded-md text-[12.5px] font-semibold"
            style={{ background: tab === t ? T.surface : "transparent", color: tab === t ? T.ink : T.inkFaint, boxShadow: tab === t ? "0 1px 2px rgba(18,20,28,0.08)" : "none" }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Lead" && <AddLeadForm dispatch={dispatch} teamList={teamList} onClose={onClose} toast={toast} />}
      {tab === "Deal" && <AddDealForm dispatch={dispatch} teamList={teamList} onClose={onClose} toast={toast} />}
      {tab === "Task" && <AddTaskForm dispatch={dispatch} teamList={teamList} onClose={onClose} toast={toast} />}
      {tab === "Activity" && <AddActivityForm dispatch={dispatch} teamList={teamList} onClose={onClose} toast={toast} />}
    </Modal>
  );
}

function AddLeadForm({ dispatch, teamList, onClose, toast }) {
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", status: "New", priority: "Medium", source: "Website", owner: teamList[0] || "", dealValue: "0", industry: "", location: "" });
  const activeOwner = form.owner || teamList[0] || "Unassigned";

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = () => {
    if (!form.name.trim() || !form.company.trim()) return toast.warning("Name and company are required");
    const ownerToSave = activeOwner;
    const initials = form.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    const ownerInitials = ownerToSave.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    dispatch({ type: "ADD_LEAD", payload: { id: createLeadId(), ...form, owner: ownerToSave, initials, ownerInitials, score: 40, probability: 100, dealValueNum: 0, lastContact: "Just now", nextFollowup: "Not scheduled", created: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), notes: "", website: "" } });
    toast.success(`Lead "${form.name}" added successfully`);
    onClose();
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Full name" required><Input value={form.name} onChange={set("name")} placeholder="Anjali Rao" /></FormField>
        <FormField label="Company" required><Input value={form.company} onChange={set("company")} placeholder="Meridian Textiles" /></FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Email"><Input value={form.email} onChange={set("email")} placeholder="anjali@example.com" type="email" /></FormField>
        <FormField label="Phone"><Input value={form.phone} onChange={set("phone")} placeholder="+91 98000 00000" /></FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Status"><Select value={form.status} onChange={set("status")}>{["New","Contacted","Interested","Qualified","Meeting Scheduled","Proposal Sent","Negotiation","Won","Non-Interested"].map(s => <option key={s}>{s}</option>)}</Select></FormField>
        <FormField label="Priority"><Select value={form.priority} onChange={set("priority")}>{["High","Medium","Normal","Low"].map(p => <option key={p}>{p}</option>)}</Select></FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Source"><Select value={form.source} onChange={set("source")}>{["Website","Referral","Outbound","Partner","Event","Cold Call","LinkedIn"].map(s => <option key={s}>{s}</option>)}</Select></FormField>
        <FormField label="Assign to"><Select value={activeOwner} onChange={set("owner")}>{teamList.map(o => <option key={o} value={o}>{o}</option>)}</Select></FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Deal value (₹)"><Input value={form.dealValue} onChange={set("dealValue")} placeholder="18,40,000" /></FormField>
        <FormField label="Industry"><Input value={form.industry} onChange={set("industry")} placeholder="SaaS" /></FormField>
      </div>
      <FormField label="Location"><Input value={form.location} onChange={set("location")} placeholder="Mumbai, MH" /></FormField>
      <SubmitBtn onClick={submit}>Add Lead</SubmitBtn>
    </div>
  );
}

function AddDealForm({ dispatch, teamList, onClose, toast }) {
  const [form, setForm] = useState({ deal: "", company: "", value: "", stage: "New", priority: "Medium", ownerFull: teamList[0] || "", close: "", probability: 20 });
  const activeOwner = form.ownerFull || teamList[0] || "Unassigned";

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = () => {
    if (!form.deal.trim() || !form.company.trim()) return toast.warning("Deal name and company are required");
    const ownerInitials = activeOwner.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    dispatch({ type: "ADD_DEAL", payload: { ...form, ownerFull: activeOwner, owner: ownerInitials, value: parseInt(form.value.replace(/[^0-9]/g, "")) || 0, score: 50, last: "Just now", next: "Not scheduled" } });
    toast.success(`Deal "${form.deal}" created successfully`);
    onClose();
  };
  return (
    <div className="flex flex-col gap-4">
      <FormField label="Deal name" required><Input value={form.deal} onChange={set("deal")} placeholder="Enterprise rollout" /></FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Company" required><Input value={form.company} onChange={set("company")} placeholder="Meridian Textiles" /></FormField>
        <FormField label="Value (₹)"><Input value={form.value} onChange={set("value")} placeholder="18,40,000" /></FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Stage"><Select value={form.stage} onChange={set("stage")}>{["New","Contacted","Interested","Qualified","Meeting","Proposal","Negotiation","Won","Lost"].map(s => <option key={s}>{s}</option>)}</Select></FormField>
        <FormField label="Priority"><Select value={form.priority} onChange={set("priority")}>{["High","Medium","Normal","Low"].map(p => <option key={p}>{p}</option>)}</Select></FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Close date"><Input value={form.close} onChange={set("close")} type="date" /></FormField>
        <FormField label="Owner"><Select value={activeOwner} onChange={set("ownerFull")}>{teamList.map(o => <option key={o} value={o}>{o}</option>)}</Select></FormField>
      </div>
      <SubmitBtn onClick={submit}>Add Deal</SubmitBtn>
    </div>
  );
}

function AddTaskForm({ dispatch, teamList, onClose, toast }) {
  const [form, setForm] = useState({ title: "", linkedLead: "", dueDate: "", priority: "Normal", owner: teamList[0] || "" });
  const activeOwner = form.owner || teamList[0] || "Unassigned";

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = () => {
    if (!form.title.trim()) return toast.warning("Task title is required");
    dispatch({ type: "ADD_TASK", payload: { ...form, owner: activeOwner, created: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) } });
    toast.success(`Task "${form.title}" created`);
    onClose();
  };
  return (
    <div className="flex flex-col gap-4">
      <FormField label="Task title" required><Input value={form.title} onChange={set("title")} placeholder="Follow up with Anjali Rao" /></FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Due date"><Input value={form.dueDate} onChange={set("dueDate")} type="date" /></FormField>
        <FormField label="Priority"><Select value={form.priority} onChange={set("priority")}>{["High","Medium","Normal","Low"].map(p => <option key={p}>{p}</option>)}</Select></FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Linked lead"><Input value={form.linkedLead} onChange={set("linkedLead")} placeholder="Anjali Rao" /></FormField>
        <FormField label="Assign to"><Select value={activeOwner} onChange={set("owner")}>{teamList.map(o => <option key={o} value={o}>{o}</option>)}</Select></FormField>
      </div>
      <SubmitBtn onClick={submit}>Create Task</SubmitBtn>
    </div>
  );
}

function AddActivityForm({ dispatch, teamList, onClose, toast }) {
  const [form, setForm] = useState({ type: "Call", contact: "", company: "", description: "", owner: teamList[0] || "" });
  const activeOwner = form.owner || teamList[0] || "Unassigned";

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = () => {
    if (!form.contact.trim() || !form.description.trim()) return toast.warning("Contact and description are required");
    const now = new Date();
    dispatch({ type: "ADD_ACTIVITY", payload: { ...form, owner: activeOwner, date: now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), time: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) } });
    toast.success(`Activity logged for ${form.contact}`);
    onClose();
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Activity type"><Select value={form.type} onChange={set("type")}>{["Call","Email","Meeting","Note","Status Change","Task"].map(t => <option key={t}>{t}</option>)}</Select></FormField>
        <FormField label="Contact"><Input value={form.contact} onChange={set("contact")} placeholder="Anjali Rao" /></FormField>
      </div>
      <FormField label="Company"><Input value={form.company} onChange={set("company")} placeholder="Meridian Textiles" /></FormField>
      <FormField label="Description" required><Textarea value={form.description} onChange={set("description")} placeholder="Describe the activity…" rows={3} /></FormField>
      <FormField label="Owner"><Select value={activeOwner} onChange={set("owner")}>{teamList.map(o => <option key={o} value={o}>{o}</option>)}</Select></FormField>
      <SubmitBtn onClick={submit}>Log Activity</SubmitBtn>
    </div>
  );
}
