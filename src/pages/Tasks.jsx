import React, { useState, useMemo } from "react";
import { Search, Plus, CheckSquare, Square, Calendar, User, X, Trash2, CheckCircle2 } from "lucide-react";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import { useAuth } from "../store/AuthContext";
import { useToast } from "../components/ToastContext";
import Modal, { FormField, Input, Select, SubmitBtn } from "../components/Modal";
import { PriorityDot } from "../components/shared";

export default function Tasks() {
  const { state, dispatch } = useCrm();
  const { user } = useAuth();
  const toast = useToast();
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const teamList = useMemo(() => {
    if (state.team && state.team.length > 0) return state.team.map(m => m.name);
    return [user?.name || "Unassigned"];
  }, [state.team, user]);

  const emptyForm = { title: "", linkedLead: "", dueDate: "", priority: "Normal", owner: user?.name || "" };
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    let list = state.tasks || [];
    const loggedInName = (user?.name || "").trim().toLowerCase();

    if (filter === "My tasks") {
      list = list.filter(t => (t.owner || "").trim().toLowerCase() === loggedInName);
    }
    if (filter === "Pending") list = list.filter(t => !t.completed);
    if (filter === "Completed") list = list.filter(t => t.completed);

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(t =>
        (t.title || "").toLowerCase().includes(q) ||
        (t.linkedLead || "").toLowerCase().includes(q) ||
        (t.owner || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [state.tasks, filter, query, user]);

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    if (!form.title.trim()) return toast.warning("Task title is required", "Validation");
    const assignedOwner = form.owner || user?.name || teamList[0] || "Unassigned";
    const id = `T-${Date.now()}`;
    dispatch({
      type: "ADD_TASK",
      payload: {
        ...form,
        id,
        owner: assignedOwner,
        created: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        completed: 0,
      }
    });
    setShowAdd(false);
    setForm(emptyForm);
    toast.success(`Created task "${form.title}" assigned to ${assignedOwner}`, "Task Created");
  };

  const handleToggle = (t) => {
    dispatch({ type: "TOGGLE_TASK", payload: t.id });
    if (!t.completed) {
      toast.success(`Completed task: "${t.title}"`, "Task Done");
    } else {
      toast.info(`Re-opened task: "${t.title}"`, "Task Pending");
    }
  };

  const handleDelete = (t) => {
    dispatch({ type: "DELETE_TASK", payload: t.id });
    toast.info(`Deleted task "${t.title}"`, "Task Removed");
  };

  return (
    <div className="p-5 flex flex-col gap-4 min-w-0 animate-fadeIn">
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create Task">
        <div className="flex flex-col gap-4">
          <FormField label="Task description" required>
            <Input value={form.title} onChange={setF("title")} placeholder="Review contract terms with client" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Due date">
              <Input type="date" value={form.dueDate} onChange={setF("dueDate")} />
            </FormField>
            <FormField label="Priority">
              <Select value={form.priority} onChange={setF("priority")}>
                {["High", "Medium", "Normal", "Low"].map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Linked account / contact">
              <Input value={form.linkedLead} onChange={setF("linkedLead")} placeholder="Tata Consultancy Services" />
            </FormField>
            <FormField label="Assign to">
              <Select value={form.owner || user?.name || teamList[0]} onChange={setF("owner")}>
                {teamList.map(o => <option key={o} value={o}>{o}</option>)}
              </Select>
            </FormField>
          </div>
          <SubmitBtn onClick={submit}>Create Task</SubmitBtn>
        </div>
      </Modal>

      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="crm-display text-[20px] font-bold" style={{ color: T.ink }}>Tasks & To-Dos</h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>
            {(state.tasks || []).filter(t => !t.completed).length} pending action item{state.tasks.filter(t => !t.completed).length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold text-white shadow-sm"
          style={{ background: T.accent }}
        >
          <Plus size={14} /> Add task
        </button>
      </div>

      {/* Filter Tabs and Search */}
      <div className="flex items-center gap-2 flex-wrap">
        {["All", "Pending", "My tasks", "Completed"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="crm-focusable px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors"
            style={{
              background: filter === f ? T.ink : T.surface,
              color: filter === f ? "#fff" : T.inkSoft,
              border: `1px solid ${filter === f ? T.ink : T.line}`
            }}
          >
            {f}
          </button>
        ))}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-1 min-w-[200px] ml-auto" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <Search size={14} style={{ color: T.inkFaint }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Filter tasks by name, account, or owner…"
            className="flex-1 text-[13px] outline-none bg-transparent"
            style={{ color: T.ink }}
          />
          {query && <button onClick={() => setQuery("")}><X size={13} className="text-gray-400" /></button>}
        </div>
      </div>

      {/* Task List Container */}
      <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <div className="flex flex-col">
          {filtered.map(t => (
            <div
              key={t.id}
              className="flex items-center gap-3 px-4 py-3 border-b crm-row transition-colors hover:bg-gray-50"
              style={{ borderBottom: `1px solid ${T.lineSoft}` }}
            >
              <button
                onClick={() => handleToggle(t)}
                className="crm-focusable text-left transition-transform active:scale-90"
                style={{ color: t.completed ? T.positive : T.inkFaint }}
              >
                {t.completed ? <CheckSquare size={19} className="text-emerald-600" /> : <Square size={19} className="text-gray-400 hover:text-gray-600" />}
              </button>

              <div className="flex-1 min-w-0">
                <p className={`text-[13px] font-semibold leading-snug ${t.completed ? "line-through text-gray-400" : "text-gray-800"}`}>
                  {t.title}
                </p>
                {t.linkedLead && <p className="text-[11.5px] text-gray-500 mt-0.5">Linked: <strong className="text-gray-700">{t.linkedLead}</strong></p>}
              </div>

              <PriorityDot priority={t.priority} />

              <span className="flex items-center gap-1 text-[12px] crm-mono whitespace-nowrap text-gray-500">
                <Calendar size={12} /> {t.dueDate || "No deadline"}
              </span>

              <span className="flex items-center gap-1 text-[12px] whitespace-nowrap text-gray-700 font-medium">
                <User size={12} className="text-gray-400" /> {t.owner}
              </span>

              <button
                onClick={() => handleDelete(t)}
                className="crm-focusable p-1.5 rounded-md hover:bg-red-50 hover:text-red-600 text-gray-300 transition-colors"
                title="Delete Task"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-[13px]">
              No tasks found in "{filter}" view.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

