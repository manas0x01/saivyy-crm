import React, { useState } from "react";
import { Megaphone, Plus, Mail, Globe, Send } from "lucide-react";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import { useToast } from "../components/ToastContext";
import Modal, { FormField, Input, Select, SubmitBtn } from "../components/Modal";
import { StatusBadge } from "../components/shared";

export default function Campaigns() {
  const { state, dispatch } = useCrm();
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Email", status: "Active" });

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = () => {
    if (!form.name.trim()) return toast.warning("Campaign name required");
    dispatch({ type: "ADD_CAMPAIGN", payload: { ...form, sent: 0, openRate: 0, clickRate: 0, created: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) } });
    toast.success(`Campaign "${form.name}" created`);
    setShowAdd(false);
    setForm({ name: "", type: "Email", status: "Active" });
  };

  return (
    <div className="p-5 flex flex-col gap-4">
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Campaign">
        <div className="flex flex-col gap-4">
          <FormField label="Campaign Name" required><Input value={form.name} onChange={setF("name")} placeholder="Q4 Promotion" /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Type"><Select value={form.type} onChange={setF("type")}>{["Email","LinkedIn","SMS"].map(t => <option key={t}>{t}</option>)}</Select></FormField>
            <FormField label="Status"><Select value={form.status} onChange={setF("status")}>{["Active","Completed","Draft"].map(s => <option key={s}>{s}</option>)}</Select></FormField>
          </div>
          <SubmitBtn onClick={submit}>Launch Campaign</SubmitBtn>
        </div>
      </Modal>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="crm-display text-[20px] font-semibold flex items-center gap-2" style={{ color: T.ink }}>
            <Megaphone size={20} style={{ color: T.accent }} /> Outreach Campaigns
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>Email sequences & LinkedIn marketing campaigns</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold" style={{ background: T.accent, color: "#fff" }}>
          <Plus size={14} /> New campaign
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {state.campaigns.map(c => (
          <div key={c.id} className="crm-card rounded-xl p-4 flex flex-col gap-3" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: T.accentSoft, color: T.accent }}>
                  {c.type === "LinkedIn" ? <Globe size={16} /> : <Mail size={16} />}
                </div>
                <div>
                  <h3 className="crm-display text-[14px] font-semibold" style={{ color: T.ink }}>{c.name}</h3>
                  <p className="text-[11.5px]" style={{ color: T.inkFaint }}>{c.type} · Created {c.created}</p>
                </div>
              </div>
              <StatusBadge status={c.status} />
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 rounded-lg crm-mono text-center" style={{ background: T.canvas }}>
              <div>
                <p className="text-[11px]" style={{ color: T.inkFaint }}>SENT</p>
                <p className="text-[15px] font-semibold" style={{ color: T.ink }}>{c.sent}</p>
              </div>
              <div>
                <p className="text-[11px]" style={{ color: T.inkFaint }}>OPEN RATE</p>
                <p className="text-[15px] font-semibold" style={{ color: T.positive }}>{c.openRate}%</p>
              </div>
              <div>
                <p className="text-[11px]" style={{ color: T.inkFaint }}>CLICK RATE</p>
                <p className="text-[15px] font-semibold" style={{ color: T.accent }}>{c.clickRate}%</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
