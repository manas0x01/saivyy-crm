import React, { useState, useMemo } from "react";
import {
  Search, Plus, Activity as ActivityIcon, Phone, Mail,
  CalendarDays, StickyNote, CheckSquare, Trash2, X, Clock, Filter
} from "lucide-react";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import { useToast } from "../components/ToastContext";
import Modal, { FormField, Input, Select, Textarea, SubmitBtn } from "../components/Modal";

const TYPE_ICONS = {
  Call: Phone,
  Email: Mail,
  Meeting: CalendarDays,
  Note: StickyNote,
  Task: CheckSquare,
  "Status Change": ActivityIcon,
};

const TYPE_COLORS = {
  Call:          { bg: T.accentSoft,   fg: T.accent   },
  Email:         { bg: T.positiveSoft, fg: T.positive  },
  Meeting:       { bg: T.amberSoft,    fg: T.amber     },
  Note:          { bg: T.lineSoft,     fg: T.inkSoft   },
  Task:          { bg: "#F3E8FF",      fg: "#7C3AED"   },
  "Status Change":{ bg: T.negativeSoft, fg: T.negative },
};

const ALL_TYPES = ["All", "Call", "Email", "Meeting", "Note", "Task", "Status Change"];

function timeAgo(dateStr, timeStr) {
  if (!dateStr) return "";
  try {
    // Try to parse combined date+time
    const combined = timeStr ? `${dateStr} ${timeStr}` : dateStr;
    const parsed = new Date(combined);
    if (isNaN(parsed.getTime())) return `${dateStr}${timeStr ? " · " + timeStr : ""}`;
    const diff = Date.now() - parsed.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return `${dateStr}`;
  } catch {
    return `${dateStr}`;
  }
}

