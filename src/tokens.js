// Shared design tokens — Warm Terracotta / Sandstone theme
export const T = {
  canvas: "#FAF9F6",         // Warm paper / linen background
  surface: "#FFFFFF",        // Clean white surface
  ink: "#1C1917",            // Warm dark charcoal (Stone-900)
  inkSoft: "#57534E",        // Stone-600
  inkFaint: "#8C857B",       // Stone-400 / warm grey
  line: "#EAE7E1",           // Warm subtle border
  lineSoft: "#F5F3EF",       // Ultra-soft divider
  accent: "#BC5A1B",         // Signature warm terracotta / burnt amber
  accentHover: "#A44C10",    // Deep terracotta hover
  accentSoft: "#FAF0E6",     // Creamy peach/linen soft accent background
  positive: "#16A34A",       // Fresh emerald
  positiveSoft: "#F0FDF4",   
  negative: "#DC2626",       // Clean crimson
  negativeSoft: "#FEF2F2",   
  amber: "#BC5A1B",          // Matching terracotta amber
  amberSoft: "#FAF0E6",      
  violet: "#7C3AED",         // Deep purple
};

export const fontStack = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');
  .crm-root { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .crm-display { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .crm-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums; }
  .crm-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
  .crm-scroll::-webkit-scrollbar-thumb { background: #D6D2CA; border-radius: 999px; }
  .crm-navitem { transition: background-color .15s ease, color .15s ease; }
  .crm-card { transition: box-shadow .18s ease, transform .18s ease, border-color .18s ease; }
  .crm-card:hover { box-shadow: 0 6px 20px -8px rgba(28,25,23,0.1); transform: translateY(-1px); }
  .crm-focusable:focus-visible { outline: 2px solid #BC5A1B; outline-offset: 2px; border-radius: 8px; }
  .crm-row { transition: background-color .1s ease; }
  .crm-drag-card { transition: box-shadow .15s ease, transform .15s ease, border-color .15s ease; cursor: grab; }
  .crm-drag-card:hover { box-shadow: 0 6px 16px -6px rgba(28,25,23,0.12); transform: translateY(-1px); }
  .crm-drag-card:active { cursor: grabbing; }
  .crm-col-drop { background: #FAF0E6 !important; border-color: #BC5A1B !important; }
`;

export const NAV_ITEMS = [
  { key: "dashboard", label: "My Dashboard", icon: "LayoutDashboard", path: "/my-dashboard" },
  { key: "leads", label: "Leads", icon: "Users", path: "/leads", badge: "leads" },
  { key: "customers", label: "Customers", icon: "UserSquare2", path: "/customers" },
  { key: "companies", label: "Companies", icon: "Building2", path: "/companies" },
  { key: "deals", label: "Deals", icon: "Briefcase", path: "/deals" },
  { key: "pipeline", label: "Pipeline", icon: "KanbanSquare", path: "/pipeline" },
  { key: "activities", label: "Activities", icon: "Activity", path: "/activities" },
  { key: "calls", label: "Calls", icon: "Phone", path: "/calls" },
  { key: "meetings", label: "Meetings", icon: "CalendarDays", path: "/meetings" },
  { key: "tasks", label: "Tasks", icon: "CheckSquare", path: "/tasks", badge: "tasks" },
  { key: "ai", label: "AI Insights", icon: "Sparkles", path: "/ai" },
  { key: "reports", label: "Reports & Analytics", icon: "BarChart3", path: "/reports" },
  { key: "team", label: "Team", icon: "UsersRound", path: "/team" },
  { key: "importexport", label: "Import / Export", icon: "Upload", path: "/importexport" },
];
