import React, { useEffect } from "react";
import { T } from "../tokens";
import { X } from "lucide-react";

export default function Modal({ open, onClose, title, children, width = 520 }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(18,20,28,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: T.surface, border: `1px solid ${T.line}`, width, maxWidth: "100%" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${T.line}` }}>
          <h2 className="crm-display text-[15px] font-semibold" style={{ color: T.ink }}>{title}</h2>
          <button
            onClick={onClose}
            className="crm-focusable w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ color: T.inkFaint }}
          >
            <X size={15} />
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto crm-scroll flex-1 p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

export function FormField({ label, required, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: T.inkFaint }}>
        {label}{required && <span style={{ color: T.negative }}> *</span>}
      </label>
      {children}
    </div>
  );
}

export function Input({ value, onChange, placeholder, type = "text", ...props }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg text-[13px] outline-none crm-focusable"
      style={{ background: T.canvas, border: `1px solid ${T.line}`, color: T.ink }}
      {...props}
    />
  );
}

export function Select({ value, onChange, children, ...props }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="w-full px-3 py-2 rounded-lg text-[13px] outline-none crm-focusable appearance-none"
      style={{ background: T.canvas, border: `1px solid ${T.line}`, color: T.ink }}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ value, onChange, placeholder, rows = 3, ...props }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none crm-focusable"
      style={{ background: T.canvas, border: `1px solid ${T.line}`, color: T.ink }}
      {...props}
    />
  );
}

export function SubmitBtn({ children, onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="crm-focusable w-full py-2 rounded-lg text-[13px] font-semibold"
      style={{ background: T.accent, color: "#fff", opacity: loading ? 0.7 : 1 }}
    >
      {loading ? "Saving…" : children}
    </button>
  );
}
