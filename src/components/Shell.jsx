import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, UserSquare2, Building2, Briefcase, KanbanSquare, Activity,
  Phone, CalendarDays, CheckSquare, Sparkles, BarChart3, UsersRound,
  Upload, Settings, HelpCircle, Bell, Plus, ChevronDown, Command,
  PanelLeftClose, PanelLeft, Search, X, CheckCheck, LogOut, Crown, ArrowLeftCircle,
  Menu, ChevronRight, Share2
} from "lucide-react";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import { useAuth } from "../store/AuthContext";
import QuickAddModal from "./QuickAddModal";
import GlobalSearch from "./GlobalSearch";

const NAV_ITEMS = [
  { key: "dashboard", label: "My Dashboard", icon: LayoutDashboard, path: "/my-dashboard" },
  { key: "leads", label: "Leads", icon: Users, path: "/leads", badge: "leads" },
  { key: "social-leads", label: "Social Leads", icon: Share2, path: "/social-leads", badge: "social" },
  { key: "customers", label: "Customers", icon: UserSquare2, path: "/customers" },
  { key: "companies", label: "Companies", icon: Building2, path: "/companies" },
  { key: "deals", label: "Deals", icon: Briefcase, path: "/deals" },
  { key: "pipeline", label: "Pipeline", icon: KanbanSquare, path: "/pipeline" },
  { key: "activities", label: "Activities", icon: Activity, path: "/activities" },
  { key: "calls", label: "Calls", icon: Phone, path: "/calls" },
  { key: "meetings", label: "Meetings", icon: CalendarDays, path: "/meetings" },
  { key: "tasks", label: "Tasks", icon: CheckSquare, path: "/tasks", badge: "tasks" },
  { key: "ai", label: "AI Insights", icon: Sparkles, path: "/ai" },
  { key: "reports", label: "Reports & Analytics", icon: BarChart3, path: "/reports" },
  { key: "team", label: "Team", icon: UsersRound, path: "/team" },
  { key: "importexport", label: "Import / Export", icon: Upload, path: "/importexport" },
];

const BOTTOM_TABS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/my-dashboard" },
  { key: "leads", label: "Leads", icon: Users, path: "/leads", badge: "leads" },
  { key: "deals", label: "Deals", icon: Briefcase, path: "/deals" },
  { key: "pipeline", label: "Pipeline", icon: KanbanSquare, path: "/pipeline" },
  { key: "more", label: "More", icon: Menu, path: null },
];

