import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, Plus, ChevronDown, ArrowUpDown, X, ArrowLeft, Mail, Phone,
  Building, MapPin, Edit3, Trash2, CheckCircle2, ArrowUp, ArrowDown
} from "lucide-react";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import { useToast } from "../components/ToastContext";
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

function CustomerDetail({ customer, onBack, onEdit, onDelete }) {
  const { state } = useCrm();
  const toast = useToast();
  const relevantActivities = (state.activities || []).filter(
    a => a.contact === customer.name || a.company === customer.company
  );

  const handleEmail = () => {
    if (!customer.email) return toast.warning("No email address registered", "Contact Info");
    window.location.href = `mailto:${customer.email}`;
    toast.info(`Opening default mail client for ${customer.email}`, "Email");
  };

  const handleCall = () => {
    if (!customer.phone) return toast.warning("No phone number registered", "Contact Info");
    window.location.href = `tel:${customer.phone.replace(/[^0-9+]/g, "")}`;
    toast.info(`Initiating call to ${customer.phone}`, "Telephony");
  };

  return (
    <div className="flex flex-col gap-4 p-5 animate-fadeIn">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="crm-focusable flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={14} /> Back to customers directory
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(customer)}
            className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold border hover:bg-gray-50 text-gray-700"
            style={{ borderColor: T.line }}
          >
            <Edit3 size={13} /> Edit Account
          </button>
          <button
            onClick={() => onDelete(customer)}
            className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold text-red-600 hover:bg-red-50"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>

      <div className="rounded-xl p-5 flex items-start justify-between flex-wrap gap-4 shadow-sm" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <div className="flex items-start gap-3.5">
          <Avatar initials={customer.initials} size={52} />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="crm-display text-[20px] font-bold" style={{ color: T.ink }}>{customer.name}</h1>
              <StatusBadge status={customer.status} />
            </div>
            <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>
              {customer.title ? `${customer.title} at ` : ""}<strong className="text-gray-800">{customer.company}</strong> · {customer.id}
            </p>
            <div className="flex items-center gap-4 mt-2 text-[12.5px]" style={{ color: T.inkSoft }}>
              <span className="crm-mono font-bold text-emerald-600">{customer.totalRevenue || "₹0"} total revenue</span>
              <span>Owner: <strong className="text-gray-700">{customer.owner}</strong></span>
              <span>Joined: {customer.joinDate}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleEmail}
            className="crm-focusable flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold hover:bg-indigo-50 hover:text-indigo-600 transition-colors border"
            style={{ borderColor: T.line, color: T.inkSoft }}
          >
            <Mail size={14} className="text-indigo-600" /> Email Contact
          </button>
          <button
            onClick={handleCall}
            className="crm-focusable flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold hover:bg-emerald-50 hover:text-emerald-700 transition-colors border"
            style={{ borderColor: T.line, color: T.inkSoft }}
          >
            <Phone size={14} className="text-emerald-600" /> Dial Phone
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl p-5 shadow-sm" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <h3 className="crm-display text-[14px] font-bold mb-3" style={{ color: T.ink }}>Contact Information</h3>
          <div className="flex flex-col gap-3 text-[13px]">
            <div className="flex items-center justify-between py-1 border-b" style={{ borderColor: T.lineSoft }}>
              <span className="flex items-center gap-2 text-gray-500"><Mail size={14} /> Email</span>
              <a href={`mailto:${customer.email}`} className="text-indigo-600 hover:underline font-medium">{customer.email || "—"}</a>
            </div>
            <div className="flex items-center justify-between py-1 border-b" style={{ borderColor: T.lineSoft }}>
              <span className="flex items-center gap-2 text-gray-500"><Phone size={14} /> Phone</span>
              <span className="crm-mono font-semibold text-gray-800">{customer.phone || "—"}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b" style={{ borderColor: T.lineSoft }}>
              <span className="flex items-center gap-2 text-gray-500"><Building size={14} /> Industry</span>
              <span className="font-medium text-gray-800">{customer.industry || "Enterprise"}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="flex items-center gap-2 text-gray-500"><MapPin size={14} /> Location</span>
              <span className="font-medium text-gray-800">{customer.location || "India"}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-5 shadow-sm" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <h3 className="crm-display text-[14px] font-bold mb-3" style={{ color: T.ink }}>Recent Activity & Engagements</h3>
          {relevantActivities.length > 0 ? (
            <div className="flex flex-col gap-3">
              {relevantActivities.slice(0, 5).map(a => {
                const color = ACTIVITY_COLORS[a.type] || ACTIVITY_COLORS["Note"];
                return (
                  <div key={a.id} className="flex items-start gap-2.5 pb-2.5 border-b last:border-0" style={{ borderColor: T.lineSoft }}>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 shrink-0" style={{ background: color.bg, color: color.fg }}>
                      {a.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-medium text-gray-800">{a.description}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{a.date} · {a.owner || "System"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[12.5px] text-gray-400 py-4">No recent activity logged for this customer.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Customers() {
  const { state, dispatch } = useCrm();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [openCustomer, setOpenCustomer] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  const teamList = useMemo(() => {
    if (state.team && state.team.length > 0) return state.team.map(m => m.name);
    return ["Unassigned"];
  }, [state.team]);

  const emptyForm = { name: "", company: "", email: "", phone: "", title: "", status: "Active", owner: "", industry: "", location: "" };
  const [form, setForm] = useState(emptyForm);

  // Handle URL deep linking ?id=CU-...
  useEffect(() => {
    const idParam = searchParams.get("id");
    if (idParam && state.customers.length > 0) {
      const match = state.customers.find(c => c.id === idParam);
      if (match) setOpenCustomer(match);
    }
  }, [searchParams, state.customers]);

  const activeOwner = form.owner || teamList[0] || "Unassigned";

  // Filtered & Sorted
  const filtered = useMemo(() => {
    let rows = state.customers || [];
    if (statusFilter !== "All") rows = rows.filter(c => c.status === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.owner || "").toLowerCase().includes(q)
      );
    }

    return [...rows].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === "totalRevenue") {
        aVal = parseInt(String(aVal).replace(/[^0-9]/g, "")) || 0;
        bVal = parseInt(String(bVal).replace(/[^0-9]/g, "")) || 0;
      } else {
        aVal = String(aVal || "").toLowerCase();
        bVal = String(bVal || "").toLowerCase();
      }
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [state.customers, query, statusFilter, sortField, sortOrder]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(o => o === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submitAdd = () => {
    if (!form.name.trim() || !form.company.trim()) {
      return toast.warning("Name and company are required", "Validation");
    }
    const initials = form.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    const id = `CU-${Date.now()}`;
    dispatch({
      type: "ADD_CUSTOMER",
      payload: {
        ...form,
        id,
        owner: activeOwner,
        initials,
        totalRevenue: "₹0",
        lastContact: "Just now",
        joinDate: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      }
    });
    setShowAdd(false);
    setForm(emptyForm);
    toast.success(`Created customer account for "${form.name}"`, "Customer Added");
  };

  const openEdit = (c) => {
    setEditCustomer(c);
    setForm({
      name: c.name,
      company: c.company,
      email: c.email || "",
      phone: c.phone || "",
      title: c.title || "",
      status: c.status || "Active",
      owner: c.owner || "",
      industry: c.industry || "",
      location: c.location || "",
    });
  };

  const submitEdit = () => {
    if (!form.name.trim() || !form.company.trim()) {
      return toast.warning("Name and company are required", "Validation");
    }
    const initials = form.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    dispatch({
      type: "UPDATE_CUSTOMER",
      payload: {
        id: editCustomer.id,
        ...form,
        initials,
        owner: form.owner || editCustomer.owner,
      }
    });
    setEditCustomer(null);
    setForm(emptyForm);
    toast.success(`Updated customer "${form.name}"`, "Changes Saved");
  };

  const handleDelete = (c) => {
    dispatch({ type: "DELETE_CUSTOMER", payload: c.id });
    if (openCustomer && openCustomer.id === c.id) setOpenCustomer(null);
    toast.info(`Deleted customer "${c.name}"`, "Customer Removed");
  };

  const currentCustomer = openCustomer ? state.customers.find(c => c.id === openCustomer.id) || openCustomer : null;
  if (currentCustomer) {
    return (
      <CustomerDetail
        customer={currentCustomer}
        onBack={() => setOpenCustomer(null)}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <div className="p-5 flex flex-col gap-4 min-w-0 animate-fadeIn">
      {/* ADD CUSTOMER MODAL */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Customer Account">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Full name" required>
              <Input value={form.name} onChange={setF("name")} placeholder="Simran Kaur" />
            </FormField>
            <FormField label="Company" required>
              <Input value={form.company} onChange={setF("company")} placeholder="Harbor & Co." />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email">
              <Input value={form.email} onChange={setF("email")} type="email" placeholder="simran@harbor.co" />
            </FormField>
            <FormField label="Phone">
              <Input value={form.phone} onChange={setF("phone")} placeholder="+91 98200 12345" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Job Title">
              <Input value={form.title} onChange={setF("title")} placeholder="VP of Finance" />
            </FormField>
            <FormField label="Status">
              <Select value={form.status} onChange={setF("status")}>
                {["VIP", "Active", "Onboarding", "At Risk", "Churned"].map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Industry">
              <Input value={form.industry} onChange={setF("industry")} placeholder="Fintech & Cloud" />
            </FormField>
            <FormField label="Location">
              <Input value={form.location} onChange={setF("location")} placeholder="Bengaluru, Karnataka" />
            </FormField>
          </div>
          <FormField label="Account Owner">
            <Select value={activeOwner} onChange={setF("owner")}>
              {teamList.map(o => <option key={o} value={o}>{o}</option>)}
            </Select>
          </FormField>
          <SubmitBtn onClick={submitAdd}>Create Customer Account</SubmitBtn>
        </div>
      </Modal>

      {/* EDIT CUSTOMER MODAL */}
      <Modal open={!!editCustomer} onClose={() => setEditCustomer(null)} title="Edit Customer Account">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Full name" required>
              <Input value={form.name} onChange={setF("name")} />
            </FormField>
            <FormField label="Company" required>
              <Input value={form.company} onChange={setF("company")} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email">
              <Input value={form.email} onChange={setF("email")} type="email" />
            </FormField>
            <FormField label="Phone">
              <Input value={form.phone} onChange={setF("phone")} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Job Title">
              <Input value={form.title} onChange={setF("title")} />
            </FormField>
            <FormField label="Status">
              <Select value={form.status} onChange={setF("status")}>
                {["VIP", "Active", "Onboarding", "At Risk", "Churned"].map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Industry">
              <Input value={form.industry} onChange={setF("industry")} />
            </FormField>
            <FormField label="Location">
              <Input value={form.location} onChange={setF("location")} />
            </FormField>
          </div>
          <FormField label="Account Owner">
            <Select value={form.owner || activeOwner} onChange={setF("owner")}>
              {teamList.map(o => <option key={o} value={o}>{o}</option>)}
            </Select>
          </FormField>
          <SubmitBtn onClick={submitEdit}>Save Customer Details</SubmitBtn>
        </div>
      </Modal>

      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="crm-display text-[20px] font-bold" style={{ color: T.ink }}>Customers Directory</h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>
            {state.customers.length} total active client{state.customers.length !== 1 ? "s" : ""} · Click any customer to view profile & engagements
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold text-white shadow-sm"
          style={{ background: T.accent }}
        >
          <Plus size={14} /> Add customer
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-1 min-w-[220px]" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <Search size={14} style={{ color: T.inkFaint }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search customers, company, email, or owner…"
            className="flex-1 text-[13px] outline-none bg-transparent"
            style={{ color: T.ink }}
          />
          {query && <button onClick={() => setQuery("")}><X size={13} className="text-gray-400" /></button>}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 text-[12px]">
          <span className="text-gray-400 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border text-[12px] bg-transparent outline-none font-medium"
            style={{ borderColor: T.line, color: T.ink }}
          >
            <option value="All">All Statuses ({state.customers.length})</option>
            {["VIP", "Active", "Onboarding", "At Risk", "Churned"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <div className="overflow-x-auto crm-scroll">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.line}` }}>
                {[
                  { field: "name", label: "Name" },
                  { field: "company", label: "Company" },
                  { field: "email", label: "Email" },
                  { field: "status", label: "Status" },
                  { field: "owner", label: "Owner" },
                  { field: "totalRevenue", label: "Total Revenue" },
                  { field: "lastContact", label: "Last Contact" },
                ].map(({ field, label }) => {
                  const isSorted = sortField === field;
                  return (
                    <th
                      key={field}
                      onClick={() => toggleSort(field)}
                      className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap cursor-pointer hover:bg-gray-50 transition-colors select-none"
                      style={{ color: isSorted ? T.accent : T.inkFaint }}
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        {isSorted ? (
                          sortOrder === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                        ) : (
                          <ArrowUpDown size={10} className="opacity-40" />
                        )}
                      </span>
                    </th>
                  );
                })}
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide" style={{ color: T.inkFaint }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr
                  key={c.id}
                  className="crm-row transition-colors cursor-pointer hover:bg-gray-50"
                  style={{ borderBottom: `1px solid ${T.lineSoft}` }}
                  onClick={() => setOpenCustomer(c)}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={c.initials} size={30} />
                      <div>
                        <span className="text-[13px] font-semibold text-gray-900 whitespace-nowrap block">{c.name}</span>
                        {c.title && <span className="text-[11px] text-gray-400 block">{c.title}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[13px] whitespace-nowrap font-medium text-gray-700">{c.company}</td>
                  <td className="px-3 py-2.5 text-[12.5px] whitespace-nowrap text-gray-500">{c.email || "—"}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={c.status} /></td>
                  <td className="px-3 py-2.5 text-[12.5px] whitespace-nowrap text-gray-700 font-medium">{c.owner}</td>
                  <td className="px-3 py-2.5 crm-mono text-[12.5px] font-bold whitespace-nowrap text-emerald-600">{c.totalRevenue || "₹0"}</td>
                  <td className="px-3 py-2.5 text-[12px] whitespace-nowrap text-gray-400">{c.lastContact}</td>
                  <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        className="crm-focusable p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors"
                        title="Edit Customer"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="crm-focusable p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Customer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 text-[13px]">
                    No customers found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderTop: `1px solid ${T.line}` }}>
          <span className="text-[12px]" style={{ color: T.inkFaint }}>
            Showing {filtered.length} of {state.customers.length} customers
          </span>
        </div>
      </div>
    </div>
  );
}

