import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

async function safeJsonFetch(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      res.status >= 500
        ? "Server error (500). Please check backend deployment logs or database setup."
        : `Server error (${res.status}): ${text.slice(0, 80)}`
    );
  }
  if (!res.ok || (data && data.success === false)) {
    throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
  }
  return data;
}

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
          try {
            const data = await safeJsonFetch("/api/auth/me", {
              headers: { "x-user-id": parsed.id || "" }
            });
            if (data.success && data.user) {
              localStorage.setItem("saivyy_crm_user", JSON.stringify(data.user));
              setUser(data.user);
            }
          } catch (e) {
            console.warn("Could not sync latest session from server:", e.message);
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
    const data = await safeJsonFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("saivyy_crm_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const signup = async (name, email, password, role, orgName) => {
    const data = await safeJsonFetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role, orgName }),
    });
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
    const data = await safeJsonFetch("/api/auth/create-member", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": user?.id || ""
      },
      body: JSON.stringify({ name, email, password, role }),
    });
    return data.user;
  };

  // Leader impersonates a member — switches active session to that member's context
  const impersonate = async (memberId) => {
    const leaderToSave = originalLeader || user; // preserve the real leader
    const data = await safeJsonFetch("/api/auth/impersonate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": leaderToSave.id
      },
      body: JSON.stringify({ memberId }),
    });
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
    const data = await safeJsonFetch("/api/users/org-members", {
      headers: { "x-user-id": leaderId || "" }
    });
    return data.members || [];
  };

  const updateUserSession = (updatedUser) => {
    if (!updatedUser) return;
    const merged = { ...user, ...updatedUser };
    localStorage.setItem("saivyy_crm_user", JSON.stringify(merged));
    setUser(merged);
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
      updateUserSession,
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
