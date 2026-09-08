import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Crown, Users, TrendingUp, Target, Phone, CalendarDays,
  Briefcase, Eye, LogIn, RefreshCw, BarChart3, UserCheck,
  ChevronRight, ArrowUpRight, Activity, Flame, CheckSquare, Key,
  X, Filter, Search, PieChart as PieChartIcon, CheckCircle2, Clock,
  ArrowRight, ShieldCheck, Mail, AlertTriangle, Layers
} from "lucide-react";
import { T } from "../tokens";
import { useAuth } from "../store/AuthContext";
import { useCrm } from "../store/CrmContext";
import { fmtINR, Avatar } from "../components/shared";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import Modal from "../components/Modal";

const RANGES = ["All Time", "Today", "This Week", "This Month", "This Quarter", "This Year"];

const ROLE_COLORS = {
  Leader: { bg: T.amberSoft, text: T.amber },
  Admin:  { bg: T.accentSoft, text: T.accent },
  Member: { bg: T.positiveSoft, text: T.positive },
};

function StatPill({ value, label, color }) {
  return (
    <div className="text-center">
      <p className="crm-mono text-[15px] font-bold" style={{ color }}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: T.inkFaint }}>{label}</p>
    </div>
  );
}

function isOwnedByMember(item, member) {
  if (!item || !member) return false;

  // 1. Match by userId if available on both item and member
  if (member.userId && item.userId && String(item.userId) === String(member.userId)) {
    return true;
  }

  // 2. Match by owner string (e.g. "Lakshita", "Himanshi Mahlawat", "Himanshi")
  const ownerName = item.owner || item.ownerFull;
  if (ownerName && member.name) {
    const cleanOwner = ownerName.trim().toLowerCase();
    const cleanMember = member.name.trim().toLowerCase();

    if (cleanOwner === cleanMember) return true;

    // First name match (e.g. "Lakshita" vs "Lakshita Sharma")
    const memberFirstName = cleanMember.split(" ")[0];
    const ownerFirstName = cleanOwner.split(" ")[0];
    if (memberFirstName && ownerFirstName && memberFirstName.length > 1 && memberFirstName === ownerFirstName) {
      return true;
    }
  }

  // 3. Match by ownerInitials if available
  if (item.ownerInitials && member.initials) {
    if (item.ownerInitials.trim().toUpperCase() === member.initials.trim().toUpperCase()) {
      return true;
    }
  }

  return false;
}

