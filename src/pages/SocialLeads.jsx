import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Share2, RefreshCw, Zap, Inbox, Plus, Search, Filter, CheckCircle2,
  Clock, MessageCircle, ExternalLink, ChevronDown, ChevronUp, Send,
  Globe, Wifi, WifiOff, BarChart2, TrendingUp, Users, Star, X,
  AlertCircle, ArrowRight, Building2, Phone, Mail, Briefcase, DollarSign,
  Tag, Eye, Check, Loader2, Play, Settings2
} from "lucide-react";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import { useToast } from "../components/ToastContext";
import { useNavigate } from "react-router-dom";
import * as api from "../services/api";

// ── Platform Brand Config ──────────────────────────────────────────────────
const PLATFORM_CONFIG = {
  LinkedIn: {
    color: "#0A66C2",
    gradient: "linear-gradient(135deg, #0A66C2 0%, #0073b1 100%)",
    bg: "#EBF4FC",
    badge: "bg-[#EBF4FC] text-[#0A66C2]",
    icon: LinkedInIcon,
  },
  Meta: {
    color: "#1877F2",
    gradient: "linear-gradient(135deg, #1877F2 0%, #3b5998 100%)",
    bg: "#EEF4FF",
    badge: "bg-[#EEF4FF] text-[#1877F2]",
    icon: MetaIcon,
  },
  Instagram: {
    color: "#E4405F",
    gradient: "linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)",
    bg: "#FEF0F3",
    badge: "bg-[#FEF0F3] text-[#E4405F]",
    icon: InstagramIcon,
  },
  WhatsApp: {
    color: "#25D366",
    gradient: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
    bg: "#EEFBF4",
    badge: "bg-[#EEFBF4] text-[#128C7E]",
    icon: WhatsAppIcon,
  },
  X: {
    color: "#0F1419",
    gradient: "linear-gradient(135deg, #0F1419 0%, #374151 100%)",
    bg: "#F3F4F6",
    badge: "bg-[#F3F4F6] text-[#0F1419]",
    icon: XIcon,
  },
};

// ── Platform Icons (SVG) ───────────────────────────────────────────────────
function LinkedInIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#0A66C2">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

function MetaIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function InstagramIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fcb045"/>
          <stop offset="50%" stopColor="#fd1d1d"/>
          <stop offset="100%" stopColor="#833ab4"/>
        </linearGradient>
      </defs>
      <path fill="url(#ig-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
    </svg>
  );
}

function WhatsAppIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
    </svg>
  );
}

function XIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#0F1419">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.258 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

// ── Status Badge ────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const map = {
    New: { bg: "#FEF3C7", color: "#B45309", dot: "#F59E0B" },
    Extracted: { bg: "#D1FAE5", color: "#065F46", dot: "#10B981" },
    Replied: { bg: "#DBEAFE", color: "#1E40AF", dot: "#3B82F6" },
    Ignored: { bg: "#F3F4F6", color: "#6B7280", dot: "#9CA3AF" },
  };
  const s = map[status] || map.New;
  return (
    <span style={{ background: s.bg, color: s.color }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold">
      <span style={{ background: s.dot }} className="w-1.5 h-1.5 rounded-full" />
      {status}
    </span>
  );
}

// ── Intent Badge ────────────────────────────────────────────────────────────
function IntentBadge({ intent, score }) {
  const isHigh = intent === "High Intent";
  const isMed = intent === "Medium Intent";
  const bg = isHigh ? "#FEF0E6" : isMed ? "#FEF9C3" : "#F3F4F6";
  const color = isHigh ? "#BC5A1B" : isMed ? "#854D0E" : "#6B7280";
  return (
    <span style={{ background: bg, color }} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold">
      <Star size={9} fill={color} />
      {score}% — {isHigh ? "High" : isMed ? "Medium" : "Low"} Intent
    </span>
  );
}

