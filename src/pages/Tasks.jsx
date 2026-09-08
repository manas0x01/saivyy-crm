import React, { useState, useMemo } from "react";
import { Search, Plus, CheckSquare, Square, Calendar, User, X } from "lucide-react";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import Modal, { FormField, Input, Select, SubmitBtn } from "../components/Modal";
import { PriorityDot } from "../components/shared";

export default function Tasks() {
  const { state, dispatch } = useCrm();
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const teamList = useMemo(() => {
    if (state.team && state.team.length > 0) return state.team.map(m => m.name);
    return ["Unassigned"];
  }, [state.team]);

  const emptyForm = { title: "", linkedLead: "", dueDate: "", priority: "Normal", owner: "" };
  const [form, setForm] = useState(emptyForm);

  const activeOwner = form.owner || teamList[0] || "Unassigned";

  const filtered = useMemo(() => {
    let list = state.tasks;
    if (filter === "My tasks") list = list.filter(t => t.owner === activeOwner);
    if (filter === "Pending") list = list.filter(t => !t.completed);
    if (filter === "Completed") list = list.filter(t => t.completed);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.linkedLead?.toLowerCase().includes(q));
    }
    return list;
  }, [state.tasks, filter, query, activeOwner]);

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = () => {
    if (!form.title) return alert("Task title required");
    dispatch({ type: "ADD_TASK", payload: { ...form, owner: activeOwner, created: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) } });
    setShowAdd(false);
    setForm(emptyForm);
  };

  return (
    <div className="p-5 flex flex-col gap-4">
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create task">
        <div className="flex flex-col gap-4">
          <FormField label="Task title" required><Input value={form.title} onChange={setF("title")} placeholder="Follow up with prospect" /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Due date"><Input value={form.dueDate} onChange={setF("dueDate")} placeholder="Today / date" /></FormField>
            <FormField label="Priority"><Select value={form.priority} onChange={setF("priority")}>{["High","Medium","Normal","Low"].map(p => <option key={p}>{p}</option>)}</Select></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Linked lead"><Input value={form.linkedLead} onChange={setF("linkedLead")} placeholder="Anjali Rao" /></FormField>
            <FormField label="Assign to"><Select value={activeOwner} onChange={setF("owner")}>{teamList.map(o => <option key={o} value={o}>{o}</option>)}</Select></FormField>
          </div>
          <SubmitBtn onClick={submit}>Create Task</SubmitBtn>
        </div>
      </Modal>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="crm-display text-[20px] font-semibold" style={{ color: T.ink }}>Tasks</h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>{state.tasks.filter(t => !t.completed).length} pending tasks requiring action</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold" style={{ background: T.accent, color: "#fff" }}>
          <Plus size={14} /> Add task
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {["All", "Pending", "My tasks", "Completed"].map(f => (
          <button key={f} onClick={() => setFilter(f)} className="crm-focusable px-3 py-1.5 rounded-lg text-[12.5px] font-medium" style={{ background: filter === f ? T.ink : T.surface, color: filter === f ? "#fff" : T.inkSoft, border: `1px solid ${filter === f ? T.ink : T.line}` }}>
            {f}
          </button>
        ))}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-1 min-w-[200px] ml-auto" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <Search size={14} style={{ color: T.inkFaint }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter tasks…" className="flex-1 text-[13px] outline-none bg-transparent" style={{ color: T.ink }} />
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <div className="flex flex-col">
          {filtered.map(t => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 crm-row" style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
              <button onClick={() => dispatch({ type: "TOGGLE_TASK", payload: t.id })} className="crm-focusable text-left" style={{ color: t.completed ? T.positive : T.inkFaint }}>
                {t.completed ? <CheckSquare size={18} /> : <Square size={18} />}
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium" style={{ color: t.completed ? T.inkFaint : T.ink, textDecoration: t.completed ? "line-through" : "none" }}>{t.title}</p>
                {t.linkedLead && <p className="text-[11.5px]" style={{ color: T.inkFaint }}>Linked to {t.linkedLead}</p>}
              </div>

              <PriorityDot priority={t.priority} />

              <span className="flex items-center gap-1 text-[12px] crm-mono whitespace-nowrap" style={{ color: t.dueDate === "Overdue" ? T.negative : T.inkFaint }}>
                <Calendar size={12} />{t.dueDate}
              </span>

              <span className="flex items-center gap-1 text-[12px] whitespace-nowrap" style={{ color: T.inkSoft }}>
                <User size={12} />{t.owner}
              </span>

              <button onClick={() => dispatch({ type: "DELETE_TASK", payload: t.id })} className="crm-focusable p-1 rounded hover:bg-gray-100" style={{ color: T.inkFaint }}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
