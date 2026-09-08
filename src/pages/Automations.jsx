import React, { useState } from "react";
import { Zap, Plus, Play, Pause, CheckCircle2 } from "lucide-react";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import Modal, { FormField, Input, Select, SubmitBtn } from "../components/Modal";

export default function Automations() {
  const { state, dispatch } = useCrm();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", trigger: "Deal inactive for 7+ days", action: "Notify deal owner via in-app alert" });

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = () => {
    if (!form.name) return alert("Name required");
    dispatch({ type: "ADD_AUTOMATION", payload: { ...form, status: "active" } });
    setShowAdd(false);
    setForm({ name: "", trigger: "Deal inactive for 7+ days", action: "Notify deal owner via in-app alert" });
  };

  return (
    <div className="p-5 flex flex-col gap-4">
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create Automation Workflow">
        <div className="flex flex-col gap-4">
          <FormField label="Workflow Name" required><Input value={form.name} onChange={setF("name")} placeholder="Stale lead alert" /></FormField>
          <FormField label="When Trigger Happens">
            <Select value={form.trigger} onChange={setF("trigger")}>
              {["Deal inactive for 7+ days", "Lead score exceeds 80", "Task overdue by 2 days", "Deal stage changed to Won", "New lead created from Website"].map(t => <option key={t}>{t}</option>)}
            </Select>
          </FormField>
          <FormField label="Then Execute Action">
            <Select value={form.action} onChange={setF("action")}>
              {["Notify deal owner via in-app alert", "Assign to Senior Account Executive", "Send email to team manager", "Post to Slack #wins channel", "Send welcome email template"].map(a => <option key={a}>{a}</option>)}
            </Select>
          </FormField>
          <SubmitBtn onClick={submit}>Create Workflow</SubmitBtn>
        </div>
      </Modal>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="crm-display text-[20px] font-semibold flex items-center gap-2" style={{ color: T.ink }}>
            <Zap size={20} style={{ color: T.amber }} /> Workflow Automations
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>Trigger-based rules to automate sales ops & notifications</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="crm-focusable flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold" style={{ background: T.accent, color: "#fff" }}>
          <Plus size={14} /> New workflow
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {state.automations.map(a => (
          <div key={a.id} className="crm-card rounded-xl p-4 flex flex-col justify-between gap-3" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="crm-display text-[15px] font-semibold" style={{ color: T.ink }}>{a.name}</h3>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full inline-block mt-1" style={{ background: a.status === "active" ? T.positiveSoft : T.lineSoft, color: a.status === "active" ? T.positive : T.inkFaint }}>
                  {a.status.toUpperCase()}
                </span>
              </div>
              <button onClick={() => dispatch({ type: "TOGGLE_AUTOMATION", payload: a.id })} className="crm-focusable p-2 rounded-lg" style={{ background: T.canvas }}>
                {a.status === "active" ? <Pause size={16} style={{ color: T.amber }} /> : <Play size={16} style={{ color: T.positive }} />}
              </button>
            </div>

            <div className="flex flex-col gap-1.5 text-[12.5px] p-3 rounded-lg" style={{ background: T.canvas }}>
              <p><strong style={{ color: T.inkFaint }}>IF:</strong> {a.trigger}</p>
              <p><strong style={{ color: T.accent }}>THEN:</strong> {a.action}</p>
            </div>

            <div className="flex items-center justify-between text-[11.5px] crm-mono" style={{ color: T.inkFaint }}>
              <span className="flex items-center gap-1"><CheckCircle2 size={13} style={{ color: T.positive }} /> Triggered {a.triggered} times</span>
              <span>ID: {a.id}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
