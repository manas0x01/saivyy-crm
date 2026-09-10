import React, { useMemo, useState } from "react";
import { Plus, UserPlus, Crown, Mail, Phone, ShieldCheck, Key } from "lucide-react";
import { T } from "../tokens";
import { useCrm } from "../store/CrmContext";
import { useAuth } from "../store/AuthContext";
import { useToast } from "../components/ToastContext";
import { Avatar, fmtINR } from "../components/shared";
import Modal, { FormField, Input, Select, Textarea, SubmitBtn } from "../components/Modal";

function createId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isOwnedByMember(item, member) {
  if (!item || !member) return false;

  const rawMemberName = member.name || (typeof member === "string" ? member : "");
  const cleanMember = rawMemberName.replace(/\s*\((Leader|Admin|Member)\)/i, "").trim().toLowerCase();

  const ownerName = (item.owner || item.ownerFull || "").trim();
  const cleanOwner = ownerName.toLowerCase();

  // 1. Direct match by owner string (primary truth for assignments)
  if (cleanOwner) {
    if (cleanOwner === cleanMember) return true;
    if (cleanOwner.includes(cleanMember) || cleanMember.includes(cleanOwner)) return true;

    // First name match if at least 3 characters
    const memberFirstName = cleanMember.split(" ")[0];
    const ownerFirstName = cleanOwner.split(" ")[0];
    if (memberFirstName && ownerFirstName && memberFirstName.length >= 3 && memberFirstName === ownerFirstName) {
      return true;
    }

    // Initials match if available
    if (item.ownerInitials && member.initials) {
      if (item.ownerInitials.trim().toUpperCase() === member.initials.trim().toUpperCase()) {
        if (cleanMember[0] === cleanOwner[0]) return true;
      }
    }

    // Owner was specified but didn't match this member
    return false;
  }

  // 2. Fallback to user account ID ONLY if owner is unassigned or empty
  const targetAccId = member.accountUserId || member.userId;
  if (targetAccId && item.userId && String(item.userId) === String(targetAccId)) {
    return true;
  }

  return false;
}

