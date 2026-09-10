import React, { useState } from "react";
import { useAuth } from "../store/AuthContext";
import { T } from "../tokens";
import { Mail, Lock, User, Building, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AdminRegister() {
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    orgName: "Saivyy Technologies Private Limited",
    securityRole: "Leader",
  });

  const setF = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Please fill in email and password");
      return;
    }
    if (!isLogin && !form.name) {
      setError("Please enter your full name");
      return;
    }
    if (!isLogin && form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!isLogin && form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        await signup(form.name, form.email, form.password, form.securityRole, form.orgName);
        setSuccess(`Account created for ${form.name}! You are now logged in.`);
      }
    } catch (err) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
  };

  const labelStyle = { color: "#9ca3af" };
  const textStyle = { color: "#f0f0ff" };

  const Field = ({ icon: Icon, children }) => (
    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl" style={inputStyle}>
      <Icon size={14} style={{ color: "#9ca3af" }} />
      {children}
    </div>
  );

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden select-none"
      style={{ background: `radial-gradient(circle at 50% 10%, #24201D 0%, #1C1917 80%, #12100E 100%)` }}
    >
      {/* Decorative orbs */}
      <div
        className="absolute w-[450px] h-[450px] rounded-full filter blur-[120px] opacity-20 animate-pulse pointer-events-none"
        style={{ background: "#BC5A1B", top: "-100px", left: "-100px", animationDuration: "8s" }}
      />
      <div
        className="absolute w-[350px] h-[350px] rounded-full filter blur-[100px] opacity-15 animate-pulse pointer-events-none"
        style={{ background: "#D97706", bottom: "-80px", right: "-80px", animationDuration: "12s" }}
      />

      <div className="w-full max-w-[460px] z-10 flex flex-col gap-6">
        {/* Branding with Official Logo */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md p-2 bg-[#1C1917] border border-[#3E3835] transform hover:scale-105 transition-transform duration-300">
            <img src="/logo.png" alt="Saivyy Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="crm-display text-[24px] font-bold tracking-tight mt-2" style={{ color: "#F5F3EF" }}>
            Admin Portal
          </h1>
          <p className="text-[13px]" style={{ color: "#A8A29E" }}>
            Saivyy Technologies — Restricted Access
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 flex flex-col gap-5 backdrop-blur-md"
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            border: `1px solid rgba(255, 255, 255, 0.1)`,
            boxShadow: `0 20px 60px -15px rgba(0, 0, 0, 0.5)`,
          }}
        >
          {/* Tabs */}
          <div className="flex p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }}>
            <button
              onClick={() => { setIsLogin(true); setError(""); setSuccess(""); }}
              className="flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200"
              style={{
                background: isLogin ? "#BC5A1B" : "transparent",
                color: isLogin ? "#FFFFFF" : "#A8A29E",
                boxShadow: isLogin ? "0 2px 8px -2px rgba(188,90,27,0.4)" : "none",
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(""); setSuccess(""); }}
              className="flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200"
              style={{
                background: !isLogin ? "#BC5A1B" : "transparent",
                color: !isLogin ? "#FFFFFF" : "#A8A29E",
                boxShadow: !isLogin ? "0 2px 8px -2px rgba(188,90,27,0.4)" : "none",
              }}
            >
              Register
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div
              className="p-3.5 rounded-xl text-[12.5px] font-medium flex items-start gap-2.5"
              style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div
              className="p-3.5 rounded-xl text-[12.5px] font-medium flex items-start gap-2.5"
              style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.2)" }}
            >
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Full Name (register only) */}
            {!isLogin && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest" style={labelStyle}>Full Name</label>
                <Field icon={User}>
                  <input
                    type="text"
                    value={form.name}
                    onChange={setF("name")}
                    placeholder="Manas Saxena"
                    className="flex-1 bg-transparent text-[13.5px] outline-none"
                    style={textStyle}
                  />
                </Field>
              </div>
            )}

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest" style={labelStyle}>Email Address</label>
              <Field icon={Mail}>
                <input
                  type="email"
                  value={form.email}
                  onChange={setF("email")}
                  placeholder="admin@saivyy.in"
                  className="flex-1 bg-transparent text-[13.5px] outline-none"
                  style={textStyle}
                />
              </Field>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest" style={labelStyle}>Password</label>
              <Field icon={Lock}>
                <input
                  type="password"
                  value={form.password}
                  onChange={setF("password")}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent text-[13.5px] outline-none"
                  style={textStyle}
                />
              </Field>
            </div>

            {/* Register-only fields */}
            {!isLogin && (
              <>
                {/* Confirm Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest" style={labelStyle}>Confirm Password</label>
                  <Field icon={Lock}>
                    <input
                      type="password"
                      value={form.confirmPassword}
                      onChange={setF("confirmPassword")}
                      placeholder="••••••••"
                      className="flex-1 bg-transparent text-[13.5px] outline-none"
                      style={textStyle}
                    />
                  </Field>
                </div>

                {/* Access Level */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest" style={labelStyle}>Access Level</label>
                  <Field icon={ShieldCheck}>
                    <select
                      value={form.securityRole}
                      onChange={setF("securityRole")}
                      className="flex-1 bg-transparent text-[13.5px] outline-none"
                      style={{ color: "#f0f0ff", background: "transparent" }}
                    >
                      <option value="Leader" style={{ background: "#1a0a2e" }}>Leader / Admin (Full Access)</option>
                      <option value="Member" style={{ background: "#1a0a2e" }}>Team Member (Personal Data Only)</option>
                    </select>
                  </Field>
                </div>

                {/* Organization */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest" style={labelStyle}>Organization</label>
                  <Field icon={Building}>
                    <input
                      type="text"
                      value={form.orgName}
                      onChange={setF("orgName")}
                      placeholder="Saivyy Technologies Private Limited"
                      className="flex-1 bg-transparent text-[13.5px] outline-none"
                      style={textStyle}
                    />
                  </Field>
                </div>
              </>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-[13.5px] tracking-wide mt-1 text-white transition-all duration-150 hover:opacity-90 active:scale-[0.99]"
              style={{
                background: "linear-gradient(135deg, #BC5A1B, #8C430B)",
                boxShadow: "0 8px 24px -8px rgba(188,90,27,0.5)",
              }}
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-t-transparent border-white animate-spin" />
              ) : (
                <>
                  <ShieldCheck size={15} />
                  {isLogin ? "Sign In to Admin Portal" : "Create Admin Account"}
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px]" style={{ color: "#374151" }}>
          🔒 This page is restricted. Do not share this URL publicly.
        </p>
      </div>
    </div>
  );
}