export default function Shell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);
  const [search, setSearch] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState(false);
  const profileRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { state, dispatch } = useCrm();
  const { user, logout, isImpersonating, originalLeader, exitImpersonation } = useAuth();

  const userInitials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "SA";
  const isLeader = (originalLeader || user)?.role === "Leader";

  const unreadCount = state.notifications.filter(n => !n.read).length || 6;
  const overdueTasks = state.tasks.filter(t => !t.completed && (t.dueDate === "Today" || t.dueDate === "Overdue")).length;
  const newLeads = state.leads.filter(l => l.status === "New").length;
  const newSocialInquiries = (state.socialInquiries || []).filter(si => si.status === "New").length;

  const getBadge = (badge) => {
    if (badge === "leads") return newLeads > 0 ? newLeads : null;
    if (badge === "tasks") return overdueTasks > 0 ? overdueTasks : null;
    if (badge === "social") return newSocialInquiries > 0 ? newSocialInquiries : null;
    return null;
  };

  const currentBreadcrumb = useMemo(() => {
    if (location.pathname === "/" || location.pathname === "/leader") return "Leader Dashboard";
    const found = NAV_ITEMS.find(item => location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path)));
    if (found) return found.label;
    if (location.pathname.startsWith("/settings")) return "Settings";
    return "Dashboard";
  }, [location.pathname]);

  // Global Cmd+K
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearch(true); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  // Close mobile drawer on route change
  useEffect(() => { setMobileDrawer(false); }, [location.pathname]);

  useEffect(() => {
    if (mobileDrawer) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileDrawer]);

  const handleMobileNav = (path) => {
    navigate(path);
    setMobileDrawer(false);
  };

  return (
    <div className="crm-root w-full min-h-screen flex flex-col" style={{ background: T.canvas, color: T.ink }}>
      <QuickAddModal open={quickAdd} onClose={() => setQuickAdd(false)} />
      <GlobalSearch open={search} onClose={() => setSearch(false)} />

      {/* ── Impersonation Banner ────────────────────────────────────────── */}
      {isImpersonating && (
        <div className="w-full flex items-center justify-between gap-4 px-5 py-2.5 text-[12.5px] font-semibold z-50 shrink-0"
          style={{ background: T.accent, color: "#fff" }}>
          <div className="flex items-center gap-2 min-w-0">
            <Crown size={14} className="shrink-0" />
            <span className="truncate">
              Viewing as <strong>{user?.name}</strong>
              <span className="hidden sm:inline"> ({user?.email}) — Member Portal</span>
            </span>
          </div>
          <button
            onClick={() => { exitImpersonation(); navigate("/"); }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11.5px] font-bold transition-all hover:bg-white/20 shrink-0"
            style={{ border: "1px solid rgba(255,255,255,0.4)" }}
          >
            <ArrowLeftCircle size={13} />
            <span className="hidden sm:inline">Return to Leader Dashboard</span>
            <span className="sm:hidden">Exit</span>
          </button>
        </div>
      )}

      {/* ── Mobile Drawer Overlay ───────────────────────────────────────── */}
      {mobileDrawer && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setMobileDrawer(false)}
        />
      )}

      {/* ── Mobile Drawer ───────────────────────────────────────────────── */}
      <div
        className="fixed inset-y-0 left-0 z-50 flex flex-col lg:hidden crm-scroll overflow-y-auto"
        style={{
          width: 280,
          background: T.surface,
          borderRight: `1px solid ${T.line}`,
          transform: mobileDrawer ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: mobileDrawer ? "4px 0 24px -4px rgba(0,0,0,0.18)" : "none",
        }}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 h-16 shrink-0" style={{ borderBottom: `1px solid ${T.line}` }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0 bg-[#1C1917] p-1 shadow-xs border border-[#292524]">
              <img src="/logo.png" alt="Saivyy Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="crm-display text-[14px] font-bold tracking-tight text-[#1C1917]">Saivyy CRM</span>
              <span className="text-[11px] font-medium text-[#8C857B]">Saivyy Technologies</span>
            </div>
          </div>
          <button onClick={() => setMobileDrawer(false)} className="p-2 rounded-lg" style={{ color: T.inkSoft }}>
            <X size={18} />
          </button>
        </div>

        {/* Drawer User Info */}
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${T.line}` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center crm-mono text-[12px] font-bold shrink-0" style={{ background: "#F5E8D8", color: "#8C430B" }}>
              {userInitials}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: T.ink }}>{user?.name || "Saivyy Administrator"}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: T.inkFaint }}>{user?.role === "Leader" ? "OWNER" : "MEMBER"}</p>
            </div>
          </div>
        </div>

        {/* Drawer Nav */}
        <nav className="flex-1 py-3 px-2 flex flex-col gap-1">
          {isLeader && (() => {
            const isActive = location.pathname === "/" || location.pathname === "/leader";
            return (
              <button
                onClick={() => handleMobileNav("/leader")}
                className="crm-navitem crm-focusable flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-medium text-left w-full transition-all"
                style={{
                  background: isActive ? T.accent : "transparent",
                  color: isActive ? "#FFFFFF" : T.inkSoft,
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                <Crown size={16} strokeWidth={isActive ? 2.2 : 1.8} className="shrink-0" style={{ color: isActive ? "#FFFFFF" : T.accent }} />
                <span className="truncate flex-1">Leader Dashboard</span>
              </button>
            );
          })()}

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
            const badgeCount = item.badge ? getBadge(item.badge) : null;

            return (
              <button
                key={item.key}
                onClick={() => handleMobileNav(item.path)}
                className="crm-navitem crm-focusable flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-medium text-left w-full transition-all"
                style={{
                  background: isActive ? T.accent : "transparent",
                  color: isActive ? "#FFFFFF" : T.inkSoft,
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} className="shrink-0" style={{ color: isActive ? "#FFFFFF" : T.inkSoft }} />
                <span className="truncate flex-1">{item.label}</span>
                {badgeCount && (
                  <span
                    className="crm-mono text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: isActive ? "rgba(255,255,255,0.25)" : T.accentSoft,
                      color: isActive ? "#FFFFFF" : T.accent
                    }}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Drawer Bottom */}
        <div className="px-2 py-3 flex flex-col gap-0.5" style={{ borderTop: `1px solid ${T.line}` }}>
          <button onClick={() => handleMobileNav("/settings")} className="crm-navitem crm-focusable flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-left w-full" style={{ color: T.inkSoft }}>
            <Settings size={16} className="shrink-0" /><span>Settings</span>
          </button>
          <button
            onClick={() => { logout(); setMobileDrawer(false); }}
            className="crm-navitem crm-focusable flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-left w-full"
            style={{ color: T.negative }}
          >
            <LogOut size={16} className="shrink-0" /><span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
        <aside
          className="crm-scroll shrink-0 flex flex-col h-screen sticky top-0 overflow-y-auto z-20 hidden lg:flex"
          style={{
            width: collapsed ? 72 : 240,
            background: T.surface,
            borderRight: `1px solid ${T.line}`,
            transition: "width .16s ease"
          }}
        >
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-4 h-16 shrink-0" style={{ borderBottom: `1px solid ${T.line}` }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0 bg-[#1C1917] p-1 shadow-xs border border-[#292524]">
              <img src="/logo.png" alt="Saivyy Logo" className="w-full h-full object-contain" />
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-tight overflow-hidden">
                <span className="crm-display text-[15px] font-bold tracking-tight text-[#1C1917]">Saivyy CRM</span>
                <span className="text-[11px] font-medium text-[#8C857B]">Saivyy Technologies</span>
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 py-3 px-2.5 flex flex-col gap-1">
            {/* Leader Dashboard */}
            {isLeader && (() => {
              const isActive = location.pathname === "/" || location.pathname === "/leader";
              return (
                <button
                  onClick={() => navigate("/leader")}
                  title={collapsed ? "Leader Dashboard" : undefined}
                  className="crm-navitem crm-focusable flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-left w-full transition-all"
                  style={{
                    background: isActive ? T.accent : "transparent",
                    color: isActive ? "#FFFFFF" : T.inkSoft,
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  <Crown size={16} strokeWidth={isActive ? 2.2 : 1.8} className="shrink-0" style={{ color: isActive ? "#FFFFFF" : T.accent }} />
                  {!collapsed && <span className="truncate flex-1">Leader Dashboard</span>}
                </button>
              );
            })()}

            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
              const badgeCount = item.badge ? getBadge(item.badge) : null;

              return (
                <button
                  key={item.key}
                  onClick={() => navigate(item.path)}
                  title={collapsed ? item.label : undefined}
                  className="crm-navitem crm-focusable flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-left w-full transition-all"
                  style={{
                    background: isActive ? T.accent : "transparent",
                    color: isActive ? "#FFFFFF" : T.inkSoft,
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} className="shrink-0" style={{ color: isActive ? "#FFFFFF" : T.inkSoft }} />
                  {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                  {!collapsed && badgeCount && (
                    <span
                      className="crm-mono text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: isActive ? "rgba(255,255,255,0.25)" : T.accentSoft,
                        color: isActive ? "#FFFFFF" : T.accent
                      }}
                    >
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Bottom Controls */}
          <div className="px-2.5 py-3 flex flex-col gap-0.5" style={{ borderTop: `1px solid ${T.line}` }}>
            <button onClick={() => navigate("/settings")} className="crm-navitem crm-focusable flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-left w-full" style={{ color: T.inkSoft }}>
              <Settings size={16} className="shrink-0" />{!collapsed && <span>Settings</span>}
            </button>
            <button onClick={() => setCollapsed(c => !c)} className="crm-navitem crm-focusable flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-left w-full" style={{ color: T.inkFaint }}>
              {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
              {!collapsed && <span>Collapse</span>}
            </button>
          </div>
        </aside>

        {/* Main Application Container */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* ── Top Bar (Header) ────────────────────────────────────────────── */}
          <header className="h-16 shrink-0 flex items-center justify-between gap-3 px-4 lg:px-6 sticky top-0 z-10" style={{ background: T.surface, borderBottom: `1px solid ${T.line}` }}>
            {/* Left: Mobile hamburger & Desktop Breadcrumbs */}
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => setMobileDrawer(true)}
                className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                style={{ color: T.inkSoft, border: `1px solid ${T.line}` }}
              >
                <Menu size={16} />
              </button>

              {/* Breadcrumbs matching the inspiration: Console > Crm > [Page] */}
              <div className="flex items-center gap-2 text-[13px] font-medium text-[#57534E] select-none">
                <span className="text-[#8C857B] hover:text-[#1C1917] cursor-pointer" onClick={() => navigate("/")}>Console</span>
                <span className="text-[#A8A29E] text-[11px]">&gt;</span>
                <span className="text-[#8C857B]">Crm</span>
                <span className="text-[#A8A29E] text-[11px]">&gt;</span>
                <span className="text-[#1C1917] font-semibold">{currentBreadcrumb}</span>
              </div>
            </div>

            {/* Right: Org Pill, Search Pill, Notifications, User Profile */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Org Pill with live green dot */}
              <div
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
                style={{ background: "#F5F3EF", border: `1px solid ${T.line}`, color: "#44403C" }}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0"></span>
                <span className="font-semibold">{user?.orgName || "Saivyy Technologies Private Limited"}</span>
              </div>

              {/* Search records... with Ctrl K */}
              <button
                onClick={() => setSearch(true)}
                className="crm-focusable flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12.5px] text-left transition-all"
                style={{ background: "#F5F3EF", border: `1px solid ${T.line}`, color: T.inkFaint }}
              >
                <Search size={14} className="text-[#8C857B]" />
                <span className="hidden sm:inline text-[#8C857B]">Search records…</span>
                <span className="text-[10.5px] font-mono px-1.5 py-0.5 rounded bg-white border border-[#EAE7E1] text-[#78716C] shadow-2xs">
                  Ctrl K
                </span>
              </button>

              {/* Quick Add Button */}
              <button
                onClick={() => setQuickAdd(true)}
                className="crm-focusable hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold text-white shadow-xs transition hover:brightness-105"
                style={{ background: T.accent }}
              >
                <Plus size={14} />
                <span>Quick add</span>
              </button>

              {/* Notification Bell with terracotta count pill */}
              <div className="relative">
                <button
                  onClick={() => setNotifOpen(o => !o)}
                  className="crm-focusable relative w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-gray-50"
                  style={{ border: `1px solid ${T.line}` }}
                >
                  <Bell size={15} style={{ color: T.inkSoft }} />
                  <span
                    className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1 shadow-xs"
                    style={{ background: T.accent }}
                  >
                    {unreadCount}
                  </span>
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-10 w-72 sm:w-80 rounded-xl shadow-xl z-50 overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${T.line}` }}>
                      <span className="crm-display text-[13px] font-semibold" style={{ color: T.ink }}>Notifications</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => dispatch({ type: "MARK_ALL_READ" })} className="text-[11px] font-semibold" style={{ color: T.accent }}>Mark all read</button>
                        <button onClick={() => setNotifOpen(false)} style={{ color: T.inkFaint }}><X size={14} /></button>
                      </div>
                    </div>
                    <div className="max-h-72 overflow-y-auto crm-scroll">
                      {state.notifications.map((n) => (
                        <div key={n.id} onClick={() => dispatch({ type: "MARK_NOTIFICATION_READ", payload: n.id })} className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-stone-50" style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
                          <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: n.read ? "#D6D2CA" : T.accent }} />
                          <div>
                            <p className="text-[12.5px] leading-snug" style={{ color: T.ink }}>{n.text}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>{n.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile Avatar and Role Display */}
              <div className="relative" ref={profileRef}>
                <div
                  onClick={() => setProfileOpen(o => !o)}
                  className="flex items-center gap-2.5 cursor-pointer select-none p-1 rounded-lg transition hover:bg-stone-50"
                  title={user?.name || "Account Profile"}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[12px] shrink-0 shadow-2xs"
                    style={{ background: "#F5E8D8", color: "#8C430B" }}
                  >
                    {userInitials}
                  </div>
                  <div className="hidden md:flex flex-col text-left leading-tight min-w-0 max-w-[160px]">
                    <span className="text-[13px] font-bold text-[#1C1917] truncate">
                      {user?.name || "Saivyy Administrator"}
                    </span>
                    <span className="text-[9.5px] font-bold tracking-widest text-[#8C857B] uppercase">
                      {user?.role === "Leader" ? "OWNER" : "MEMBER"}
                    </span>
                  </div>
                </div>

                {profileOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-56 sm:w-60 rounded-xl shadow-xl z-50 overflow-hidden"
                    style={{ background: T.surface, border: `1px solid ${T.line}` }}
                  >
                    <div className="px-4 py-3.5" style={{ borderBottom: `1px solid ${T.line}` }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[12px] shrink-0" style={{ background: "#F5E8D8", color: "#8C430B" }}>
                          {userInitials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold truncate" style={{ color: T.ink }}>{user?.name || "Saivyy Administrator"}</p>
                          <p className="text-[11px] truncate" style={{ color: T.inkFaint }}>{user?.email || "admin@saivyy.in"}</p>
                          <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: T.accent }}>{user?.role === "Leader" ? "OWNER" : "MEMBER"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => { navigate("/settings"); setProfileOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-left text-[13px] hover:bg-stone-50"
                        style={{ color: T.inkSoft }}
                      >
                        <Settings size={14} /> Workspace Settings
                      </button>
                      <button
                        onClick={() => { logout(); setProfileOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-left text-[13px] font-medium hover:bg-red-50"
                        style={{ color: T.negative }}
                      >
                        <LogOut size={14} /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 min-w-0 pb-16 lg:pb-0">
            {children}
          </main>
        </div>
      </div>

      {/* Floating AI Button (Bottom Right) */}
      <button
        onClick={() => navigate("/ai")}
        className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        style={{
          background: T.accent,
          boxShadow: "0 8px 24px -4px rgba(188, 90, 27, 0.45)"
        }}
        title="Ask AI Assistant"
      >
        <Sparkles size={18} />
      </button>

      {/* Mobile Bottom Tab Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 lg:hidden z-30 flex items-stretch"
        style={{
          background: T.surface,
          borderTop: `1px solid ${T.line}`,
          height: 60,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {BOTTOM_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.path && (location.pathname === tab.path || (tab.path !== "/" && location.pathname.startsWith(tab.path)));
          const badgeCount = tab.badge ? getBadge(tab.badge) : null;
          const isMoreActive = tab.key === "more" && mobileDrawer;

          return (
            <button
              key={tab.key}
              onClick={() => {
                if (tab.key === "more") {
                  setMobileDrawer(o => !o);
                } else {
                  navigate(tab.path);
                }
              }}
              className="flex-1 flex flex-col items-center justify-center gap-1 relative transition-colors"
              style={{ color: (isActive || isMoreActive) ? T.accent : T.inkFaint }}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={isActive || isMoreActive ? 2.2 : 1.8} />
                {badgeCount && (
                  <span
                    className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full flex items-center justify-center crm-mono text-[9px] font-bold px-1"
                    style={{ background: T.accent, color: "#fff" }}
                  >
                    {badgeCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
              {(isActive || isMoreActive) && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ background: T.accent }} />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
