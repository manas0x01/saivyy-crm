import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Search, Plus, Building2, Globe, MapPin, Users, Briefcase, X,
  Edit3, Trash2, ExternalLink, Phone, Mail, CheckCircle2, DollarSign
} from "lucide-react";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import { useToast } from "../components/ToastContext";
import Modal, { FormField, Input, Select, SubmitBtn } from "../components/Modal";
import { StatusBadge, fmtINR } from "../components/shared";

export default function Companies() {
  const { state, dispatch } = useCrm();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editCompany, setEditCompany] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);

  const [form, setForm] = useState({ name: "", industry: "", location: "", website: "", status: "Active" });

  // Handle URL deep linking ?id=C-...
  useEffect(() => {
    const idParam = searchParams.get("id");
    if (idParam && state.companies.length > 0) {
      const match = state.companies.find(c => c.id === idParam);
      if (match) setSelectedCompany(match);
    }
  }, [searchParams, state.companies]);

  // Keep selectedCompany fresh
  const activeCompany = useMemo(() => {
    if (!selectedCompany) return null;
    return state.companies.find(c => c.id === selectedCompany.id) || selectedCompany;
  }, [selectedCompany, state.companies]);

  // Linked leads, customers, and deals for the selected company
  const companyContacts = useMemo(() => {
    if (!activeCompany) return [];
    const custs = (state.customers || []).filter(c => c.company?.toLowerCase() === activeCompany.name?.toLowerCase());
    const leads = (state.leads || []).filter(l => l.company?.toLowerCase() === activeCompany.name?.toLowerCase());
    return [...custs.map(c => ({ ...c, type: "Customer" })), ...leads.map(l => ({ ...l, type: "Lead" }))];
  }, [activeCompany, state.customers, state.leads]);

  const companyDeals = useMemo(() => {
    if (!activeCompany) return [];
    return (state.deals || []).filter(d => d.company?.toLowerCase() === activeCompany.name?.toLowerCase());
  }, [activeCompany, state.deals]);

  const filtered = useMemo(() => {
    if (!query.trim()) return state.companies;
    const q = query.toLowerCase();
    return state.companies.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.industry || "").toLowerCase().includes(q) ||
      (c.location || "").toLowerCase().includes(q)
    );
  }, [state.companies, query]);

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submitAdd = () => {
    if (!form.name.trim()) return toast.warning("Company name is required", "Validation");
    const id = `C-${Date.now()}`;
    dispatch({
      type: "ADD_COMPANY",
      payload: { ...form, id, contacts: 1, deals: 0, revenue: "₹0" }
    });
    setShowAdd(false);
    setForm({ name: "", industry: "", location: "", website: "", status: "Active" });
    toast.success(`Added company "${form.name}"`, "Company Created");
  };

  const openEditModal = (comp) => {
    setEditCompany(comp);
    setForm({
      name: comp.name,
      industry: comp.industry || "",
      location: comp.location || "",
      website: comp.website || "",
      status: comp.status || "Active"
    });
  };

  const submitEdit = () => {
    if (!form.name.trim()) return toast.warning("Company name is required", "Validation");
    dispatch({
      type: "UPDATE_COMPANY",
      payload: { id: editCompany.id, ...form }
    });
    setEditCompany(null);
    setForm({ name: "", industry: "", location: "", website: "", status: "Active" });
    toast.success(`Updated company "${form.name}"`, "Changes Saved");
  };

  const handleDelete = (comp) => {
    dispatch({ type: "DELETE_COMPANY", payload: comp.id });
    if (selectedCompany && selectedCompany.id === comp.id) setSelectedCompany(null);
    toast.info(`Deleted company "${comp.name}"`, "Company Removed");
  };

  return (
    <div className="p-5 flex flex-col gap-4 min-w-0 animate-fadeIn">
      {/* ADD COMPANY MODAL */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Company">
        <div className="flex flex-col gap-4">
          <FormField label="Company name" required>
            <Input value={form.name} onChange={setF("name")} placeholder="Acme Technologies Private Limited" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Industry">
              <Input value={form.industry} onChange={setF("industry")} placeholder="Enterprise Software" />
            </FormField>
            <FormField label="Location">
              <Input value={form.location} onChange={setF("location")} placeholder="Mumbai, Maharashtra" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Website">
              <Input value={form.website} onChange={setF("website")} placeholder="https://acme.com" />
            </FormField>
            <FormField label="Status">
              <Select value={form.status} onChange={setF("status")}>
                {["Active", "Customer", "At Risk", "New"].map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FormField>
          </div>
          <SubmitBtn onClick={submitAdd}>Add Company Account</SubmitBtn>
        </div>
      </Modal>

      {/* EDIT COMPANY MODAL */}
      <Modal open={!!editCompany} onClose={() => setEditCompany(null)} title="Edit Company Account">
        <div className="flex flex-col gap-4">
          <FormField label="Company name" required>
            <Input value={form.name} onChange={setF("name")} placeholder="Company Name" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Industry">
              <Input value={form.industry} onChange={setF("industry")} />
            </FormField>
            <FormField label="Location">
              <Input value={form.location} onChange={setF("location")} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Website">
              <Input value={form.website} onChange={setF("website")} />
            </FormField>
            <FormField label="Status">
              <Select value={form.status} onChange={setF("status")}>
                {["Active", "Customer", "At Risk", "New"].map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FormField>
          </div>
          <SubmitBtn onClick={submitEdit}>Save Company Details</SubmitBtn>
        </div>
      </Modal>      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="crm-display text-[22px] font-bold flex items-center gap-2" style={{ color: T.ink }}>
            Companies
            <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: T.lineSoft, color: T.inkSoft }}>
              {state.companies.length}
            </span>
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>
            Corporate accounts — click any company to see linked contacts and deals.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="crm-focusable flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold text-white shadow-xs transition hover:opacity-95"
          style={{ background: T.accent }}
        >
          <Plus size={15} /> Add Company
        </button>
      </div>

      {state.companies.length === 0 ? (
        <div className="crm-card rounded-2xl p-16 text-center flex flex-col items-center justify-center gap-3 w-full my-4" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: T.lineSoft, color: T.inkSoft }}>
            <Building2 size={24} />
          </div>
          <div>
            <h3 className="crm-display text-[16px] font-bold" style={{ color: T.ink }}>No companies yet</h3>
            <p className="text-[13px] mt-1" style={{ color: T.inkFaint }}>Add a company account to group associated contacts, deals, and policies.</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="mt-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition hover:opacity-95" style={{ background: T.accent }}>
            Add company record
          </button>
        </div>
      ) : (
        <>
          {/* Search Bar */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg max-w-md" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
            <Search size={14} style={{ color: T.inkFaint }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, industry, or location…"
              className="flex-1 text-[13px] outline-none bg-transparent"
              style={{ color: T.ink }}
            />
            {query && <button onClick={() => setQuery("")}><X size={13} className="text-gray-400" /></button>}
          </div>

          {/* Grid of Company Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(c => (
              <div
                key={c.id}
                onClick={() => setSelectedCompany(c)}
                className="crm-card rounded-xl p-4 flex flex-col gap-3 cursor-pointer transition-all hover:shadow-md hover:border-amber-300 group"
                style={{ background: T.surface, border: `1px solid ${T.line}` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform" style={{ background: T.accentSoft, color: T.accent }}>
                      <Building2 size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="crm-display text-[14.5px] font-bold truncate group-hover:text-amber-800 transition-colors" style={{ color: T.ink }}>
                        {c.name}
                      </h3>
                      <p className="text-[12px] truncate" style={{ color: T.inkFaint }}>{c.industry || "Enterprise Account"}</p>
                    </div>
                  </div>
                  <StatusBadge status={c.status || "Active"} />
                </div>

                <div className="flex flex-col gap-1.5 text-[12px]" style={{ color: T.inkSoft }}>
                  <span className="flex items-center gap-2 truncate">
                    <MapPin size={13} style={{ color: T.inkFaint }} className="shrink-0" />
                    {c.location || "Location not specified"}
                  </span>
                  {c.website && (
                    <a
                      href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 hover:underline truncate"
                      style={{ color: T.accent }}
                    >
                      <ExternalLink size={12} className="shrink-0" />
                      {c.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 text-[12px] border-t" style={{ borderColor: T.lineSoft }}>
                  <span className="crm-mono" style={{ color: T.inkFaint }}>
                    {c.contacts || 0} Contacts · {c.deals || 0} Deals
                  </span>
                  <span className="crm-mono font-bold text-emerald-600">{c.revenue || "₹0"}</span>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-400">
                No companies found matching "{query}"
              </div>
            )}
          </div>
        </>
      )}

      {/* COMPANY DETAIL SLIDE-OUT DRAWER */}
      {activeCompany && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={() => setSelectedCompany(null)}>
          <div
            className="w-[480px] max-w-[95vw] h-full shadow-2xl flex flex-col gap-5 p-6 overflow-y-auto crm-scroll animate-slideInRight"
            style={{ background: T.surface }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b pb-4" style={{ borderColor: T.lineSoft }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: T.accentSoft, color: T.accent }}>
                  <Building2 size={24} />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: T.accent }}>Company Account</span>
                  <h2 className="crm-display text-[18px] font-bold text-gray-900 leading-snug">{activeCompany.name}</h2>
                  <p className="text-[12.5px] text-gray-500 font-medium">{activeCompany.industry}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openEditModal(activeCompany)}
                  className="crm-focusable p-1.5 rounded-lg border hover:bg-gray-100 text-gray-600"
                  title="Edit Company"
                  style={{ borderColor: T.line }}
                >
                  <Edit3 size={15} />
                </button>
                <button
                  onClick={() => setSelectedCompany(null)}
                  className="crm-focusable p-1.5 rounded-lg border hover:bg-gray-100 text-gray-600"
                  style={{ borderColor: T.line }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl border text-center" style={{ borderColor: T.line }}>
                <p className="text-[10.5px] uppercase font-bold text-gray-400">Total ARR</p>
                <p className="text-[16px] font-bold crm-mono text-emerald-600 mt-0.5">{activeCompany.revenue || "₹0"}</p>
              </div>
              <div className="p-3 rounded-xl border text-center" style={{ borderColor: T.line }}>
                <p className="text-[10.5px] uppercase font-bold text-gray-400">Contacts</p>
                <p className="text-[16px] font-bold crm-mono text-gray-800 mt-0.5">{companyContacts.length || activeCompany.contacts || 0}</p>
              </div>
              <div className="p-3 rounded-xl border text-center" style={{ borderColor: T.line }}>
                <p className="text-[10.5px] uppercase font-bold text-gray-400">Open Deals</p>
                <p className="text-[16px] font-bold crm-mono mt-0.5" style={{ color: T.accent }}>{companyDeals.length || activeCompany.deals || 0}</p>
              </div>
            </div>

            {/* Overview Details */}
            <div className="p-4 rounded-xl flex flex-col gap-2.5 border" style={{ borderColor: T.line }}>
              <h4 className="font-bold text-[13px] text-gray-900">Organization Info</h4>
              <div className="flex flex-col gap-2 text-[12.5px]">
                <div className="flex justify-between py-1 border-b" style={{ borderColor: T.lineSoft }}>
                  <span className="text-gray-500">Status</span>
                  <StatusBadge status={activeCompany.status || "Active"} />
                </div>
                <div className="flex justify-between py-1 border-b" style={{ borderColor: T.lineSoft }}>
                  <span className="text-gray-500">Headquarters</span>
                  <span className="font-medium text-gray-800">{activeCompany.location || "Not specified"}</span>
                </div>
                {activeCompany.website && (
                  <div className="flex justify-between py-1 border-b" style={{ borderColor: T.lineSoft }}>
                    <span className="text-gray-500">Website</span>
                    <a
                      href={activeCompany.website.startsWith("http") ? activeCompany.website : `https://${activeCompany.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                    >
                      {activeCompany.website.replace(/^https?:\/\//, "")} <ExternalLink size={12} />
                    </a>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Account ID</span>
                  <span className="crm-mono text-gray-600">{activeCompany.id}</span>
                </div>
              </div>
            </div>

            {/* Linked Contacts */}
            <div className="p-4 rounded-xl flex flex-col gap-3 border" style={{ borderColor: T.line }}>
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-[13px] text-gray-900">Key People ({companyContacts.length})</h4>
              </div>
              {companyContacts.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {companyContacts.map(c => (
                    <div
                      key={c.id}
                      onClick={() => navigate(c.type === "Customer" ? `/customers?id=${c.id}` : `/leads?id=${c.id}`)}
                      className="p-2.5 rounded-lg border hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex items-center justify-between cursor-pointer"
                      style={{ borderColor: T.lineSoft }}
                    >
                      <div>
                        <p className="text-[13px] font-semibold text-gray-800">{c.name}</p>
                        <p className="text-[11.5px] text-gray-500">{c.title || c.type} · {c.phone || c.email}</p>
                      </div>
                      <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        {c.type}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-gray-400 py-2">No linked contacts found in database.</p>
              )}
            </div>

            {/* Linked Deals */}
            <div className="p-4 rounded-xl flex flex-col gap-3 border" style={{ borderColor: T.line }}>
              <h4 className="font-bold text-[13px] text-gray-900">Opportunities ({companyDeals.length})</h4>
              {companyDeals.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {companyDeals.map(d => (
                    <div
                      key={d.id}
                      onClick={() => navigate(`/deals?id=${d.id}`)}
                      className="p-2.5 rounded-lg border hover:border-amber-400 hover:bg-amber-50/30 transition-all flex items-center justify-between cursor-pointer"
                      style={{ borderColor: T.lineSoft }}
                    >
                      <div>
                        <p className="text-[13px] font-semibold text-gray-800">{d.deal}</p>
                        <p className="text-[11.5px] text-gray-500">Stage: <strong style={{ color: T.accent }}>{d.stage}</strong> · Closes: {d.close || "—"}</p>
                      </div>
                      <span className="crm-mono text-[13px] font-bold text-emerald-600">
                        {fmtINR(d.value || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-gray-400 py-2">No active deals registered for this account.</p>
              )}
            </div>

            {/* Footer Action */}
            <div className="flex items-center justify-between pt-3 border-t mt-auto" style={{ borderColor: T.line }}>
              <button
                onClick={() => handleDelete(activeCompany)}
                className="crm-focusable flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} /> Delete Company
              </button>
              <button
                onClick={() => setSelectedCompany(null)}
                className="crm-focusable px-4 py-2 rounded-lg text-[12.5px] font-medium border hover:bg-gray-50"
                style={{ borderColor: T.line }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