// ── Platform Pill ────────────────────────────────────────────────────────────
function PlatformPill({ platform }) {
  const cfg = PLATFORM_CONFIG[platform] || { color: "#BC5A1B", bg: "#FAF0E6", icon: Share2 };
  const Icon = cfg.icon;
  return (
    <span style={{ background: cfg.bg, color: cfg.color }}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold">
      <Icon size={11} />
      {platform}
    </span>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, iconColor, iconBg, label, value, sub }) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-2xl border crm-card"
      style={{ background: T.surface, borderColor: T.line }}>
      <div className="flex items-center gap-3">
        <div style={{ background: iconBg }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
          <Icon size={16} style={{ color: iconColor }} />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium" style={{ color: T.inkFaint }}>{label}</div>
          <div className="text-xl font-bold crm-display leading-tight" style={{ color: T.ink }}>{value}</div>
        </div>
      </div>
      {sub && <div className="text-[11px]" style={{ color: T.inkFaint }}>{sub}</div>}
    </div>
  );
}

// ── Platform Account Card ────────────────────────────────────────────────────
function AccountCard({ account, onToggle }) {
  const cfg = PLATFORM_CONFIG[account.platform] || { color: "#BC5A1B", gradient: "linear-gradient(135deg, #BC5A1B, #A44C10)", bg: "#FAF0E6", icon: Globe };
  const Icon = cfg.icon;
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    await onToggle(account.id);
    setToggling(false);
  };

  return (
    <div className="relative flex flex-col gap-3 p-4 rounded-2xl border transition-all crm-card"
      style={{ background: T.surface, borderColor: account.status ? cfg.color + "33" : T.line, minWidth: 200 }}>
      {/* Platform Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div style={{ background: cfg.gradient }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <Icon size={18} style={{ color: "#fff" }} />
          </div>
          <div>
            <div className="text-[13px] font-bold leading-tight" style={{ color: T.ink }}>{account.platform}</div>
            <div className="text-[10.5px] font-medium" style={{ color: T.inkFaint }}>{account.accountType}</div>
          </div>
        </div>
        <button onClick={handleToggle} disabled={toggling}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all hover:opacity-80 shrink-0"
          style={{
            background: account.status ? "#ECFDF5" : "#F3F4F6",
            color: account.status ? "#065F46" : "#6B7280",
            border: `1px solid ${account.status ? "#6EE7B7" : "#D1D5DB"}`,
          }}>
          {toggling ? <Loader2 size={10} className="animate-spin" /> : (account.status ? <Wifi size={10} /> : <WifiOff size={10} />)}
          {account.status ? "Live" : "Off"}
        </button>
      </div>

      {/* Handle */}
      <div className="text-[11.5px] font-medium px-1" style={{ color: T.inkSoft }}>{account.handle}</div>

      {/* Metrics */}
      <div className="flex gap-3 text-[11px] font-semibold">
        <div className="flex flex-col items-center px-2 py-1.5 rounded-lg flex-1" style={{ background: T.canvas }}>
          <span style={{ color: cfg.color }} className="text-base font-black leading-none">{account.metrics?.inquiries ?? 0}</span>
          <span style={{ color: T.inkFaint }}>Inquiries</span>
        </div>
        <div className="flex flex-col items-center px-2 py-1.5 rounded-lg flex-1" style={{ background: T.canvas }}>
          <span style={{ color: "#10B981" }} className="text-base font-black leading-none">{account.metrics?.extracted ?? 0}</span>
          <span style={{ color: T.inkFaint }}>Extracted</span>
        </div>
        <div className="flex flex-col items-center px-2 py-1.5 rounded-lg flex-1" style={{ background: T.canvas }}>
          <span style={{ color: T.accent }} className="text-base font-black leading-none">{account.metrics?.yield ?? "0%"}</span>
          <span style={{ color: T.inkFaint }}>Yield</span>
        </div>
      </div>

      <div className="text-[10px] flex items-center gap-1" style={{ color: T.inkFaint }}>
        <RefreshCw size={9} />
        {account.lastSync}
      </div>

      {/* Live indicator */}
      {account.status && (
        <div className="absolute top-3 right-16 flex items-center gap-1">
          <span style={{ background: "#10B981" }} className="w-2 h-2 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
}

// ── AI Reply Modal ───────────────────────────────────────────────────────────
function ReplyModal({ inquiry, onClose, onSend }) {
  const cfg = PLATFORM_CONFIG[inquiry.platform] || {};
  const [replyText, setReplyText] = useState(
    `Hi ${inquiry.senderName.split(' ')[0]}! Thank you for reaching out to Saivyy CRM. We'd love to show you how we can help ${inquiry.senderCompany || 'your team'} streamline sales workflows and boost conversion. Can we schedule a personalized demo call this week? Our team will prepare a custom solution walkthrough for you.`
  );
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    await onSend(inquiry.id, replyText);
    setSending(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(28,25,23,0.55)", backdropFilter: "blur(6px)" }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b"
          style={{ borderColor: T.line }}>
          <div className="flex items-center gap-3">
            <div style={{ background: cfg.gradient || T.accent }}
              className="w-8 h-8 rounded-xl flex items-center justify-center">
              <MessageCircle size={15} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold" style={{ color: T.ink }}>AI Quick Reply</div>
              <div className="text-xs" style={{ color: T.inkFaint }}>Replying to {inquiry.senderName} via {inquiry.platform}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={16} style={{ color: T.inkFaint }} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Original message */}
          <div className="p-3 rounded-xl text-xs" style={{ background: T.canvas, color: T.inkSoft }}>
            <div className="font-semibold mb-1" style={{ color: T.inkFaint }}>Original Query:</div>
            <div className="italic leading-relaxed">"{inquiry.queryText.slice(0, 180)}{inquiry.queryText.length > 180 ? '…' : ''}"</div>
          </div>

          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: T.inkSoft }}>Your Reply (AI-crafted, editable):</label>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              rows={5}
              className="w-full resize-none text-sm p-3 rounded-xl border outline-none focus:ring-2 leading-relaxed"
              style={{ background: T.canvas, color: T.ink, borderColor: T.line, "--tw-ring-color": T.accent + "66" }}
            />
          </div>

          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:bg-gray-50"
              style={{ color: T.inkSoft, borderColor: T.line }}>
              Cancel
            </button>
            <button onClick={handleSend} disabled={sending || !replyText.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: sending ? T.inkFaint : T.accent }}>
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sending ? "Sending…" : "Send Reply"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Connect Account Modal ────────────────────────────────────────────────────
function ConnectModal({ onClose, onConnect }) {
  const [platform, setPlatform] = useState("LinkedIn");
  const [step, setStep] = useState(1); // 1=select, 2=auth, 3=success
  const [connecting, setConnecting] = useState(false);
  const platforms = ["LinkedIn", "Meta", "Instagram", "WhatsApp", "X"];

  const handleConnect = async () => {
    setConnecting(true);
    setStep(2);
    await new Promise(r => setTimeout(r, 1800));
    await onConnect({ platform });
    setStep(3);
    setConnecting(false);
    setTimeout(onClose, 1500);
  };

  const cfg = PLATFORM_CONFIG[platform] || {};
  const Icon = cfg.icon || Globe;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(28,25,23,0.55)", backdropFilter: "blur(6px)" }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: T.surface, border: `1px solid ${T.line}` }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: T.line }}>
          <div className="flex items-center gap-3">
            <div style={{ background: cfg.gradient || T.accent }} className="w-8 h-8 rounded-xl flex items-center justify-center">
              <Plus size={15} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold" style={{ color: T.ink }}>Connect Social Channel</div>
              <div className="text-xs" style={{ color: T.inkFaint }}>OAuth 2.0 secure connection</div>
            </div>
          </div>
          <button onClick={onClose}><X size={16} style={{ color: T.inkFaint }} /></button>
        </div>

        <div className="p-5">
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="text-xs font-semibold" style={{ color: T.inkFaint }}>Select Platform</div>
              <div className="grid grid-cols-3 gap-2">
                {platforms.map(p => {
                  const pcfg = PLATFORM_CONFIG[p] || {};
                  const PIco = pcfg.icon || Globe;
                  return (
                    <button key={p} onClick={() => setPlatform(p)}
                      className="flex flex-col items-center gap-2 py-3 px-2 rounded-xl border transition-all"
                      style={{
                        borderColor: platform === p ? pcfg.color : T.line,
                        background: platform === p ? (pcfg.bg || T.accentSoft) : T.canvas,
                        transform: platform === p ? "scale(1.04)" : "scale(1)",
                      }}>
                      <PIco size={20} />
                      <span className="text-[11px] font-semibold" style={{ color: T.ink }}>{p}</span>
                    </button>
                  );
                })}
              </div>

              <div className="p-3 rounded-xl text-xs flex items-start gap-2" style={{ background: T.accentSoft, color: T.accent }}>
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                <span>Demo Mode: This is a simulated OAuth flow. In production, your real {platform} Business API credentials are used for live data extraction.</span>
              </div>

              <button onClick={handleConnect}
                className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{ background: cfg.gradient || T.accent }}>
                <Icon size={16} />
                Authorize {platform} Account
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div style={{ background: cfg.gradient || T.accent }} className="w-14 h-14 rounded-2xl flex items-center justify-center animate-pulse">
                <Icon size={26} style={{ color: "#fff" }} />
              </div>
              <div className="text-sm font-semibold" style={{ color: T.ink }}>Connecting to {platform}…</div>
              <div className="text-xs text-center" style={{ color: T.inkFaint }}>
                Authenticating via OAuth 2.0 · Fetching page permissions · Setting up webhooks
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: T.canvas }}>
                <div className="h-full rounded-full animate-[progress_1.8s_ease_forwards]"
                  style={{ background: cfg.color || T.accent, width: "80%" }} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div style={{ background: "#ECFDF5" }} className="w-14 h-14 rounded-2xl flex items-center justify-center">
                <CheckCircle2 size={28} style={{ color: "#10B981" }} />
              </div>
              <div className="text-base font-bold" style={{ color: T.ink }}>{platform} Connected!</div>
              <div className="text-xs" style={{ color: T.inkFaint }}>Lead extraction is now active.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Inquiry Card ──────────────────────────────────────────────────────────────
