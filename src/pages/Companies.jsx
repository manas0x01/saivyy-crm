import React, { useState, useMemo } from "react";
import { Search, Plus, Building2, Globe, MapPin, Users, Briefcase, X } from "lucide-react";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import Modal, { FormField, Input, Select, SubmitBtn } from "../components/Modal";
import { StatusBadge } from "../components/shared";

export default function Companies() {
  const { state, dispatch } = useCrm();
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", industry: "", location: "", website: "", status: "Active" });

  const filtered = useMemo(() => {
    if (!query.trim()) return state.companies;
    const q = query.toLowerCase();
    return state.companies.filter(c => c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q));
  }, [state.companies, query]);

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = () => {
    if (!form.name) return alert("Company name required");
    dispatch({ type: "ADD_COMPANY", payload: { ...form, contacts: 1, deals: 0, revenue: "₹0" } });
    setShowAdd(false);
    setForm({ name: "", industry: "", location: "", website: "", status: "Active" });
  };

  return (
    <div className="p-5 flex flex-col gap-4">
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add company">
        <div className="flex flex-col gap-4">
          <FormField label="Company name" required><Input value={form.name} onChange={setF("name")} placeholder="Acme Corp" /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Industry"><Input value={form.industry} onChange={setF("industry")} placeholder="Manufacturing" /></FormField>
            <FormField label="Location"><Input value={form.location} onChange={setF("location")} placeholder="Mumbai, MH" /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Website"><Input value={form.website} onChange={setF("website")} placeholder="acme.com" /></FormField>
            <FormField label="Status"><Select value={form.status} onChange={setF("status")}>{["Active","At Risk","Customer","New"].map(s => <option key={s}>{s}</option>)}</Select></FormField>
          </div>
          <SubmitBtn onClick={submit}>Add Company</SubmitBtn>
        </div>
      </Modal>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="crm-display text-[20px] font-semibold" style={{ color: T.ink }}>Companies</h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>{state.companies.length} account organizations</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold" style={{ background: T.accent, color: "#fff" }}>
          <Plus size={14} /> Add company
        </button>
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg max-w-sm" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <Search size={14} style={{ color: T.inkFaint }} />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search companies…" className="flex-1 text-[13px] outline-none bg-transparent" style={{ color: T.ink }} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {filtered.map(c => (
          <div key={c.id} className="crm-card rounded-xl p-4 flex flex-col gap-3" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: T.accentSoft, color: T.accent }}>
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="crm-display text-[14px] font-semibold" style={{ color: T.ink }}>{c.name}</h3>
                  <p className="text-[11.5px]" style={{ color: T.inkFaint }}>{c.industry}</p>
                </div>
              </div>
              <StatusBadge status={c.status} />
            </div>

            <div className="flex flex-col gap-1.5 text-[12px]" style={{ color: T.inkSoft }}>
              <span className="flex items-center gap-2"><MapPin size={13} style={{ color: T.inkFaint }} />{c.location}</span>
              {c.website && <span className="flex items-center gap-2"><Globe size={13} style={{ color: T.inkFaint }} />{c.website}</span>}
            </div>

            <div className="flex items-center justify-between pt-2 text-[12px]" style={{ borderTop: `1px solid ${T.lineSoft}` }}>
              <span className="flex items-center gap-1" style={{ color: T.inkFaint }}><Users size={13} />{c.contacts} contacts</span>
              <span className="flex items-center gap-1" style={{ color: T.inkFaint }}><Briefcase size={13} />{c.deals} deals</span>
              <span className="crm-mono font-semibold" style={{ color: T.ink }}>{c.revenue}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
