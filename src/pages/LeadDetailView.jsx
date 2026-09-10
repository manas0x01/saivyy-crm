import React, { useState, useMemo } from "react";
import {
  ArrowLeft, Mail, Phone, PhoneCall, CalendarPlus, StickyNote, Building, MapPin, Globe,
  Sparkles, ShieldAlert, TrendingUp, Check, X, Clock, Users, Crown, Briefcase, CheckSquare,
  Square, Calendar, Video, ExternalLink, Send, Plus, Award, AlertCircle, FileText
} from "lucide-react";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import { useAuth } from "../store/AuthContext";
import { useToast } from "../components/ToastContext";
import { Avatar, StatusBadge, PriorityDot, ScoreChip, fmtINR } from "../components/shared";
import Modal, { FormField, Input, Select, Textarea, SubmitBtn } from "../components/Modal";

const TABS = ["Overview", "Business Details", "Activity", "Calls", "Meetings", "Emails", "Tasks", "Notes", "Deals", "AI Insights"];

export default function LeadDetailView({ lead, onBack }) {
  const [tab, setTab] = useState("Overview");
  const { state, dispatch } = useCrm();
  const { user } = useAuth();
  const toast = useToast();

  // Modals
  const [showConvert, setShowConvert] = useState(false);
  const [showLogCall, setShowLogCall] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  const [showSendEmail, setShowSendEmail] = useState(false);

  // Forms
  const [convertForm, setConvertForm] = useState({
    dealName: `${lead.company || lead.name} - Enterprise Deal`,
    dealValue: lead.dealValueNum || (parseInt(String(lead.dealValue).replace(/[^0-9]/g, "")) || 500000),
    stage: "Won",
    customerName: lead.name,
    companyName: lead.company || lead.name,
  });

  const [callForm, setCallForm] = useState({
    duration: "5 min",
    outcome: "Interested",
    notes: "",
  });

  const [meetingForm, setMeetingForm] = useState({
    title: `Product Demo with ${lead.name}`,
    date: new Date().toISOString().slice(0, 10),
    time: "11:00 AM",
    duration: "45 min",
    type: "Demo",
    joinUrl: "",
  });

  const [taskForm, setTaskForm] = useState({
    title: `Follow up with ${lead.name}`,
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    priority: "High",
  });

  const [dealForm, setDealForm] = useState({
    deal: `${lead.company} - Expansion`,
    value: "750000",
    stage: "Qualified",
    priority: "High",
    close: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
  });

  const [emailForm, setEmailForm] = useState({
    subject: `Saivyy Partnership for ${lead.company}`,
    body: `Hi ${lead.name},\n\nGreat speaking with you regarding ${lead.company}. I would love to share our enterprise capabilities and schedule a quick walkthrough.\n\nBest regards,\n${user?.name || "Saivyy Team"}`,
  });

  // Dynamic Timeline aggregated from all lead touchpoints
  const leadTimeline = useMemo(() => {
    const list = [];

    // Calls for this lead
    (state.calls || [])
      .filter(c => c.contact === lead.name || (c.company && c.company === lead.company))
      .forEach(c => {
        list.push({
          id: `c-${c.id}`,
          time: `${c.date} ${c.time || ""}`,
          text: `Call Logged (${c.outcome}, ${c.duration}): ${c.notes || "No notes"}`,
          tag: "Call",
          color: T.accent,
        });
      });

    // Meetings for this lead
    (state.meetings || [])
      .filter(m => m.contact === lead.name || (m.company && m.company === lead.company))
      .forEach(m => {
        list.push({
          id: `m-${m.id}`,
          time: `${m.date} ${m.time || ""}`,
          text: `Meeting Scheduled: ${m.title} (${m.type}) - Outcome: ${m.outcome || "Pending"}`,
          tag: "Meeting",
          color: T.amber,
        });
      });

    // Activities for this lead
    (state.activities || [])
      .filter(a => a.contact === lead.name || (a.company && a.company === lead.company))
      .forEach(a => {
        list.push({
          id: `a-${a.id}`,
          time: `${a.date} ${a.time || ""}`,
          text: a.description,
          tag: a.type || "Activity",
          color: T.positive,
        });
      });

    // Lead Creation Event
    list.push({
      id: `lead-create-${lead.id}`,
      time: lead.created || "Initial Entry",
      text: `Lead created from source: ${lead.source || "Website"} (Assigned to ${lead.owner || "Sales Rep"})`,
      tag: "Created",
      color: T.violet,
    });

    return list;
  }, [state.calls, state.meetings, state.activities, lead]);

  // Lead-associated records
  const leadCalls = useMemo(() => {
    return (state.calls || []).filter(c => c.contact === lead.name || (c.company && c.company === lead.company));
  }, [state.calls, lead]);

  const leadMeetings = useMemo(() => {
    return (state.meetings || []).filter(m => m.contact === lead.name || (m.company && m.company === lead.company));
  }, [state.meetings, lead]);

  const leadTasks = useMemo(() => {
    return (state.tasks || []).filter(t => t.linkedLead === lead.name || (t.title && t.title.includes(lead.name)));
  }, [state.tasks, lead]);

  const leadDeals = useMemo(() => {
    return (state.deals || []).filter(d => d.company === lead.company || (d.deal && d.deal.includes(lead.name)));
  }, [state.deals, lead]);

  // Handle Lead Conversion
  const handleConvertLead = () => {
    const valNum = Number(convertForm.dealValue) || 0;
    const nowStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const nowTime = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    const newDeal = {
      id: `D-${Date.now()}`,
      deal: convertForm.dealName,
      company: convertForm.companyName,
      value: valNum,
      stage: convertForm.stage,
      priority: "High",
      owner: lead.ownerInitials || "SR",
      ownerFull: lead.owner || user?.name || "Sales Rep",
      score: 95,
      probability: 100,
      close: nowStr,
      last: "Converted just now",
      next: "Customer Onboarding",
    };

    const newCustomer = {
      id: `C-${Date.now()}`,
      name: convertForm.customerName,
      initials: lead.initials || "CU",
      company: convertForm.companyName,
      title: lead.title || "Key Stakeholder",
      email: lead.email || "",
      phone: lead.phone || "",
      status: "Active",
      owner: lead.owner || user?.name || "Sales Rep",
      totalRevenue: fmtINR(valNum),
      lastContact: nowStr,
      joinDate: nowStr,
      industry: lead.industry || "Enterprise",
      location: lead.location || "",
    };

    const newCompany = {
      id: `CO-${Date.now()}`,
      name: convertForm.companyName,
      industry: lead.industry || "General Enterprise",
      location: lead.location || "",
      contacts: 1,
      deals: 1,
      revenue: fmtINR(valNum),
      website: lead.website || "",
      status: "Customer",
    };

    const newActivity = {
      id: `ACT-${Date.now()}`,
      type: "Status Change",
      contact: lead.name,
      company: lead.company,
      description: `🎉 Lead converted to Won Account! Created Deal: ${newDeal.deal} (${fmtINR(valNum)}) and Customer Account.`,
      date: nowStr,
      time: nowTime,
      owner: user?.name || lead.owner || "Sales Rep",
    };

    dispatch({
      type: "CONVERT_LEAD",
      payload: {
        leadId: lead.id,
        deal: newDeal,
        customer: newCustomer,
        company: newCompany,
        activity: newActivity,
      },
    });

    setShowConvert(false);
    toast.success(`Successfully converted ${lead.name} into Won Deal & Active Customer Account!`, "Lead Converted");
  };

  // Quick Action Handlers
  const handleLogCallSubmit = () => {
    const nowStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const nowTime = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    dispatch({
      type: "ADD_CALL",
      payload: {
        id: `CL-${Date.now()}`,
        contact: lead.name,
        company: lead.company || "Prospect Company",
        date: nowStr,
        time: nowTime,
        duration: callForm.duration,
        outcome: callForm.outcome,
        notes: callForm.notes || "Call logged from lead record",
        owner: user?.name || lead.owner || "Sales Rep",
      },
    });

    dispatch({
      type: "UPDATE_LEAD",
      payload: {
        id: lead.id,
        status: lead.status === "New" ? "Contacted" : lead.status,
        lastContact: new Date().toISOString(),
      },
    });

    setShowLogCall(false);
    setCallForm({ duration: "5 min", outcome: "Interested", notes: "" });
    toast.success(`Logged ${callForm.outcome} call with ${lead.name}`, "Call Recorded");
  };

  const handleScheduleMeetingSubmit = () => {
    if (!meetingForm.title) return toast.error("Meeting title is required", "Validation");

    dispatch({
      type: "ADD_MEETING",
      payload: {
        id: `M-${Date.now()}`,
        title: meetingForm.title,
        contact: lead.name,
        company: lead.company || "Prospect",
        date: meetingForm.date,
        time: meetingForm.time,
        duration: meetingForm.duration,
        type: meetingForm.type,
        outcome: "Scheduled",
        joinUrl: meetingForm.joinUrl || "",
        owner: user?.name || lead.owner || "Sales Rep",
        attendees: [user?.name || "Sales Rep", lead.name],
      },
    });

    dispatch({
      type: "UPDATE_LEAD",
      payload: {
        id: lead.id,
        status: "Meeting Scheduled",
        nextFollowup: `${meetingForm.date} at ${meetingForm.time}`,
      },
    });

    setShowSchedule(false);
    toast.success(`Scheduled ${meetingForm.type} with ${lead.name} for ${meetingForm.date}`, "Meeting Scheduled");
  };

  const handleAddTaskSubmit = () => {
    if (!taskForm.title) return toast.error("Task title is required", "Validation");

    dispatch({
      type: "ADD_TASK",
      payload: {
        id: `T-${Date.now()}`,
        title: taskForm.title,
        linkedLead: lead.name,
        dueDate: taskForm.dueDate,
        priority: taskForm.priority,
        owner: user?.name || lead.owner || "Sales Rep",
        completed: false,
        created: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      },
    });

    setShowAddTask(false);
    toast.success(`Task created and linked to ${lead.name}`, "Task Added");
  };

  const handleCreateDealSubmit = () => {
    if (!dealForm.deal) return toast.error("Deal name is required", "Validation");
    const numVal = parseInt(String(dealForm.value).replace(/[^0-9]/g, "")) || 0;

    dispatch({
      type: "ADD_DEAL",
      payload: {
        id: `D-${Date.now()}`,
        deal: dealForm.deal,
        company: lead.company,
        value: numVal,
        stage: dealForm.stage,
        priority: dealForm.priority,
        owner: lead.ownerInitials || "SR",
        ownerFull: user?.name || lead.owner || "Sales Rep",
        score: 70,
        probability: 60,
        close: dealForm.close,
        last: "Just created",
        next: "Send Proposal",
      },
    });

    setShowCreateDeal(false);
    toast.success(`Created deal "${dealForm.deal}" worth ${fmtINR(numVal)}!`, "Deal Created");
  };

  const handleSendEmail = () => {
    if (lead.email) {
      window.open(`mailto:${lead.email}?subject=${encodeURIComponent(emailForm.subject)}&body=${encodeURIComponent(emailForm.body)}`, "_blank");
    }

    const nowStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const nowTime = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    dispatch({
      type: "ADD_ACTIVITY",
      payload: {
        id: `ACT-${Date.now()}`,
        type: "Email",
        contact: lead.name,
        company: lead.company,
        description: `Sent email: "${emailForm.subject}"`,
        date: nowStr,
        time: nowTime,
        owner: user?.name || "Sales Rep",
      },
    });

    setShowSendEmail(false);
    toast.success(`Email drafted & logged to activity stream for ${lead.name}`, "Email Prepared");
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-4 p-5 animate-fadeIn">
      {/* Back navigation */}
      <button onClick={onBack} className="crm-focusable flex items-center gap-1.5 text-[12.5px] font-medium w-fit transition-colors hover:text-indigo-600" style={{ color: T.inkSoft }}>
        <ArrowLeft size={14} /> Back to leads list
      </button>

      {/* Header card */}
      <div className="rounded-xl p-5 flex items-start justify-between flex-wrap gap-4 shadow-sm" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center crm-mono text-[16px] font-bold shrink-0 shadow-sm" style={{ background: T.accentSoft, color: T.accent }}>
            {lead.initials || "LD"}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="crm-display text-[20px] font-bold" style={{ color: T.ink }}>{lead.name}</h1>
              <StatusBadge status={lead.status} />
              <PriorityDot priority={lead.priority} />
              {lead.status === "Won" && (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.positiveSoft, color: T.positive }}>
                  <Award size={12} /> WON CUSTOMER
                </span>
              )}
            </div>
            <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>
              {lead.title ? `${lead.title} at ` : ""}<strong style={{ color: T.inkSoft }}>{lead.company}</strong> · ID: {lead.id}
            </p>
            <div className="flex items-center gap-4 mt-2 text-[12.5px] flex-wrap" style={{ color: T.inkSoft }}>
              <span className="flex items-center gap-1"><ScoreChip score={lead.score} /> lead score</span>
              <span className="crm-mono font-bold" style={{ color: T.positive }}>{lead.dealValue || "₹0"}</span>
              <div className="flex items-center gap-1.5">
                <span>Owner:</span>
                <select
                  value={lead.owner || "Unassigned"}
                  onChange={(e) => {
                    const newOwner = e.target.value;
                    const targetMember = (state.team || []).find(m => m.name === newOwner);
                    const targetUserId = targetMember?.accountUserId || targetMember?.userId || (newOwner === user?.name ? user?.id : null);
                    const ownerInitials = newOwner === "Unassigned" ? "UA" : newOwner.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
                    dispatch({
                      type: "UPDATE_LEAD",
                      payload: {
                        id: lead.id,
                        owner: newOwner,
                        ownerInitials,
                        ...(targetUserId ? { userId: targetUserId } : {})
                      }
                    });
                    toast.success(`Re-assigned lead to ${newOwner}`, "Assignee Updated");
                  }}
                  className="crm-focusable text-[12px] font-semibold rounded px-1.5 py-0.5 border cursor-pointer"
                  style={{ background: T.canvas, borderColor: T.line, color: T.ink }}
                >
                  <option value="Unassigned">Unassigned</option>
                  {(state.team || []).map(m => (
                    <option key={m.id || m.name} value={m.name}>{m.name}</option>
                  ))}
                  {user?.name && !(state.team || []).some(m => m.name === user.name) && (
                    <option value={user.name}>{user.name}</option>
                  )}
                </select>
              </div>
              <span>Source: <strong>{lead.source || "Website"}</strong></span>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {lead.status !== "Won" && (
            <button
              onClick={() => setShowConvert(true)}
              className="crm-focusable flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12.5px] font-bold shadow-md hover:shadow-lg active:scale-95 transition-all text-white"
              style={{ background: "linear-gradient(135deg, #BC5A1B 0%, #D97706 100%)" }}
            >
              <Crown size={14} className="text-amber-200" /> Convert Lead
            </button>
          )}

          <button
            onClick={() => {
              if (lead.phone) window.open(`tel:${lead.phone.replace(/\s+/g, "")}`);
              setShowLogCall(true);
            }}
            className="crm-focusable flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-semibold transition-all hover:bg-gray-50 border"
            style={{ borderColor: T.line, color: T.ink }}
            title="Log phone call"
          >
            <PhoneCall size={14} style={{ color: T.accent }} /> Call
          </button>

          <button
            onClick={() => setShowSendEmail(true)}
            className="crm-focusable flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-semibold transition-all hover:bg-gray-50 border"
            style={{ borderColor: T.line, color: T.ink }}
            title="Send or log email"
          >
            <Mail size={14} style={{ color: T.positive }} /> Email
          </button>

          <button
            onClick={() => setShowSchedule(true)}
            className="crm-focusable flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-semibold transition-all hover:bg-gray-50 border"
            style={{ borderColor: T.line, color: T.ink }}
            title="Schedule calendar meeting"
          >
            <CalendarPlus size={14} style={{ color: T.amber }} /> Schedule
          </button>

          <button
            onClick={() => setTab("Notes")}
            className="crm-focusable flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-semibold transition-all hover:bg-gray-50 border"
            style={{ borderColor: T.line, color: T.ink }}
            title="Add note"
          >
            <StickyNote size={14} style={{ color: T.violet }} /> Note
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1 overflow-x-auto crm-scroll pb-1" style={{ borderBottom: `1px solid ${T.line}` }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="crm-focusable px-3 py-2 text-[13px] font-medium relative whitespace-nowrap transition-colors"
            style={{ color: tab === t ? T.accent : T.inkFaint }}
          >
            {t}
            {tab === t && <span className="absolute left-0 right-0 -bottom-px h-[2px] rounded-full" style={{ background: T.accent }} />}
          </button>
        ))}
      </div>

      {/* Main Tab Content + AI Insights Panel */}
      <div className="flex flex-col lg:flex-row gap-5">
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* TAB 1: OVERVIEW */}
          {tab === "Overview" && (
            <>
              {/* Business Summary Box */}
              <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building size={15} style={{ color: T.accent }} />
                    <h3 className="crm-display text-[13.5px] font-semibold" style={{ color: T.ink }}>Business Overview</h3>
                  </div>
                  <button onClick={() => setTab("Business Details")} className="text-[12px] font-semibold hover:underline flex items-center gap-1" style={{ color: T.accent }}>
                    Edit Profile Details →
                  </button>
                </div>
                <p className="text-[12.5px] leading-relaxed" style={{ color: lead.businessDescription ? T.ink : T.inkFaint }}>
                  {lead.businessDescription || "No company overview provided yet. Click 'Edit Profile Details' to log key target markets, products, and operational parameters."}
                </p>
                {(lead.companySize || lead.annualRevenue || lead.businessModel) && (
                  <div className="flex items-center gap-2 mt-1 pt-2 flex-wrap text-[11.5px]" style={{ borderTop: `1px dashed ${T.line}` }}>
                    {lead.businessModel && <span className="px-2 py-0.5 rounded font-semibold" style={{ background: T.accentSoft, color: T.accent }}>{lead.businessModel}</span>}
                    {lead.companySize && <span className="px-2 py-0.5 rounded font-medium" style={{ background: T.lineSoft, color: T.inkSoft }}>{lead.companySize}</span>}
                    {lead.annualRevenue && <span className="px-2 py-0.5 rounded crm-mono font-medium" style={{ background: T.positiveSoft, color: T.positive }}>{lead.annualRevenue}</span>}
                  </div>
                )}
              </div>

              {/* Contact Info & Deal Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                  <h3 className="crm-display text-[13px] font-semibold mb-3">Contact Information</h3>
                  <div className="flex flex-col gap-2.5 text-[13px]">
                    <span className="flex items-center gap-2" style={{ color: T.inkSoft }}>
                      <Mail size={14} style={{ color: T.inkFaint }} /> {lead.email || "No email"}
                    </span>
                    <span className="flex items-center gap-2 crm-mono" style={{ color: T.inkSoft }}>
                      <Phone size={14} style={{ color: T.inkFaint }} /> {lead.phone || "No phone"}
                    </span>
                    <span className="flex items-center gap-2" style={{ color: T.inkSoft }}>
                      <Building size={14} style={{ color: T.inkFaint }} /> {lead.industry || "General Industry"}
                    </span>
                    <span className="flex items-center gap-2" style={{ color: T.inkSoft }}>
                      <MapPin size={14} style={{ color: T.inkFaint }} /> {lead.location || "India"}
                    </span>
                    {lead.website && (
                      <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-indigo-600 hover:underline">
                        <Globe size={14} /> {lead.website} <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>

                <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                  <h3 className="crm-display text-[13px] font-semibold mb-3">Pipeline Snapshot</h3>
                  <div className="flex flex-col gap-2.5 text-[13px]">
                    <span className="flex justify-between"><span style={{ color: T.inkFaint }}>Estimated Value</span><span className="crm-mono font-bold" style={{ color: T.positive }}>{lead.dealValue || "₹0"}</span></span>
                    <span className="flex justify-between"><span style={{ color: T.inkFaint }}>Probability</span><span className="crm-mono font-semibold">{lead.probability ?? 100}%</span></span>
                    <span className="flex justify-between"><span style={{ color: T.inkFaint }}>Lead Status</span><StatusBadge status={lead.status} /></span>
                    <span className="flex justify-between"><span style={{ color: T.inkFaint }}>Assigned Rep</span><span>{lead.owner || "Unassigned"}</span></span>
                    <span className="flex justify-between"><span style={{ color: T.inkFaint }}>Next Follow-up</span><span style={{ color: lead.nextFollowup === "Overdue" ? T.negative : T.ink, fontWeight: 600 }}>{lead.nextFollowup || "Not scheduled"}</span></span>
                  </div>
                </div>
              </div>

              {/* Dynamic Timeline */}
              <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="crm-display text-[13px] font-semibold">Lead Activity Timeline</h3>
                  <span className="text-[11px] text-gray-400">{leadTimeline.length} events recorded</span>
                </div>
                <div className="flex flex-col">
                  {leadTimeline.map((t, i) => (
                    <div key={t.id || i} className="flex gap-3 pb-4 relative">
                      {i !== leadTimeline.length - 1 && <span className="absolute left-[5px] top-3 bottom-0 w-px" style={{ background: T.line }} />}
                      <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: t.color || T.accent }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: T.inkFaint }}>{t.tag} · {t.time}</span>
                        <p className="text-[12.5px] mt-0.5 leading-snug" style={{ color: T.ink }}>{t.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: BUSINESS DETAILS */}
          {tab === "Business Details" && (
            <BusinessDetailsTab lead={lead} />
          )}

          {/* TAB 3: ACTIVITY */}
          {tab === "Activity" && (
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
              <div className="flex items-center justify-between">
                <h3 className="crm-display text-[14px] font-semibold" style={{ color: T.ink }}>Audit Trail & Interaction Feed</h3>
                <button onClick={() => setShowLogCall(true)} className="crm-focusable text-[12px] font-semibold px-2.5 py-1 rounded-lg text-white" style={{ background: T.accent }}>
                  + Quick Log
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {leadTimeline.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg flex items-start gap-3 text-[12.5px]" style={{ background: T.canvas, border: `1px solid ${T.lineSoft}` }}>
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: item.color || T.accent }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold" style={{ color: T.ink }}>{item.tag}</span>
                        <span className="text-[11px] crm-mono text-gray-400">{item.time}</span>
                      </div>
                      <p className="mt-0.5 leading-snug text-gray-700">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CALLS */}
          {tab === "Calls" && (
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
              <div className="flex items-center justify-between">
                <h3 className="crm-display text-[14px] font-semibold" style={{ color: T.ink }}>Call Records ({leadCalls.length})</h3>
                <button onClick={() => setShowLogCall(true)} className="crm-focusable text-[12px] font-semibold px-3 py-1.5 rounded-lg text-white flex items-center gap-1" style={{ background: T.accent }}>
                  <Plus size={13} /> Log New Call
                </button>
              </div>
              {leadCalls.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center gap-2">
                  <PhoneCall size={28} style={{ color: T.lineSoft }} />
                  <p className="text-[13px]" style={{ color: T.inkFaint }}>No call logs yet. Click "+ Log New Call" or use dialer.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {leadCalls.map((c) => (
                    <div key={c.id} className="p-3 rounded-xl flex flex-col gap-1.5" style={{ background: T.canvas, border: `1px solid ${T.line}` }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-bold flex items-center gap-1.5" style={{ color: T.ink }}>
                          <PhoneCall size={14} style={{ color: T.accent }} /> {c.outcome} ({c.duration})
                        </span>
                        <span className="text-[11.5px] crm-mono text-gray-500">{c.date} · {c.time}</span>
                      </div>
                      <p className="text-[12.5px] text-gray-700">{c.notes || "Call completed."}</p>
                      <span className="text-[11px] text-gray-400">Rep: {c.owner}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: MEETINGS */}
          {tab === "Meetings" && (
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
              <div className="flex items-center justify-between">
                <h3 className="crm-display text-[14px] font-semibold" style={{ color: T.ink }}>Meetings & Demos ({leadMeetings.length})</h3>
                <button onClick={() => setShowSchedule(true)} className="crm-focusable text-[12px] font-semibold px-3 py-1.5 rounded-lg text-white flex items-center gap-1" style={{ background: T.accent }}>
                  <Plus size={13} /> Schedule Meeting
                </button>
              </div>
              {leadMeetings.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center gap-2">
                  <CalendarPlus size={28} style={{ color: T.lineSoft }} />
                  <p className="text-[13px]" style={{ color: T.inkFaint }}>No meetings booked yet for this lead.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {leadMeetings.map((m) => (
                    <div key={m.id} className="p-3.5 rounded-xl flex flex-col gap-2" style={{ background: T.canvas, border: `1px solid ${T.line}` }}>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: T.accentSoft, color: T.accent }}>{m.type}</span>
                          <h4 className="font-semibold text-[13.5px] mt-1" style={{ color: T.ink }}>{m.title}</h4>
                        </div>
                        <StatusBadge status={m.outcome === "Scheduled" ? "Interested" : m.outcome} />
                      </div>
                      <div className="text-[12px] crm-mono text-gray-500 flex items-center gap-3">
                        <span>📅 {m.date}</span>
                        <span>⏰ {m.time} ({m.duration})</span>
                      </div>
                      {m.joinUrl && (
                        <a href={m.joinUrl} target="_blank" rel="noreferrer" className="text-[12px] font-semibold text-indigo-600 flex items-center gap-1 mt-1 hover:underline">
                          <Video size={13} /> Join Link <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: EMAILS */}
          {tab === "Emails" && (
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
              <div className="flex items-center justify-between">
                <h3 className="crm-display text-[14px] font-semibold" style={{ color: T.ink }}>Email Correspondence</h3>
                <button onClick={() => setShowSendEmail(true)} className="crm-focusable text-[12px] font-semibold px-3 py-1.5 rounded-lg text-white flex items-center gap-1" style={{ background: T.positive }}>
                  <Send size={13} /> Compose Email
                </button>
              </div>
              <div className="p-4 rounded-xl flex flex-col gap-2" style={{ background: T.canvas, border: `1px solid ${T.line}` }}>
                <p className="text-[12.5px] font-semibold" style={{ color: T.ink }}>Primary Email: {lead.email || "No email on file"}</p>
                <p className="text-[12px] text-gray-600">
                  You can send direct sequence emails or launch integrated Outreach campaigns from the Campaigns tab.
                </p>
                {lead.email && (
                  <button
                    onClick={() => setShowSendEmail(true)}
                    className="crm-focusable text-[12px] font-semibold text-indigo-600 hover:underline flex items-center gap-1 w-fit"
                  >
                    Open Email Composer & Log Touchpoint →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: TASKS */}
          {tab === "Tasks" && (
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
              <div className="flex items-center justify-between">
                <h3 className="crm-display text-[14px] font-semibold" style={{ color: T.ink }}>Linked Tasks ({leadTasks.length})</h3>
                <button onClick={() => setShowAddTask(true)} className="crm-focusable text-[12px] font-semibold px-3 py-1.5 rounded-lg text-white flex items-center gap-1" style={{ background: T.accent }}>
                  <Plus size={13} /> Add Task
                </button>
              </div>
              {leadTasks.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center gap-2">
                  <CheckSquare size={28} style={{ color: T.lineSoft }} />
                  <p className="text-[13px]" style={{ color: T.inkFaint }}>No pending tasks linked to this lead.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {leadTasks.map((t) => (
                    <div key={t.id} className="p-3 rounded-xl flex items-center gap-3" style={{ background: T.canvas, border: `1px solid ${T.line}` }}>
                      <button onClick={() => dispatch({ type: "TOGGLE_TASK", payload: t.id })} style={{ color: t.completed ? T.positive : T.inkFaint }}>
                        {t.completed ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold" style={{ color: t.completed ? T.inkFaint : T.ink, textDecoration: t.completed ? "line-through" : "none" }}>{t.title}</p>
                        <span className="text-[11px] crm-mono text-gray-500">Due: {t.dueDate} · Priority: {t.priority}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: NOTES */}
          {tab === "Notes" && (
            <NoteTab lead={lead} />
          )}

          {/* TAB 9: DEALS */}
          {tab === "Deals" && (
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
              <div className="flex items-center justify-between">
                <h3 className="crm-display text-[14px] font-semibold" style={{ color: T.ink }}>Opportunities & Deals ({leadDeals.length})</h3>
                <button onClick={() => setShowCreateDeal(true)} className="crm-focusable text-[12px] font-semibold px-3 py-1.5 rounded-lg text-white flex items-center gap-1" style={{ background: T.accent }}>
                  <Plus size={13} /> Create Deal
                </button>
              </div>
              {leadDeals.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center gap-2">
                  <Briefcase size={28} style={{ color: T.lineSoft }} />
                  <p className="text-[13px]" style={{ color: T.inkFaint }}>No active deals recorded for {lead.company || lead.name}.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {leadDeals.map((d) => (
                    <div key={d.id} className="p-3.5 rounded-xl flex flex-col gap-2" style={{ background: T.canvas, border: `1px solid ${T.line}` }}>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-[13.5px]" style={{ color: T.ink }}>{d.deal}</h4>
                          <span className="text-[11.5px] text-gray-500">{d.company}</span>
                        </div>
                        <StatusBadge status={d.stage} />
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[13px]">
                        <span className="font-bold crm-mono" style={{ color: T.positive }}>{fmtINR(d.value || 0)}</span>
                        <span className="text-[11.5px] crm-mono text-gray-500">Closes: {d.close || "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 10: AI INSIGHTS */}
          {tab === "AI Insights" && (
            <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
              <div className="flex items-center gap-2">
                <Sparkles size={18} style={{ color: T.accent }} />
                <h3 className="crm-display text-[15px] font-bold" style={{ color: T.ink }}>AI Lead Scoring & Deal Velocity Analysis</h3>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl text-center" style={{ background: T.canvas }}>
                  <p className="text-[11px] uppercase font-bold text-gray-400">Account Fit</p>
                  <p className="text-[20px] font-bold text-indigo-600 mt-1">
                    {(lead.score || 50) >= 70 ? "Tier-1 High" : (lead.score || 50) >= 40 ? "Tier-2 Mid" : "Tier-3 Low"}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl text-center" style={{ background: T.canvas }}>
                  <p className="text-[11px] uppercase font-bold text-gray-400">Buying Intent</p>
                  <p className="text-[20px] font-bold text-emerald-600 mt-1">
                    {lead.status === "Negotiation" || lead.status === "Proposal Sent" ? "88% High" : lead.status === "Contacted" ? "52% Medium" : "25% Early"}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl text-center" style={{ background: T.canvas }}>
                  <p className="text-[11px] uppercase font-bold text-gray-400">Velocity</p>
                  <p className="text-[20px] font-bold text-amber-600 mt-1">
                    {lead.nextFollowup === "Overdue" ? "Stalled ⚠️" : "Healthy ⚡"}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl flex flex-col gap-2" style={{ background: T.accentSoft + "40", border: `1px solid ${T.accent}30` }}>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Recommended Next Best Action</span>
                <p className="text-[13px] leading-relaxed text-indigo-950 font-medium">
                  {lead.status === "New"
                    ? "Prospect has not been engaged yet. Call immediately within the first 15 minutes to multiply response rates by 4x."
                    : lead.status === "Contacted"
                    ? "Prospect is engaged. Schedule an executive demo to introduce product capabilities and qualify budget."
                    : lead.status === "Negotiation"
                    ? "In final contract stage. Offer annual upfront discount or executive sponsor call to close before month-end."
                    : "Regular touchpoint maintained. Continue nurture cadences."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* AI Sidebar */}
        <aside className="w-full lg:w-[280px] shrink-0 flex flex-col gap-4">
          <div className="rounded-xl p-4 shadow-md" style={{ background: T.ink, color: "#fff" }}>
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles size={14} className="text-indigo-300" />
              <span className="crm-display text-[13px] font-semibold">AI Intelligence</span>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <span className="text-[10.5px] font-semibold uppercase tracking-wide text-indigo-200">Recommended Action</span>
                <p className="text-[12.5px] leading-snug mt-1 text-white/90">
                  {lead.status === "New" ? "Initiate direct phone touchpoint." : "Prepare custom proposal deck."}
                </p>
              </div>
              <div>
                <span className="text-[10.5px] font-semibold uppercase tracking-wide text-indigo-200">Win Probability</span>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-2 rounded-full overflow-hidden bg-white/20">
                    <div className="h-full rounded-full" style={{ width: `${lead.probability || 50}%`, background: "#818CF8" }} />
                  </div>
                  <span className="crm-mono text-[12px] font-bold">{lead.probability || 50}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
            <div className="flex items-center gap-1.5 mb-2">
              <ShieldAlert size={14} style={{ color: lead.nextFollowup === "Overdue" ? T.negative : T.positive }} />
              <span className="crm-display text-[13px] font-semibold">Deal Risk Level</span>
            </div>
            <p className="text-[12.5px]" style={{ color: T.inkSoft }}>
              {lead.nextFollowup === "Overdue" ? "⚠️ Overdue follow-up alert! Deal at risk of stalling." : "No risk signals. Account healthy."}
            </p>
          </div>
        </aside>
      </div>

      {/* CONVERT LEAD MODAL */}
      <Modal open={showConvert} onClose={() => setShowConvert(false)} title={`Convert Lead — ${lead.name}`}>
        <div className="flex flex-col gap-4">
          <div className="p-3.5 rounded-xl text-[12.5px] flex items-start gap-2.5" style={{ background: T.positiveSoft, color: T.positive }}>
            <Crown size={18} className="shrink-0 mt-0.5 text-amber-500" />
            <div>
              <p className="font-bold">Enterprise Conversion Workflow</p>
              <p className="text-[12px] mt-0.5">This will update the lead to "Won", automatically create a Won Deal in your pipeline, register an active Customer Account, and create/update the Company Account.</p>
            </div>
          </div>

          <FormField label="Deal Opportunity Name" required>
            <Input value={convertForm.dealName} onChange={e => setConvertForm(f => ({ ...f, dealName: e.target.value }))} />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Deal Revenue Value (₹)" required>
              <Input value={convertForm.dealValue} onChange={e => setConvertForm(f => ({ ...f, dealValue: e.target.value }))} type="number" />
            </FormField>
            <FormField label="Target Pipeline Stage">
              <Select value={convertForm.stage} onChange={e => setConvertForm(f => ({ ...f, stage: e.target.value }))}>
                <option value="Won">Won (Closed & Earned)</option>
                <option value="Negotiation">Negotiation (Final Review)</option>
                <option value="Proposal">Proposal Sent</option>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Customer Account Contact">
              <Input value={convertForm.customerName} onChange={e => setConvertForm(f => ({ ...f, customerName: e.target.value }))} />
            </FormField>
            <FormField label="Company Account Name">
              <Input value={convertForm.companyName} onChange={e => setConvertForm(f => ({ ...f, companyName: e.target.value }))} />
            </FormField>
          </div>

          <SubmitBtn onClick={handleConvertLead}>Confirm & Convert to Won Account</SubmitBtn>
        </div>
      </Modal>

      {/* LOG CALL MODAL */}
      <Modal open={showLogCall} onClose={() => setShowLogCall(false)} title={`Log Call — ${lead.name}`}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Call Outcome">
              <Select value={callForm.outcome} onChange={e => setCallForm(f => ({ ...f, outcome: e.target.value }))}>
                <option value="Connected">Connected & Interested</option>
                <option value="Callback scheduled">Callback Scheduled</option>
                <option value="Follow-up required">Follow-up Required</option>
                <option value="Meeting scheduled">Meeting Scheduled</option>
                <option value="No Answer / Busy">No Answer / Busy</option>
                <option value="Not Interested">Not Interested</option>
              </Select>
            </FormField>
            <FormField label="Duration">
              <Select value={callForm.duration} onChange={e => setCallForm(f => ({ ...f, duration: e.target.value }))}>
                <option value="1 min">1 min</option>
                <option value="3 min">3 min</option>
                <option value="5 min">5 min</option>
                <option value="10 min">10 min</option>
                <option value="15+ min">15+ min</option>
              </Select>
            </FormField>
          </div>
          <FormField label="Call Discussion Notes">
            <Textarea value={callForm.notes} onChange={e => setCallForm(f => ({ ...f, notes: e.target.value }))} placeholder="Key discussion points, objections, next steps..." rows={3} />
          </FormField>
          <SubmitBtn onClick={handleLogCallSubmit}>Save Call Record</SubmitBtn>
        </div>
      </Modal>

      {/* SCHEDULE MEETING MODAL */}
      <Modal open={showSchedule} onClose={() => setShowSchedule(false)} title={`Schedule Meeting — ${lead.name}`}>
        <div className="flex flex-col gap-4">
          <FormField label="Meeting Title" required>
            <Input value={meetingForm.title} onChange={e => setMeetingForm(f => ({ ...f, title: e.target.value }))} />
          </FormField>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Date">
              <Input value={meetingForm.date} onChange={e => setMeetingForm(f => ({ ...f, date: e.target.value }))} type="date" />
            </FormField>
            <FormField label="Time">
              <Input value={meetingForm.time} onChange={e => setMeetingForm(f => ({ ...f, time: e.target.value }))} placeholder="11:00 AM" />
            </FormField>
            <FormField label="Duration">
              <Select value={meetingForm.duration} onChange={e => setMeetingForm(f => ({ ...f, duration: e.target.value }))}>
                <option value="15 min">15 min</option>
                <option value="30 min">30 min</option>
                <option value="45 min">45 min</option>
                <option value="60 min">60 min</option>
              </Select>
            </FormField>
          </div>
          <FormField label="Video Join Link (Google Meet / Zoom)">
            <Input value={meetingForm.joinUrl} onChange={e => setMeetingForm(f => ({ ...f, joinUrl: e.target.value }))} placeholder="https://meet.google.com/xyz-abc" />
          </FormField>
          <SubmitBtn onClick={handleScheduleMeetingSubmit}>Confirm Meeting</SubmitBtn>
        </div>
      </Modal>

      {/* ADD TASK MODAL */}
      <Modal open={showAddTask} onClose={() => setShowAddTask(false)} title={`Add Task for ${lead.name}`}>
        <div className="flex flex-col gap-4">
          <FormField label="Task Title" required>
            <Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Due Date">
              <Input value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} type="date" />
            </FormField>
            <FormField label="Priority">
              <Select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="High">High Priority</option>
                <option value="Medium">Medium</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
              </Select>
            </FormField>
          </div>
          <SubmitBtn onClick={handleAddTaskSubmit}>Create Task</SubmitBtn>
        </div>
      </Modal>

      {/* CREATE DEAL MODAL */}
      <Modal open={showCreateDeal} onClose={() => setShowCreateDeal(false)} title={`Create Deal for ${lead.company}`}>
        <div className="flex flex-col gap-4">
          <FormField label="Deal Name" required>
            <Input value={dealForm.deal} onChange={e => setDealForm(f => ({ ...f, deal: e.target.value }))} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Deal Value (₹)" required>
              <Input value={dealForm.value} onChange={e => setDealForm(f => ({ ...f, value: e.target.value }))} placeholder="750000" />
            </FormField>
            <FormField label="Pipeline Stage">
              <Select value={dealForm.stage} onChange={e => setDealForm(f => ({ ...f, stage: e.target.value }))}>
                <option value="New">New</option>
                <option value="Qualified">Qualified</option>
                <option value="Meeting">Meeting</option>
                <option value="Proposal">Proposal</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Won">Won</option>
              </Select>
            </FormField>
          </div>
          <FormField label="Target Close Date">
            <Input value={dealForm.close} onChange={e => setDealForm(f => ({ ...f, close: e.target.value }))} type="date" />
          </FormField>
          <SubmitBtn onClick={handleCreateDealSubmit}>Add to Pipeline</SubmitBtn>
        </div>
      </Modal>

      {/* SEND EMAIL MODAL */}
      <Modal open={showSendEmail} onClose={() => setShowSendEmail(false)} title={`Compose Email to ${lead.name}`}>
        <div className="flex flex-col gap-4">
          <div className="p-3 rounded-lg text-[12px]" style={{ background: T.canvas }}>
            Recipient: <strong>{lead.email || "No email on record"}</strong>
          </div>
          <FormField label="Subject" required>
            <Input value={emailForm.subject} onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))} />
          </FormField>
          <FormField label="Message Body">
            <Textarea value={emailForm.body} onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))} rows={6} />
          </FormField>
          <SubmitBtn onClick={handleSendEmail}>Open Email Client & Log Touchpoint</SubmitBtn>
        </div>
      </Modal>
    </div>
  );
}

// Subcomponents for Notes and Business Details
function NoteTab({ lead }) {
  const [newNote, setNewNote] = useState("");
  const [outcome, setOutcome] = useState("Connected");
  const [duration, setDuration] = useState("3 min");
  const { dispatch, state } = useCrm();
  const { user } = useAuth();
  const toast = useToast();

  const leadCalls = useMemo(() => {
    return (state.calls || []).filter(c => c.contact === lead.name || (c.company && c.company === lead.company));
  }, [state.calls, lead]);

  const saveCallNote = () => {
    if (!newNote.trim()) return toast.warning("Please type a note first", "Empty Note");
    const dateStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const timeStr = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    const formattedNote = `[Call Note · ${dateStr} ${timeStr} · ${outcome} (${duration})]: ${newNote.trim()}`;
    const updatedNotes = lead.notes ? `${formattedNote}\n\n${lead.notes}` : formattedNote;

    dispatch({
      type: "UPDATE_LEAD",
      payload: {
        id: lead.id,
        notes: updatedNotes,
        status: lead.status === "New" ? "Contacted" : lead.status,
        lastContact: new Date().toISOString(),
      },
    });

    dispatch({
      type: "ADD_CALL",
      payload: {
        id: `CL-${Date.now()}`,
        contact: lead.name,
        company: lead.company || "Prospect",
        date: dateStr,
        time: timeStr,
        duration,
        outcome,
        notes: newNote.trim(),
        owner: user?.name || lead.owner || "Sales Rep",
      },
    });

    setNewNote("");
    toast.success("Call note logged and added to activity timeline", "Note Saved");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <h3 className="crm-display text-[14px] font-semibold" style={{ color: T.ink }}>Log Discussion & Notes</h3>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Outcome">
            <Select value={outcome} onChange={e => setOutcome(e.target.value)}>
              <option value="Connected">Connected & Positive</option>
              <option value="Interested">Interested / Follow-up</option>
              <option value="Callback Required">Callback Scheduled</option>
              <option value="No Answer">No Answer / Busy</option>
            </Select>
          </FormField>
          <FormField label="Duration">
            <Select value={duration} onChange={e => setDuration(e.target.value)}>
              <option value="1 min">1 min</option>
              <option value="3 min">3 min</option>
              <option value="5 min">5 min</option>
              <option value="10+ min">10+ min</option>
            </Select>
          </FormField>
        </div>
        <FormField label="Note Details">
          <Textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Type notes here..." rows={4} />
        </FormField>
        <button onClick={saveCallNote} className="crm-focusable px-4 py-2 rounded-lg text-[12.5px] font-semibold w-fit text-white" style={{ background: T.accent }}>
          Save Note
        </button>
      </div>

      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <h3 className="crm-display text-[14px] font-semibold" style={{ color: T.ink }}>Historical Notes</h3>
        {leadCalls.length === 0 && !lead.notes ? (
          <p className="text-[12.5px] text-gray-400 py-4 text-center">No notes recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {leadCalls.map(c => (
              <div key={c.id} className="p-3 rounded-lg flex flex-col gap-1 text-[12.5px]" style={{ background: T.canvas }}>
                <span className="font-semibold" style={{ color: T.ink }}>{c.outcome} ({c.duration}) · <span className="crm-mono text-gray-400 font-normal">{c.date}</span></span>
                <p className="text-gray-700">{c.notes}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BusinessDetailsTab({ lead }) {
  const { dispatch } = useCrm();
  const toast = useToast();
  const [desc, setDesc] = useState(lead.businessDescription || "");
  const [industry, setIndustry] = useState(lead.industry || "");
  const [model, setModel] = useState(lead.businessModel || "B2B");
  const [companySize, setCompanySize] = useState(lead.companySize || "11–50 employees");
  const [annualRevenue, setAnnualRevenue] = useState(lead.annualRevenue || "");

  const save = () => {
    dispatch({
      type: "UPDATE_LEAD",
      payload: {
        id: lead.id,
        businessDescription: desc,
        industry,
        businessModel: model,
        companySize,
        annualRevenue,
      },
    });
    toast.success("Business profile parameters updated", "Profile Saved");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <h3 className="crm-display text-[14px] font-semibold" style={{ color: T.ink }}>Company Overview & Business Model</h3>
        <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe core operations, products, and target markets..." rows={4} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <FormField label="Industry / Sector">
            <Input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Fintech, SaaS, Manufacturing..." />
          </FormField>
          <FormField label="Business Model">
            <Select value={model} onChange={e => setModel(e.target.value)}>
              <option value="B2B">B2B (Business to Business)</option>
              <option value="SaaS / Cloud">SaaS / Cloud Software</option>
              <option value="Enterprise Services">Enterprise Services</option>
              <option value="Manufacturing">Manufacturing & Industrial</option>
            </Select>
          </FormField>
        </div>

        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <FormField label="Company Workforce Size">
            <Select value={companySize} onChange={e => setCompanySize(e.target.value)}>
              <option value="1–10 employees">1–10 employees</option>
              <option value="11–50 employees">11–50 employees</option>
              <option value="51–200 employees">51–200 employees</option>
              <option value="201–500 employees">201–500 employees</option>
              <option value="500+ employees">500+ employees</option>
            </Select>
          </FormField>
          <FormField label="Annual Turnover / Revenue">
            <Input value={annualRevenue} onChange={e => setAnnualRevenue(e.target.value)} placeholder="₹10 Cr - ₹50 Cr" />
          </FormField>
        </div>
      </div>

      <button onClick={save} className="crm-focusable px-4 py-2 rounded-lg text-[12.5px] font-semibold w-fit text-white" style={{ background: T.accent }}>
        Save Business Details
      </button>
    </div>
  );
}
