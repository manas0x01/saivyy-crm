import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Crown, Users, TrendingUp, Target, Phone, CalendarDays,
  Briefcase, Eye, LogIn, RefreshCw, BarChart3, UserCheck,
  ChevronRight, ArrowUpRight, ArrowDownRight, Activity, Flame, CheckSquare, Key,
  X, Filter, Search, PieChart as PieChartIcon, CheckCircle2, Clock,
  ArrowRight, ShieldCheck, Mail, AlertTriangle, Layers, Sparkles, Award, Zap
} from "lucide-react";
import { T } from "../tokens";
import { useAuth } from "../store/AuthContext";
import { useCrm } from "../store/CrmContext";
import { useToast } from "../components/ToastContext";
import { filterByDateRange } from "../utils/dateFilter";
import { fmtINR, Avatar } from "../components/shared";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import Modal from "../components/Modal";

const RANGES = ["Today", "This Week", "This Month", "This Quarter", "This Year", "All Time"];

const ROLE_COLORS = {
  Leader: { bg: T.amberSoft, text: T.amber },
  Admin:  { bg: T.accentSoft, text: T.accent },
  Member: { bg: T.positiveSoft, text: T.positive },
};

function StatPill({ value, label, color }) {
  return (
    <div className="text-center p-2 rounded-lg" style={{ background: "#FAF9F6" }}>
      <p className="crm-mono text-[14.5px] font-bold" style={{ color }}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: T.inkFaint }}>{label}</p>
    </div>
  );
}

