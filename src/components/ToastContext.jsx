import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { T } from "../tokens";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random().toString(36).slice(2, 6);
    const newToast = {
      id,
      type: toast.type || "info", // "success" | "error" | "warning" | "info"
      title: toast.title || "",
      message: typeof toast === "string" ? toast : toast.message || "",
      duration: toast.duration || 3500,
    };

    setToasts((prev) => [...prev, newToast]);

    if (newToast.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, newToast.duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg, title = "Success") => addToast({ type: "success", title, message: msg }),
    error: (msg, title = "Error") => addToast({ type: "error", title, message: msg, duration: 5000 }),
    warning: (msg, title = "Warning") => addToast({ type: "warning", title, message: msg }),
    info: (msg, title = "Notice") => addToast({ type: "info", title, message: msg }),
  };

  const getStyle = (type) => {
    switch (type) {
      case "success":
        return {
          bg: "#FFFFFF",
          border: `1px solid ${T.positive}40`,
          iconColor: T.positive,
          badgeBg: T.positiveSoft,
          Icon: CheckCircle2,
          shadow: "0 10px 25px -5px rgba(14, 143, 92, 0.15)",
        };
      case "error":
        return {
          bg: "#FFFFFF",
          border: `1px solid ${T.negative}40`,
          iconColor: T.negative,
          badgeBg: T.negativeSoft,
          Icon: AlertCircle,
          shadow: "0 10px 25px -5px rgba(214, 66, 63, 0.15)",
        };
      case "warning":
        return {
          bg: "#FFFFFF",
          border: `1px solid ${T.amber}40`,
          iconColor: T.amber,
          badgeBg: T.amberSoft,
          Icon: AlertTriangle,
          shadow: "0 10px 25px -5px rgba(178, 101, 11, 0.15)",
        };
      default:
        return {
          bg: "#FFFFFF",
          border: `1px solid ${T.accent}40`,
          iconColor: T.accent,
          badgeBg: T.accentSoft,
          Icon: Info,
          shadow: "0 10px 25px -5px rgba(55, 48, 224, 0.15)",
        };
    }
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Overlay Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0">
        {toasts.map((t) => {
          const style = getStyle(t.type);
          const IconComponent = style.Icon;
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl transition-all duration-300 transform translate-y-0 opacity-100 backdrop-blur-md"
              style={{
                background: style.bg,
                border: style.border,
                boxShadow: style.shadow,
                animation: "toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: style.badgeBg }}
              >
                <IconComponent size={17} style={{ color: style.iconColor }} />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                {t.title && (
                  <p className="text-[13px] font-semibold leading-tight" style={{ color: T.ink }}>
                    {t.title}
                  </p>
                )}
                <p className="text-[12px] leading-snug mt-0.5" style={{ color: T.inkSoft }}>
                  {t.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="crm-focusable p-1 rounded-md hover:bg-gray-100 transition-colors shrink-0 text-gray-400 hover:text-gray-700"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      success: (msg) => console.log("Toast [success]:", msg),
      error: (msg) => console.error("Toast [error]:", msg),
      warning: (msg) => console.warn("Toast [warning]:", msg),
      info: (msg) => console.log("Toast [info]:", msg),
    };
  }
  return context;
}