// ── Member Inspection Drawer / Modal ──────────────────────────────────────
function MemberDetailModal({ member, crmData, open, onClose, onImpersonate, impersonating }) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!open || !member) return null;

  const memberLeads = crmData.leads.filter(l => isOwnedByMember(l, member));
  const memberDeals = crmData.deals.filter(d => isOwnedByMember(d, member));
  const memberCalls = crmData.calls.filter(c => isOwnedByMember(c, member));
  const memberMeetings = crmData.meetings.filter(m => isOwnedByMember(m, member));
  const memberTasks = crmData.tasks.filter(t => isOwnedByMember(t, member));

  const wonDeals = memberDeals.filter(d => d.stage === "Won");
  const lostDeals = memberDeals.filter(d => d.stage === "Lost");
  const openDeals = memberDeals.filter(d => d.stage !== "Won" && d.stage !== "Lost");
  const wonRevenue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const pipelineVal = openDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const convRate = memberLeads.length > 0 ? Math.round((wonDeals.length / memberLeads.length) * 100) : 0;
  const winRate = memberDeals.length > 0 ? Math.round((wonDeals.length / memberDeals.length) * 100) : 0;

  const initials = member.initials || member.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Modal open={open} onClose={onClose} title={`Member Deep Dive — ${member.name}`}>
      <div className="flex flex-col gap-5 max-h-[80vh] overflow-y-auto crm-scroll pr-1">
        {/* Header Profile Info */}
        <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: T.canvas, border: `1px solid ${T.line}` }}>
          <div className="flex items-center gap-3.5">
            <Avatar initials={initials} size={48} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="crm-display text-[16px] font-semibold" style={{ color: T.ink }}>{member.name}</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: T.accentSoft, color: T.accent }}>
                  {member.role || member.tag || "Member"}
                </span>
              </div>
              <p className="text-[12px] mt-0.5" style={{ color: T.inkFaint }}>{member.email || "No email provided"}</p>
            </div>
          </div>
          {member.hasLogin && (
            <button
              onClick={() => onImpersonate(member)}
              disabled={impersonating}
              className="crm-focusable flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all hover:scale-[1.02]"
              style={{ background: T.accent, color: "#fff" }}
            >
              <LogIn size={13} />
              {impersonating ? "Switching..." : "Login as Member"}
            </button>
          )}
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          {[
            { id: "overview", label: "Overview & KPIs", count: null },
            { id: "deals", label: "Deals & Pipeline", count: memberDeals.length },
            { id: "leads", label: "Leads List", count: memberLeads.length },
            { id: "activities", label: "Calls & Tasks", count: memberCalls.length + memberTasks.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="crm-focusable flex-1 py-1.5 px-3 rounded-lg text-[12px] font-medium transition-all text-center"
              style={{
                background: activeTab === tab.id ? T.accent : "transparent",
                color: activeTab === tab.id ? "#fff" : T.inkSoft,
              }}
            >
              {tab.label} {tab.count !== null && <span className="opacity-75 text-[11px]">({tab.count})</span>}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 rounded-xl text-center" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: T.inkFaint }}>Won Revenue</p>
                <p className="crm-mono text-[16px] font-bold mt-1" style={{ color: T.positive }}>{fmtINR(wonRevenue)}</p>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: T.inkFaint }}>Pipeline Value</p>
                <p className="crm-mono text-[16px] font-bold mt-1" style={{ color: T.accent }}>{fmtINR(pipelineVal)}</p>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: T.inkFaint }}>Lead Conv Rate</p>
                <p className="crm-mono text-[16px] font-bold mt-1" style={{ color: T.amber }}>{convRate}%</p>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: T.inkFaint }}>Deal Win Rate</p>
                <p className="crm-mono text-[16px] font-bold mt-1" style={{ color: T.violet }}>{winRate}%</p>
              </div>
            </div>

            {/* Micro Activity Summary */}
            <div className="p-4 rounded-xl flex flex-col gap-3" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
              <h3 className="crm-display text-[13px] font-semibold" style={{ color: T.ink }}>Sales Activity Breakdown</h3>
              <div className="grid grid-cols-4 gap-2 text-center text-[12px]">
                <div className="p-2 rounded-lg" style={{ background: T.canvas }}>
                  <p className="text-[10.5px]" style={{ color: T.inkFaint }}>Leads Assigned</p>
                  <p className="crm-mono font-semibold text-[14px]" style={{ color: T.ink }}>{memberLeads.length}</p>
                </div>
                <div className="p-2 rounded-lg" style={{ background: T.canvas }}>
                  <p className="text-[10.5px]" style={{ color: T.inkFaint }}>Calls Logged</p>
                  <p className="crm-mono font-semibold text-[14px]" style={{ color: T.positive }}>{memberCalls.length}</p>
                </div>
                <div className="p-2 rounded-lg" style={{ background: T.canvas }}>
                  <p className="text-[10.5px]" style={{ color: T.inkFaint }}>Meetings Booked</p>
                  <p className="crm-mono font-semibold text-[14px]" style={{ color: T.amber }}>{memberMeetings.length}</p>
                </div>
                <div className="p-2 rounded-lg" style={{ background: T.canvas }}>
                  <p className="text-[10.5px]" style={{ color: T.inkFaint }}>Tasks Pending</p>
                  <p className="crm-mono font-semibold text-[14px]" style={{ color: T.negative }}>
                    {memberTasks.filter(t => !t.completed).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Deals */}
        {activeTab === "deals" && (
          <div className="flex flex-col gap-2 animate-fadeIn">
            {memberDeals.length === 0 ? (
              <p className="text-[12.5px] text-center py-8" style={{ color: T.inkFaint }}>No deals assigned to this member.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.line}` }}>
                      <th className="pb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: T.inkFaint }}>Deal</th>
                      <th className="pb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: T.inkFaint }}>Company</th>
                      <th className="pb-2 text-[11px] font-bold uppercase tracking-wider text-center" style={{ color: T.inkFaint }}>Stage</th>
                      <th className="pb-2 text-[11px] font-bold uppercase tracking-wider text-right" style={{ color: T.inkFaint }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberDeals.map(d => (
                      <tr key={d.id} className="border-b" style={{ borderColor: T.lineSoft }}>
                        <td className="py-2.5 text-[12.5px] font-semibold" style={{ color: T.ink }}>{d.deal}</td>
                        <td className="py-2.5 text-[12px]" style={{ color: T.inkFaint }}>{d.company}</td>
                        <td className="py-2.5 text-center">
                          <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: d.stage === "Won" ? T.positiveSoft : d.stage === "Lost" ? T.negativeSoft : T.accentSoft,
                              color: d.stage === "Won" ? T.positive : d.stage === "Lost" ? T.negative : T.accent
                            }}>
                            {d.stage}
                          </span>
                        </td>
                        <td className="py-2.5 text-right crm-mono text-[12.5px] font-semibold" style={{ color: T.positive }}>
                          {fmtINR(d.value || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Leads */}
        {activeTab === "leads" && (
          <div className="flex flex-col gap-2 animate-fadeIn">
            {memberLeads.length === 0 ? (
              <p className="text-[12.5px] text-center py-8" style={{ color: T.inkFaint }}>No leads assigned to this member.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.line}` }}>
                      <th className="pb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: T.inkFaint }}>Lead Name</th>
                      <th className="pb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: T.inkFaint }}>Company</th>
                      <th className="pb-2 text-[11px] font-bold uppercase tracking-wider text-center" style={{ color: T.inkFaint }}>Status</th>
                      <th className="pb-2 text-[11px] font-bold uppercase tracking-wider text-right" style={{ color: T.inkFaint }}>Deal Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberLeads.map(l => (
                      <tr key={l.id} className="border-b" style={{ borderColor: T.lineSoft }}>
                        <td className="py-2.5 text-[12.5px] font-semibold" style={{ color: T.ink }}>{l.name}</td>
                        <td className="py-2.5 text-[12px]" style={{ color: T.inkFaint }}>{l.company}</td>
                        <td className="py-2.5 text-center">
                          <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: T.accentSoft, color: T.accent }}>
                            {l.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-right crm-mono text-[12.5px] font-semibold" style={{ color: T.ink }}>
                          {l.dealValue || fmtINR(l.dealValueNum || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Activities & Tasks */}
        {activeTab === "activities" && (
          <div className="flex flex-col gap-4 animate-fadeIn text-[12.5px]">
            <div>
              <h4 className="font-semibold text-[13px] mb-2" style={{ color: T.ink }}>Pending Tasks ({memberTasks.filter(t => !t.completed).length})</h4>
              {memberTasks.length === 0 ? (
                <p className="text-[12px]" style={{ color: T.inkFaint }}>No tasks found.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {memberTasks.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: T.canvas }}>
                      <span className={t.completed ? "line-through opacity-50" : ""} style={{ color: T.ink }}>{t.title}</span>
                      <span className="text-[11px] crm-mono" style={{ color: T.inkFaint }}>Due: {t.dueDate}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-[13px] mb-2" style={{ color: T.ink }}>Recent Calls Logged ({memberCalls.length})</h4>
              {memberCalls.length === 0 ? (
                <p className="text-[12px]" style={{ color: T.inkFaint }}>No calls logged.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {memberCalls.slice(0, 5).map(c => (
                    <div key={c.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: T.canvas }}>
                      <div>
                        <p className="font-medium" style={{ color: T.ink }}>{c.contact} ({c.company})</p>
                        <p className="text-[11px]" style={{ color: T.inkFaint }}>Outcome: {c.outcome}</p>
                      </div>
                      <span className="text-[11px] crm-mono" style={{ color: T.inkFaint }}>{c.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function MemberCard({ member, crmData, onImpersonate, impersonating, navigate, onInspect }) {
  const leads = crmData.leads.filter(l => isOwnedByMember(l, member)).length;
  const wonDeals = crmData.deals.filter(d => isOwnedByMember(d, member) && d.stage === "Won");
  const revenue = wonDeals.reduce((s, d) => s + (d.value || 0), 0);
  const calls = crmData.calls.filter(c => isOwnedByMember(c, member)).length;
  const meetings = crmData.meetings.filter(m => isOwnedByMember(m, member)).length;
  const tasks = crmData.tasks.filter(t => isOwnedByMember(t, member) && !t.completed).length;

  const conv = leads > 0 ? Math.round((wonDeals.length / leads) * 100) : 0;

  const roleStyle = ROLE_COLORS[member.role] || ROLE_COLORS.Member;
  const initials  = member.initials || member.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div
      className="rounded-2xl flex flex-col gap-4 p-5 transition-all duration-200 hover:shadow-lg"
      style={{ background: T.surface, border: `1px solid ${T.line}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar initials={initials} size={42} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="crm-display text-[14px] font-semibold" style={{ color: T.ink }}>{member.name}</h3>
              {member.tag === "Leader" && <Crown size={12} style={{ color: T.amber }} />}
            </div>
            <p className="text-[11.5px]" style={{ color: T.inkFaint }}>{member.email || "No email"}</p>
            <span className="inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: roleStyle.bg, color: roleStyle.text }}>
              {member.role || member.tag}
            </span>
          </div>
        </div>
        <button
          onClick={() => onInspect(member)}
          className="crm-focusable p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title="Inspect Detailed Analytics"
          style={{ color: T.accent }}
        >
          <Eye size={16} />
        </button>
      </div>

      {/* Live Stats Grid */}
      <div className="grid grid-cols-4 gap-2 p-3 rounded-xl" style={{ background: T.canvas }}>
        <StatPill value={leads}    label="Leads"    color={T.accent} />
        <StatPill value={calls}    label="Calls"    color={T.positive} />
        <StatPill value={meetings} label="Meets"    color={T.amber} />
        <StatPill value={tasks}    label="Tasks"    color={T.negative} />
      </div>

      {/* Revenue row */}
      <div className="flex items-center justify-between text-[12px]">
        <div>
          <span style={{ color: T.inkFaint }}>Won Revenue </span>
          <span className="font-bold crm-mono" style={{ color: T.positive }}>{fmtINR(revenue)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ color: T.inkFaint }}>Conv </span>
          <span className="font-bold crm-mono px-1.5 py-0.5 rounded-full text-[11px]"
            style={{ background: conv >= 25 ? T.positiveSoft : conv >= 10 ? T.amberSoft : T.negativeSoft,
              color: conv >= 25 ? T.positive : conv >= 10 ? T.amber : T.negative }}>
            {conv}%
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onInspect(member)}
          className="crm-focusable flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: T.accentSoft, color: T.accent }}
        >
          <BarChart3 size={13} />
          View Detailed Analytics
        </button>

        {member.hasLogin ? (
          <button
            onClick={() => onImpersonate(member)}
            disabled={impersonating}
            className="crm-focusable px-3 py-2 rounded-xl text-[12px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-1"
            style={{ background: T.accent, color: "#fff" }}
            title="Switch to Member's Personal Portal"
          >
            <LogIn size={13} />
            {impersonating ? "..." : "Login"}
          </button>
        ) : (
          <button
            onClick={() => navigate("/team")}
            className="crm-focusable px-3 py-2 rounded-xl text-[12px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: T.lineSoft, color: T.inkSoft, border: `1px solid ${T.line}` }}
            title="Setup login credentials"
          >
            <Key size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function LeaderDashboard() {
  const navigate = useNavigate();
  const { user, fetchOrgMembers, impersonate } = useAuth();
  const { state } = useCrm();

  const [range, setRange] = useState("All Time");
  const [orgMembers, setOrgMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [impersonatingId, setImpersonatingId] = useState(null);
  const [inspectMember, setInspectMember] = useState(null);
  const [searchMember, setSearchMember] = useState("");

  // Load org members
  const loadOrgMembers = () => {
    if (user?.role !== "Leader") return;
    setLoadingMembers(true);
    fetchOrgMembers()
      .then(members => setOrgMembers(members))
      .catch(err => console.error("Failed to load org members:", err))
      .finally(() => setLoadingMembers(false));
  };

  useEffect(() => {
    loadOrgMembers();
  }, [user]);

  // Merge team members directory with active login accounts
  const mergedMembers = useMemo(() => {
    const team = state.team || [];
    return team.map(member => {
      const account = orgMembers.find(u => u.email.toLowerCase() === member.email?.toLowerCase());
      return {
        ...member,
        userId: account ? account.id : null,
        hasLogin: !!account,
        role: account ? account.role : (member.role || "Member"),
      };
    });
  }, [state.team, orgMembers]);

  const filteredMembers = useMemo(() => {
    if (!searchMember.trim()) return mergedMembers;
    const q = searchMember.toLowerCase();
    return mergedMembers.filter(m => m.name.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q) || m.role?.toLowerCase().includes(q));
  }, [mergedMembers, searchMember]);

  // Aggregate org-wide stats directly from CrmContext
  const orgStats = useMemo(() => {
    const leads    = state.leads.length;
    const deals    = state.deals.length;
    const wonDeals = state.deals.filter(d => d.stage === "Won");
    const revenue  = wonDeals.reduce((s, d) => s + (d.value || 0), 0);
    const calls    = state.calls.length;
    const meetings = state.meetings.length;
    const tasks    = state.tasks.filter(t => !t.completed).length;
    return { leads, deals, revenue, calls, meetings, tasks };
  }, [state]);

  // Sales Funnel Pipeline Stage breakdown
  const dealFunnel = useMemo(() => {
    const stages = ["New", "Contacted", "Interested", "Qualified", "Proposal", "Negotiation", "Won"];
    return stages.map(stg => {
      const dealsInStage = state.deals.filter(d => d.stage === stg);
      return {
        stage: stg,
        count: dealsInStage.length,
        val: dealsInStage.reduce((sum, d) => sum + (d.value || 0), 0),
      };
    });
  }, [state.deals]);

  // Per-member comparison chart data
  const chartData = useMemo(() =>
    mergedMembers.map(m => {
      const leads = state.leads.filter(l => isOwnedByMember(l, m)).length;
      const wonDeals = state.deals.filter(d => isOwnedByMember(d, m) && d.stage === "Won");
      const revenue = wonDeals.reduce((s, d) => s + (d.value || 0), 0);

      return {
        name: m.name.split(" ")[0],
        leads,
        revenue: Math.round(revenue / 1000),
      };
    }),
    [mergedMembers, state]
  );

  const handleImpersonate = async (member) => {
    if (!member.userId) return;
    setImpersonatingId(member.userId);
    try {
      await impersonate(member.userId);
      navigate("/");
    } catch (err) {
      alert(err.message);
      setImpersonatingId(null);
    }
  };

  return (
    <div className="p-5 flex flex-col gap-6 min-w-0">
      {/* Inspection Modal */}
      <MemberDetailModal
        member={inspectMember}
        crmData={state}
        open={Boolean(inspectMember)}
        onClose={() => setInspectMember(null)}
        onImpersonate={handleImpersonate}
        impersonating={inspectMember && impersonatingId === inspectMember.userId}
      />

      {/* Header & Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Crown size={18} style={{ color: T.amber }} />
            <h1 className="crm-display text-[20px] font-semibold" style={{ color: T.ink }}>
              Leader Command Center & Analytics
            </h1>
          </div>
          <p className="text-[13px]" style={{ color: T.inkFaint }}>
            Full organization intelligence · {mergedMembers.length} active team members
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Time Filter Pills */}
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
            {RANGES.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="crm-focusable px-2.5 py-1 rounded-md text-[11.5px] font-medium transition-colors"
                style={{ background: range === r ? T.accent : "transparent", color: range === r ? "#fff" : T.inkSoft }}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            onClick={loadOrgMembers}
            className="crm-focusable flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium"
            style={{ border: `1px solid ${T.line}`, color: T.inkSoft }}
          >
            <RefreshCw size={13} /> Refresh
          </button>

          <button
            onClick={() => navigate("/team")}
            className="crm-focusable flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold"
            style={{ background: T.accent, color: "#fff" }}
          >
            <Users size={14} /> Manage Team
          </button>
        </div>
      </div>

      {/* Org KPI Banner */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: "Total Leads",    value: orgStats.leads,                 icon: Users,       color: T.accent,   path: "/leads"    },
          { label: "Open Deals",     value: orgStats.deals,                 icon: Briefcase,   color: T.violet,   path: "/pipeline" },
          { label: "Won Revenue",    value: fmtINR(orgStats.revenue),       icon: TrendingUp,  color: T.positive, path: "/deals"    },
          { label: "Calls Logged",   value: orgStats.calls,                 icon: Phone,       color: T.positive, path: "/calls"    },
          { label: "Meetings",       value: orgStats.meetings,              icon: CalendarDays, color: T.amber,   path: "/meetings" },
          { label: "Pending Tasks",  value: orgStats.tasks,                 icon: CheckSquare, color: T.negative, path: "/tasks"    },
        ].map(s => (
          <button key={s.label} onClick={() => navigate(s.path)}
            className="crm-card rounded-xl p-3.5 flex items-center gap-3 text-left transition-all hover:shadow-md"
            style={{ background: T.surface, border: `1px solid ${T.line}` }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.color + "18", color: s.color }}>
              <s.icon size={18} />
            </div>
            <div>
              <p className="crm-mono text-[17px] font-bold leading-none" style={{ color: T.ink }}>{s.value}</p>
              <p className="text-[10.5px] font-medium mt-0.5 uppercase tracking-wide" style={{ color: T.inkFaint }}>{s.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Analytics Grid: Member Comparison Bar Chart & Leaderboard */}
      <div className="grid grid-cols-3 gap-4">
        {/* Bar chart: member performance */}
        <div className="col-span-2 rounded-2xl p-4 flex flex-col gap-3" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="crm-display text-[14.5px] font-semibold" style={{ color: T.ink }}>Team Member Performance Comparison</h2>
              <p className="text-[12px]" style={{ color: T.inkFaint }}>Comparison of leads captured vs revenue won (₹K)</p>
            </div>
            <BarChart3 size={16} style={{ color: T.inkFaint }} />
          </div>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-44 text-[13px]" style={{ color: T.inkFaint }}>
              Add team members to see performance comparison
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.lineSoft} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: T.inkFaint }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: T.inkFaint }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: `1px solid ${T.line}`, background: T.surface }}
                  formatter={(v, name) => [name === "revenue" ? `₹${v}K` : v, name === "revenue" ? "Revenue Won" : "Leads"]}
                />
                <Bar dataKey="leads" fill={T.accent} radius={[4, 4, 0, 0]} name="Leads" />
                <Bar dataKey="revenue" fill={T.positive} radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Leaderboard with Deep Dive inspection */}
        <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="crm-display text-[14.5px] font-semibold" style={{ color: T.ink }}>Revenue Leaderboard</h2>
            <Crown size={15} style={{ color: T.amber }} />
          </div>
          {mergedMembers.slice(0, 6).map((m, idx) => {
            const rev = state.deals.filter(d => isOwnedByMember(d, m) && d.stage === "Won").reduce((s, d) => s + (d.value || 0), 0);
            return (
              <div
                key={m.id}
                onClick={() => setInspectMember(m)}
                className="flex items-center gap-2.5 py-2 px-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ borderBottom: `1px solid ${T.lineSoft}` }}
              >
                <span className="crm-mono text-[11px] font-bold w-5 text-center" style={{ color: T.inkFaint }}>#{idx + 1}</span>
                <Avatar initials={m.initials || m.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)} size={30} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold truncate" style={{ color: T.ink }}>{m.name}</p>
                  <p className="text-[11px] crm-mono" style={{ color: T.positive }}>{fmtINR(rev)}</p>
                </div>
                <button className="p-1 rounded text-gray-400 hover:text-indigo-600">
                  <Eye size={14} />
                </button>
              </div>
            );
          })}
          {mergedMembers.length === 0 && (
            <p className="text-[12px] text-center py-6" style={{ color: T.inkFaint }}>No team members configured</p>
          )}
        </div>
      </div>

      {/* Sales Pipeline Funnel & Stage Breakdown */}
      <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="crm-display text-[14.5px] font-semibold" style={{ color: T.ink }}>Organization Sales Pipeline Funnel</h2>
            <p className="text-[12px]" style={{ color: T.inkFaint }}>Deal distribution & total value across stages</p>
          </div>
          <button onClick={() => navigate("/pipeline")} className="crm-focusable text-[12px] font-semibold flex items-center gap-1" style={{ color: T.accent }}>
            View Full Pipeline <ChevronRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {dealFunnel.map((f, i) => (
            <div key={f.stage} className="p-3 rounded-xl flex flex-col justify-between text-center" style={{ background: T.canvas, border: `1px solid ${T.lineSoft}` }}>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: T.inkFaint }}>
                {i + 1}. {f.stage}
              </span>
              <div className="my-2">
                <p className="crm-mono text-[18px] font-bold" style={{ color: T.ink }}>{f.count}</p>
                <p className="crm-mono text-[11.5px] font-semibold" style={{ color: T.positive }}>{fmtINR(f.val)}</p>
              </div>
              <div className="w-full h-1 rounded-full" style={{ background: T.accentSoft }}>
                <div className="h-full rounded-full" style={{ background: T.accent, width: `${Math.min(100, f.count * 20)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Member Cards Grid with Deep-Dive Inspection */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h2 className="crm-display text-[15px] font-semibold" style={{ color: T.ink }}>
              Organization Members Directory
              <span className="ml-2 text-[12px] font-normal" style={{ color: T.inkFaint }}>{mergedMembers.length} members</span>
            </h2>
            <p className="text-[12px]" style={{ color: T.inkFaint }}>Click "View Detailed Analytics" on any member to inspect their full activity log</p>
          </div>

          {/* Search Member Filter */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
            <Search size={14} style={{ color: T.inkFaint }} />
            <input
              type="text"
              value={searchMember}
              onChange={e => setSearchMember(e.target.value)}
              placeholder="Search member name or email..."
              className="bg-transparent text-[12px] outline-none w-52"
              style={{ color: T.ink }}
            />
          </div>
        </div>

        {loadingMembers ? (
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-2xl h-56 animate-pulse" style={{ background: T.surface, border: `1px solid ${T.line}` }} />
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: T.surface, border: `1px dashed ${T.line}` }}>
            <Users size={32} className="mx-auto mb-3 opacity-30" style={{ color: T.ink }} />
            <p className="text-[13px] font-medium" style={{ color: T.inkSoft }}>No matching team members found.</p>
            <p className="text-[12px] mt-1" style={{ color: T.inkFaint }}>Go to Team directory to create members and generate login credentials.</p>
            <button onClick={() => navigate("/team")}
              className="mt-4 crm-focusable px-4 py-2 rounded-xl text-[12.5px] font-semibold"
              style={{ background: T.accentSoft, color: T.accent }}>
              Go to Team Directory →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filteredMembers.map(m => (
              <MemberCard
                key={m.id}
                member={m}
                crmData={state}
                onImpersonate={handleImpersonate}
                impersonating={impersonatingId === m.userId}
                navigate={navigate}
                onInspect={(target) => setInspectMember(target)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