function InquiryCard({ inquiry, onExtract, onReply, isExtracting }) {
  const [expanded, setExpanded] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const cfg = PLATFORM_CONFIG[inquiry.platform] || { color: "#BC5A1B", bg: "#FAF0E6" };
  const Icon = cfg.icon || Share2;
  const ext = inquiry.extractedData || {};
  const isExtracted = inquiry.status === "Extracted";
  const isReplied = inquiry.status === "Replied";

  return (
    <>
      {showReply && (
        <ReplyModal inquiry={inquiry} onClose={() => setShowReply(false)} onSend={onReply} />
      )}
      <div className="rounded-2xl border overflow-hidden transition-all crm-card"
        style={{
          background: T.surface,
          borderColor: isExtracted ? "#6EE7B7" : isReplied ? "#BFDBFE" : T.line,
          borderLeft: `3.5px solid ${isExtracted ? "#10B981" : isReplied ? "#3B82F6" : cfg.color}`,
        }}>
        {/* Card Header */}
        <div className="flex items-start gap-3 p-4 pb-2">
          {/* Avatar */}
          <div style={{ background: cfg.gradient || cfg.color, flexShrink: 0 }}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm">
            {inquiry.senderName.split(" ").map(w => w[0]).join("").slice(0, 2)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold" style={{ color: T.ink }}>{inquiry.senderName}</span>
                  <PlatformPill platform={inquiry.platform} />
                  <StatusPill status={inquiry.status} />
                </div>
                <div className="text-[11.5px] mt-0.5" style={{ color: T.inkFaint }}>
                  {inquiry.senderTitle && <span>{inquiry.senderTitle} · </span>}
                  <span className="font-semibold">{inquiry.senderCompany}</span>
                  <span className="ml-2 opacity-60">{inquiry.senderHandle}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <IntentBadge intent={inquiry.intent} score={inquiry.intentScore} />
              </div>
            </div>
          </div>
        </div>

        {/* Query Type + Timestamp */}
        <div className="px-4 pb-2 flex items-center gap-2">
          <Tag size={11} style={{ color: T.inkFaint }} />
          <span className="text-[11px] font-semibold" style={{ color: T.inkFaint }}>{inquiry.queryType}</span>
          <span className="text-[11px]" style={{ color: T.inkFaint }}>·</span>
          <Clock size={11} style={{ color: T.inkFaint }} />
          <span className="text-[11px]" style={{ color: T.inkFaint }}>{inquiry.timestamp}</span>
        </div>

        {/* Query Text */}
        <div className="px-4 pb-3">
          <div className="text-[12.5px] leading-relaxed p-3 rounded-xl"
            style={{ background: T.canvas, color: T.inkSoft, fontStyle: "italic" }}>
            "{expanded ? inquiry.queryText : (inquiry.queryText.length > 180 ? inquiry.queryText.slice(0, 180) + "…" : inquiry.queryText)}"
          </div>
          {inquiry.queryText.length > 180 && (
            <button onClick={() => setExpanded(!expanded)}
              className="text-[11px] font-semibold mt-1 px-1 flex items-center gap-1"
              style={{ color: T.accent }}>
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? "Show less" : "Read full message"}
            </button>
          )}
        </div>

        {/* Extracted Data Chips */}
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {ext.email && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
              style={{ background: "#EEF4FF", color: "#1E40AF" }}>
              <Mail size={10} />{ext.email}
            </div>
          )}
          {ext.phone && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
              style={{ background: "#ECFDF5", color: "#065F46" }}>
              <Phone size={10} />{ext.phone}
            </div>
          )}
          {ext.company && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
              style={{ background: "#F5F3FF", color: "#5B21B6" }}>
              <Building2 size={10} />{ext.company}
            </div>
          )}
          {ext.budget && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
              style={{ background: "#FEF3C7", color: "#92400E" }}>
              <DollarSign size={10} />{ext.budget}
            </div>
          )}
          {ext.teamSize && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
              style={{ background: "#FFF7ED", color: "#9A3412" }}>
              <Users size={10} />{ext.teamSize}
            </div>
          )}
          {ext.industry && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
              style={{ background: T.canvas, color: T.inkSoft }}>
              <Briefcase size={10} />{ext.industry}
            </div>
          )}
        </div>

        {/* Replied text preview */}
        {isReplied && inquiry.replyText && (
          <div className="px-4 pb-3">
            <div className="text-[11px] px-3 py-2 rounded-lg" style={{ background: "#EFF6FF", color: "#1E40AF" }}>
              <span className="font-semibold">Replied: </span>{inquiry.replyText.slice(0, 120)}…
            </div>
          </div>
        )}

        {/* Extracted Lead info */}
        {isExtracted && inquiry.leadId && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 text-[11.5px] px-3 py-2 rounded-lg"
              style={{ background: "#ECFDF5", color: "#065F46" }}>
              <CheckCircle2 size={13} />
              <span className="font-semibold">Extracted to CRM Lead</span>
              <span className="opacity-70">#{inquiry.leadId.slice(-8)}</span>
            </div>
          </div>
        )}

        {/* Action Row */}
        <div className="px-4 pb-4 flex items-center gap-2 flex-wrap border-t pt-3" style={{ borderColor: T.lineSoft }}>
          {!isExtracted && (
            <button
              onClick={() => onExtract(inquiry.id)}
              disabled={isExtracting === inquiry.id}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: isExtracting === inquiry.id ? T.inkFaint : T.accent }}>
              {isExtracting === inquiry.id
                ? <Loader2 size={12} className="animate-spin" />
                : <Zap size={12} />}
              {isExtracting === inquiry.id ? "Extracting…" : "Extract to CRM"}
            </button>
          )}
          {!isReplied && (
            <button onClick={() => setShowReply(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all hover:bg-gray-50"
              style={{ color: T.inkSoft, borderColor: T.line }}>
              <MessageCircle size={12} />
              Quick Reply
            </button>
          )}
          <div className="flex-1" />
          <span className="text-[10.5px]" style={{ color: T.inkFaint }}>{inquiry.platform} · {inquiry.queryType}</span>
        </div>
      </div>
    </>
  );
}

