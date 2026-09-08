import React, { useState, useMemo } from "react";
import { Search, Plus, ChevronDown, ArrowUpDown, X, MoreHorizontal, ArrowLeft, Mail, Phone, Building, MapPin } from "lucide-react";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import { Avatar, StatusBadge } from "../components/shared";
import Modal, { FormField, Input, Select, SubmitBtn } from "../components/Modal";

const ACTIVITY_COLORS = {
  Call: { bg: T.accentSoft, fg: T.accent },
  Email: { bg: T.positiveSoft, fg: T.positive },
  Meeting: { bg: T.amberSoft, fg: T.amber },
  Note: { bg: T.lineSoft, fg: T.inkSoft },
  "Status Change": { bg: T.negativeSoft, fg: T.negative },
  Task: { bg: "#F3E8FF", fg: "#7C3AED" },
};

function CustomerDetail({ customer, onBack }) {
  const { state } = useCrm();
  const relevantActivities = state.activities.filter(a => a.contact === customer.name || a.company === customer.company);
  return (
    <div className="flex flex-col gap-4 p-5">
      <button onClick={onBack} className="crm-focusable flex items-center gap-1.5 text-[12.5px] font-medium w-fit" style={{ color: T.inkSoft }}>
        <ArrowLeft size={14} /> Back to customers
      </button>
      <div className="rounded-xl p-5 flex items-start justify-between flex-wrap gap-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <div className="flex items-start gap-3">
          <Avatar initials={customer.initials} size={48} />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="crm-display text-[19px] font-semibold" style={{ color: T.ink }}>{customer.name}</h1>
              <StatusBadge status={customer.status} />
            </div>
            <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>{customer.title} at {customer.company} · {customer.id}</p>
            <div className="flex items-center gap-4 mt-2 text-[12.5px]" style={{ color: T.inkSoft }}>
              <span className="crm-mono font-semibold" style={{ color: T.ink }}>{customer.totalRevenue} total revenue</span>
              <span>owner: {customer.owner}</span>
              <span>joined: {customer.joinDate}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {[[Mail, "Email"], [Phone, "Call"]].map(([Icon, label]) => (
            <button key={label} className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium" style={{ border: `1px solid ${T.line}`, color: T.inkSoft }}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <h3 className="crm-display text-[13px] font-semibold mb-3">Contact info</h3>
          <div className="flex flex-col gap-2.5 text-[13px]">
            <span className="flex items-center gap-2" style={{ color: T.inkSoft }}><Mail size={14} style={{ color: T.inkFaint }} />{customer.email}</span>
            <span className="flex items-center gap-2 crm-mono" style={{ color: T.inkSoft }}><Phone size={14} style={{ color: T.inkFaint }} />{customer.phone}</span>
            <span className="flex items-center gap-2" style={{ color: T.inkSoft }}><Building size={14} style={{ color: T.inkFaint }} />{customer.industry}</span>
            <span className="flex items-center gap-2" style={{ color: T.inkSoft }}><MapPin size={14} style={{ color: T.inkFaint }} />{customer.location}</span>
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <h3 className="crm-display text-[13px] font-semibold mb-3">Recent activity</h3>
          {relevantActivities.length > 0 ? relevantActivities.slice(0, 4).map((a, i) => {
            const color = ACTIVITY_COLORS[a.type] || ACTIVITY_COLORS["Note"];
            return (
              <div key={a.id} className="flex items-start gap-2.5 mb-3">
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 shrink-0" style={{ background: color.bg, color: color.fg }}>{a.type}</span>
                <div>
                  <p className="text-[12.5px]" style={{ color: T.ink }}>{a.description}</p>
                  <p className="text-[11px]" style={{ color: T.inkFaint }}>{a.date}</p>
                </div>
              </div>
            );
          }) : <p className="text-[12.5px]" style={{ color: T.inkFaint }}>No recent activity.</p>}
        </div>
      </div>
    </div>
  );
}

export default function Customers() {
  const { state, dispatch } = useCrm();
  const [query, setQuery] = useState("");
  const [openCustomer, setOpenCustomer] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const teamList = useMemo(() => {
    if (state.team && state.team.length > 0) return state.team.map(m => m.name);
    return ["Unassigned"];
  }, [state.team]);

  const emptyForm = { name: "", company: "", email: "", phone: "", title: "", status: "Active", owner: "", industry: "", location: "" };
  const [form, setForm] = useState(emptyForm);

  const activeOwner = form.owner || teamList[0] || "Unassigned";

  const filtered = useMemo(() => {
    if (!query.trim()) return state.customers;
    const q = query.toLowerCase();
    return state.customers.filter(c => c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q));
  }, [state.customers, query]);

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = () => {
    if (!form.name || !form.company) return alert("Name and company required");
    const initials = form.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    dispatch({ type: "ADD_CUSTOMER", payload: { ...form, owner: activeOwner, initials, totalRevenue: "₹0", lastContact: "Just now", joinDate: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) } });
    setShowAdd(false);
    setForm(emptyForm);
  };

  const currentCustomer = openCustomer ? state.customers.find(c => c.id === openCustomer.id) || openCustomer : null;
  if (currentCustomer) return <CustomerDetail customer={currentCustomer} onBack={() => setOpenCustomer(null)} />;

  return (
    <div className="p-5 flex flex-col gap-4">
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add customer">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Full name" required><Input value={form.name} onChange={setF("name")} placeholder="Simran Kaur" /></FormField>
            <FormField label="Company" required><Input value={form.company} onChange={setF("company")} placeholder="Harbor & Co." /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email"><Input value={form.email} onChange={setF("email")} type="email" /></FormField>
            <FormField label="Phone"><Input value={form.phone} onChange={setF("phone")} /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Title"><Input value={form.title} onChange={setF("title")} placeholder="Finance Manager" /></FormField>
            <FormField label="Status"><Select value={form.status} onChange={setF("status")}>{["Active","At Risk","Churned"].map(s => <option key={s}>{s}</option>)}</Select></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Industry"><Input value={form.industry} onChange={setF("industry")} /></FormField>
            <FormField label="Location"><Input value={form.location} onChange={setF("location")} /></FormField>
          </div>
          <FormField label="Owner"><Select value={activeOwner} onChange={setF("owner")}>{teamList.map(o => <option key={o} value={o}>{o}</option>)}</Select></FormField>
          <SubmitBtn onClick={submit}>Add Customer</SubmitBtn>
        </div>
      </Modal>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="crm-display text-[20px] font-semibold" style={{ color: T.ink }}>Customers</h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>{state.customers.length} total customers</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold" style={{ background: T.accent, color: "#fff" }}>
          <Plus size={14} /> Add customer
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-1 min-w-[220px]" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <Search size={14} style={{ color: T.inkFaint }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search customers…" className="flex-1 text-[13px] outline-none bg-transparent" style={{ color: T.ink }} />
        </div>
        <button className="crm-focusable flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium" style={{ background: T.surface, border: `1px solid ${T.line}`, color: T.inkSoft }}>Status <ChevronDown size={12} /></button>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <div className="overflow-x-auto crm-scroll">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.line}` }}>
                {["Name", "Company", "Email", "Status", "Owner", "Total Revenue", "Last Contact", "Actions"].map(c => (
                  <th key={c} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: T.inkFaint }}>
                    <span className="flex items-center gap-1">{c}{!["Actions"].includes(c) && <ArrowUpDown size={10} />}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="crm-row" style={{ borderBottom: `1px solid ${T.lineSoft}` }}
                  onMouseEnter={e => e.currentTarget.style.background = T.canvas}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td className="px-3 py-2.5">
                    <button onClick={() => setOpenCustomer(c)} className="crm-focusable flex items-center gap-2.5">
                      <Avatar initials={c.initials} size={30} />
                      <span className="text-[13px] font-medium whitespace-nowrap" style={{ color: T.ink }}>{c.name}</span>
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-[13px] whitespace-nowrap" style={{ color: T.inkSoft }}>{c.company}</td>
                  <td className="px-3 py-2.5 text-[12.5px] whitespace-nowrap" style={{ color: T.inkFaint }}>{c.email}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={c.status} /></td>
                  <td className="px-3 py-2.5 text-[12.5px] whitespace-nowrap" style={{ color: T.inkSoft }}>{c.owner}</td>
                  <td className="px-3 py-2.5 crm-mono text-[12.5px] font-semibold whitespace-nowrap" style={{ color: T.ink }}>{c.totalRevenue}</td>
                  <td className="px-3 py-2.5 text-[12.5px] whitespace-nowrap" style={{ color: T.inkFaint }}>{c.lastContact}</td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => { if (window.confirm("Delete customer?")) dispatch({ type: "DELETE_CUSTOMER", payload: c.id }); }} className="crm-focusable w-7 h-7 rounded-md flex items-center justify-center" style={{ color: T.negative }}>
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5" style={{ borderTop: `1px solid ${T.line}` }}>
          <span className="text-[12px]" style={{ color: T.inkFaint }}>Showing {filtered.length} of {state.customers.length} customers</span>
        </div>
      </div>
    </div>
  );
}