export default function Activities() {
  const { state, dispatch } = useCrm();
  const toast = useToast();
  const [filterType, setFilterType] = useState("All");
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const teamList = useMemo(() => {
    if (state.team && state.team.length > 0) return state.team.map(m => m.name);
    return ["Unassigned"];
  }, [state.team]);

  const emptyForm = { type: "Call", contact: "", company: "", description: "", owner: "" };
  const [form, setForm] = useState(emptyForm);
  const activeOwner = form.owner || teamList[0] || "Unassigned";

  // Build a unified feed from activities + calls + meetings + tasks
  const allActivities = useMemo(() => {
    const list = [];

    // Logged activities (primary source)
    (state.activities || []).forEach(a => {
      list.push({ ...a, _source: "activity" });
    });

    // Calls — map to activity shape
    (state.calls || []).forEach(c => {
      list.push({
        id: c.id,
        type: "Call",
        contact: c.contact || "—",
        company: c.company || "—",
        description: `📞 ${c.duration || ""} call · Outcome: ${c.outcome || "—"}${c.notes ? " · " + c.notes : ""}`,
        date: c.date,
        time: c.time,
        owner: c.owner || "—",
        _source: "call",
      });
    });

    // Meetings — map to activity shape
    (state.meetings || []).forEach(m => {
      list.push({
        id: m.id,
        type: "Meeting",
        contact: m.contact || "—",
        company: m.company || "—",
        description: `📅 ${m.title || "Meeting"} · ${m.duration || ""} · Outcome: ${m.outcome || "—"}`,
        date: m.date,
        time: m.time,
        owner: m.owner || "—",
        _source: "meeting",
      });
    });

    // Tasks — map to activity shape
    (state.tasks || []).forEach(t => {
      list.push({
        id: t.id,
        type: "Task",
        contact: t.linkedLead || "—",
        company: "—",
        description: `✅ ${t.title} · Priority: ${t.priority} · Due: ${t.dueDate} · ${t.completed ? "Completed" : "Pending"}`,
        date: t.created,
        time: "",
        owner: t.owner || "—",
        _source: "task",
      });
    });

    // Sort all combined by newest (rowid DESC already done for activities/calls/meetings individually — keep order stable)
    return list;
  }, [state.activities, state.calls, state.meetings, state.tasks]);

  const filtered = useMemo(() => {
    let list = allActivities;
    if (filterType !== "All") list = list.filter(a => a.type === filterType);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(a =>
        String(a.contact || "").toLowerCase().includes(q) ||
        String(a.description || "").toLowerCase().includes(q) ||
        String(a.company || "").toLowerCase().includes(q) ||
        String(a.owner || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [allActivities, filterType, query]);

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    if (!form.contact.trim() || !form.description.trim()) return toast.warning("Contact and description required");
    const now = new Date();
    dispatch({
      type: "ADD_ACTIVITY",
      payload: {
        ...form,
        owner: activeOwner,
        date: now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        time: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      }
    });
    toast.success(`Activity logged for "${form.contact}"`);
    setShowAdd(false);
    setForm(emptyForm);
  };

  // Stats
  const stats = useMemo(() => {
    const counts = {};
    ALL_TYPES.slice(1).forEach(t => { counts[t] = 0; });
    allActivities.forEach(a => { if (counts[a.type] !== undefined) counts[a.type]++; });
    return counts;
  }, [allActivities]);

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Log Activity Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Log activity">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Activity type">
              <Select value={form.type} onChange={setF("type")}>
                {["Call", "Email", "Meeting", "Note", "Task", "Status Change"].map(t => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Contact" required>
              <Input value={form.contact} onChange={setF("contact")} placeholder="Anjali Rao" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Company">
              <Input value={form.company} onChange={setF("company")} placeholder="Meridian Textiles" />
            </FormField>
            <FormField label="Logged by">
              <Select value={activeOwner} onChange={setF("owner")}>
                {teamList.map(o => <option key={o} value={o}>{o}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Description" required>
            <Textarea value={form.description} onChange={setF("description")} placeholder="Details of the interaction…" rows={3} />
          </FormField>
          <SubmitBtn onClick={submit}>Log Activity</SubmitBtn>
        </div>
      </Modal>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="crm-display text-[20px] font-semibold" style={{ color: T.ink }}>Activities Feed</h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>
            All logged touchpoints — calls, meetings, tasks, emails &amp; notes
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold"
          style={{ background: T.accent, color: "#fff" }}
        >
          <Plus size={14} /> Log activity
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-6 gap-3">
        {ALL_TYPES.slice(1).map(t => {
          const color = TYPE_COLORS[t];
          const Icon = TYPE_ICONS[t];
          return (
            <button
              key={t}
              onClick={() => setFilterType(filterType === t ? "All" : t)}
              className="crm-focusable rounded-xl p-3 flex flex-col items-center gap-1 text-center transition-all"
              style={{
                background: filterType === t ? color.fg : T.surface,
                border: `1px solid ${filterType === t ? color.fg : T.line}`,
              }}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: filterType === t ? "rgba(255,255,255,0.25)" : color.bg, color: filterType === t ? "#fff" : color.fg }}>
                <Icon size={14} />
              </div>
              <p className="crm-mono text-[16px] font-bold mt-0.5" style={{ color: filterType === t ? "#fff" : T.ink }}>
                {stats[t]}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: filterType === t ? "rgba(255,255,255,0.8)" : T.inkFaint }}>
                {t}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filter tabs + Search */}
      <div className="flex items-center gap-2 flex-wrap">
        {ALL_TYPES.map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className="crm-focusable px-3 py-1.5 rounded-lg text-[12.5px] font-medium"
            style={{
              background: filterType === t ? T.ink : T.surface,
              color: filterType === t ? "#fff" : T.inkSoft,
              border: `1px solid ${filterType === t ? T.ink : T.line}`
            }}
          >
            {t} {t !== "All" && stats[t] > 0 && (
              <span className="ml-1 text-[10px] font-bold opacity-60">{stats[t]}</span>
            )}
          </button>
        ))}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-1 min-w-[200px] ml-auto"
          style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <Search size={14} style={{ color: T.inkFaint }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search contact, company, description, owner…"
            className="flex-1 text-[13px] outline-none bg-transparent"
            style={{ color: T.ink }}
          />
          {query && (
            <button onClick={() => setQuery("")}>
              <X size={13} style={{ color: T.inkFaint }} />
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      {(filterType !== "All" || query) && (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>
          Showing <strong>{filtered.length}</strong> {filterType !== "All" ? filterType.toLowerCase() : ""} {filtered.length === 1 ? "activity" : "activities"}
          {query && <> matching "<strong>{query}</strong>"</>}
        </p>
      )}

      {/* Timeline feed */}
      <div className="rounded-xl p-5 flex flex-col" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: T.accentSoft, color: T.accent }}>
              <ActivityIcon size={26} />
            </div>
            <p className="text-[14px] font-semibold" style={{ color: T.ink }}>
              {filterType !== "All" || query ? "No matching activities found" : "No activities logged yet"}
            </p>
            <p className="text-[12.5px] text-center max-w-[300px]" style={{ color: T.inkFaint }}>
              {filterType !== "All" || query
                ? "Try clearing the search or selecting a different type filter."
                : "Log your first touchpoint — calls, meetings, emails, notes, or tasks will all appear here."}
            </p>
            {!query && filterType === "All" && (
              <button
                onClick={() => setShowAdd(true)}
                className="crm-focusable mt-1 flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-semibold"
                style={{ background: T.accent, color: "#fff" }}
              >
                <Plus size={13} /> Log your first activity
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {filtered.map((a, i) => {
              const Icon = TYPE_ICONS[a.type] || ActivityIcon;
              const color = TYPE_COLORS[a.type] || TYPE_COLORS["Note"];
              const isLast = i === filtered.length - 1;
              return (
                <div key={`${a._source}-${a.id || i}`} className="flex gap-4 relative group" style={{ paddingBottom: isLast ? 0 : "1.25rem" }}>
                  {/* Vertical line */}
                  {!isLast && (
                    <span className="absolute left-[17px] top-9 bottom-0 w-px" style={{ background: T.lineSoft }} />
                  )}

                  {/* Icon bubble */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10"
                    style={{ background: color.bg, color: color.fg, border: `2px solid ${T.surface}`, outline: `1px solid ${color.fg}30` }}>
                    <Icon size={15} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[13px] font-semibold" style={{ color: T.ink }}>
                          {a.contact}
                          {a.company && a.company !== "—" && (
                            <span className="font-normal ml-1" style={{ color: T.inkFaint }}>({a.company})</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="crm-mono text-[11px] flex items-center gap-1" style={{ color: T.inkFaint }}>
                          <Clock size={10} />
                          {timeAgo(a.date, a.time)}
                        </span>
                        {/* Only allow deleting manually logged activities */}
                        {a._source === "activity" && (
                          <button
                            onClick={() => dispatch({ type: "DELETE_ACTIVITY", payload: a.id })}
                            className="crm-focusable opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                            style={{ color: T.negative }}
                            title="Delete activity"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[13px] mt-1 leading-relaxed" style={{ color: T.inkSoft }}>
                      {a.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
                        style={{ background: color.bg, color: color.fg }}
                      >
                        {a.type}
                      </span>
                      <span className="text-[11.5px]" style={{ color: T.inkFaint }}>
                        Logged by {a.owner}
                      </span>
                      {a._source !== "activity" && (
                        <span className="text-[10.5px] font-medium px-1.5 py-0.5 rounded" style={{ background: T.canvas, color: T.inkFaint }}>
                          from {a._source}s
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
