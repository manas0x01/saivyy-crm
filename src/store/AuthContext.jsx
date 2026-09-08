import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);           // current active user (may be impersonated)
  const [originalLeader, setOriginalLeader] = useState(null); // real leader stored when impersonating
  const [loading, setLoading] = useState(true);

  // Initialize session from localStorage on mount and fetch fresh profile from DB
  useEffect(() => {
    async function restoreSession() {
      try {
        const savedUserStr = localStorage.getItem("saivyy_crm_user");
        const savedLeaderStr = localStorage.getItem("saivyy_crm_original_leader");
        if (savedUserStr) {
          const parsed = JSON.parse(savedUserStr);
          setUser(parsed);
          // Fetch fresh user profile from backend to sync latest role & org
          const res = await fetch("/api/auth/me", {
            headers: { "x-user-id": parsed.id || "" }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
              localStorage.setItem("saivyy_crm_user", JSON.stringify(data.user));
              setUser(data.user);
            }
          }
        }
        if (savedLeaderStr) setOriginalLeader(JSON.parse(savedLeaderStr));
      } catch (e) {
        console.error("Failed to restore auth session:", e);
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  const login = async (email, password) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Login failed");
    }
    localStorage.setItem("saivyy_crm_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const signup = async (name, email, password, role, orgName) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role, orgName }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Signup failed");
    }
    localStorage.setItem("saivyy_crm_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("saivyy_crm_user");
    localStorage.removeItem("saivyy_crm_original_leader");
    setUser(null);
    setOriginalLeader(null);
  };

  const createMember = async (name, email, password, role = "Member") => {
    const res = await fetch("/api/auth/create-member", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": user?.id || ""
      },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to create member credentials");
    }
    return data.user;
  };

  // Leader impersonates a member — switches active session to that member's context
  const impersonate = async (memberId) => {
    const leaderToSave = originalLeader || user; // preserve the real leader
    const res = await fetch("/api/auth/impersonate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": leaderToSave.id
      },
      body: JSON.stringify({ memberId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Impersonation failed");
    }
    // Save original leader and switch to member view
    localStorage.setItem("saivyy_crm_original_leader", JSON.stringify(leaderToSave));
    localStorage.setItem("saivyy_crm_user", JSON.stringify(data.member));
    setOriginalLeader(leaderToSave);
    setUser(data.member);
    return data.member;
  };

  // Exit impersonation mode and return to leader session
  const exitImpersonation = () => {
    if (!originalLeader) return;
    localStorage.setItem("saivyy_crm_user", JSON.stringify(originalLeader));
    localStorage.removeItem("saivyy_crm_original_leader");
    setUser(originalLeader);
    setOriginalLeader(null);
  };

  // Fetch all org members (for Leaders only)
  const fetchOrgMembers = async () => {
    const leaderId = originalLeader?.id || user?.id;
    const res = await fetch("/api/users/org-members", {
      headers: { "x-user-id": leaderId || "" }
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to fetch org members");
    }
    return data.members;
  };

  const isImpersonating = Boolean(originalLeader);

  return (
    <AuthContext.Provider value={{
      user,
      originalLeader,
      isImpersonating,
      loading,
      login,
      signup,
      logout,
      createMember,
      impersonate,
      exitImpersonation,
      fetchOrgMembers,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
