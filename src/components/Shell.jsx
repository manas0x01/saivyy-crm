import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, UserSquare2, Building2, Briefcase, KanbanSquare, Activity,
  Phone, CalendarDays, CheckSquare, Sparkles, Zap, Megaphone, BarChart3, UsersRound,
  Upload, Plug, Settings, HelpCircle, Bell, Plus, ChevronDown, Command,
  PanelLeftClose, PanelLeft, Search, X, CheckCheck, LogOut, Crown, ArrowLeftCircle,
  Menu,
} from "lucide-react";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import { useAuth } from "../store/AuthContext";
import QuickAddModal from "./QuickAddModal";
import GlobalSearch from "./GlobalSearch";

const NAV_ITEMS = [
  { key: "dashboard", label: "My Dashboard", icon: LayoutDashboard, path: "/my-dashboard" },
  { key: "leads", label: "Leads", icon: Users, path: "/leads", badge: "leads" },
  { key: "customers", label: "Customers", icon: UserSquare2, path: "/customers" },
  { key: "companies", label: "Companies", icon: Building2, path: "/companies" },
  { key: "deals", label: "Deals", icon: Briefcase, path: "/deals" },
  { key: "pipeline", label: "Pipeline", icon: KanbanSquare, path: "/pipeline" },
  { key: "activities", label: "Activities", icon: Activity, path: "/activities" },
  { key: "calls", label: "Calls", icon: Phone, path: "/calls" },
  { key: "meetings", label: "Meetings", icon: CalendarDays, path: "/meetings" },
  { key: "tasks", label: "Tasks", icon: CheckSquare, path: "/tasks", badge: "tasks" },
  { key: "ai", label: "AI Insights", icon: Sparkles, path: "/ai" },
  { key: "automations", label: "Automations", icon: Zap, path: "/automations" },
  { key: "campaigns", label: "Campaigns", icon: Megaphone, path: "/campaigns" },
  { key: "reports", label: "Reports & Analytics", icon: BarChart3, path: "/reports" },
  { key: "team", label: "Team", icon: UsersRound, path: "/team" },
  { key: "importexport", label: "Import / Export", icon: Upload, path: "/importexport" },
  { key: "integrations", label: "Integrations", icon: Plug, path: "/integrations" },
];

// Bottom tab bar items for mobile (most important 5)
const BOTTOM_TABS = [
  { key: "dashboard", label: "Home", icon: LayoutDashboard, path: "/my-dashboard" },
  { key: "leads", label: "Leads", icon: Users, path: "/leads", badge: "leads" },
  { key: "deals", label: "Deals", icon: Briefcase, path: "/deals" },
  { key: "calls", label: "Calls", icon: Phone, path: "/calls" },
  { key: "more", label: "More", icon: Menu, path: null }, // opens drawer
];

const WORKSPACES = ["Saivyy Technologies", "Saivyy Tech", "Enterprise SaaS", "SMB Division"];