function isOwnedByMember(item, member) {
  if (!item || !member) return false;

  const rawMemberName = member.name || (typeof member === "string" ? member : "");
  const cleanMember = rawMemberName.replace(/\s*\((Leader|Admin|Member)\)/i, "").trim().toLowerCase();

  const ownerName = (item.owner || item.ownerFull || "").trim();
  const cleanOwner = ownerName.toLowerCase();

  // 1. Direct match by owner string (primary truth for assignments)
  if (cleanOwner) {
    if (cleanOwner === cleanMember) return true;
    if (cleanOwner.includes(cleanMember) || cleanMember.includes(cleanOwner)) return true;

    // First name match if at least 3 characters
    const memberFirstName = cleanMember.split(" ")[0];
    const ownerFirstName = cleanOwner.split(" ")[0];
    if (memberFirstName && ownerFirstName && memberFirstName.length >= 3 && memberFirstName === ownerFirstName) {
      return true;
    }

    // Initials match if available
    if (item.ownerInitials && member.initials) {
      if (item.ownerInitials.trim().toUpperCase() === member.initials.trim().toUpperCase()) {
        if (cleanMember[0] === cleanOwner[0]) return true;
      }
    }

    // Owner was specified but didn't match this member
    return false;
  }

  // 2. Fallback to user account ID ONLY if owner is unassigned or empty
  const targetAccId = member.accountUserId || member.userId;
  if (targetAccId && item.userId && String(item.userId) === String(targetAccId)) {
    return true;
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
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "#F5F3EF", border: `1px solid ${T.line}` }}>
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
                background: activeTab === tab.id ? "#FFFFFF" : "transparent",
                color: activeTab === tab.id ? "#1C1917" : T.inkSoft,
                boxShadow: activeTab === tab.id ? "0 2px 6px -1px rgba(0,0,0,0.08)" : "none",
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
                <p className="crm-mono text-[16px] font-bold mt-1" style={{ color: T.positive }}>{winRate}%</p>
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
                          {fmtINR(l.dealValue || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Activities */}
        {activeTab === "activities" && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: T.inkFaint }}>Recent Calls ({memberCalls.length})</h4>
              {memberCalls.length === 0 ? (
                <p className="text-[12px]" style={{ color: T.inkFaint }}>No logged calls.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {memberCalls.map(c => (
                    <div key={c.id} className="p-2.5 rounded-lg flex items-center justify-between text-[12px]" style={{ background: T.canvas }}>
                      <div>
                        <p className="font-semibold" style={{ color: T.ink }}>{c.contact} · {c.company}</p>
                        <p className="text-[11px]" style={{ color: T.inkFaint }}>{c.notes || "Call logged"}</p>
                      </div>
                      <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: T.positiveSoft, color: T.positive }}>
                        {c.outcome || "Completed"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: T.inkFaint }}>Assigned Tasks ({memberTasks.length})</h4>
              {memberTasks.length === 0 ? (
                <p className="text-[12px]" style={{ color: T.inkFaint }}>No pending tasks.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {memberTasks.map(t => (
                    <div key={t.id} className="p-2.5 rounded-lg flex items-center justify-between text-[12px]" style={{ background: T.canvas }}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${t.completed ? "bg-emerald-500" : "bg-amber-500"}`} />
                        <span className={`font-medium ${t.completed ? "line-through opacity-60" : ""}`} style={{ color: T.ink }}>{t.title}</span>
                      </div>
                      <span className="text-[10.5px]" style={{ color: T.inkFaint }}>{t.dueDate}</span>
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

// ── Member Card Component ───────────────────────────────────────────────────
function MemberCard({ member, crmData, onImpersonate, impersonating, navigate, onInspect }) {
  const memberLeads = crmData.leads.filter(l => isOwnedByMember(l, member));
  const memberDeals = crmData.deals.filter(d => isOwnedByMember(d, member));
  const memberCalls = crmData.calls.filter(c => isOwnedByMember(c, member));
  const memberMeetings = crmData.meetings.filter(m => isOwnedByMember(m, member));
  const memberTasks = crmData.tasks.filter(t => isOwnedByMember(t, member) && !t.completed);

  const leads = memberLeads.length;
  const calls = memberCalls.length;
  const meetings = memberMeetings.length;
  const tasks = memberTasks.length;

  const wonDeals = memberDeals.filter(d => d.stage === "Won");
  const revenue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const conv = leads > 0 ? Math.round((wonDeals.length / leads) * 100) : 0;

  // Quota goal (e.g. ₹20L per rep standard)
  const quota = 2000000;
  const quotaPercent = Math.min(100, Math.round((revenue / quota) * 100));

  const roleStyle = ROLE_COLORS[member.role] || ROLE_COLORS.Member;
  const initials = member.initials || member.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div
      className="crm-card rounded-2xl flex flex-col justify-between gap-4 p-5 transition-all duration-200 hover:shadow-md"
      style={{ background: T.surface, border: `1px solid ${T.line}` }}
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar initials={initials} size={42} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="crm-display text-[14.5px] font-semibold truncate" style={{ color: T.ink }}>{member.name}</h3>
                {member.tag === "Leader" && <Crown size={12} style={{ color: T.amber }} />}
              </div>
              <p className="text-[11.5px] truncate" style={{ color: T.inkFaint }}>{member.email || "No email"}</p>
              <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: roleStyle.bg, color: roleStyle.text }}>
                {member.role || member.tag || "Team Member"}
              </span>
            </div>
          </div>
          <button
            onClick={() => onInspect(member)}
            className="crm-focusable p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
            title="Inspect Detailed Analytics"
            style={{ color: T.accent }}
          >
            <Eye size={16} />
          </button>
        </div>

        {/* Live Stats Grid */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <StatPill value={leads}    label="Leads"    color={T.accent} />
          <StatPill value={calls}    label="Calls"    color={T.positive} />
          <StatPill value={meetings} label="Meets"    color={T.amber} />
          <StatPill value={tasks}    label="Tasks"    color={tasks > 0 ? T.negative : T.inkFaint} />
        </div>

        {/* Quota Progress */}
        <div className="mt-4 p-3 rounded-xl" style={{ background: "#FAF9F6", border: `1px solid ${T.lineSoft}` }}>
          <div className="flex items-center justify-between text-[11.5px] mb-1.5">
            <span className="font-medium text-[#57534E]">Quota Progress</span>
            <span className="font-bold crm-mono text-[#1C1917]">{fmtINR(revenue)} <span className="font-normal text-[#8C857B]">({quotaPercent}%)</span></span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden bg-[#EAE7E1]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${quotaPercent}%`,
                background: quotaPercent >= 100 ? "#10B981" : quotaPercent >= 60 ? "#BC5A1B" : "#D97706"
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[10.5px] mt-1 text-[#8C857B]">
            <span>Target: ₹20L</span>
            <span>Win Rate: {conv}%</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2" style={{ borderTop: `1px solid ${T.lineSoft}` }}>
        <button
          onClick={() => onInspect(member)}
          className="crm-focusable flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition-all hover:brightness-95 active:scale-[0.99]"
          style={{ background: T.accentSoft, color: T.accent }}
        >
          <BarChart3 size={13} />
          Deep Dive Analytics
        </button>

        {member.hasLogin ? (
          <button
            onClick={() => onImpersonate(member)}
            disabled={impersonating}
            className="crm-focusable px-3 py-2 rounded-xl text-[12px] font-semibold transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-50 flex items-center gap-1 text-white shadow-xs"
            style={{ background: T.accent }}
            title="Switch to Member's Personal Portal"
          >
            <LogIn size={13} />
            {impersonating ? "..." : "Login"}
          </button>
        ) : (
          <button
            onClick={() => navigate("/team")}
            className="crm-focusable px-3 py-2 rounded-xl text-[12px] font-semibold transition-all hover:bg-gray-100"
            style={{ background: "#F5F3EF", color: T.inkSoft, border: `1px solid ${T.line}` }}
            title="Setup login credentials in Team directory"
          >
            <Key size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Leader Dashboard ───────────────────────────────────────────────────
export default function LeaderDashboard() {
  const navigate = useNavigate();
  const { user, fetchOrgMembers, impersonate } = useAuth();
  const { state } = useCrm();

  const [range, setRange] = useState("This Month");
  const [selectedRep, setSelectedRep] = useState("all");
  const [activeView, setActiveView] = useState("overview"); // "overview" | "team" | "funnel"
  const [orgMembers, setOrgMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [impersonatingId, setImpersonatingId] = useState(null);
  const [inspectMember, setInspectMember] = useState(null);
  const [searchMember, setSearchMember] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load org members
  const loadOrgMembers = () => {
    if (user?.role !== "Leader") return;
    setLoadingMembers(true);
    setIsRefreshing(true);
    fetchOrgMembers()
      .then(members => setOrgMembers(members))
      .catch(err => console.error("Failed to load org members:", err))
      .finally(() => {
        setLoadingMembers(false);
        setTimeout(() => setIsRefreshing(false), 400);
      });
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

  const selectedMemberObj = useMemo(() => {
    if (selectedRep === "all") return null;
    return mergedMembers.find(m => String(m.id) === String(selectedRep) || String(m.userId) === String(selectedRep));
  }, [mergedMembers, selectedRep]);

  // Filter base collections if rep filter is applied
  const baseLeads = useMemo(() => {
    if (!selectedMemberObj) return state.leads || [];
    return (state.leads || []).filter(l => isOwnedByMember(l, selectedMemberObj));
  }, [state.leads, selectedMemberObj]);

  const baseDeals = useMemo(() => {
    if (!selectedMemberObj) return state.deals || [];
    return (state.deals || []).filter(d => isOwnedByMember(d, selectedMemberObj));
  }, [state.deals, selectedMemberObj]);

  const baseCalls = useMemo(() => {
    if (!selectedMemberObj) return state.calls || [];
    return (state.calls || []).filter(c => isOwnedByMember(c, selectedMemberObj));
  }, [state.calls, selectedMemberObj]);

  const baseMeetings = useMemo(() => {
    if (!selectedMemberObj) return state.meetings || [];
    return (state.meetings || []).filter(m => isOwnedByMember(m, selectedMemberObj));
  }, [state.meetings, selectedMemberObj]);

  const baseTasks = useMemo(() => {
    if (!selectedMemberObj) return state.tasks || [];
    return (state.tasks || []).filter(t => isOwnedByMember(t, selectedMemberObj));
  }, [state.tasks, selectedMemberObj]);

  // Filtered collections by selected time range
  const filteredLeads = useMemo(() => filterByDateRange(baseLeads, range, ['created', 'lastContact']), [baseLeads, range]);
  const filteredDeals = useMemo(() => filterByDateRange(baseDeals, range, ['close', 'last']), [baseDeals, range]);
  const filteredCalls = useMemo(() => filterByDateRange(baseCalls, range, ['date']), [baseCalls, range]);
  const filteredMeetings = useMemo(() => filterByDateRange(baseMeetings, range, ['date']), [baseMeetings, range]);
  const filteredTasks = useMemo(() => filterByDateRange(baseTasks, range, ['dueDate', 'created']), [baseTasks, range]);

  // Key stats
  const wonDeals = useMemo(() => filteredDeals.filter(d => d.stage === "Won"), [filteredDeals]);
  const openDeals = useMemo(() => filteredDeals.filter(d => d.stage !== "Won" && d.stage !== "Lost"), [filteredDeals]);
  const pipelineVal = useMemo(() => openDeals.reduce((s, d) => s + (d.value || 0), 0), [openDeals]);
  const wonRevenue = useMemo(() => wonDeals.reduce((s, d) => s + (d.value || 0), 0), [wonDeals]);
  const winRate = filteredDeals.length > 0 ? Math.round((wonDeals.length / filteredDeals.length) * 100) : 0;
  const avgDealSize = openDeals.length > 0 ? Math.round(pipelineVal / openDeals.length) : 0;
  const overdueTasks = useMemo(() => filteredTasks.filter(t => !t.completed && (t.dueDate === "Overdue" || t.dueDate === "Today")).length, [filteredTasks]);

  // Sales Funnel Pipeline Stage breakdown with drop-offs
  const dealFunnel = useMemo(() => {
    const stages = ["New", "Contacted", "Interested", "Qualified", "Proposal", "Negotiation", "Won"];
    const totalPipeline = baseDeals.reduce((sum, d) => sum + (d.value || 0), 0) || 1;

    return stages.map((stg, index) => {
      const dealsInStage = filteredDeals.filter(d => d.stage === stg);
      const val = dealsInStage.reduce((sum, d) => sum + (d.value || 0), 0);
      const count = dealsInStage.length;
      const percentOfPipeline = Math.round((val / totalPipeline) * 100);

      return {
        stage: stg,
        count,
        val,
        percentOfPipeline,
        index: index + 1
      };
    });
  }, [filteredDeals, baseDeals]);

  // Per-member comparison chart data
  const chartData = useMemo(() =>
    mergedMembers.map(m => {
      const leads = filteredLeads.filter(l => isOwnedByMember(l, m)).length;
      const wDeals = filteredDeals.filter(d => isOwnedByMember(d, m) && d.stage === "Won");
      const revenue = wDeals.reduce((s, d) => s + (d.value || 0), 0);

      return {
        name: m.name.split(" ")[0],
        leads,
        revenue: Math.round(revenue / 1000), // in ₹K
      };
    }),
    [mergedMembers, filteredLeads, filteredDeals]
  );

  // Ranked members for leaderboard
  const rankedMembers = useMemo(() => {
    return mergedMembers.map(m => {
      const rev = state.deals.filter(d => isOwnedByMember(d, m) && d.stage === "Won").reduce((s, d) => s + (d.value || 0), 0);
      const activeDealsCount = state.deals.filter(d => isOwnedByMember(d, m) && d.stage !== "Won" && d.stage !== "Lost").length;
      return { ...m, revenue: rev, activeDealsCount };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [mergedMembers, state.deals]);

  const filteredMembersList = useMemo(() => {
    if (!searchMember.trim()) return mergedMembers;
    const q = searchMember.toLowerCase();
    return mergedMembers.filter(m => m.name.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q) || m.role?.toLowerCase().includes(q));
  }, [mergedMembers, searchMember]);

  const toast = useToast();

  const handleImpersonate = async (member) => {
    if (!member.userId) return;
    setImpersonatingId(member.userId);
    try {
      await impersonate(member.userId);
      toast.success(`Switched to portal for ${member.name}`, "Account Switched");
      navigate("/");
    } catch (err) {
      toast.error(err.message, "Impersonation Failed");
      setImpersonatingId(null);
    }
  };

  return (
    <div className="p-5 flex flex-col gap-5 min-w-0">
      {/* Inspection Modal */}
      <MemberDetailModal
        member={inspectMember}
        crmData={state}
        open={Boolean(inspectMember)}
        onClose={() => setInspectMember(null)}
        onImpersonate={handleImpersonate}
        impersonating={inspectMember && impersonatingId === inspectMember.userId}
      />

      {/* ── 1. Top Header & Interactive Filtering ───────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Crown size={20} className="text-[#BC5A1B]" />
            <h1 className="crm-display text-[21px] font-bold tracking-tight text-[#1C1917]">
              Leader Command Center & Intelligence
            </h1>
          </div>
          <p className="text-[12.5px] text-[#8C857B]">
            Enterprise visibility · {mergedMembers.length} active sales executives · Live operational sync
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Rep Filter Dropdown */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px] font-medium" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
            <Users size={14} className="text-[#8C857B]" />
            <select
              value={selectedRep}
              onChange={e => setSelectedRep(e.target.value)}
              className="bg-transparent font-semibold text-[#1C1917] outline-none cursor-pointer pr-1"
            >
              <option value="all">Whole Organization (All Reps)</option>
              {mergedMembers.map(m => (
                <option key={m.id} value={m.id}>Rep: {m.name}</option>
              ))}
            </select>
            {selectedRep !== "all" && (
              <button
                onClick={() => setSelectedRep("all")}
                className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 hover:bg-amber-200"
                title="Reset to whole organization"
              >
                Clear
              </button>
            )}
          </div>

          {/* Time Filter Pills */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
            {RANGES.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="crm-focusable px-2.5 py-1 rounded-lg text-[11.5px] font-medium transition-all"
                style={{
                  background: range === r ? T.accent : "transparent",
                  color: range === r ? "#FFFFFF" : T.inkSoft,
                  fontWeight: range === r ? 600 : 500,
                  boxShadow: range === r ? "0 1px 3px rgba(188,90,27,0.25)" : "none"
                }}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadOrgMembers}
            disabled={isRefreshing}
            className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition hover:bg-white"
            style={{ border: `1px solid ${T.line}`, color: T.inkSoft, background: T.surface }}
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin text-[#BC5A1B]" : ""} />
            <span>Refresh</span>
          </button>

          {/* Manage Team */}
          <button
            onClick={() => navigate("/team")}
            className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold text-white shadow-xs transition hover:brightness-105"
            style={{ background: T.accent }}
          >
            <Users size={14} />
            <span>Manage Team</span>
          </button>
        </div>
      </div>

      {/* ── 2. Executive Pulse & Health Digest Bar ──────────────────────── */}
      <div
        className="rounded-2xl p-4 flex items-center justify-between flex-wrap gap-4 border shadow-xs"
        style={{
          background: "linear-gradient(135deg, #FAF0E6 0%, #FAF9F6 100%)",
          borderColor: "#EAE7E1"
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#1C1917] text-white shrink-0 shadow-xs">
            <Zap size={18} className="text-[#F59E0B]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="crm-display text-[14.5px] font-bold text-[#1C1917]">
                {selectedMemberObj ? `${selectedMemberObj.name}'s Executive Pulse` : "Enterprise Health Pulse"}
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Strong Velocity
              </span>
            </div>
            <p className="text-[12px] text-[#57534E] mt-0.5">
              Win Rate sits at <strong>{winRate}%</strong> with <strong>{fmtINR(pipelineVal)}</strong> in active pipeline coverage.
              {overdueTasks > 0 ? (
                <span className="text-red-700 font-semibold ml-1.5">⚠️ {overdueTasks} tasks require immediate follow-up.</span>
              ) : (
                <span className="text-emerald-700 font-medium ml-1.5">✓ All compliance and tasks on track.</span>
              )}
            </p>
          </div>
        </div>

        {/* Quick Diagnostic Metrics */}
        <div className="flex items-center gap-4 text-right">
          <div className="hidden sm:block">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8C857B]">Win Rate</p>
            <p className="crm-mono text-[16px] font-bold text-[#1C1917]">{winRate}%</p>
          </div>
          <div className="hidden sm:block border-l pl-4 border-[#EAE7E1]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8C857B]">Avg Deal Size</p>
            <p className="crm-mono text-[16px] font-bold text-[#10B981]">{fmtINR(avgDealSize)}</p>
          </div>
          <div className="hidden md:block border-l pl-4 border-[#EAE7E1]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8C857B]">Total Won</p>
            <p className="crm-mono text-[16px] font-bold text-[#BC5A1B]">{fmtINR(wonRevenue)}</p>
          </div>
        </div>
      </div>

      {/* ── 3. Six Core KPI Interactive Cards ────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: "Total Leads",
            value: filteredLeads.length,
            sub: `${filteredLeads.filter(l => l.status === "New").length} new inquiries`,
            icon: Users,
            color: "#BC5A1B",
            path: "/leads"
          },
          {
            label: "Active Pipeline",
            value: fmtINR(pipelineVal),
            sub: `${openDeals.length} active deals`,
            icon: Briefcase,
            color: "#0284C7",
            path: "/pipeline"
          },
          {
            label: "Won Revenue",
            value: fmtINR(wonRevenue),
            sub: `${wonDeals.length} closed won deals`,
            icon: TrendingUp,
            color: "#10B981",
            path: "/deals"
          },
          {
            label: "Calls Logged",
            value: filteredCalls.length,
            sub: "Outreach calls completed",
            icon: Phone,
            color: "#10B981",
            path: "/calls"
          },
          {
            label: "Meetings Held",
            value: filteredMeetings.length,
            sub: "Demos & consultations",
            icon: CalendarDays,
            color: "#F59E0B",
            path: "/meetings"
          },
          {
            label: "Pending Tasks",
            value: filteredTasks.filter(t => !t.completed).length,
            sub: overdueTasks > 0 ? `${overdueTasks} overdue items` : "All on schedule",
            icon: CheckSquare,
            color: overdueTasks > 0 ? "#DC2626" : "#6B7280",
            path: "/tasks"
          },
        ].map(kpi => (
          <button
            key={kpi.label}
            onClick={() => navigate(kpi.path)}
            className="crm-card rounded-2xl p-4 flex flex-col justify-between text-left transition-all hover:shadow-md cursor-pointer group"
            style={{
              background: T.surface,
              border: `1px solid ${T.line}`,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#57534E]">
                {kpi.label}
              </span>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                style={{ background: `${kpi.color}15`, color: kpi.color }}
              >
                <kpi.icon size={16} />
              </div>
            </div>
            <div>
              <p className="crm-mono text-[20px] font-bold text-[#1C1917] tracking-tight leading-none">
                {kpi.value}
              </p>
              <p className="text-[11px] text-[#8C857B] mt-1.5 truncate">
                {kpi.sub}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* ── 4. View Mode Tabs (Executive Overview / Team Quotas / Funnel) ─── */}
      <div className="flex items-center justify-between gap-3 border-b border-[#EAE7E1] pb-2">
        <div className="flex items-center gap-2">
          {[
            { id: "overview", label: "Executive Overview & Insights", icon: BarChart3 },
            { id: "team", label: "Team Roster & Quotas", icon: Users },
            { id: "funnel", label: "Pipeline Funnel & Bottlenecks", icon: Layers },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className="crm-focusable flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-all cursor-pointer"
                style={{
                  background: isActive ? "#FAF0E6" : "transparent",
                  color: isActive ? "#BC5A1B" : "#57534E",
                  border: isActive ? "1px solid #F0D4BE" : "1px solid transparent"
                }}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeView === "team" && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#EAE7E1]">
            <Search size={14} className="text-[#8C857B]" />
            <input
              type="text"
              value={searchMember}
              onChange={e => setSearchMember(e.target.value)}
              placeholder="Search rep name or email..."
              className="text-[12px] bg-transparent outline-none w-48 text-[#1C1917]"
            />
          </div>
        )}
      </div>

      {/* ── 5. TAB 1: Executive Overview ─────────────────────────────────── */}
      {activeView === "overview" && (
        <div className="flex flex-col gap-5 animate-fadeIn">
          {/* Main 2-Column Analytics Grid: Chart + Leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: Performance Comparison Chart */}
            <div className="lg:col-span-2 rounded-2xl p-5 flex flex-col justify-between" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="crm-display text-[15px] font-bold text-[#1C1917]">
                    Team Performance Comparison
                  </h2>
                  <p className="text-[12px] text-[#8C857B]">
                    Comparison of captured leads vs revenue won (₹ in Thousands)
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11.5px] font-medium text-[#57534E]">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#BC5A1B]" /> Leads</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#10B981]" /> Revenue Won (₹K)</span>
                </div>
              </div>

              {chartData.length === 0 ? (
                <div className="flex items-center justify-center h-52 text-[13px] text-[#8C857B]">
                  No performance data recorded for this timeframe.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={chartData} barGap={6}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F3EF" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8C857B" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#8C857B" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 12, border: `1px solid ${T.line}`, background: "#FFFFFF", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                      formatter={(v, name) => [name === "revenue" ? `₹${v}K` : v, name === "revenue" ? "Revenue Won" : "Leads"]}
                    />
                    <Bar dataKey="leads" fill="#BC5A1B" radius={[4, 4, 0, 0]} name="Leads" />
                    <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Right: Revenue Leaderboard */}
            <div className="rounded-2xl p-5 flex flex-col justify-between" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Award size={16} className="text-[#BC5A1B]" />
                    <h2 className="crm-display text-[15px] font-bold text-[#1C1917]">
                      Revenue Leaderboard
                    </h2>
                  </div>
                  <span className="text-[11px] font-semibold text-[#8C857B]">Top Booked</span>
                </div>

                <div className="flex flex-col gap-2">
                  {rankedMembers.slice(0, 5).map((m, idx) => (
                    <div
                      key={m.id}
                      onClick={() => setInspectMember(m)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#FAF9F6] transition-colors cursor-pointer border border-transparent hover:border-[#EAE7E1]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 text-center font-bold text-[12px]">
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                        </span>
                        <Avatar initials={m.initials || m.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)} size={32} />
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#1C1917] truncate">{m.name}</p>
                          <p className="text-[11px] text-[#8C857B]">{m.activeDealsCount} active deals</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="crm-mono text-[13px] font-bold text-[#10B981]">{fmtINR(m.revenue)}</p>
                        <span className="text-[10px] text-[#BC5A1B] hover:underline">Inspect →</span>
                      </div>
                    </div>
                  ))}
                  {rankedMembers.length === 0 && (
                    <p className="text-[12.5px] text-center py-6 text-[#8C857B]">No team members found.</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setActiveView("team")}
                className="w-full py-2 rounded-xl text-[12px] font-semibold text-center mt-3 transition hover:bg-amber-50"
                style={{ background: "#FAF0E6", color: "#BC5A1B" }}
              >
                View Full Team Directory ({mergedMembers.length}) →
              </button>
            </div>
          </div>

          {/* Pipeline Stage Quick Snapshot */}
          <div className="rounded-2xl p-5" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="crm-display text-[15px] font-bold text-[#1C1917]">
                  Pipeline Stage Funnel
                </h2>
                <p className="text-[12px] text-[#8C857B]">
                  Deals distribution and volume progressing through sales cycle
                </p>
              </div>
              <button
                onClick={() => navigate("/pipeline")}
                className="flex items-center gap-1 text-[12px] font-semibold text-[#BC5A1B] hover:underline"
              >
                Open Kanban Pipeline <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {dealFunnel.map((f) => (
                <div
                  key={f.stage}
                  onClick={() => navigate("/pipeline")}
                  className="p-3.5 rounded-xl flex flex-col justify-between text-center transition hover:shadow-xs hover:border-[#BC5A1B] cursor-pointer"
                  style={{ background: "#FAF9F6", border: `1px solid #EAE7E1` }}
                >
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#8C857B]">
                    {f.index}. {f.stage}
                  </span>
                  <div className="my-2">
                    <p className="crm-mono text-[20px] font-bold text-[#1C1917]">{f.count}</p>
                    <p className="crm-mono text-[12px] font-semibold text-[#10B981] mt-0.5">{fmtINR(f.val)}</p>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden bg-[#EAE7E1]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, f.count * 20)}%`,
                        background: f.stage === "Won" ? "#10B981" : "#BC5A1B"
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 6. TAB 2: Team Roster & Quotas ──────────────────────────────── */}
      {activeView === "team" && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          {loadingMembers ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-2xl h-64 animate-pulse bg-white border border-[#EAE7E1]" />
              ))}
            </div>
          ) : filteredMembersList.length === 0 ? (
            <div className="rounded-2xl p-12 text-center bg-white border border-dashed border-[#EAE7E1]">
              <Users size={36} className="mx-auto mb-3 opacity-30 text-[#1C1917]" />
              <p className="text-[14px] font-semibold text-[#1C1917]">No team members match "{searchMember}"</p>
              <button
                onClick={() => setSearchMember("")}
                className="mt-3 px-3 py-1.5 rounded-xl text-[12px] font-semibold bg-amber-50 text-[#BC5A1B]"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembersList.map(m => (
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
      )}

      {/* ── 7. TAB 3: Pipeline Funnel & Bottlenecks ──────────────────────── */}
      {activeView === "funnel" && (
        <div className="flex flex-col gap-5 animate-fadeIn">
          {/* Funnel Drop-off Visualizer */}
          <div className="rounded-2xl p-6 bg-white border border-[#EAE7E1] flex flex-col gap-5">
            <div>
              <h2 className="crm-display text-[16px] font-bold text-[#1C1917]">
                Deal Conversion & Drop-off Funnel
              </h2>
              <p className="text-[12.5px] text-[#8C857B]">
                Track progression rates across each gate of the customer lifecycle to identify deal stalling
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-7 gap-3">
              {dealFunnel.map((step, idx) => {
                const nextStep = dealFunnel[idx + 1];
                const convRateToNext = nextStep && step.count > 0 ? Math.round((nextStep.count / step.count) * 100) : null;

                return (
                  <div key={step.stage} className="flex flex-col justify-between p-4 rounded-xl bg-[#FAF9F6] border border-[#EAE7E1]">
                    <div>
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#8C857B]">
                        Stage {step.index}
                      </span>
                      <h3 className="crm-display text-[14px] font-bold text-[#1C1917] mt-0.5">
                        {step.stage}
                      </h3>
                      <p className="crm-mono text-[22px] font-bold text-[#1C1917] mt-2">
                        {step.count}
                      </p>
                      <p className="crm-mono text-[12px] font-semibold text-[#10B981]">
                        {fmtINR(step.val)}
                      </p>
                    </div>

                    {convRateToNext !== null && (
                      <div className="mt-4 pt-3 border-t border-[#EAE7E1] text-[11px]">
                        <span className="text-[#8C857B]">Pass-through: </span>
                        <strong className={convRateToNext >= 50 ? "text-[#10B981]" : "text-[#BC5A1B]"}>
                          {convRateToNext}%
                        </strong>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actionable Bottlenecks Card */}
          <div className="rounded-2xl p-5 border shadow-xs" style={{ background: "#FEF2F2", borderColor: "#FCA5A5" }}>
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-[14px] font-bold text-red-900">
                  Bottleneck Detection & Attention Needed
                </h3>
                <p className="text-[12.5px] text-red-800 mt-1 leading-relaxed">
                  Deals in <strong>Proposal</strong> and <strong>Negotiation</strong> stages account for <strong>{fmtINR(dealFunnel.filter(f => f.stage === "Proposal" || f.stage === "Negotiation").reduce((s, f) => s + f.val, 0))}</strong> across {dealFunnel.filter(f => f.stage === "Proposal" || f.stage === "Negotiation").reduce((s, f) => s + f.count, 0)} accounts.
                  Make sure executives complete follow-up calls to prevent quarter-end slippage.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => navigate("/pipeline")}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-red-600 text-white hover:bg-red-700 transition"
                  >
                    Review Negotiation Deals in Pipeline →
                  </button>
                  <button
                    onClick={() => navigate("/tasks")}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-white text-red-700 border border-red-200 hover:bg-red-50 transition"
                  >
                    View Overdue Tasks ({overdueTasks})
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