// ── Main SocialLeads Page ─────────────────────────────────────────────────────
export default function SocialLeads() {
  const { state, dispatch } = useCrm();
  const toast = useToast();
  const navigate = useNavigate();

  const [platformFilter, setPlatformFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [intentFilter, setIntentFilter] = useState("All");
  const [searchQ, setSearchQ] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [bulkExtracting, setBulkExtracting] = useState(false);
  const [extractingId, setExtractingId] = useState(null);
  const [showConnect, setShowConnect] = useState(false);
  const [newInquiryId, setNewInquiryId] = useState(null);

  const accounts = state.socialAccounts || [];
  const inquiries = state.socialInquiries || [];

  // ── Derived KPIs ──────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = inquiries.length;
    const extracted = inquiries.filter(si => si.status === "Extracted").length;
    const newCount = inquiries.filter(si => si.status === "New").length;
    const highIntent = inquiries.filter(si => si.intent === "High Intent").length;
    const yieldPct = total > 0 ? Math.round((extracted / total) * 100) : 0;
    return { total, extracted, newCount, highIntent, yieldPct };
  }, [inquiries]);

  // ── Filtered inquiries ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = inquiries;
    if (platformFilter !== "All") list = list.filter(si => si.platform === platformFilter);
    if (statusFilter !== "All") list = list.filter(si => si.status === statusFilter);
    if (intentFilter !== "All") list = list.filter(si => si.intent === intentFilter);
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      list = list.filter(si =>
        si.senderName?.toLowerCase().includes(q) ||
        si.senderCompany?.toLowerCase().includes(q) ||
        si.queryText?.toLowerCase().includes(q) ||
        si.platform?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [inquiries, platformFilter, statusFilter, intentFilter, searchQ]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    await api.syncSocialChannels();
    toast.success("✅ All channels synced — Meta, Instagram, LinkedIn, X & WhatsApp polled successfully!");
    setSyncing(false);
  };

  const handleSimulate = async () => {
    setSimulating(true);
    const result = await api.simulateSocialInquiry();
    if (result.success) {
      dispatch({ type: "ADD_SOCIAL_INQUIRY", payload: result.inquiry });
      setNewInquiryId(result.inquiry.id);
      toast.success(`📥 New inquiry received from ${result.inquiry.senderName} via ${result.inquiry.platform}!`);
      setTimeout(() => setNewInquiryId(null), 3000);
    } else {
      toast.error("Failed to simulate inquiry");
    }
    setSimulating(false);
  };

  const handleBulkExtract = async () => {
    setBulkExtracting(true);
    const result = await api.bulkExtractSocialLeads();
    if (result.success) {
      if (result.extractedCount === 0) {
        toast.info("No pending high-intent inquiries to extract.");
      } else {
        dispatch({ type: "BATCH_EXTRACT_SOCIAL_LEADS", payload: { leads: result.leads, inquiries: result.inquiries } });
        toast.success(`⚡ Batch extracted ${result.extractedCount} high-intent leads into your CRM pipeline!`);
      }
    } else {
      toast.error("Batch extraction failed");
    }
    setBulkExtracting(false);
  };

  const handleExtract = async (inquiryId) => {
    setExtractingId(inquiryId);
    const result = await api.extractSocialLead(inquiryId);
    if (result.success) {
      dispatch({ type: "EXTRACT_SOCIAL_LEAD", payload: { lead: result.lead, inquiryId } });
      toast.success(
        `🎯 Lead extracted! ${result.lead.name} → CRM #${result.lead.id.slice(-8)}`,
        { action: { label: "View Lead", onClick: () => navigate("/leads") } }
      );
    } else {
      toast.error(result.error || "Extraction failed");
    }
    setExtractingId(null);
  };

  const handleReply = async (inquiryId, replyText) => {
    const result = await api.replySocialInquiry(inquiryId, replyText);
    if (result.success) {
      dispatch({ type: "UPDATE_SOCIAL_INQUIRY", payload: result.inquiry });
      toast.success("💬 Reply sent successfully!");
    } else {
      toast.error("Failed to send reply");
    }
  };

  const handleToggleAccount = async (accountId) => {
    const result = await api.toggleSocialAccount(accountId);
    if (result.success) {
      dispatch({ type: "TOGGLE_SOCIAL_ACCOUNT", payload: result.account });
      const acc = result.account;
      toast.success(acc.status ? `✅ ${acc.platform} connected & listening for inquiries!` : `${acc.platform} disconnected.`);
    }
  };

  const handleConnect = async (data) => {
    const result = await api.connectSocialAccount(data);
    if (result.success) {
      dispatch({ type: "ADD_SOCIAL_ACCOUNT", payload: result.account });
      toast.success(`✅ ${data.platform} channel connected successfully!`);
    }
  };

  const PLATFORMS = ["All", ...Object.keys(PLATFORM_CONFIG)];
  const newSocialCount = inquiries.filter(si => si.status === "New").length;

  return (
    <div className="flex-1 flex flex-col min-h-0 crm-scroll overflow-y-auto"
      style={{ background: T.canvas }}>
      {/* ── Hero Header ───────────────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-0 md:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
                style={{ background: "linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)" }}>
                <Share2 size={17} className="text-white" />
              </div>
              <h1 className="text-xl font-black crm-display" style={{ color: T.ink }}>
                Social Lead Extractor
              </h1>
              {newSocialCount > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white animate-pulse"
                  style={{ background: T.accent }}>
                  {newSocialCount} New
                </span>
              )}
            </div>
            <p className="text-sm" style={{ color: T.inkFaint }}>
              Monitor social platforms · Extract qualified leads · Convert inquiries into CRM pipeline
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowConnect(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all hover:bg-white"
              style={{ color: T.inkSoft, borderColor: T.line, background: T.surface }}>
              <Plus size={13} />
              Connect Channel
            </button>
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all hover:bg-white"
              style={{ color: T.inkSoft, borderColor: T.line, background: T.surface }}>
              <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing…" : "Sync All"}
            </button>
            <button onClick={handleSimulate} disabled={simulating}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all hover:bg-white"
              style={{ color: "#7C3AED", borderColor: "#DDD6FE", background: "#F5F3FF" }}>
              <Play size={13} />
              {simulating ? "Simulating…" : "Simulate Inquiry"}
            </button>
            <button onClick={handleBulkExtract} disabled={bulkExtracting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: bulkExtracting ? T.inkFaint : T.accent }}>
              {bulkExtracting ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
              {bulkExtracting ? "Extracting…" : "Batch Extract High-Intent"}
            </button>
          </div>
        </div>

        {/* ── KPI Strip ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <KpiCard icon={Inbox} iconColor="#BC5A1B" iconBg="#FAF0E6"
            label="Total Inquiries" value={kpis.total}
            sub={`${kpis.newCount} pending extraction`} />
          <KpiCard icon={Zap} iconColor="#10B981" iconBg="#ECFDF5"
            label="Extracted to CRM" value={kpis.extracted}
            sub={`${kpis.yieldPct}% conversion yield`} />
          <KpiCard icon={Star} iconColor="#7C3AED" iconBg="#F5F3FF"
            label="High-Intent Leads" value={kpis.highIntent}
            sub="Intent score ≥ 90" />
          <KpiCard icon={Wifi} iconColor="#0A66C2" iconBg="#EBF4FC"
            label="Active Channels" value={accounts.filter(a => a.status).length}
            sub={`of ${accounts.length} connected`} />
        </div>
      </div>

      {/* ── Connected Platforms ────────────────────────────────────────────── */}
      <div className="px-5 md:px-8 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold" style={{ color: T.ink }}>Connected Platforms</div>
          <button onClick={() => setShowConnect(true)}
            className="text-xs font-semibold flex items-center gap-1"
            style={{ color: T.accent }}>
            <Plus size={12} /> Add Channel
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 crm-scroll -mx-1 px-1">
          {accounts.length === 0 ? (
            <div className="text-sm py-4 text-center w-full" style={{ color: T.inkFaint }}>
              No social accounts connected yet.
            </div>
          ) : (
            accounts.map(acc => (
              <AccountCard key={acc.id} account={acc} onToggle={handleToggleAccount} />
            ))
          )}
        </div>
      </div>

      {/* ── Inquiry Stream ─────────────────────────────────────────────────── */}
      <div className="px-5 md:px-8 pb-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.inkFaint }} />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search inquiries, companies, queries…"
                className="w-full pl-8 pr-4 py-2.5 text-sm rounded-xl border outline-none"
                style={{ background: T.surface, borderColor: T.line, color: T.ink }}
              />
            </div>
          </div>

          {/* Platform tabs */}
          <div className="flex gap-1 overflow-x-auto crm-scroll pb-0.5">
            {PLATFORMS.map(p => {
              const cfg = PLATFORM_CONFIG[p] || {};
              const PIcon = cfg.icon;
              const isActive = platformFilter === p;
              return (
                <button key={p} onClick={() => setPlatformFilter(p)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border whitespace-nowrap transition-all"
                  style={{
                    background: isActive ? (cfg.bg || T.accentSoft) : T.surface,
                    borderColor: isActive ? (cfg.color || T.accent) : T.line,
                    color: isActive ? (cfg.color || T.accent) : T.inkSoft,
                  }}>
                  {PIcon && <PIcon size={11} />}
                  {p}
                </button>
              );
            })}
          </div>

          {/* Status filter */}
          <div className="flex gap-1">
            {["All", "New", "Extracted", "Replied"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="px-3 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap"
                style={{
                  background: statusFilter === s ? T.accentSoft : T.surface,
                  borderColor: statusFilter === s ? T.accent : T.line,
                  color: statusFilter === s ? T.accent : T.inkSoft,
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Row */}
        <div className="flex items-center gap-3 mb-4 text-xs" style={{ color: T.inkFaint }}>
          <span>{filtered.length} inquiries</span>
          {filtered.filter(si => si.status === "New").length > 0 && (
            <span className="font-semibold" style={{ color: T.accent }}>
              · {filtered.filter(si => si.status === "New").length} pending
            </span>
          )}
          {filtered.filter(si => si.status === "Extracted").length > 0 && (
            <span className="font-semibold" style={{ color: "#10B981" }}>
              · {filtered.filter(si => si.status === "Extracted").length} extracted
            </span>
          )}
        </div>

        {/* Inquiry Cards */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: T.canvas }}>
              <Inbox size={28} style={{ color: T.inkFaint }} />
            </div>
            <div>
              <div className="text-sm font-bold mb-1" style={{ color: T.ink }}>No inquiries found</div>
              <div className="text-xs" style={{ color: T.inkFaint }}>
                Try changing filters, or click{" "}
                <button onClick={handleSimulate} className="underline font-semibold" style={{ color: T.accent }}>
                  Simulate Inquiry
                </button>{" "}
                to generate a demo lead.
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map(inquiry => (
              <div key={inquiry.id}
                className={inquiry.id === newInquiryId ? "ring-2 ring-offset-1 rounded-2xl animate-[pulse_0.5s_ease]" : ""}
                style={{ "--tw-ring-color": "#7C3AED" }}>
                <InquiryCard
                  inquiry={inquiry}
                  onExtract={handleExtract}
                  onReply={handleReply}
                  isExtracting={extractingId}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connect Modal */}
      {showConnect && (
        <ConnectModal onClose={() => setShowConnect(false)} onConnect={handleConnect} />
      )}
    </div>
  );
}