export default function Shell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);
  const [search, setSearch] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [wsOpen, setWsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [workspace, setWorkspace] = useState(WORKSPACES[0]);
  const [mobileDrawer, setMobileDrawer] = useState(false); // slide-in full nav on mobile
  const wsRef = useRef(null);
  const profileRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { state, dispatch } = useCrm();
  const { user, logout, isImpersonating, originalLeader, exitImpersonation } = useAuth();

  // Derived user display info
  const userInitials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  const isLeader = (originalLeader || user)?.role === "Leader";

  const unreadCount = state.notifications.filter(n => !n.read).length;
  const overdueTasks = state.tasks.filter(t => !t.completed && (t.dueDate === "Today" || t.dueDate === "Overdue")).length;
  const newLeads = state.leads.filter(l => l.status === "New").length;

  const getBadge = (badge) => {
    if (badge === "leads") return newLeads > 0 ? newLeads : null;
    if (badge === "tasks") return overdueTasks > 0 ? overdueTasks : null;
    return null;
  };

  // Global Cmd+K
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearch(true); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Close workspace dropdown on outside click
  useEffect(() => {
    if (!wsOpen) return;
    const handler = (e) => { if (wsRef.current && !wsRef.current.contains(e.target)) setWsOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [wsOpen]);

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  // Close mobile drawer on route change
  useEffect(() => { setMobileDrawer(false); }, [location.pathname]);

  // Lock body scroll when drawer open
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
          style={{ background: "#7C3AED", color: "#fff" }}>
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
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md flex items-center justify-center crm-display font-bold text-[13px] shrink-0" style={{ background: T.accent, color: "#fff" }}>S</div>
            <div className="flex flex-col leading-tight">
              <span className="crm-display text-[13px] font-semibold">Saivyy CRM</span>
              <span className="text-[11px]" style={{ color: T.inkFaint }}>Saivyy Technologies</span>
            </div>
          </div>
          <button onClick={() => setMobileDrawer(false)} className="p-2 rounded-lg" style={{ color: T.inkSoft }}>
            <X size={18} />
          </button>
        </div>

        {/* Drawer User Info */}
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${T.line}` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center crm-mono text-[12px] font-bold shrink-0" style={{ background: T.accentSoft, color: T.accent }}>
              {userInitials}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: T.ink }}>{user?.name}</p>
              <p className="text-[11px] truncate" style={{ color: T.inkFaint }}>{user?.email}</p>
              <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Drawer Nav */}
        <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5">
          {isLeader && (() => {
            const isActive = location.pathname === "/" || location.pathname === "/leader";
            return (
              <button
                onClick={() => handleMobileNav("/leader")}
                className="crm-navitem crm-focusable flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[14px] font-medium text-left w-full"
                style={{ background: isActive ? T.amberSoft : "transparent", color: isActive ? T.amber : T.inkSoft }}
              >
                <Crown size={18} strokeWidth={2} className="shrink-0" />
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
                className="crm-navitem crm-focusable flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[14px] font-medium text-left w-full"
                style={{ background: isActive ? T.accentSoft : "transparent", color: isActive ? T.accent : T.inkSoft }}
              >
                <Icon size={18} strokeWidth={2} className="shrink-0" />
                <span className="truncate flex-1">{item.label}</span>
                {badgeCount && (
                  <span className="crm-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: isActive ? "#fff" : T.lineSoft, color: isActive ? T.accent : T.inkFaint }}>
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Drawer Bottom */}
        <div className="px-2 py-3 flex flex-col gap-0.5" style={{ borderTop: `1px solid ${T.line}` }}>
          <button onClick={() => handleMobileNav("/settings")} className="crm-navitem crm-focusable flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[14px] font-medium text-left w-full" style={{ color: T.inkSoft }}>
            <Settings size={18} className="shrink-0" /><span>Settings</span>
          </button>
          <button
            onClick={() => { logout(); setMobileDrawer(false); }}
            className="crm-navitem crm-focusable flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[14px] font-medium text-left w-full"
            style={{ color: T.negative }}
          >
            <LogOut size={18} className="shrink-0" /><span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">

        {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
        <aside
          className="crm-scroll shrink-0 flex-col h-screen sticky top-0 overflow-y-auto z-20 hidden lg:flex"
          style={{ width: collapsed ? 72 : 240, background: T.surface, borderRight: `1px solid ${T.line}`, transition: "width .16s ease" }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2 px-4 h-16 shrink-0" style={{ borderBottom: `1px solid ${T.line}` }}>
            <div className="w-7 h-7 rounded-md flex items-center justify-center crm-display font-bold text-[13px] shrink-0" style={{ background: T.accent, color: "#fff" }}>S</div>
            {!collapsed && (
              <div className="flex flex-col leading-tight overflow-hidden">
                <span className="crm-display text-[13px] font-semibold truncate">Saivyy CRM</span>
                <span className="text-[11px] truncate" style={{ color: T.inkFaint }}>Saivyy Technologies</span>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5">
            {/* Leader Dashboard special nav item */}
            {isLeader && (() => {
              const isActive = location.pathname === "/" || location.pathname === "/leader";
              return (
                <button
                  onClick={() => navigate("/leader")}
                  className="crm-navitem crm-focusable flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-left w-full"
                  style={{ background: isActive ? T.amberSoft : "transparent", color: isActive ? T.amber : T.inkSoft }}
                  title={collapsed ? "Leader Dashboard" : undefined}
                >
                  <Crown size={16} strokeWidth={2} className="shrink-0" />
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
                  className="crm-navitem crm-focusable flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-left w-full"
                  style={{ background: isActive ? T.accentSoft : "transparent", color: isActive ? T.accent : T.inkSoft }}
                >
                  <Icon size={16} strokeWidth={2} className="shrink-0" />
                  {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                  {!collapsed && badgeCount && (
                    <span className="crm-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: isActive ? "#fff" : T.lineSoft, color: isActive ? T.accent : T.inkFaint }}>
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom */}
          <div className="px-2 py-3 flex flex-col gap-0.5" style={{ borderTop: `1px solid ${T.line}` }}>
            <button onClick={() => navigate("/settings")} className="crm-navitem crm-focusable flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-left w-full" style={{ color: T.inkSoft }}>
              <Settings size={16} className="shrink-0" />{!collapsed && <span>Settings</span>}
            </button>
            <button className="crm-navitem crm-focusable flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-left w-full" style={{ color: T.inkSoft }}>
              <HelpCircle size={16} className="shrink-0" />{!collapsed && <span>Help center</span>}
            </button>
            <button onClick={() => setCollapsed((c) => !c)} className="crm-navitem crm-focusable flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-left w-full" style={{ color: T.inkFaint }}>
              {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
              {!collapsed && <span>Collapse</span>}
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <header className="h-14 lg:h-16 shrink-0 flex items-center gap-2 lg:gap-3 px-3 lg:px-5 sticky top-0 z-10" style={{ background: T.surface, borderBottom: `1px solid ${T.line}` }}>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileDrawer(true)}
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
              style={{ color: T.inkSoft, border: `1px solid ${T.line}` }}
            >
              <Menu size={16} />
            </button>

            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-2 shrink-0">
              <div className="w-6 h-6 rounded-md flex items-center justify-center crm-display font-bold text-[12px]" style={{ background: T.accent, color: "#fff" }}>S</div>
              <span className="crm-display text-[13px] font-semibold">Saivyy CRM</span>
            </div>

            {/* Desktop: Workspace Switcher */}
            <div className="relative hidden lg:block" ref={wsRef}>
              <button
                onClick={() => setWsOpen(o => !o)}
                className="crm-focusable flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium"
                style={{ border: `1px solid ${T.line}`, color: T.inkSoft }}
              >
                <span className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold" style={{ background: T.accent, color: "#fff" }}>{workspace[0]}</span>
                {workspace} <ChevronDown size={13} />
              </button>
              {wsOpen && (
                <div className="absolute left-0 top-full mt-1 w-52 rounded-xl shadow-xl z-50 py-1" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                  <p className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: T.inkFaint }}>Switch workspace</p>
                  {WORKSPACES.map(ws => (
                    <button key={ws} onClick={() => { setWorkspace(ws); setWsOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-gray-50"
                      style={{ color: ws === workspace ? T.accent : T.ink, fontWeight: ws === workspace ? 600 : 400 }}
                    >
                      <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold" style={{ background: ws === workspace ? T.accent : T.lineSoft, color: ws === workspace ? "#fff" : T.inkSoft }}>{ws[0]}</span>
                      {ws}
                      {ws === workspace && <CheckCheck size={12} className="ml-auto" style={{ color: T.accent }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Global Search */}
            <div className="flex-1 max-w-[480px]">
              <button
                onClick={() => setSearch(true)}
                className="crm-focusable w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-left"
                style={{ background: T.canvas, border: `1px solid ${T.line}`, color: T.inkFaint }}
              >
                <Search size={15} />
                <span className="flex-1 hidden sm:inline">Search leads, deals, customers…</span>
                <span className="flex-1 sm:hidden text-[12px]">Search…</span>
                <span className="hidden sm:flex items-center gap-0.5 crm-mono text-[10.5px] px-1.5 py-0.5 rounded" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                  <Command size={10} />K
                </span>
              </button>
            </div>

            <div className="flex-1" />

            {/* Quick Add */}
            <button
              onClick={() => setQuickAdd(true)}
              className="crm-focusable flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-[12.5px] font-semibold shrink-0"
              style={{ background: T.accent, color: "#fff" }}
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Quick add</span>
            </button>

            {/* Ask AI — desktop only */}
            <button
              onClick={() => navigate("/ai")}
              className="crm-focusable hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium shrink-0"
              style={{ border: `1px solid ${T.accent}`, color: T.accent, background: T.accentSoft }}
            >
              <Sparkles size={14} /> Ask AI
            </button>

            {/* Notifications */}
            <div className="relative shrink-0">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="crm-focusable relative w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ border: `1px solid ${T.line}` }}
              >
                <Bell size={15} style={{ color: T.inkSoft }} />
                {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: T.negative }} />}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-10 w-72 sm:w-80 rounded-xl shadow-xl z-50" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${T.line}` }}>
                    <span className="crm-display text-[13px] font-semibold" style={{ color: T.ink }}>Notifications</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => dispatch({ type: "MARK_ALL_READ" })} className="text-[11px] font-medium" style={{ color: T.accent }}>Mark all read</button>
                      <button onClick={() => setNotifOpen(false)} style={{ color: T.inkFaint }}><X size={14} /></button>
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto crm-scroll">
                    {state.notifications.map((n) => (
                      <div key={n.id} onClick={() => dispatch({ type: "MARK_NOTIFICATION_READ", payload: n.id })} className="flex items-start gap-3 px-4 py-3 cursor-pointer" style={{ borderBottom: `1px solid ${T.lineSoft}`, background: n.read ? "transparent" : T.accentSoft + "40" }}>
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: n.read ? "transparent" : T.accent }} />
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

            {/* Profile Avatar + Dropdown */}
            <div className="relative shrink-0" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(o => !o)}
                className="crm-focusable w-8 h-8 rounded-full flex items-center justify-center crm-mono text-[11px] font-semibold"
                style={{ background: T.accentSoft, color: T.accent }}
                title={user?.name || "Profile"}
              >
                {userInitials}
              </button>
              {profileOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 sm:w-60 rounded-xl shadow-xl z-50 overflow-hidden"
                  style={{ background: T.surface, border: `1px solid ${T.line}` }}
                >
                  {/* User Info */}
                  <div className="px-4 py-3.5" style={{ borderBottom: `1px solid ${T.line}` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center crm-mono text-[12px] font-bold shrink-0" style={{ background: T.accentSoft, color: T.accent }}>
                        {userInitials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold truncate" style={{ color: T.ink }}>{user?.name}</p>
                        <p className="text-[11.5px] truncate" style={{ color: T.inkFaint }}>{user?.email}</p>
                        <p className="text-[11px] truncate mt-0.5" style={{ color: T.inkFaint }}>{user?.role}</p>
                      </div>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="py-1">
                    <button
                      onClick={() => { navigate("/settings"); setProfileOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[13px] hover:bg-gray-50"
                      style={{ color: T.inkSoft }}
                    >
                      <Settings size={14} /> Account Settings
                    </button>
                    <button
                      onClick={() => { logout(); setProfileOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-medium hover:bg-red-50"
                      style={{ color: T.negative }}
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 min-w-0 pb-16 lg:pb-0">
            {children}
          </main>
        </div>
      </div>

      {/* ── Mobile Bottom Tab Bar ───────────────────────────────────────── */}
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
                    style={{ background: T.negative, color: "#fff" }}
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
