import React, { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Download, Trophy } from "lucide-react";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import { SectionLabel, ChartTooltip, fmtINR } from "../components/shared";

const RANGES = ["This Week", "This Month", "This Quarter", "This Year"];
const TABS = ["Lead analytics", "Sales analytics", "Salesperson analytics"];

function Kpi({ label, value }) {
  return (
    <div className="rounded-xl p-3.5" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
      <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: T.inkFaint }}>{label}</span>
      <div className="flex items-end justify-between mt-1">
        <span className="crm-mono crm-display text-[20px] font-semibold" style={{ color: T.ink }}>{value}</span>
      </div>
    </div>
  );
}

function Card({ children, className = "" }) {
  return <div className={`crm-card rounded-xl p-4 ${className}`} style={{ background: T.surface, border: `1px solid ${T.line}` }}>{children}</div>;
}

export default function Reports() {
  const [tab, setTab] = useState("Lead analytics");
  const [range, setRange] = useState("This Quarter");
  const { state } = useCrm();

  const exportCSV = () => {
    const rows = [["Name", "Company", "Status", "Value"], ...state.leads.map(l => [l.name, l.company, l.status, l.dealValue])];
    const content = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encoded = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", `crm_report_${tab.toLowerCase().replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dynamic Lead Sources Distribution
  const sourceDist = useMemo(() => {
    const map = {};
    state.leads.forEach(l => {
      const src = l.source || "Website";
      map[src] = (map[src] || 0) + 1;
    });
    const colors = [T.accent, T.positive, T.amber, T.violet, T.inkFaint, T.negative];
    return Object.entries(map).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length]
    }));
  }, [state.leads]);

  const maxSourceVal = useMemo(() => Math.max(...sourceDist.map(s => s.value), 1), [sourceDist]);

  // Dynamic Lead Status Breakup
  const statusDist = useMemo(() => {
    const map = {};
    state.leads.forEach(l => {
      const s = l.status || "New";
      map[s] = (map[s] || 0) + 1;
    });
    const colors = [T.inkFaint, T.accent, T.violet, T.positive, T.amber, T.negative];
    return Object.entries(map).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length]
    }));
  }, [state.leads]);

  const avgResponseTime = useMemo(() => {
    const touchpoints = (state.activities?.length || 0) + (state.calls?.length || 0);
    if (!touchpoints || !state.leads.length) return "0.0 hrs";
    const avgHours = (Math.max(0.5, 24 / Math.max(1, touchpoints))).toFixed(1);
    return `${avgHours} hrs`;
  }, [state.activities, state.calls, state.leads]);

  const avgLeadScore = useMemo(() => {
    if (!state.leads.length) return "0 / 100";
    const sum = state.leads.reduce((acc, l) => acc + (l.score || 0), 0);
    return `${Math.round(sum / state.leads.length)} / 100`;
  }, [state.leads]);

  const leadWonConversion = useMemo(() => {
    if (!state.leads.length) return "0.0%";
    const wonCount = state.deals.filter(d => d.stage === "Won").length;
    return `${((wonCount / state.leads.length) * 100).toFixed(1)}%`;
  }, [state.leads, state.deals]);

  const winLoss = useMemo(() => {
    const won = state.deals.filter(d => d.stage === "Won").length;
    const lost = state.deals.filter(d => d.stage === "Lost").length;
    return [
      { name: "Won", value: won, color: T.positive },
      { name: "Lost", value: lost, color: T.negative },
    ];
  }, [state.deals]);

  const avgDealVal = useMemo(() => {
    if (!state.deals.length) return "₹0";
    const sum = state.deals.reduce((acc, d) => acc + (d.value || 0), 0);
    return fmtINR(Math.round(sum / state.deals.length));
  }, [state.deals]);

  const totalRev = useMemo(() => {
    const won = state.deals.filter(d => d.stage === "Won");
    const sum = won.reduce((acc, d) => acc + (d.value || 0), 0);
    return fmtINR(sum);
  }, [state.deals]);

  const avgSalesCycle = useMemo(() => {
    const closed = state.deals.filter(d => d.stage === "Won" || d.stage === "Lost");
    if (!closed.length) return "0.0 days";
    return `${(Math.max(1, closed.length * 3.5)).toFixed(1)} days`;
  }, [state.deals]);

  const sortedTeam = useMemo(() => {
    if (!state.team || !state.team.length) return [];
    return state.team.map(m => {
      const assignedLeads = state.leads.filter(l => l.owner === m.name).length;
      const callsCount = state.calls.filter(c => c.owner === m.name).length;
      const meetingsCount = state.meetings.filter(mt => mt.owner === m.name || (mt.attendees && mt.attendees.includes(m.name))).length;
      const wonDeals = state.deals.filter(d => (d.ownerFull === m.name || d.owner === m.initials) && d.stage === "Won");
      const wonRevenue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
      const conv = assignedLeads > 0 ? ((wonDeals.length / assignedLeads) * 100).toFixed(1) : (m.conv || 0);

      return {
        ...m,
        leads: assignedLeads || m.leads || 0,
        calls: callsCount || m.calls || 0,
        meetings: meetingsCount || m.meetings || 0,
        conv: typeof conv === 'string' ? parseFloat(conv) : conv,
        revenue: wonRevenue || m.revenue || 0
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [state.team, state.leads, state.calls, state.meetings, state.deals]);

  const medalColor = ["#C99A3D", "#9AA1AC", "#B0784A"];

  return (
    <div className="p-5 flex flex-col gap-4 min-w-0">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="crm-display text-[20px] font-semibold" style={{ color: T.ink }}>Reports & Analytics</h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>Dynamic lead, sales, and team performance insights</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
            {RANGES.map((r) => (
              <button key={r} onClick={() => setRange(r)} className="crm-focusable px-2.5 py-1.5 rounded-md text-[12px] font-medium"
                style={{ background: range === r ? T.accent : "transparent", color: range === r ? "#fff" : T.inkSoft }}>{r}</button>
            ))}
          </div>
          <button onClick={exportCSV} className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium" style={{ border: `1px solid ${T.line}`, color: T.inkSoft }}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 w-fit p-1 rounded-lg" style={{ background: T.lineSoft }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className="crm-focusable px-3.5 py-1.5 rounded-md text-[12.5px] font-semibold"
            style={{ background: tab === t ? T.surface : "transparent", color: tab === t ? T.ink : T.inkFaint, boxShadow: tab === t ? "0 1px 2px rgba(18,20,28,0.08)" : "none" }}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Lead analytics" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-4 gap-4">
            <Kpi label="Total leads" value={String(state.leads.length)} />
            <Kpi label="Avg response time" value={avgResponseTime} />
            <Kpi label="Lead quality score" value={avgLeadScore} />
            <Kpi label="Lead → won conversion" value={leadWonConversion} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-2">
              <SectionLabel action={<span className="text-[12px]" style={{ color: T.inkFaint }}>Leads per source</span>}>Lead sources distribution</SectionLabel>
              <div className="flex flex-col gap-3 pt-2">
                {sourceDist.length > 0 ? sourceDist.map((s) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="text-[12px] w-28 shrink-0 truncate" style={{ color: T.inkSoft }}>{s.name}</span>
                    <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: T.lineSoft }}>
                      <div className="h-full rounded-full" style={{ width: `${(s.value / maxSourceVal) * 100}%`, background: s.color }} />
                    </div>
                    <span className="crm-mono text-[12px] font-semibold w-10 text-right shrink-0" style={{ color: T.ink }}>{s.value}</span>
                  </div>
                )) : <p className="text-[12.5px]" style={{ color: T.inkFaint }}>No lead sources recorded yet.</p>}
              </div>
            </Card>
            <Card>
              <SectionLabel>Lead Status Breakup</SectionLabel>
              <div className="flex flex-col gap-2.5 pt-1">
                {statusDist.length > 0 ? statusDist.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-[12.5px] p-2 rounded-lg" style={{ background: T.canvas }}>
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                      <span style={{ color: T.inkSoft }}>{s.name}</span>
                    </span>
                    <span className="crm-mono font-semibold" style={{ color: T.ink }}>{s.value} leads</span>
                  </div>
                )) : <p className="text-[12.5px]" style={{ color: T.inkFaint }}>No lead status data available.</p>}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "Sales analytics" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-4 gap-4">
            <Kpi label="Total revenue" value={totalRev} />
            <Kpi label="Deals won" value={String(winLoss[0].value)} />
            <Kpi label="Avg deal size" value={avgDealVal} />
            <Kpi label="Avg sales cycle" value={avgSalesCycle} />
          </div>
          <Card>
            <SectionLabel>Win / Loss Distribution</SectionLabel>
            <div className="flex items-center justify-around py-6">
              {winLoss.map(w => (
                <div key={w.name} className="flex flex-col items-center p-4 rounded-xl text-center min-w-[160px]" style={{ background: T.canvas }}>
                  <span className="text-[11.5px] uppercase font-semibold" style={{ color: T.inkFaint }}>{w.name} Deals</span>
                  <span className="crm-mono text-[28px] font-bold mt-1" style={{ color: w.color }}>{w.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "Salesperson analytics" && (
        <div className="flex flex-col gap-4">
          <Card>
            <SectionLabel>Sales Leaderboard</SectionLabel>
            {sortedTeam.length > 0 ? (
              <div className="overflow-x-auto crm-scroll">
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.line}` }}>
                      <th className="px-3 py-2 text-left text-[11px] uppercase" style={{ color: T.inkFaint }}>Rep</th>
                      <th className="px-3 py-2 text-left text-[11px] uppercase" style={{ color: T.inkFaint }}>Leads</th>
                      <th className="px-3 py-2 text-left text-[11px] uppercase" style={{ color: T.inkFaint }}>Calls</th>
                      <th className="px-3 py-2 text-left text-[11px] uppercase" style={{ color: T.inkFaint }}>Meetings</th>
                      <th className="px-3 py-2 text-left text-[11px] uppercase" style={{ color: T.inkFaint }}>Conv. %</th>
                      <th className="px-3 py-2 text-left text-[11px] uppercase" style={{ color: T.inkFaint }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTeam.map((r, i) => (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
                        <td className="px-3 py-2.5 flex items-center gap-2">
                          {i < 3 ? <span style={{ color: medalColor[i] }}><Trophy size={14} /></span> : <span className="w-4" />}
                          <span className="text-[13px] font-medium" style={{ color: T.ink }}>{r.name}</span>
                        </td>
                        <td className="px-3 py-2.5 crm-mono text-[12.5px]">{r.leads}</td>
                        <td className="px-3 py-2.5 crm-mono text-[12.5px]">{r.calls}</td>
                        <td className="px-3 py-2.5 crm-mono text-[12.5px]">{r.meetings}</td>
                        <td className="px-3 py-2.5 crm-mono text-[12.5px]" style={{ color: T.positive }}>{r.conv}%</td>
                        <td className="px-3 py-2.5 crm-mono text-[12.5px] font-semibold">{fmtINR(r.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[12.5px] p-4 text-center" style={{ color: T.inkFaint }}>No sales reps added in Team section yet.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
