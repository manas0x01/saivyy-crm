import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import { Search, Users, Briefcase, UserSquare2, X } from "lucide-react";

export default function GlobalSearch({ open, onClose }) {
  const [query, setQuery] = useState("");
  const { state } = useCrm();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (open) { setQuery(""); setSelected(0); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") setSelected((s) => Math.min(s + 1, results.length - 1));
      if (e.key === "ArrowUp") setSelected((s) => Math.max(s - 1, 0));
      if (e.key === "Enter" && results[selected]) goTo(results[selected]);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, query, selected]);

  if (!open) return null;

  const q = query.toLowerCase().trim();
  const leads = q ? state.leads.filter(l => l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q)).slice(0, 4).map(l => ({ type: "lead", label: l.name, sub: l.company, id: l.id })) : [];
  const deals = q ? state.deals.filter(d => d.deal.toLowerCase().includes(q) || d.company.toLowerCase().includes(q)).slice(0, 3).map(d => ({ type: "deal", label: d.deal, sub: d.company, id: d.id })) : [];
  const customers = q ? state.customers.filter(c => c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q)).slice(0, 3).map(c => ({ type: "customer", label: c.name, sub: c.company, id: c.id })) : [];
  const results = [...leads, ...deals, ...customers];

  const goTo = (r) => {
    if (r.type === "lead") navigate("/leads");
    else if (r.type === "deal") navigate("/deals");
    else navigate("/customers");
    onClose();
  };

  const iconMap = { lead: Users, deal: Briefcase, customer: UserSquare2 };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      style={{ background: "rgba(18,20,28,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full rounded-2xl shadow-2xl overflow-hidden" style={{ maxWidth: 560, background: T.surface, border: `1px solid ${T.line}` }}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: `1px solid ${T.line}` }}>
          <Search size={16} style={{ color: T.inkFaint }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            placeholder="Search leads, deals, customers…"
            className="flex-1 text-[14px] outline-none bg-transparent"
            style={{ color: T.ink }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ color: T.inkFaint }}>
              <X size={14} />
            </button>
          )}
          <span className="crm-mono text-[11px] px-1.5 py-0.5 rounded" style={{ background: T.lineSoft, color: T.inkFaint }}>ESC</span>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <div className="max-h-80 overflow-y-auto crm-scroll">
            {["lead", "deal", "customer"].map((type) => {
              const group = results.filter(r => r.type === type);
              if (!group.length) return null;
              const groupLabel = type === "lead" ? "Leads" : type === "deal" ? "Deals" : "Customers";
              const Icon = iconMap[type];
              return (
                <div key={type}>
                  <div className="px-4 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: T.inkFaint }}>
                    {groupLabel}
                  </div>
                  {group.map((r, i) => {
                    const idx = results.indexOf(r);
                    return (
                      <button
                        key={r.id}
                        onClick={() => goTo(r)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
                        style={{ background: idx === selected ? T.accentSoft : "transparent" }}
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: T.lineSoft }}>
                          <Icon size={14} style={{ color: T.inkSoft }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium truncate" style={{ color: T.ink }}>{r.label}</p>
                          <p className="text-[11.5px] truncate" style={{ color: T.inkFaint }}>{r.sub}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : query ? (
          <div className="px-4 py-8 text-center text-[13px]" style={{ color: T.inkFaint }}>
            No results for "{query}"
          </div>
        ) : (
          <div className="px-4 py-5">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide mb-2" style={{ color: T.inkFaint }}>Quick navigate</p>
            {[{ label: "Leads", path: "/leads" }, { label: "Pipeline", path: "/pipeline" }, { label: "Tasks", path: "/tasks" }, { label: "Reports", path: "/reports" }].map(({ label, path }) => (
              <button key={path} onClick={() => { navigate(path); onClose(); }} className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium mb-1" style={{ color: T.inkSoft }}>
                → {label}
              </button>
            ))}
          </div>
        )}

        <div className="px-4 py-2.5 flex items-center gap-3" style={{ borderTop: `1px solid ${T.lineSoft}` }}>
          <span className="text-[11px]" style={{ color: T.inkFaint }}>↑↓ navigate</span>
          <span className="text-[11px]" style={{ color: T.inkFaint }}>↵ open</span>
          <span className="text-[11px]" style={{ color: T.inkFaint }}>esc close</span>
        </div>
      </div>
    </div>
  );
}
