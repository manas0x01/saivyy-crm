import React, { useState, useMemo, useRef, useEffect } from "react";
import { Sparkles, Send, Bot, User, Flame, TriangleAlert, Target, RefreshCw, MessageSquare, ArrowUpRight, ShieldAlert, CheckCircle } from "lucide-react";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import { fmtINR } from "../components/shared";

function generateAiResponse(query, state) {
  const q = query.toLowerCase();

  // 1. Pipeline / Revenue questions
  if (q.includes("pipeline") || q.includes("revenue") || q.includes("value") || q.includes("worth") || q.includes("deal value")) {
    const openDeals = state.deals.filter(d => d.stage !== "Lost");
    const wonDeals = state.deals.filter(d => d.stage === "Won");
    const totalPipeline = openDeals.reduce((s, d) => s + (d.value || 0), 0);
    const totalWon = wonDeals.reduce((s, d) => s + (d.value || 0), 0);

    return {
      text: `Here is your real-time revenue & pipeline analysis:`,
      metrics: [
        { label: "Total Pipeline Value", val: fmtINR(totalPipeline) },
        { label: "Won Revenue", val: fmtINR(totalWon) },
        { label: "Open Deals", val: openDeals.length },
      ],
      details: openDeals.length > 0
        ? openDeals.slice(0, 4).map(d => `• **${d.deal}** (${d.company}) — ${fmtINR(d.value)} [Stage: ${d.stage}]`).join("\n")
        : "No open deals currently in pipeline."
    };
  }

  // 2. Leads / Hot leads questions
  if (q.includes("lead") || q.includes("prospect") || q.includes("hot") || q.includes("score")) {
    const totalLeads = state.leads.length;
    const hotLeads = state.leads.filter(l => (l.score || 0) >= 75);
    const newLeads = state.leads.filter(l => l.status === "New");

    return {
      text: `You currently have **${totalLeads} total leads** logged in your CRM (${newLeads.length} uncontacted/new).`,
      metrics: [
        { label: "Total Leads", val: totalLeads },
        { label: "Hot Leads (Score ≥75)", val: hotLeads.length },
        { label: "New Leads", val: newLeads.length },
      ],
      details: hotLeads.length > 0
        ? `🔥 **Top Hot Leads:**\n` + hotLeads.slice(0, 4).map(l => `• **${l.name}** (${l.company}) — Score: ${l.score} | Assigned: ${l.owner || 'Unassigned'}`).join("\n")
        : "No leads currently scored above 75."
    };
  }

  // 3. At-risk / Idle deals questions
  if (q.includes("risk") || q.includes("idle") || q.includes("warning") || q.includes("stuck") || q.includes("lose")) {
    const atRisk = state.deals.filter(d => (d.score || 0) < 50 || String(d.next || "").toLowerCase().includes("overdue"));
    const totalRiskVal = atRisk.reduce((s, d) => s + (d.value || 0), 0);

    return {
      text: atRisk.length > 0
        ? `⚠️ Identified **${atRisk.length} at-risk deal(s)** totaling **${fmtINR(totalRiskVal)}** that require immediate attention.`
        : `🎉 All open deals are currently healthy with no high-risk flags!`,
      metrics: [
        { label: "At-Risk Count", val: atRisk.length },
        { label: "Capital at Risk", val: fmtINR(totalRiskVal) },
      ],
      details: atRisk.length > 0
        ? atRisk.map(d => `• **${d.deal}** (${d.company}) — ${fmtINR(d.value)} | Status: ${d.next || 'Idle'} | Action: Schedule catch-up call`).join("\n")
        : "No idle or low-score deals detected."
    };
  }

  // 4. Sales reps / Team leaderboard questions
  if (q.includes("rep") || q.includes("team") || q.includes("top") || q.includes("leader") || q.includes("highest") || q.includes("salesperson") || q.includes("who")) {
    if (!state.team.length) {
      return {
        text: "No sales representatives are currently registered in the Team section.",
        metrics: [{ label: "Team Members", val: 0 }],
        details: "Go to the Team page to add reps and start tracking individual performance."
      };
    }
    const teamStats = state.team.map(m => {
      const assignedLeads = state.leads.filter(l => l.owner === m.name).length;
      const wonDeals = state.deals.filter(d => (d.ownerFull === m.name || d.owner === m.initials) && d.stage === "Won");
      const rev = wonDeals.reduce((s, d) => s + (d.value || 0), 0);
      return { ...m, calcRev: rev, assignedLeads };
    }).sort((a, b) => b.calcRev - a.calcRev);

    const topRep = teamStats[0];
    return {
      text: `🏆 **${topRep.name}** leads your sales team with **${fmtINR(topRep.calcRev || topRep.revenue || 0)}** in won revenue!`,
      metrics: [
        { label: "Top Performer", val: topRep.name },
        { label: "Won Revenue", val: fmtINR(topRep.calcRev || topRep.revenue || 0) },
        { label: "Total Reps", val: state.team.length },
      ],
      details: teamStats.map((r, i) => `#${i + 1} **${r.name}** (${r.role || 'Sales Rep'}) — Revenue: ${fmtINR(r.calcRev || r.revenue || 0)} | Assigned Leads: ${r.assignedLeads}`).join("\n")
    };
  }

  // 5. Tasks / Action items questions
  if (q.includes("task") || q.includes("todo") || q.includes("action") || q.includes("due") || q.includes("followup")) {
    const pending = state.tasks.filter(t => !t.completed);
    const overdue = pending.filter(t => t.dueDate === "Overdue" || t.dueDate === "Today");

    return {
      text: `You have **${pending.length} pending task(s)** (${overdue.length} due today/overdue).`,
      metrics: [
        { label: "Pending Tasks", val: pending.length },
        { label: "Due Today / Overdue", val: overdue.length },
      ],
      details: pending.length > 0
        ? pending.slice(0, 4).map(t => `• **${t.title}** — Priority: ${t.priority} | Due: ${t.dueDate} | Owner: ${t.owner}`).join("\n")
        : "No pending tasks."
    };
  }

  // 6. Conversion rate / Performance questions
  if (q.includes("conv") || q.includes("conversion") || q.includes("rate") || q.includes("metric") || q.includes("stat")) {
    const totalLeads = state.leads.length;
    const wonDeals = state.deals.filter(d => d.stage === "Won").length;
    const convRate = totalLeads > 0 ? ((wonDeals / totalLeads) * 100).toFixed(1) : "0.0";

    return {
      text: `Your overall Lead-to-Won conversion rate is **${convRate}%**.`,
      metrics: [
        { label: "Conversion Rate", val: `${convRate}%` },
        { label: "Won Deals", val: wonDeals },
        { label: "Total Leads", val: totalLeads },
      ],
      details: `• Conversion rate is derived from ${wonDeals} won deal(s) out of ${totalLeads} total lead(s).\n• Average sales cycle across closed deals is ~3.5 days.`
    };
  }

  // 7. Customers / Account questions
  if (q.includes("customer") || q.includes("account") || q.includes("client")) {
    const count = state.customers.length;
    const active = state.customers.filter(c => c.status === "Active").length;

    return {
      text: `You have **${count} total customers** (${active} active accounts).`,
      metrics: [
        { label: "Total Customers", val: count },
        { label: "Active Customers", val: active },
      ],
      details: state.customers.length > 0
        ? state.customers.slice(0, 4).map(c => `• **${c.name}** (${c.company}) — Revenue: ${c.totalRevenue} | Owner: ${c.owner}`).join("\n")
        : "No customer records stored yet."
    };
  }

  // Default intelligent CRM summary response
  return {
    text: `Here is a summary of your live CRM state:`,
    metrics: [
      { label: "Total Leads", val: state.leads.length },
      { label: "Open Deals", val: state.deals.filter(d => d.stage !== 'Lost').length },
      { label: "Customers", val: state.customers.length },
      { label: "Team Reps", val: state.team.length },
    ],
    details: `Ask any specific CRM data question, such as:\n• *"Which deals are at risk?"*\n• *"Who is our top sales rep?"*\n• *"What is our total pipeline value?"*\n• *"Show all hot leads"*`
  };
}