export default function Team() {
  const { state, dispatch } = useCrm();
  const { user, createMember } = useAuth();
  const toast = useToast();
  const teams = state.teams || [];
  const members = state.team || [];
  
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showCredModal, setShowCredModal] = useState(false);

  const [teamForm, setTeamForm] = useState({ name: "", description: "" });
  const [memberForm, setMemberForm] = useState({ teamId: "", name: "", role: "", email: "", phone: "", tag: "Member", status: "Active" });
  const [credForm, setCredForm] = useState({ name: "", email: "", password: "", memberId: "" });
  const [credError, setCredError] = useState("");
  const [credSuccess, setCredSuccess] = useState("");

  const isLeader = user?.role === "Leader";

  // Group teams and calculate team member metrics dynamically from live state
  const groupedTeams = useMemo(() => {
    return teams.map(team => {
      const teamMembers = members
        .filter(member => member.teamId === team.id)
        .map(member => {
          const assignedLeads = state.leads.filter(l => isOwnedByMember(l, member)).length;
          const wonDeals = state.deals.filter(d => isOwnedByMember(d, member) && d.stage === "Won");
          const revenue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
          const conv = assignedLeads > 0 ? Math.round((wonDeals.length / assignedLeads) * 100) : 0;
          return {
            ...member,
            leads: assignedLeads,
            revenue,
            conv
          };
        });
      return { ...team, members: teamMembers };
    });
  }, [teams, members, state.leads, state.deals]);

  const addTeam = () => {
    if (!isLeader) return;
    if (!teamForm.name.trim()) return toast.warning("Team name is required");
    dispatch({ type: "ADD_TEAM", payload: { id: createId("TEAM"), name: teamForm.name.trim(), description: teamForm.description.trim(), created: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) } });
    toast.success(`Team "${teamForm.name.trim()}" created successfully`);
    setTeamForm({ name: "", description: "" });
    setShowTeamModal(false);
  };

  const addMember = () => {
    if (!isLeader) return;
    if (!memberForm.teamId) return toast.warning("Please select a team first");
    if (!memberForm.name.trim()) return toast.warning("Member name is required");
    const initials = memberForm.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    dispatch({ type: "ADD_TEAM_MEMBER", payload: { id: createId("TM"), teamId: memberForm.teamId, name: memberForm.name.trim(), initials, role: memberForm.role.trim(), email: memberForm.email.trim(), phone: memberForm.phone.trim(), tag: memberForm.tag, leads: 0, calls: 0, meetings: 0, conv: 0, revenue: 0, won: 0, lost: 0, status: memberForm.status, created: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) } });
    toast.success(`Member "${memberForm.name.trim()}" added to team`);
    setMemberForm({ teamId: "", name: "", role: "", email: "", phone: "", tag: "Member", status: "Active" });
    setShowMemberModal(false);
  };

  const handleOpenCredentials = (m) => {
    setCredForm({
      name: m.name,
      email: m.email || "",
      password: "",
      memberId: m.id
    });
    setCredError("");
    setCredSuccess("");
    setShowCredModal(true);
  };

  const submitCredentials = async () => {
    if (!credForm.email || !credForm.password) {
      setCredError("Email and Password are required");
      return;
    }
    setCredError("");
    setCredSuccess("");
    try {
      await createMember(credForm.name, credForm.email, credForm.password, "Member");
      setCredSuccess("Login credentials generated successfully! The member can now log in.");
      // Reload current CRM state to refresh `hasLogin` flags
      setTimeout(() => {
        setShowCredModal(false);
        window.location.reload();
      }, 1500);
    } catch (err) {
      setCredError(err.message || "Failed to create member login credentials");
    }
  };

  return (
    <div className="p-5 flex flex-col gap-4 min-w-0">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="crm-display text-[20px] font-semibold" style={{ color: T.ink }}>Sales Team Directory</h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.inkFaint }}>{teams.length} teams · {members.length} members</p>
        </div>
        {isLeader && (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowTeamModal(true)} className="crm-focusable flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold" style={{ background: T.surface, border: `1px solid ${T.line}`, color: T.inkSoft }}>
              <Plus size={14} /> Add team
            </button>
            <button onClick={() => setShowMemberModal(true)} disabled={teams.length === 0} className="crm-focusable flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold" style={{ background: T.accent, color: "#fff", opacity: teams.length === 0 ? 0.45 : 1 }}>
              <UserPlus size={14} /> Add team member
            </button>
          </div>
        )}
      </div>

      {groupedTeams.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ background: T.surface, border: `1px dashed ${T.line}` }}>
          <p className="text-[13px] font-medium" style={{ color: T.inkSoft }}>
            {isLeader ? "No teams yet. Add a team first, then add members under it." : "No teams configured yet."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groupedTeams.map(team => (
            <div key={team.id} className="rounded-xl p-4 animate-fadeIn" style={{ background: T.surface, border: `1px solid ${T.line}` }}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="crm-display text-[15px] font-semibold" style={{ color: T.ink }}>{team.name}</h2>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: T.accentSoft, color: T.accent }}>Team</span>
                  </div>
                  <p className="text-[12px] mt-0.5" style={{ color: T.inkFaint }}>{team.description || "No description"}</p>
                </div>
                {isLeader && (
                  <button onClick={() => { setMemberForm(f => ({ ...f, teamId: team.id })); setShowMemberModal(true); }} className="crm-focusable flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold" style={{ border: `1px solid ${T.line}`, color: T.inkSoft }}>
                    <UserPlus size={13} /> Add member
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                {team.members.length === 0 ? (
                  <div className="col-span-3 rounded-lg p-4 text-[12px]" style={{ background: T.canvas, color: T.inkFaint }}>No members in this team yet.</div>
                ) : team.members.map(member => (
                  <div key={member.id} className="rounded-xl p-4 flex flex-col gap-3 transition-all hover:shadow-md" style={{ background: T.canvas, border: `1px solid ${T.lineSoft}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar initials={member.initials} size={40} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="crm-display text-[14px] font-semibold truncate" style={{ color: T.ink }}>{member.name}</h3>
                            {(member.tag === "Leader" || member.isLeader || member.role === "Leader" || member.name.toLowerCase().includes("manas")) ? (
                              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm" style={{ background: T.amberSoft, color: T.amber, border: `1px solid ${T.amber}40` }}>
                                <Crown size={11} /> Leader
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: T.lineSoft, color: T.inkFaint }}>
                                {member.tag || "Member"}
                              </span>
                            )}
                          </div>
                          <p className="text-[11.5px] font-medium" style={{ color: (member.tag === "Leader" || member.isLeader || member.name.toLowerCase().includes("manas")) ? T.accent : T.inkFaint }}>
                            {(member.tag === "Leader" || member.isLeader || member.name.toLowerCase().includes("manas")) && (!member.role || member.role === "Member") ? "Team Leader" : member.role}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: member.status === "Active" ? T.positiveSoft : T.amberSoft, color: member.status === "Active" ? T.positive : T.amber }}>
                        {member.status}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 text-[12px]" style={{ color: T.inkSoft }}>
                      <span className="flex items-center gap-2"><Mail size={13} style={{ color: T.inkFaint }} />{member.email || "—"}</span>
                      <span className="flex items-center gap-2 crm-mono"><Phone size={13} style={{ color: T.inkFaint }} />{member.phone || "—"}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg text-center crm-mono" style={{ background: T.surface }}>
                      <div>
                        <p className="text-[10px]" style={{ color: T.inkFaint }}>LEADS</p>
                        <p className="text-[13px] font-semibold" style={{ color: T.ink }}>{member.leads || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px]" style={{ color: T.inkFaint }}>CONV %</p>
                        <p className="text-[13px] font-semibold" style={{ color: T.positive }}>{member.conv || 0}%</p>
                      </div>
                      <div>
                        <p className="text-[10px]" style={{ color: T.inkFaint }}>REVENUE</p>
                        <p className="text-[13px] font-semibold" style={{ color: T.accent }}>{fmtINR(member.revenue || 0)}</p>
                      </div>
                    </div>

                    {/* RBAC Login Creation Panel */}
                    {isLeader && (
                      <div className="pt-2" style={{ borderTop: `1px solid ${T.lineSoft}` }}>
                        {member.hasLogin ? (
                          <div className="flex items-center gap-1 text-[11.5px] font-medium text-emerald-600">
                            <ShieldCheck size={14} />
                            <span>Login Active</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenCredentials(member)}
                            className="crm-focusable flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                            style={{ background: T.accentSoft, color: T.accent }}
                          >
                            <Key size={12} />
                            <span>Create Login Credentials</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Team Modal */}
      <Modal open={showTeamModal} onClose={() => setShowTeamModal(false)} title="Add team">
        <div className="flex flex-col gap-4">
          <FormField label="Team name" required>
            <Input value={teamForm.name} onChange={e => setTeamForm(f => ({ ...f, name: e.target.value }))} placeholder="Enterprise Sales" />
          </FormField>
          <FormField label="Description">
            <Textarea value={teamForm.description} onChange={e => setTeamForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="What this team owns" />
          </FormField>
          <SubmitBtn onClick={addTeam}>Create team</SubmitBtn>
        </div>
      </Modal>

      {/* Member Modal */}
      <Modal open={showMemberModal} onClose={() => setShowMemberModal(false)} title="Add team member">
        <div className="flex flex-col gap-4">
          <FormField label="Team" required>
            <Select value={memberForm.teamId} onChange={e => setMemberForm(f => ({ ...f, teamId: e.target.value }))}>
              <option value="">Select a team</option>
              {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Full name" required>
              <Input value={memberForm.name} onChange={e => setMemberForm(f => ({ ...f, name: e.target.value }))} placeholder="Anjali Rao" />
            </FormField>
            <FormField label="Role">
              <Input value={memberForm.role} onChange={e => setMemberForm(f => ({ ...f, role: e.target.value }))} placeholder="Account Executive" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email">
              <Input value={memberForm.email} onChange={e => setMemberForm(f => ({ ...f, email: e.target.value }))} placeholder="name@company.com" />
            </FormField>
            <FormField label="Phone">
              <Input value={memberForm.phone} onChange={e => setMemberForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98000 00000" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Tag">
              <Select value={memberForm.tag} onChange={e => setMemberForm(f => ({ ...f, tag: e.target.value }))}>
                <option value="Leader">Leader</option>
                <option value="Member">Member</option>
              </Select>
            </FormField>
            <FormField label="Status">
              <Select value={memberForm.status} onChange={e => setMemberForm(f => ({ ...f, status: e.target.value }))}>
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
              </Select>
            </FormField>
          </div>
          <SubmitBtn onClick={addMember}>Add member</SubmitBtn>
        </div>
      </Modal>

      {/* Generate Credentials Modal */}
      <Modal open={showCredModal} onClose={() => setShowCredModal(false)} title={`Create login credentials for ${credForm.name}`}>
        <div className="flex flex-col gap-4">
          {credError && (
            <div className="p-3 rounded-lg text-[12.5px] font-medium" style={{ background: T.negativeSoft, color: T.negative }}>
              {credError}
            </div>
          )}
          {credSuccess && (
            <div className="p-3 rounded-lg text-[12.5px] font-medium" style={{ background: T.positiveSoft, color: T.positive }}>
              {credSuccess}
            </div>
          )}
          <FormField label="Name (Account Holder)">
            <Input value={credForm.name} readOnly disabled />
          </FormField>
          <FormField label="Email Address" required>
            <Input value={credForm.email} onChange={e => setCredForm(f => ({ ...f, email: e.target.value }))} placeholder="member@company.com" />
          </FormField>
          <FormField label="Password" required>
            <Input type="password" value={credForm.password} onChange={e => setCredForm(f => ({ ...f, password: e.target.value }))} placeholder="Set secure password" />
          </FormField>
          <SubmitBtn onClick={submitCredentials}>Generate Credentials</SubmitBtn>
        </div>
      </Modal>
    </div>
  );
}
