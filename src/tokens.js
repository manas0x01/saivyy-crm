// Shared design tokens — "Ops Ledger" CRM
export const T = {
  canvas: "#F5F6F9",
  surface: "#FFFFFF",
  ink: "#12141C",
  inkSoft: "#4B5262",
  inkFaint: "#8A91A0",
  line: "#E7E9EF",
  lineSoft: "#F0F1F5",
  accent: "#3730E0",
  accentSoft: "#EEEDFC",
  positive: "#0E8F5C",
  positiveSoft: "#E7F6EF",
  negative: "#D6423F",
  negativeSoft: "#FBEAEA",
  amber: "#B2650B",
  amberSoft: "#FBF0DF",
  violet: "#7C6FF0",
};

export const fontStack = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');
  .crm-root { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
  .crm-display { font-family: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif; }
  .crm-mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums; }
  .crm-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
  .crm-scroll::-webkit-scrollbar-thumb { background: #D9DBE3; border-radius: 999px; }
  .crm-navitem { transition: background-color .12s ease, color .12s ease; }
  .crm-card { transition: box-shadow .18s ease, transform .18s ease; }
  .crm-card:hover { box-shadow: 0 6px 20px -8px rgba(18,20,28,0.14); transform: translateY(-1px); }
  .crm-focusable:focus-visible { outline: 2px solid #3730E0; outline-offset: 2px; border-radius: 8px; }
  .crm-row { transition: background-color .1s ease; }
  .crm-drag-card { transition: box-shadow .15s ease, transform .15s ease, border-color .15s ease; cursor: grab; }
  .crm-drag-card:hover { box-shadow: 0 6px 16px -6px rgba(18,20,28,0.16); transform: translateY(-1px); }
  .crm-drag-card:active { cursor: grabbing; }
  .crm-col-drop { background: #EEEDFC !important; border-color: #3730E0 !important; }
`;

export const NAV = [
  { key: "dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { key: "leads", label: "Leads", icon: "Users", badge: "leads" },
  { key: "customers", label: "Customers", icon: "UserSquare2" },
  { key: "companies", label: "Companies", icon: "Building2" },
  { key: "deals", label: "Deals", icon: "Briefcase" },
  { key: "pipeline", label: "Pipeline", icon: "KanbanSquare" },
  { key: "activities", label: "Activities", icon: "Activity" },
  { key: "calls", label: "Calls", icon: "Phone" },
  { key: "meetings", label: "Meetings", icon: "CalendarDays" },
  { key: "tasks", label: "Tasks", icon: "CheckSquare", badge: "tasks" },
  { key: "ai", label: "AI Insights", icon: "Sparkles" },
  { key: "automations", label: "Automations", icon: "Zap" },
  { key: "campaigns", label: "Campaigns", icon: "Megaphone" },
  { key: "reports", label: "Reports & Analytics", icon: "BarChart3" },
  { key: "team", label: "Team", icon: "UsersRound" },
  { key: "importexport", label: "Import / Export", icon: "Upload" },
  { key: "integrations", label: "Integrations", icon: "Plug" },
];