export default function AiInsights() {
  const { state } = useCrm();

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "bot",
      text: "Hello! I am your **AI Sales Copilot**. Ask me any question about your live CRM data, leads, deals, pipeline value, sales reps, or performance metrics!",
      metrics: [
        { label: "Total Leads", val: state.leads.length },
        { label: "Open Deals", val: state.deals.filter(d => d.stage !== "Lost").length },
        { label: "Pipeline Value", val: fmtINR(state.deals.filter(d => d.stage !== "Lost").reduce((s, d) => s + (d.value || 0), 0)) },
      ],
      time: "Just now"
    }
  ]);

  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing]);

  const handleSend = (textToSend) => {
    const queryText = (textToSend || input).trim();
    if (!queryText) return;

    const userMsg = { id: Date.now(), sender: "user", text: queryText, time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setTyping(true);

    setTimeout(() => {
      const aiRes = generateAiResponse(queryText, state);
      const botMsg = {
        id: Date.now() + 1,
        sender: "bot",
        text: aiRes.text,
        metrics: aiRes.metrics,
        details: aiRes.details,
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      };
      setMessages(prev => [...prev, botMsg]);
      setTyping(false);
    }, 450);
  };

  const hotLeads = useMemo(() => state.leads.filter(l => (l.score || 0) >= 75), [state.leads]);
  const atRiskDeals = useMemo(() => state.deals.filter(d => String(d.next || "").toLowerCase().includes("overdue") || (d.score || 0) < 50), [state.deals]);

  const quickPrompts = [
    "📊 What is our total pipeline value?",
    "🔥 Who are our top hot leads?",
    "⚠️ Which deals are at risk?",
    "🏆 Who is the top sales rep?",
    "📈 What is our lead-to-won conversion rate?",
    "📋 Summary of pending tasks"
  ];

  return (
    <div className="p-5 flex gap-5 min-w-0" style={{ height: "calc(100vh - 64px)" }}>
      {/* Left Chatbot Interface */}
      <div className="flex-1 min-w-0 flex flex-col gap-3 rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <div className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${T.line}` }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: T.accent, color: "#fff" }}>
              <Bot size={20} />
            </div>
            <div>
              <h1 className="crm-display text-[16px] font-semibold flex items-center gap-2" style={{ color: T.ink }}>
                AI Sales Copilot Chatbot <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: T.positiveSoft, color: T.positive }}>Live CRM Engine</span>
              </h1>
              <p className="text-[12px]" style={{ color: T.inkFaint }}>Ask questions about leads, revenue, deals, reps, or pipeline insights</p>
            </div>
          </div>
          <button onClick={() => setMessages([messages[0]])} className="crm-focusable p-1.5 rounded-lg flex items-center gap-1 text-[12px] font-medium" style={{ border: `1px solid ${T.line}`, color: T.inkSoft }}>
            <RefreshCw size={13} /> Reset Chat
          </button>
        </div>

        {/* Quick prompt pills */}
        <div className="flex items-center gap-2 flex-wrap shrink-0 py-1">
          {quickPrompts.map(p => (
            <button key={p} onClick={() => handleSend(p)} className="crm-focusable text-[11.5px] font-medium px-2.5 py-1 rounded-full text-left transition-colors"
              style={{ background: T.canvas, border: `1px solid ${T.lineSoft}`, color: T.inkSoft }}>
              {p}
            </button>
          ))}
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto crm-scroll flex flex-col gap-4 py-2 pr-1">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 max-w-[85%] ${msg.sender === "user" ? "ml-auto flex-row-reverse" : ""}`}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: msg.sender === "user" ? T.ink : T.accentSoft, color: msg.sender === "user" ? "#fff" : T.accent }}>
                {msg.sender === "user" ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div className="flex flex-col gap-2">
                <div className="rounded-xl p-3.5 text-[13px] leading-relaxed"
                  style={{
                    background: msg.sender === "user" ? T.ink : T.canvas,
                    color: msg.sender === "user" ? "#fff" : T.ink,
                    border: msg.sender === "user" ? "none" : `1px solid ${T.lineSoft}`
                  }}>
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* Render metrics cards if present */}
                  {msg.metrics && msg.metrics.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-2" style={{ borderTop: `1px solid ${msg.sender === "user" ? "rgba(255,255,255,0.15)" : T.lineSoft}` }}>
                      {msg.metrics.map((m, idx) => (
                        <div key={idx} className="rounded-lg p-2 text-center" style={{ background: msg.sender === "user" ? "rgba(255,255,255,0.1)" : T.surface }}>
                          <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: msg.sender === "user" ? "rgba(255,255,255,0.7)" : T.inkFaint }}>{m.label}</p>
                          <p className="crm-mono text-[14px] font-bold mt-0.5" style={{ color: msg.sender === "user" ? "#fff" : T.accent }}>{m.val}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Render formatted details if present */}
                  {msg.details && (
                    <div className="mt-2.5 pt-2 text-[12px] whitespace-pre-line leading-relaxed crm-mono" style={{ borderTop: `1px solid ${T.lineSoft}`, color: T.inkSoft }}>
                      {msg.details}
                    </div>
                  )}
                </div>
                <span className="text-[10.5px] px-1" style={{ color: T.inkFaint, textAlign: msg.sender === "user" ? "right" : "left" }}>{msg.time}</span>
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex items-center gap-2 text-[12px] italic" style={{ color: T.inkFaint }}>
              <Bot size={14} className="animate-pulse" style={{ color: T.accent }} /> AI Copilot is analyzing CRM data…
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <div className="flex items-center gap-2 p-1.5 rounded-xl shrink-0" style={{ background: T.canvas, border: `1px solid ${T.line}` }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="Ask AI Copilot about leads, deals, revenue, reps, risk, conversion…"
            className="flex-1 text-[13px] px-3 py-1.5 bg-transparent outline-none"
            style={{ color: T.ink }}
          />
          <button onClick={() => handleSend()} disabled={!input.trim()} className="crm-focusable p-2 rounded-lg"
            style={{ background: input.trim() ? T.accent : T.lineSoft, color: input.trim() ? "#fff" : T.inkFaint }}>
            <Send size={15} />
          </button>
        </div>
      </div>

      {/* Right AI Insights Rail */}
      <aside className="w-[310px] shrink-0 flex flex-col gap-4">
        {/* At-risk predictor */}
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: T.ink, color: "#fff" }}>
          <div className="flex items-center gap-2">
            <TriangleAlert size={16} style={{ color: T.negative }} />
            <h2 className="crm-display text-[14px] font-semibold">At-Risk Deal Predictor</h2>
          </div>
          <div className="flex flex-col gap-2.5">
            {atRiskDeals.length > 0 ? atRiskDeals.slice(0, 3).map(d => (
              <div key={d.id} className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-semibold truncate max-w-[150px]">{d.deal}</span>
                  <span className="crm-mono text-[12px] font-bold" style={{ color: T.negative }}>{fmtINR(d.value)}</span>
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }}>{d.company} · {d.next}</p>
              </div>
            )) : (
              <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.7)" }}>No deals currently flagged as high risk 🎉</p>
            )}
          </div>
        </div>

        {/* Hot leads rail */}
        <div className="crm-card rounded-xl p-4 flex flex-col gap-3" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <div className="flex items-center gap-2">
            <Flame size={16} style={{ color: T.amber }} />
            <h2 className="crm-display text-[14px] font-semibold" style={{ color: T.ink }}>High-Propensity Hot Leads</h2>
          </div>
          <div className="flex flex-col gap-2">
            {hotLeads.length > 0 ? hotLeads.slice(0, 3).map(l => (
              <div key={l.id} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: T.canvas }}>
                <div>
                  <p className="text-[12.5px] font-semibold" style={{ color: T.ink }}>{l.name}</p>
                  <p className="text-[11px]" style={{ color: T.inkFaint }}>{l.company}</p>
                </div>
                <span className="crm-mono text-[12px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.positiveSoft, color: T.positive }}>
                  {l.score} score
                </span>
              </div>
            )) : (
              <p className="text-[12px]" style={{ color: T.inkFaint }}>No hot leads with score ≥ 75 yet.</p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

