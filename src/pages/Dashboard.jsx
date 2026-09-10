import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  ArrowUpRight, ArrowDownRight, ChevronRight,
  Sparkles, TriangleAlert, Flame, Clock, Users, Briefcase,
  Phone, CalendarDays, CheckSquare, TrendingUp, Target,
  AlertCircle, Activity, UserCheck, BarChart3
} from "lucide-react";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import { useAuth } from "../store/AuthContext";
import { fmtINR, Avatar } from "../components/shared";
import { filterByDateRange } from "../utils/dateFilter";

const RANGES = ["Today", "This Week", "This Month", "This Quarter", "This Year", "All Time"];
const ALL_STAGES = ["New", "Contacted", "Interested", "Qualified", "Meeting", "Proposal", "Negotiation", "Won"];
const PIE_COLORS = [T.accent, T.positive, T.amber, T.negative, "#7C6FF0", "#0EA5E9", "#F59E0B", "#10B981"];

// ── Micro sparkline ──────────────────────────────────────────────────────────
function Spark({ points = [], color = T.accent }) {
  if (!points || points.length < 2) return null;
  const max = Math.max(...points, 1);
  const w = 64, h = 28;
  const xs = points.map((_, i) => (i / (points.length - 1)) * w);
  const ys = points.map(v => h - (v / max) * h * 0.9 - 2);
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${xs[xs.length - 1]},${h} L${xs[0]},${h} Z`}
        fill={`url(#sg-${color.replace("#", "")})`} />
      <path d={d} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, delta, positive, spark, icon: Icon, color, onClick }) {
  const col = color || (positive ? T.positive : T.negative);
  return (
    <button
      onClick={onClick}
      className="crm-card rounded-xl p-4 flex flex-col gap-3 text-left w-full"
      style={{ background: T.surface, border: `1px solid ${T.line}`, borderTop: `3px solid ${col}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: col + "18", color: col }}>
            <Icon size={14} />
          </div>
          <span className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: T.inkFaint }}>
            {label}
          </span>
        </div>
        {delta !== undefined && (
          <span className="flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
            style={{ background: positive ? T.positiveSoft : T.negativeSoft, color: positive ? T.positive : T.negative }}>
            {positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="crm-mono crm-display text-[24px] font-semibold leading-none" style={{ color: T.ink }}>
          {value}
        </span>
        <Spark points={spark} color={col} />
      </div>
      <span className="text-[12px]" style={{ color: T.inkSoft }}>{sub}</span>
    </button>
  );
}

// ── Chart Tooltip ─────────────────────────────────────────────────────────────
function CT({ active, payload, label, prefix = "", suffix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 shadow-xl text-[12px]"
      style={{ background: T.ink, color: "#fff", border: `1px solid rgba(255,255,255,0.1)` }}>
      <p className="font-semibold mb-1" style={{ color: "rgba(255,255,255,0.7)" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="crm-mono font-semibold">{prefix}{p.value?.toLocaleString()}{suffix}</p>
      ))}
    </div>
  );
}

// ── Activity Item ─────────────────────────────────────────────────────────────
function ActivityItem({ icon: Icon, color, title, sub, time }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: color + "18", color }}>
        <Icon size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-medium truncate" style={{ color: T.ink }}>{title}</p>
        <p className="text-[11.5px] mt-0.5 truncate" style={{ color: T.inkFaint }}>{sub}</p>
      </div>
      <span className="crm-mono text-[10.5px] shrink-0 mt-0.5" style={{ color: T.inkFaint }}>{time}</span>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [range, setRange] = useState("This Quarter");
  const { state } = useCrm();
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Date-Filtered collections ─────────────────────────────────────────────
  const filteredDeals = useMemo(() => filterByDateRange(state.deals || [], range, ['close', 'last']), [state.deals, range]);
  const filteredLeads = useMemo(() => filterByDateRange(state.leads || [], range, ['created', 'lastContact']), [state.leads, range]);
  const filteredCalls = useMemo(() => filterByDateRange(state.calls || [], range, ['date']), [state.calls, range]);
  const filteredMeetings = useMemo(() => filterByDateRange(state.meetings || [], range, ['date']), [state.meetings, range]);
  const filteredTasks = useMemo(() => filterByDateRange(state.tasks || [], range, ['dueDate', 'created']), [state.tasks, range]);

  // ── Core computations ──────────────────────────────────────────────────────
  const openDeals   = useMemo(() => filteredDeals.filter(d => d.stage !== "Lost"), [filteredDeals]);
  const wonDeals    = useMemo(() => filteredDeals.filter(d => d.stage === "Won"),  [filteredDeals]);
  const lostDeals   = useMemo(() => filteredDeals.filter(d => d.stage === "Lost"), [filteredDeals]);

  const pipelineVal = useMemo(() => openDeals.reduce((s, d) => s + (d.value || 0), 0), [openDeals]);
  const wonRevenue  = useMemo(() => wonDeals.reduce((s, d) => s + (d.value || 0), 0), [wonDeals]);
  const avgDealSize = openDeals.length > 0 ? Math.round(pipelineVal / openDeals.length) : 0;
  const winRate     = filteredDeals.length > 0 ? ((wonDeals.length / filteredDeals.length) * 100).toFixed(1) : "0.0";

  const totalLeads  = filteredLeads.length;
  const newLeads    = filteredLeads.filter(l => l.status === "New").length;
  const hotLeads    = useMemo(() => filteredLeads.filter(l => (l.score || 0) >= 75), [filteredLeads]);
  const convRate    = totalLeads > 0 ? ((wonDeals.length / totalLeads) * 100).toFixed(1) : "0.0";

  const pendingTasks  = filteredTasks.filter(t => !t.completed).length;
  const overdueTasks  = filteredTasks.filter(t => !t.completed && (t.dueDate === "Overdue" || t.dueDate === "Today")).length;
  const totalCalls    = filteredCalls.length;
  const totalMeetings = filteredMeetings.length;

  const atRisk = useMemo(() =>
    filteredDeals.filter(d => String(d.next || "").toLowerCase().includes("overdue") || (d.score || 0) < 50),
    [filteredDeals]);

  // ── Pipeline stage breakdown ───────────────────────────────────────────────
  const pipelineStages = useMemo(() => {
    return ALL_STAGES.map(stage => {
      const stageDeals = filteredDeals.filter(d => d.stage === stage);
      return {
        stage,
        short: stage.slice(0, 3),
        count: stageDeals.length,
        value: stageDeals.reduce((s, d) => s + (d.value || 0), 0),
      };
    });
  }, [filteredDeals]);
  const maxStageCount = Math.max(...pipelineStages.map(s => s.count), 1);

  // ── Lead source breakdown (pie) ───────────────────────────────────────────
  const leadsBySource = useMemo(() => {
    const map = {};
    filteredLeads.forEach(l => { const s = l.source || "Direct"; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredLeads]);

  // ── Lead status distribution (bar) ────────────────────────────────────────
  const leadsByStatus = useMemo(() => {
    const map = {};
    filteredLeads.forEach(l => { const s = l.status || "New"; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [filteredLeads]);

  // ── Revenue trend (monthly aggregated from deals) ─────────────────────────
  const revenueTrend = useMemo(() => {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const map = Object.fromEntries(months.map(m => [m, 0]));
    state.deals.filter(d => d.stage === "Won").forEach(d => {
      const m = months.find(mo => (d.close || "").includes(mo));
      if (m) map[m] += Math.round((d.value || 0) / 100000);
    });
    return months.map(m => ({ m, won: map[m] }));
  }, [state.deals]);

  // ── Recent activity feed (combined) ───────────────────────────────────────
  const recentFeed = useMemo(() => {
    const items = [];
    state.activities.slice(0, 4).forEach(a => items.push({
      icon: Activity, color: T.accent,
      title: `${a.type}: ${a.contact}`, sub: a.company || a.description, time: a.time || a.date, key: a.id
    }));
    state.calls.slice(0, 2).forEach(c => items.push({
      icon: Phone, color: T.positive,
      title: `Call with ${c.contact}`, sub: c.company + (c.outcome ? ` · ${c.outcome}` : ""), time: c.time || c.date, key: c.id
    }));
    state.meetings.slice(0, 2).forEach(m => items.push({
      icon: CalendarDays, color: T.amber,
      title: m.title || `Meeting: ${m.contact}`, sub: m.company || "", time: m.time || m.date, key: m.id
    }));
    return items.slice(0, 8);
  }, [state.activities, state.calls, state.meetings]);

  // ── Top performers from team ───────────────────────────────────────────────
  const topPerformers = useMemo(() => {
    return state.team.map(m => {
      const assigned = state.leads.filter(l => l.owner === m.name).length;
      const calls    = state.calls.filter(c => c.owner === m.name).length;
      const wonRev   = state.deals.filter(d => (d.ownerFull === m.name || d.owner === m.initials) && d.stage === "Won")
                         .reduce((s, d) => s + (d.value || 0), 0);
      return { ...m, assigned, calls, wonRev };
    }).sort((a, b) => b.wonRev - a.wonRev).slice(0, 5);
  }, [state.team, state.leads, state.calls, state.deals]);

  // ── Today's priorities (AI-generated from real data) ─────────────────────
  const priorities = useMemo(() => {
    const items = [];
    if (hotLeads.length > 0) items.push({ icon: Flame, color: T.amber, tag: "🔥 Hot Lead", text: `${hotLeads[0].name} (${hotLeads[0].company}) — score ${hotLeads[0].score}, call within 24h` });
    if (atRisk.length > 0)  items.push({ icon: TriangleAlert, color: T.negative, tag: "⚠️ At Risk", text: `"${atRisk[0].deal}" — ${fmtINR(atRisk[0].value || 0)} idle, needs follow-up` });
    if (overdueTasks > 0)   items.push({ icon: AlertCircle, color: T.negative, tag: "📋 Overdue", text: `${overdueTasks} task${overdueTasks > 1 ? "s" : ""} past due — review and action today` });
    if (newLeads > 0)       items.push({ icon: Users, color: T.accent, tag: "👤 New Leads", text: `${newLeads} uncontacted lead${newLeads > 1 ? "s" : ""} — assign and reach out` });
    if (items.length === 0) items.push({ icon: CheckSquare, color: T.positive, tag: "✅ All clear", text: "No critical actions needed. Great work!" });
    return items.slice(0, 4);
  }, [hotLeads, atRisk, overdueTasks, newLeads]);

  return (
    <div className="p-5 flex flex-col gap-5 min-w-0">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="crm-display text-[22px] font-semibold" style={{ color: T.ink }}>
            Executive Dashboard
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>
            Live CRM overview · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg overflow-x-auto max-w-full crm-scroll" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          {RANGES.map(r => (
            <button key={r} onClick={() => setRange(r)}
              className="crm-focusable px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors shrink-0 whitespace-nowrap"
              style={{ background: range === r ? T.accent : "transparent", color: range === r ? "#fff" : T.inkSoft }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Row ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Pipeline Value"   value={fmtINR(pipelineVal)} sub={`${openDeals.length} open deals`}      delta={8.4}  positive icon={TrendingUp}  color={T.accent}   spark={[12,18,15,22,26,24,30,34,31,38,42,46]} onClick={() => navigate("/pipeline")} />
        <KpiCard label="Won Revenue"      value={fmtINR(wonRevenue)}  sub={`${wonDeals.length} won deals`}         delta={12.1} positive icon={Target}      color={T.positive} spark={[8,10,9,14,13,18,17,22,24,21,27,30]}   onClick={() => navigate("/deals")} />
        <KpiCard label="Total Leads"      value={totalLeads}           sub={`${newLeads} uncontacted`}              delta={5.6}  positive icon={Users}       color={T.accent}   spark={[60,62,61,65,64,68,70,69,73,75,74,78]}  onClick={() => navigate("/leads")} />
        <KpiCard label="Conversion Rate"  value={`${convRate}%`}       sub="Lead to won average"                   delta={1.8}  positive={parseFloat(convRate) > 0} icon={BarChart3}    color={T.violet}   spark={[28,27,26,27,25,24,26,25,24,23,24,25]} onClick={() => navigate("/reports")} />
        <KpiCard label="Win Rate"         value={`${winRate}%`}        sub={`${wonDeals.length} won / ${state.deals.length} total`} delta={2.3} positive icon={UserCheck}  color={T.positive} spark={[20,22,21,24,23,26,25,27,26,28,27,30]} onClick={() => navigate("/pipeline")} />
        <KpiCard label="Pending Tasks"    value={pendingTasks}          sub={`${overdueTasks} overdue`}             delta={overdueTasks} positive={overdueTasks === 0} icon={CheckSquare} color={overdueTasks > 0 ? T.negative : T.positive} spark={[10,14,12,16,15,20,18,22,20,25,30,34]} onClick={() => navigate("/tasks")} />
      </div>

      {/* ── Secondary Stats Row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Calls",    val: totalCalls,    icon: Phone,       col: T.positive, path: "/calls"    },
          { label: "Total Meetings", val: totalMeetings, icon: CalendarDays, col: T.amber,   path: "/meetings" },
          { label: "Hot Leads",      val: hotLeads.length, icon: Flame,     col: T.amber,    path: "/ai"       },
          { label: "Avg Deal Size",  val: fmtINR(avgDealSize), icon: Briefcase, col: T.accent, path: "/deals" },
        ].map(s => (
          <button key={s.label} onClick={() => navigate(s.path)}
            className="crm-card rounded-xl p-3.5 flex items-center gap-3 text-left"
            style={{ background: T.surface, border: `1px solid ${T.line}` }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: s.col + "18", color: s.col }}>
              <s.icon size={18} />
            </div>
            <div>
              <p className="crm-mono text-[18px] font-bold leading-none" style={{ color: T.ink }}>{s.val}</p>
              <p className="text-[11px] font-medium mt-0.5 uppercase tracking-wide" style={{ color: T.inkFaint }}>{s.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Team Performance Overview (Leader Only) ────────────────────────── */}
      {user?.role === "Leader" && (
        <div className="crm-card rounded-xl p-4 animate-fadeIn" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="crm-display text-[15px] font-semibold" style={{ color: T.ink }}>Team Performance Overview</h2>
              <p className="text-[12px] mt-0.5" style={{ color: T.inkFaint }}>Real-time sales activity and contribution metrics</p>
            </div>
            <button onClick={() => navigate("/team")} className="crm-focusable flex items-center gap-1 text-[12px] font-semibold" style={{ color: T.accent }}>
              Manage Team <ChevronRight size={13} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.line}` }}>
                  <th className="pb-2.5 text-[11px] font-bold uppercase tracking-wider text-left" style={{ color: T.inkFaint }}>Member</th>
                  <th className="pb-2.5 text-[11px] font-bold uppercase tracking-wider text-center" style={{ color: T.inkFaint }}>Role</th>
                  <th className="pb-2.5 text-[11px] font-bold uppercase tracking-wider text-center" style={{ color: T.inkFaint }}>Assigned Leads</th>
                  <th className="pb-2.5 text-[11px] font-bold uppercase tracking-wider text-center" style={{ color: T.inkFaint }}>Calls Logged</th>
                  <th className="pb-2.5 text-[11px] font-bold uppercase tracking-wider text-center" style={{ color: T.inkFaint }}>Meetings Booked</th>
                  <th className="pb-2.5 text-[11px] font-bold uppercase tracking-wider text-center" style={{ color: T.inkFaint }}>Conversion %</th>
                  <th className="pb-2.5 text-[11px] font-bold uppercase tracking-wider text-right" style={{ color: T.inkFaint }}>Revenue Won</th>
                </tr>
              </thead>
              <tbody>
                {state.team.map((m) => {
                  const assigned = state.leads.filter(l => l.owner === m.name).length;
                  const calls = state.calls.filter(c => c.owner === m.name).length;
                  const meetings = state.meetings.filter(meet => meet.owner === m.name).length;
                  
                  const wonDeals = state.deals.filter(d => (d.ownerFull === m.name || d.owner === m.initials) && d.stage === "Won");
                  const wonRev = wonDeals.reduce((s, d) => s + (d.value || 0), 0);
                  const conv = assigned > 0 ? Math.round((wonDeals.length / assigned) * 100) : 0;

                  return (
                    <tr key={m.id} className="crm-row hover:bg-gray-50" style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
                      <td className="py-2.5 flex items-center gap-2.5">
                        <Avatar initials={m.initials || m.name?.slice(0, 2).toUpperCase()} size={28} />
                        <div>
                          <p className="text-[12.5px] font-semibold" style={{ color: T.ink }}>{m.name}</p>
                          <p className="text-[11px]" style={{ color: T.inkFaint }}>{m.email}</p>
                        </div>
                      </td>
                      <td className="py-2.5 text-center text-[12px]" style={{ color: T.inkSoft }}>{m.role}</td>
                      <td className="py-2.5 text-center crm-mono text-[12.5px]" style={{ color: T.ink }}>{assigned}</td>
                      <td className="py-2.5 text-center crm-mono text-[12.5px]" style={{ color: T.ink }}>{calls}</td>
                      <td className="py-2.5 text-center crm-mono text-[12.5px]" style={{ color: T.ink }}>{meetings}</td>
                      <td className="py-2.5 text-center">
                        <span className="crm-mono text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: conv >= 25 ? T.positiveSoft : conv >= 10 ? T.amberSoft : T.negativeSoft, color: conv >= 25 ? T.positive : conv >= 10 ? T.amber : T.negative }}>
                          {conv}%
                        </span>
                      </td>
                      <td className="py-2.5 text-right crm-mono text-[12.5px] font-semibold" style={{ color: T.positive }}>{fmtINR(wonRev)}</td>
                    </tr>
                  );
                })}
                {state.team.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-[13px]" style={{ color: T.inkFaint }}>No team members registered under your organization yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Main Charts Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Revenue Trend (Area) */}
        <div className="col-span-2 rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="crm-display text-[14px] font-semibold" style={{ color: T.ink }}>Revenue Trend</h2>
              <p className="text-[12px] mt-0.5" style={{ color: T.inkFaint }}>Monthly won revenue (₹ Lakhs)</p>
            </div>
            <button onClick={() => navigate("/reports")}
              className="crm-focusable flex items-center gap-1 text-[12px] font-medium"
              style={{ color: T.accent }}>
              Full report <ChevronRight size={13} />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueTrend} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.accent} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={T.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={T.lineSoft} />
              <XAxis dataKey="m" tick={{ fontSize: 11, fill: T.inkFaint }} axisLine={{ stroke: T.line }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: T.inkFaint }} axisLine={false} tickLine={false} />
              <Tooltip content={<CT prefix="₹" suffix="L" />} />
              <Area type="monotone" dataKey="won" stroke={T.accent} strokeWidth={2} fill="url(#rev)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Sources Pie */}
        <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <div className="mb-3">
            <h2 className="crm-display text-[14px] font-semibold" style={{ color: T.ink }}>Lead Sources</h2>
            <p className="text-[12px] mt-0.5" style={{ color: T.inkFaint }}>Distribution by channel</p>
          </div>
          {leadsBySource.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={leadsBySource} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                    dataKey="value" paddingAngle={2}>
                    {leadsBySource.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CT />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1.5 mt-2">
                {leadsBySource.slice(0, 4).map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between text-[11.5px]">
                    <span className="flex items-center gap-1.5" style={{ color: T.inkSoft }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      {s.name}
                    </span>
                    <span className="crm-mono font-semibold" style={{ color: T.ink }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[180px] gap-2">
              <Users size={28} style={{ color: T.lineSoft }} />
              <p className="text-[12px]" style={{ color: T.inkFaint }}>No leads yet</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Pipeline + Lead Status Row ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Pipeline Funnel */}
        <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="crm-display text-[14px] font-semibold" style={{ color: T.ink }}>Pipeline by Stage</h2>
              <p className="text-[12px] mt-0.5" style={{ color: T.inkFaint }}>Deal volume across funnel</p>
            </div>
            <button onClick={() => navigate("/pipeline")}
              className="crm-focusable flex items-center gap-1 text-[12px] font-medium"
              style={{ color: T.accent }}>
              Kanban view <ChevronRight size={13} />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {pipelineStages.map((s, i) => (
              <div key={s.stage} className="flex items-center gap-3">
                <span className="text-[11.5px] w-[88px] shrink-0" style={{ color: T.inkSoft }}>{s.stage}</span>
                <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ background: T.lineSoft }}>
                  {s.count > 0 && (
                    <div className="h-full rounded-md transition-all"
                      style={{
                        width: `${Math.max(4, (s.count / maxStageCount) * 100)}%`,
                        background: PIE_COLORS[i % PIE_COLORS.length],
                        opacity: 0.8,
                      }}
                    />
                  )}
                </div>
                <span className="crm-mono text-[12px] font-bold w-6 text-right shrink-0" style={{ color: T.ink }}>{s.count}</span>
                <span className="crm-mono text-[11px] w-20 text-right shrink-0" style={{ color: T.inkFaint }}>{fmtINR(s.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Status Bar Chart */}
        <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="crm-display text-[14px] font-semibold" style={{ color: T.ink }}>Lead Status</h2>
              <p className="text-[12px] mt-0.5" style={{ color: T.inkFaint }}>Current lead stage distribution</p>
            </div>
            <button onClick={() => navigate("/leads")}
              className="crm-focusable flex items-center gap-1 text-[12px] font-medium"
              style={{ color: T.accent }}>
              All leads <ChevronRight size={13} />
            </button>
          </div>
          {leadsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={leadsByStatus} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11.5, fill: T.inkSoft }} axisLine={false} tickLine={false} width={88} />
                <Tooltip content={<CT />} cursor={{ fill: T.lineSoft }} />
                <Bar dataKey="count" fill={T.accent} radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[180px] gap-2">
              <BarChart3 size={28} style={{ color: T.lineSoft }} />
              <p className="text-[12px]" style={{ color: T.inkFaint }}>No lead data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Row: Activity + Priorities + Top Performers ─────────────── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Recent Activity Feed */}
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <div className="flex items-center justify-between">
            <h2 className="crm-display text-[14px] font-semibold" style={{ color: T.ink }}>Recent Activity</h2>
            <button onClick={() => navigate("/activities")}
              className="crm-focusable flex items-center gap-1 text-[12px] font-medium"
              style={{ color: T.accent }}>
              View all <ChevronRight size={13} />
            </button>
          </div>
          {recentFeed.length > 0 ? (
            <div className="flex flex-col gap-3">
              {recentFeed.map((item, i) => (
                <ActivityItem key={item.key || i} {...item} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Activity size={26} style={{ color: T.lineSoft }} />
              <p className="text-[12px]" style={{ color: T.inkFaint }}>No activities logged yet</p>
              <button onClick={() => navigate("/activities")}
                className="crm-focusable text-[11.5px] font-medium px-3 py-1.5 rounded-lg"
                style={{ background: T.accentSoft, color: T.accent }}>
                Log first activity
              </button>
            </div>
          )}
        </div>

        {/* AI Today's Priorities */}
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: T.ink }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "rgba(255,255,255,0.12)" }}>
              <Sparkles size={13} style={{ color: "#B8B4FF" }} />
            </div>
            <h2 className="crm-display text-[14px] font-semibold" style={{ color: "#fff" }}>AI Priorities</h2>
          </div>
          <div className="flex flex-col gap-2.5">
            {priorities.map((p, i) => (
              <div key={i} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#B8B4FF" }}>{p.tag}</span>
                <p className="text-[12.5px] leading-snug mt-1" style={{ color: "rgba(255,255,255,0.88)" }}>{p.text}</p>
              </div>
            ))}
          </div>
          <button onClick={() => navigate("/ai")}
            className="crm-focusable flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-[12px] font-semibold mt-auto"
            style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}>
            Open AI Copilot <ChevronRight size={13} />
          </button>
        </div>

        {/* Top Performers */}
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <div className="flex items-center justify-between">
            <h2 className="crm-display text-[14px] font-semibold" style={{ color: T.ink }}>Top Performers</h2>
            <button onClick={() => navigate("/team")}
              className="crm-focusable flex items-center gap-1 text-[12px] font-medium"
              style={{ color: T.accent }}>
              Team <ChevronRight size={13} />
            </button>
          </div>
          {topPerformers.length > 0 ? (
            <div className="flex flex-col gap-3">
              {topPerformers.map((m, i) => (
                <div key={m.id} className="flex items-center gap-2.5">
                  <span className="crm-mono text-[11px] w-4 shrink-0" style={{ color: T.inkFaint }}>#{i + 1}</span>
                  <Avatar initials={m.initials || m.name?.slice(0, 2).toUpperCase()} size={28} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold truncate" style={{ color: T.ink }}>{m.name}</p>
                    <p className="text-[11px] truncate" style={{ color: T.inkFaint }}>{m.assigned} leads · {m.calls} calls</p>
                  </div>
                  <span className="crm-mono text-[11.5px] font-semibold shrink-0" style={{ color: T.positive }}>
                    {fmtINR(m.wonRev)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Users size={26} style={{ color: T.lineSoft }} />
              <p className="text-[12px]" style={{ color: T.inkFaint }}>No team members yet</p>
              <button onClick={() => navigate("/team")}
                className="crm-focusable text-[11.5px] font-medium px-3 py-1.5 rounded-lg"
                style={{ background: T.accentSoft, color: T.accent }}>
                Add team member
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
