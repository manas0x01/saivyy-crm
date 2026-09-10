import React from "react";
import { T } from "../tokens";

export function Avatar({ initials, bg = T.accentSoft, fg = T.accent, size = 32 }) {
  return (
    <div
      className="crm-mono font-semibold shrink-0 rounded-full flex items-center justify-center"
      style={{ width: size, height: size, fontSize: size * 0.38, background: bg, color: fg }}
    >
      {initials}
    </div>
  );
}

export const STATUS_STYLE = {
  "New": { bg: T.lineSoft, fg: T.inkSoft },
  "Contacted": { bg: T.accentSoft, fg: T.accent },
  "Not Picked": { bg: T.amberSoft, fg: T.amber },
  "Interested": { bg: T.accentSoft, fg: T.accent },
  "Qualified": { bg: T.positiveSoft, fg: T.positive },
  "Meeting Scheduled": { bg: T.accentSoft, fg: T.accent },
  "Proposal Sent": { bg: T.amberSoft, fg: T.amber },
  "Negotiation": { bg: T.amberSoft, fg: T.amber },
  "Won": { bg: T.positiveSoft, fg: T.positive },
  "Lost": { bg: T.negativeSoft, fg: T.negative },
  "Non-Interested": { bg: T.negativeSoft, fg: T.negative },
  "Active": { bg: T.positiveSoft, fg: T.positive },
  "At Risk": { bg: T.negativeSoft, fg: T.negative },
  "Customer": { bg: T.amberSoft, fg: T.amber },
};

export function StatusBadge({ status }) {
  let s = STATUS_STYLE[status];
  if (!s && status) {
    const lower = String(status).toLowerCase();
    if (lower.includes("lost") || lower.includes("invalid") || lower.includes("wrong") || lower.includes("waste") || lower.includes("non-interested") || lower.includes("doesn't exist")) {
      s = { bg: T.negativeSoft, fg: T.negative };
    } else if (lower.includes("interested") || lower.includes("meeting") || lower.includes("won") || lower.includes("connected") || lower.includes("qualified")) {
      s = { bg: T.positiveSoft, fg: T.positive };
    } else if (lower.includes("call") || lower.includes("pick") || lower.includes("later") || lower.includes("tomorrow") || lower.includes("busy") || lower.includes("whatsapp") || lower.includes("brochure") || lower.includes("thodi")) {
      s = { bg: T.amberSoft, fg: T.amber };
    } else {
      s = { bg: T.accentSoft, fg: T.accent };
    }
  } else if (!s) {
    s = { bg: T.lineSoft, fg: T.inkSoft };
  }
  return (
    <span className="text-[11.5px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: s.bg, color: s.fg }}>
      {status || "New"}
    </span>
  );
}

export const PRIORITY_COLOR = { High: T.negative, Medium: T.amber, Normal: T.accent, Low: T.inkFaint };

export function PriorityDot({ priority }) {
  return (
    <span className="flex items-center gap-1.5 text-[12.5px]" style={{ color: T.inkSoft }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PRIORITY_COLOR[priority] || T.inkFaint }} />
      {priority}
    </span>
  );
}

export function ScoreChip({ score }) {
  const color = score >= 75 ? T.positive : score >= 45 ? T.amber : T.negative;
  const bg = score >= 75 ? T.positiveSoft : score >= 45 ? T.amberSoft : T.negativeSoft;
  return (
    <span className="crm-mono text-[11.5px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: bg, color }}>
      {score}
    </span>
  );
}

export function Sparkline({ points, positive }) {
  const w = 96, h = 28, max = Math.max(...points), min = Math.min(...points);
  const norm = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / (max - min || 1)) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const color = positive ? T.positive : T.negative;
  const areaPts = `0,${h} ${norm.join(" ")} ${w},${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline points={areaPts} fill={color} opacity="0.08" stroke="none" />
      <polyline points={norm.join(" ")} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SectionLabel({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="crm-display text-[14px] font-semibold" style={{ color: T.ink }}>{children}</h3>
      {action}
    </div>
  );
}

export function ChartTooltip({ active, payload, label, prefix = "", suffix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-[12px]" style={{ background: T.ink, color: "#fff" }}>
      <div className="opacity-70 mb-0.5">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="crm-mono font-semibold">{p.name ? `${p.name}: ` : ""}{prefix}{p.value}{suffix}</div>
      ))}
    </div>
  );
}

export function fmtINR(n) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      {Icon && <Icon size={32} style={{ color: T.inkFaint }} />}
      <p className="text-[14px] font-medium" style={{ color: T.inkSoft }}>{title}</p>
      {description && <p className="text-[12.5px]" style={{ color: T.inkFaint }}>{description}</p>}
    </div>
  );
}
