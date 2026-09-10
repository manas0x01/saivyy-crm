import React, { useState, useMemo } from "react";
import { Search, Plus, CalendarDays, Clock, Users, Video, Copy, Edit3, Trash2, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import { useToast } from "../components/ToastContext";
import Modal, { FormField, Input, Select, SubmitBtn } from "../components/Modal";
import { StatusBadge } from "../components/shared";

export default function Meetings() {
  const { state, dispatch } = useCrm();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showAdd, setShowAdd] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);

  const teamList = useMemo(() => {
    if (state.team && state.team.length > 0) return state.team.map(m => m.name);
    return ["Unassigned"];
  }, [state.team]);

  const emptyForm = {
    title: "",
    contact: "",
    company: "",
    date: new Date().toISOString().split("T")[0],
    time: "10:30 AM",
    duration: "45 min",
    type: "Demo",
    owner: "",
    link: "https://meet.google.com/new"
  };
  const [form, setForm] = useState(emptyForm);

  const activeOwner = form.owner || teamList[0] || "Unassigned";

  const filtered = useMemo(() => {
    return state.meetings.filter(m => {
      const q = query.toLowerCase().trim();
      const matchesQuery = !q || (
        (m.title && m.title.toLowerCase().includes(q)) ||
        (m.contact && m.contact.toLowerCase().includes(q)) ||
        (m.company && m.company.toLowerCase().includes(q)) ||
        (m.owner && m.owner.toLowerCase().includes(q))
      );

      const matchesType = typeFilter === "ALL" || m.type === typeFilter;

      const normOutcome = (m.outcome || "Pending").toLowerCase();
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "Pending" && (normOutcome === "pending" || normOutcome === "scheduled")) ||
        (statusFilter === "Completed" && (normOutcome === "completed" || normOutcome === "won")) ||
        (statusFilter === "Cancelled" && normOutcome === "cancelled");

      return matchesQuery && matchesType && matchesStatus;
    });
  }, [state.meetings, query, typeFilter, statusFilter]);

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submitAdd = () => {
    if (!form.title.trim() || !form.contact.trim()) {
      return toast.warning("Meeting title and contact name are required");
    }
    const newMeeting = {
      ...form,
      owner: activeOwner,
      outcome: "Pending",
      attendees: [activeOwner, form.contact],
      link: form.link || "https://meet.google.com/new"
    };
    dispatch({ type: "ADD_MEETING", payload: newMeeting });
    toast.success(`Meeting "${form.title}" scheduled successfully`);
    setShowAdd(false);
    setForm(emptyForm);
  };

  const submitEdit = () => {
    if (!editingMeeting.title?.trim() || !editingMeeting.contact?.trim()) {
      return toast.warning("Meeting title and contact name are required");
    }
    dispatch({
      type: "UPDATE_MEETING",
      payload: {
        ...editingMeeting,
        attendees: editingMeeting.attendees || [editingMeeting.owner, editingMeeting.contact]
      }
    });
    toast.success(`Meeting "${editingMeeting.title}" updated`);
    setEditingMeeting(null);
  };

  const toggleOutcome = (meeting, newOutcome) => {
    dispatch({
      type: "UPDATE_MEETING",
      payload: { ...meeting, outcome: newOutcome }
    });
    toast.info(`Meeting marked as ${newOutcome}`);
  };

  const deleteMeeting = (m) => {
    dispatch({ type: "DELETE_MEETING", payload: m.id });
    toast.success(`Meeting "${m.title}" deleted`);
  };

  const joinMeeting = (m) => {
    const url = m.link && m.link.startsWith("http") ? m.link : "https://meet.google.com/new";
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success(`Launching video room for "${m.title}"`);
  };

  const copyLink = (m) => {
    const url = m.link && m.link.startsWith("http") ? m.link : "https://meet.google.com/new";
    navigator.clipboard.writeText(url);
    toast.success("Meeting link copied to clipboard");
  };

  return (
    <div className="p-5 flex flex-col gap-4 max-w-7xl mx-auto">
      {/* Schedule Meeting Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Schedule New Meeting">
        <div className="flex flex-col gap-4">
          <FormField label="Meeting Title" required>
            <Input value={form.title} onChange={setF("title")} placeholder="Product Architecture & Demo Walkthrough" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Contact Person" required>
              <Input value={form.contact} onChange={setF("contact")} placeholder="e.g. Vikram Malhotra" />
            </FormField>
            <FormField label="Company / Account">
              <Input value={form.company} onChange={setF("company")} placeholder="e.g. Acme Health Corp" />
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Date">
              <Input value={form.date} onChange={setF("date")} type="date" />
            </FormField>
            <FormField label="Time">
              <Input value={form.time} onChange={setF("time")} placeholder="10:30 AM" />
            </FormField>
            <FormField label="Duration">
              <Input value={form.duration} onChange={setF("duration")} placeholder="45 min" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Meeting Type">
              <Select value={form.type} onChange={setF("type")}>
                {["Demo", "Discovery", "Review", "Negotiation", "Kickoff", "Support"].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Meeting Organizer">
              <Select value={activeOwner} onChange={setF("owner")}>
                {teamList.map(o => <option key={o} value={o}>{o}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Video Meeting Link (Google Meet / Zoom / Teams)">
            <Input value={form.link} onChange={setF("link")} placeholder="https://meet.google.com/abc-defg-hij" />
          </FormField>
          <SubmitBtn onClick={submitAdd}>Schedule & Confirm Meeting</SubmitBtn>
        </div>
      </Modal>

      {/* Edit Meeting Modal */}
      {editingMeeting && (
        <Modal open={Boolean(editingMeeting)} onClose={() => setEditingMeeting(null)} title="Edit Meeting Details">
          <div className="flex flex-col gap-4">
            <FormField label="Meeting Title" required>
              <Input
                value={editingMeeting.title || ""}
                onChange={e => setEditingMeeting(prev => ({ ...prev, title: e.target.value }))}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Contact Person" required>
                <Input
                  value={editingMeeting.contact || ""}
                  onChange={e => setEditingMeeting(prev => ({ ...prev, contact: e.target.value }))}
                />
              </FormField>
              <FormField label="Company">
                <Input
                  value={editingMeeting.company || ""}
                  onChange={e => setEditingMeeting(prev => ({ ...prev, company: e.target.value }))}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Date">
                <Input
                  type="date"
                  value={editingMeeting.date || ""}
                  onChange={e => setEditingMeeting(prev => ({ ...prev, date: e.target.value }))}
                />
              </FormField>
              <FormField label="Time">
                <Input
                  value={editingMeeting.time || ""}
                  onChange={e => setEditingMeeting(prev => ({ ...prev, time: e.target.value }))}
                />
              </FormField>
              <FormField label="Duration">
                <Input
                  value={editingMeeting.duration || ""}
                  onChange={e => setEditingMeeting(prev => ({ ...prev, duration: e.target.value }))}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Type">
                <Select
                  value={editingMeeting.type || "Demo"}
                  onChange={e => setEditingMeeting(prev => ({ ...prev, type: e.target.value }))}
                >
                  {["Demo", "Discovery", "Review", "Negotiation", "Kickoff", "Support"].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Organizer">
                <Select
                  value={editingMeeting.owner || activeOwner}
                  onChange={e => setEditingMeeting(prev => ({ ...prev, owner: e.target.value }))}
                >
                  {teamList.map(o => <option key={o} value={o}>{o}</option>)}
                </Select>
              </FormField>
              <FormField label="Status / Outcome">
                <Select
                  value={editingMeeting.outcome || "Pending"}
                  onChange={e => setEditingMeeting(prev => ({ ...prev, outcome: e.target.value }))}
                >
                  <option value="Pending">Scheduled / Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </Select>
              </FormField>
            </div>
            <FormField label="Video Meeting URL">
              <Input
                value={editingMeeting.link || ""}
                onChange={e => setEditingMeeting(prev => ({ ...prev, link: e.target.value }))}
                placeholder="https://meet.google.com/new"
              />
            </FormField>
            <SubmitBtn onClick={submitEdit}>Save Meeting Changes</SubmitBtn>
          </div>
        </Modal>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="crm-display text-[22px] font-bold tracking-tight" style={{ color: T.ink }}>Meetings & Calendars</h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>
            {state.meetings.length} registered meetings · {state.meetings.filter(m => m.outcome === "Pending" || !m.outcome).length} upcoming sessions
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="crm-focusable flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition shadow-sm hover:opacity-95"
          style={{ background: T.accent, color: "#fff" }}
        >
          <Plus size={15} /> Schedule meeting
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-1 min-w-[240px] max-w-md shadow-xs" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <Search size={14} style={{ color: T.inkFaint }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search meetings by title, contact, company or host…"
            className="flex-1 text-[13px] outline-none bg-transparent"
            style={{ color: T.ink }}
          />
        </div>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium outline-none cursor-pointer"
          style={{ background: T.surface, border: `1px solid ${T.line}`, color: T.ink }}
        >
          <option value="ALL">All Meeting Types</option>
          <option value="Demo">Demo</option>
          <option value="Discovery">Discovery</option>
          <option value="Review">Review</option>
          <option value="Negotiation">Negotiation</option>
          <option value="Kickoff">Kickoff</option>
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium outline-none cursor-pointer"
          style={{ background: T.surface, border: `1px solid ${T.line}`, color: T.ink }}
        >
          <option value="ALL">All Statuses</option>
          <option value="Pending">Scheduled / Upcoming</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Grid of Meetings */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-xl flex flex-col items-center justify-center gap-2" style={{ background: T.surface, border: `1px dashed ${T.line}` }}>
          <CalendarDays size={36} style={{ color: T.inkFaint }} />
          <div className="text-[14px] font-semibold" style={{ color: T.ink }}>No meetings found</div>
          <div className="text-[12.5px]" style={{ color: T.inkFaint }}>No scheduled meetings match your active filters or search terms.</div>
          <button
            onClick={() => { setQuery(""); setTypeFilter("ALL"); setStatusFilter("ALL"); }}
            className="mt-2 text-[12.5px] font-medium underline"
            style={{ color: T.accent }}
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(m => {
            const isDone = m.outcome === "Completed" || m.outcome === "Won";
            const isCancelled = m.outcome === "Cancelled";

            return (
              <div
                key={m.id}
                className="crm-card rounded-xl p-4 flex flex-col justify-between gap-3 transition-all hover:shadow-md"
                style={{
                  background: T.surface,
                  border: `1px solid ${T.line}`,
                  opacity: isCancelled ? 0.65 : 1
                }}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ background: T.accentSoft, color: T.accent }}>
                        {m.type || "Demo"}
                      </span>
                      <h3 className="crm-display text-[15.5px] font-semibold mt-1" style={{ color: T.ink }}>
                        {m.title}
                      </h3>
                      <p className="text-[12.5px]" style={{ color: T.inkFaint }}>
                        {m.contact} {m.company ? `· ${m.company}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isDone ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#059669" }}>
                          <CheckCircle2 size={12} /> Completed
                        </span>
                      ) : isCancelled ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1" style={{ background: "rgba(239, 68, 68, 0.12)", color: "#dc2626" }}>
                          <XCircle size={12} /> Cancelled
                        </span>
                      ) : (
                        <StatusBadge status="Contacted" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[12px] crm-mono flex-wrap" style={{ color: T.inkSoft }}>
                    <span className="flex items-center gap-1.5">
                      <CalendarDays size={13} style={{ color: T.inkFaint }} />
                      {m.date || "Today"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} style={{ color: T.inkFaint }} />
                      {m.time || "10:00 AM"} ({m.duration || "30 min"})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users size={13} style={{ color: T.inkFaint }} />
                      Host: {m.owner || "Team Member"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 text-[12px] gap-2 flex-wrap" style={{ borderTop: `1px solid ${T.lineSoft}` }}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => joinMeeting(m)}
                      className="crm-focusable flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold shadow-xs transition hover:brightness-105"
                      style={{ background: T.accent, color: "#fff" }}
                    >
                      <Video size={13} /> Join Room
                    </button>
                    <button
                      onClick={() => copyLink(m)}
                      title="Copy meeting link"
                      className="crm-focusable flex items-center gap-1 px-2 py-1 rounded-md text-[12px] font-medium transition"
                      style={{ background: T.bg, border: `1px solid ${T.line}`, color: T.inkSoft }}
                    >
                      <Copy size={12} /> Copy Link
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isDone ? (
                      <button
                        onClick={() => toggleOutcome(m, "Completed")}
                        title="Mark as Completed"
                        className="p-1.5 rounded-md transition hover:bg-emerald-50"
                        style={{ color: "#059669" }}
                      >
                        <CheckCircle2 size={15} />
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleOutcome(m, "Pending")}
                        title="Reopen Meeting"
                        className="text-[11px] font-medium px-1.5 py-0.5 rounded transition"
                        style={{ color: T.inkFaint }}
                      >
                        Reopen
                      </button>
                    )}

                    <button
                      onClick={() => setEditingMeeting(m)}
                      title="Edit meeting"
                      className="p-1.5 rounded-md transition hover:bg-gray-100"
                      style={{ color: T.inkSoft }}
                    >
                      <Edit3 size={14} />
                    </button>

                    <button
                      onClick={() => deleteMeeting(m)}
                      title="Delete meeting"
                      className="p-1.5 rounded-md transition hover:bg-rose-50"
                      style={{ color: "#e11d48" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
