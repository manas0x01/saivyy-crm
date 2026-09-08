import React, { useState } from "react";
import { useAuth } from "../store/AuthContext";
import { T } from "../tokens";
import { Mail, Lock, User, Building, Briefcase, Sparkles, AlertCircle } from "lucide-react";

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
        background: `radial-gradient(circle at 10% 20%, #EEEDFC 0%, #F5F6F9 90%)`,
      }}
    >
      {/* Decorative Blur Orbs */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full filter blur-[100px] opacity-40 animate-pulse pointer-events-none"
        style={{
          background: T.accent,
          top: "-100px",
          left: "-100px",
          animationDuration: "8s",
        }}
      />
      <div
        className="absolute w-[350px] h-[350px] rounded-full filter blur-[80px] opacity-30 animate-pulse pointer-events-none"
        style={{
          background: T.violet,
          bottom: "-80px",
          right: "-80px",
          animationDuration: "12s",
        }}
      />

      <div className="w-full max-w-[460px] z-10 flex flex-col gap-6">
        {/* Branding Title */}
        <div className="flex flex-col items-center text-center gap-2">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transform hover:rotate-12 transition-transform duration-300"
            style={{ background: T.accent }}
          >
            <span className="crm-display text-white font-extrabold text-[22px]">S</span>
          </div>
          <h1 className="crm-display text-[26px] font-bold tracking-tight mt-2" style={{ color: T.ink }}>
            Saivyy CRM
          </h1>
          <p className="text-[13px]" style={{ color: T.inkFaint }}>
            Enterprise operations portal for Saivyy Technologies
          </p>
        </div>

        {/* Auth Form Card */}
        <div
          className="rounded-2xl p-8 shadow-2xl flex flex-col gap-6 backdrop-blur-md transition-all duration-300"
          style={{
            background: "rgba(255, 255, 255, 0.88)",
            border: `1px solid rgba(255, 255, 255, 0.6)`,
            boxShadow: `0 20px 40px -15px rgba(55, 48, 224, 0.08)`,
          }}
        >
          {/* Form Tabs */}
          <div className="flex p-1 rounded-xl" style={{ background: T.lineSoft }}>
            <button
              onClick={() => {
                setIsLogin(true);
                setError("");
              }}
              className="flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200"
              style={{
                background: isLogin ? T.surface : "transparent",
                color: isLogin ? T.ink : T.inkFaint,
                boxShadow: isLogin ? "0 2px 8px -2px rgba(18,20,28,0.08)" : "none",
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
                background: !isLogin ? T.surface : "transparent",
                color: !isLogin ? T.ink : T.inkFaint,
                boxShadow: !isLogin ? "0 2px 8px -2px rgba(18,20,28,0.08)" : "none",
              }}
            >
              Register
            </button>
          </div>

          {error && (
            <div
              className="p-3.5 rounded-xl text-[12.5px] font-medium flex items-start gap-2.5 shadow-sm"
              style={{ background: T.negativeSoft, color: T.negative }}
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Name field (Signup only) */}
            {!isLogin && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold uppercase tracking-wider" style={{ color: T.inkSoft }}>
                  Full Name
                </label>
                <div
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all duration-200 focus-within:ring-2 focus-within:ring-offset-2"
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.line}`,
                    outline: "none",
                  }}
                >
                  <User size={15} style={{ color: T.inkFaint }} />
                  <input
                    type="text"
                    value={form.name}
                    onChange={setF("name")}
                    placeholder="Rahul Kapoor"
                    className="flex-1 bg-transparent text-[13.5px] outline-none"
                    style={{ color: T.ink }}
                  />
                </div>
              </div>
            )}

            {/* Email field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold uppercase tracking-wider" style={{ color: T.inkSoft }}>
                Email Address
              </label>
              <div
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all duration-200"
                style={{
                  background: T.surface,
                  border: `1px solid ${T.line}`,
                }}
              >
                <Mail size={15} style={{ color: T.inkFaint }} />
                <input
                  type="email"
                  value={form.email}
                  onChange={setF("email")}
                  placeholder="rahul.k@saivyy.in"
                  className="flex-1 bg-transparent text-[13.5px] outline-none"
                  style={{ color: T.ink }}
                />
              </div>
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold uppercase tracking-wider" style={{ color: T.inkSoft }}>
                Password
              </label>
              <div
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all duration-200"
                style={{
                  background: T.surface,
                  border: `1px solid ${T.line}`,
                }}
              >
                <Lock size={15} style={{ color: T.inkFaint }} />
                <input
                  type="password"
                  value={form.password}
                  onChange={setF("password")}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent text-[13.5px] outline-none"
                  style={{ color: T.ink }}
                />
              </div>
            </div>

            {/* Role / Designation (Signup only) */}
            {!isLogin && (
              <>
                <div
                  className="rounded-xl p-3 text-[11.5px] leading-relaxed"
                  style={{
                    background: T.positiveSoft,
                    border: `1px solid ${T.positive}30`,
                    color: T.positive,
                  }}
                >
                  ℹ️ You will join <strong>Saivyy Technologies Private Limited</strong> as a Team Member.
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-bold uppercase tracking-wider" style={{ color: T.inkSoft }}>
                    Role / Designation
                  </label>
                  <div
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all duration-200"
                    style={{
                      background: T.surface,
                      border: `1px solid ${T.line}`,
                    }}
                  >
                    <Briefcase size={15} style={{ color: T.inkFaint }} />
                    <select
                      value={form.role}
                      onChange={setF("role")}
                      className="flex-1 bg-transparent text-[13.5px] outline-none"
                      style={{ color: T.ink }}
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
              className="crm-focusable flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-[13.5px] tracking-wide mt-2 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:translate-y-px transition-all duration-150 text-white"
              style={{ background: T.accent }}
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


      </div>
    </div>
  );
}
