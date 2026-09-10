import React, { useState } from "react";
import { useAuth } from "../store/AuthContext";
import { T } from "../tokens";
import { Mail, Lock, User, Briefcase, Sparkles, AlertCircle, ShieldCheck } from "lucide-react";

export default function Login() {
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    orgName: "Saivyy Technologies Private Limited",
    role: "Senior Account Executive",
  });

  const setF = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Please fill in email and password");
      return;
    }
    if (!isLogin && !form.name) {
      setError("Please enter your name for signing up");
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        await signup(form.name, form.email, form.password, "Member", form.orgName);
      }
    } catch (err) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden select-none"
      style={{
        background: `radial-gradient(ellipse at 50% 0%, #FAF0E6 0%, #FAF9F6 65%, #F5F3EF 100%)`,
      }}
    >
      {/* Warm Ambient Orbs */}
      <div
        className="absolute w-[450px] h-[450px] rounded-full filter blur-[120px] pointer-events-none"
        style={{
          background: "#BC5A1B",
          opacity: 0.12,
          top: "-120px",
          left: "-80px",
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full filter blur-[100px] pointer-events-none"
        style={{
          background: "#D97706",
          opacity: 0.08,
          bottom: "-100px",
          right: "-80px",
        }}
      />

      <div className="w-full max-w-[440px] z-10 flex flex-col gap-6">
        {/* Branding Header with Official Logo */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md p-2 bg-[#1C1917] border border-[#292524] transform hover:scale-105 transition-transform duration-300">
            <img src="/logo.png" alt="Saivyy Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="crm-display text-[26px] font-bold tracking-tight mt-1" style={{ color: "#1C1917" }}>
            Saivyy CRM
          </h1>
          <p className="text-[13px] font-medium" style={{ color: "#8C857B" }}>
            Enterprise operations portal for Saivyy Technologies
          </p>
        </div>

        {/* Auth Form Card */}
        <div
          className="rounded-2xl p-7 shadow-xl flex flex-col gap-5 backdrop-blur-md transition-all duration-300"
          style={{
            background: "rgba(255, 255, 255, 0.94)",
            border: `1px solid ${T.line}`,
            boxShadow: `0 20px 40px -15px rgba(188, 90, 27, 0.07), 0 1px 3px rgba(0,0,0,0.04)`,
          }}
        >
          {/* Segmented Form Tabs */}
          <div className="flex p-1 rounded-xl" style={{ background: "#F5F3EF", border: `1px solid ${T.line}` }}>
            <button
              onClick={() => {
                setIsLogin(true);
                setError("");
              }}
              className="flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200"
              style={{
                background: isLogin ? "#FFFFFF" : "transparent",
                color: isLogin ? "#1C1917" : "#8C857B",
                boxShadow: isLogin ? "0 2px 6px -1px rgba(0,0,0,0.08)" : "none",
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError("");
              }}
              className="flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200"
              style={{
                background: !isLogin ? "#FFFFFF" : "transparent",
                color: !isLogin ? "#1C1917" : "#8C857B",
                boxShadow: !isLogin ? "0 2px 6px -1px rgba(0,0,0,0.08)" : "none",
              }}
            >
              Register
            </button>
          </div>

          {error && (
            <div
              className="p-3.5 rounded-xl text-[12.5px] font-medium flex items-start gap-2.5 shadow-xs border"
              style={{ background: "#FEF2F2", color: "#DC2626", borderColor: "#FCA5A5" }}
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Name field (Signup only) */}
            {!isLogin && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#57534E]">
                  Full Name
                </label>
                <div
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all duration-200 focus-within:border-[#BC5A1B] focus-within:ring-2 focus-within:ring-[#BC5A1B]/15"
                  style={{
                    background: "#FAF9F6",
                    border: `1px solid ${T.line}`,
                  }}
                >
                  <User size={15} style={{ color: "#8C857B" }} />
                  <input
                    type="text"
                    value={form.name}
                    onChange={setF("name")}
                    placeholder="Rahul Kapoor"
                    className="flex-1 bg-transparent text-[13.5px] outline-none text-[#1C1917] placeholder:text-[#A8A29E]"
                  />
                </div>
              </div>
            )}

            {/* Email field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#57534E]">
                Email Address
              </label>
              <div
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all duration-200 focus-within:border-[#BC5A1B] focus-within:ring-2 focus-within:ring-[#BC5A1B]/15"
                style={{
                  background: "#FAF9F6",
                  border: `1px solid ${T.line}`,
                }}
              >
                <Mail size={15} style={{ color: "#8C857B" }} />
                <input
                  type="email"
                  value={form.email}
                  onChange={setF("email")}
                  placeholder="rahul.k@saivyy.in"
                  className="flex-1 bg-transparent text-[13.5px] outline-none text-[#1C1917] placeholder:text-[#A8A29E]"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#57534E]">
                Password
              </label>
              <div
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all duration-200 focus-within:border-[#BC5A1B] focus-within:ring-2 focus-within:ring-[#BC5A1B]/15"
                style={{
                  background: "#FAF9F6",
                  border: `1px solid ${T.line}`,
                }}
              >
                <Lock size={15} style={{ color: "#8C857B" }} />
                <input
                  type="password"
                  value={form.password}
                  onChange={setF("password")}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent text-[13.5px] outline-none text-[#1C1917] placeholder:text-[#A8A29E]"
                />
              </div>
            </div>

            {/* Role / Designation (Signup only) */}
            {!isLogin && (
              <>
                <div
                  className="rounded-xl p-3 text-[11.5px] leading-relaxed border"
                  style={{
                    background: "#FAF0E6",
                    borderColor: "#F0D4BE",
                    color: "#8C430B",
                  }}
                >
                  ℹ️ You will join <strong>Saivyy Technologies Private Limited</strong> as a Team Member.
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#57534E]">
                    Role / Designation
                  </label>
                  <div
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all duration-200 focus-within:border-[#BC5A1B] focus-within:ring-2 focus-within:ring-[#BC5A1B]/15"
                    style={{
                      background: "#FAF9F6",
                      border: `1px solid ${T.line}`,
                    }}
                  >
                    <Briefcase size={15} style={{ color: "#8C857B" }} />
                    <select
                      value={form.role}
                      onChange={setF("role")}
                      className="flex-1 bg-transparent text-[13.5px] outline-none text-[#1C1917]"
                    >
                      <option>Senior Account Executive</option>
                      <option>Sales Manager</option>
                      <option>Business Development Representative</option>
                      <option>CRM Administrator</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="crm-focusable flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-[13.5px] tracking-wide mt-2 shadow-sm hover:brightness-105 active:translate-y-px transition-all duration-150 text-white cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #BC5A1B 0%, #A44C10 100%)",
                boxShadow: "0 8px 20px -4px rgba(188, 90, 27, 0.35)",
              }}
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-t-transparent border-white animate-spin" />
              ) : (
                <>
                  <Sparkles size={14} />
                  {isLogin ? "Sign In to Workspace" : "Create Enterprise Account"}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Security Note */}
        <div className="flex items-center justify-center gap-2 text-[11.5px] text-[#8C857B]">
          <ShieldCheck size={13} className="text-[#BC5A1B]" />
          <span>Enterprise 256-bit SSL encrypted • Saivyy Technologies</span>
        </div>
      </div>
    </div>
  );
}
