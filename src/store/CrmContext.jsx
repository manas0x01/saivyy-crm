import React, { createContext, useContext, useReducer, useEffect } from "react";
import * as api from "../services/api";
import { useAuth } from "./AuthContext";

const CrmContext = createContext(null);

const emptyState = {
  leads: [],
  deals: [],
  customers: [],
  companies: [],
  tasks: [],
  calls: [],
  meetings: [],
  activities: [],
  teams: [],
  team: [],
  automations: [],
  campaigns: [],
  notifications: [],
  integrations: [],
  loading: true,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_STATE":
      return { ...state, ...action.payload, loading: false };

    // --- LEADS ---
    case "ADD_LEAD":
      return { ...state, leads: [action.payload, ...state.leads] };
    case "BATCH_ADD_LEADS":
      return { ...state, leads: [...action.payload, ...state.leads] };
    case "UPDATE_LEAD":
      return { ...state, leads: state.leads.map(l => l.id === action.payload.id ? { ...l, ...action.payload } : l) };
    case "DELETE_LEAD":
      return { ...state, leads: state.leads.filter(l => l.id !== action.payload) };
    case "CONVERT_LEAD": {
      const { leadId, deal, customer, company, activity } = action.payload;
      const leads = state.leads.map(l => l.id === leadId ? { ...l, status: "Won", probability: 100 } : l);
      const deals = deal ? [deal, ...state.deals] : state.deals;
      const customers = customer ? [customer, ...state.customers] : state.customers;
      let companies = [...state.companies];
      if (company) {
        const existingIdx = companies.findIndex(c => c.name.toLowerCase() === company.name.toLowerCase());
        if (existingIdx >= 0) {
          companies[existingIdx] = {
            ...companies[existingIdx],
            deals: (companies[existingIdx].deals || 0) + 1,
            revenue: company.revenue || companies[existingIdx].revenue,
          };
        } else {
          companies = [company, ...companies];
        }
      }
      const activities = activity ? [activity, ...state.activities] : state.activities;
      return { ...state, leads, deals, customers, companies, activities };
    }

    // --- DEALS ---
    case "ADD_DEAL":
      return { ...state, deals: [action.payload, ...state.deals] };
    case "UPDATE_DEAL":
    case "MOVE_DEAL":
      return { ...state, deals: state.deals.map(d => d.id === action.payload.id ? { ...d, ...action.payload } : d) };
    case "DELETE_DEAL":
      return { ...state, deals: state.deals.filter(d => d.id !== action.payload) };

    // --- CUSTOMERS ---
    case "ADD_CUSTOMER":
      return { ...state, customers: [action.payload, ...state.customers] };
    case "UPDATE_CUSTOMER":
      return { ...state, customers: state.customers.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c) };
    case "DELETE_CUSTOMER":
      return { ...state, customers: state.customers.filter(c => c.id !== action.payload) };

    // --- TASKS ---
    case "ADD_TASK":
      return { ...state, tasks: [action.payload, ...state.tasks] };
    case "TOGGLE_TASK":
      return { ...state, tasks: state.tasks.map(t => t.id === action.payload ? { ...t, completed: !t.completed } : t) };
    case "DELETE_TASK":
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.payload) };

    // --- CALLS ---
    case "ADD_CALL":
      return { ...state, calls: [action.payload, ...state.calls] };
    case "UPDATE_CALL":
      return { ...state, calls: state.calls.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c) };

    // --- MEETINGS ---
    case "ADD_MEETING":
      return { ...state, meetings: [action.payload, ...state.meetings] };
    case "UPDATE_MEETING":
      return { ...state, meetings: state.meetings.map(m => m.id === action.payload.id ? { ...m, ...action.payload } : m) };
    case "DELETE_MEETING":
      return { ...state, meetings: state.meetings.filter(m => m.id !== action.payload) };

    // --- ACTIVITIES ---
    case "ADD_ACTIVITY":
      return { ...state, activities: [action.payload, ...state.activities] };
    case "DELETE_ACTIVITY":
      return { ...state, activities: state.activities.filter(a => a.id !== action.payload) };

    // --- COMPANIES ---
    case "ADD_COMPANY":
      return { ...state, companies: [action.payload, ...state.companies] };
    case "UPDATE_COMPANY":
      return { ...state, companies: state.companies.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c) };
    case "DELETE_COMPANY":
      return { ...state, companies: state.companies.filter(c => c.id !== action.payload) };

    // --- TEAMS ---
    case "ADD_TEAM":
      return { ...state, teams: [action.payload, ...state.teams] };
    case "DELETE_TEAM":
      return { ...state, teams: state.teams.filter(t => t.id !== action.payload), team: state.team.filter(m => m.teamId !== action.payload) };
    case "ADD_TEAM_MEMBER":
      return { ...state, team: [action.payload, ...state.team] };
    case "UPDATE_TEAM_MEMBER":
      return { ...state, team: state.team.map(m => m.id === action.payload.id ? { ...m, ...action.payload } : m) };
    case "DELETE_TEAM_MEMBER":
      return { ...state, team: state.team.filter(m => m.id !== action.payload) };

    // --- AUTOMATIONS ---
    case "TOGGLE_AUTOMATION":
      return { ...state, automations: state.automations.map(a => a.id === action.payload ? { ...a, status: a.status === "active" ? "inactive" : "active" } : a) };
    case "ADD_AUTOMATION":
      return { ...state, automations: [action.payload, ...state.automations] };

    // --- CAMPAIGNS ---
    case "ADD_CAMPAIGN":
      return { ...state, campaigns: [action.payload, ...state.campaigns] };

    // --- INTEGRATIONS ---
    case "ADD_INTEGRATION":
      return { ...state, integrations: [action.payload, ...state.integrations] };
    case "UPDATE_INTEGRATION":
      return { ...state, integrations: state.integrations.map(i => i.id === action.payload.id ? { ...i, ...action.payload } : i) };
    case "TOGGLE_INTEGRATION":
      return { ...state, integrations: state.integrations.map(i => i.id === action.payload ? { ...i, status: !i.status, lastSync: !i.status ? "Just connected" : "Disconnected" } : i) };
    case "DELETE_INTEGRATION":
      return { ...state, integrations: state.integrations.filter(i => i.id !== action.payload) };

    // --- NOTIFICATIONS ---
    case "MARK_NOTIFICATION_READ":
      return { ...state, notifications: state.notifications.map(n => n.id === action.payload ? { ...n, read: true } : n) };
    case "MARK_ALL_READ":
      return { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) };

    default:
      return state;
  }
}

export function CrmProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, emptyState);
  const { user } = useAuth();

  // Helper to fetch latest state from API
  const refreshData = async () => {
    if (!user) {
      dispatch({ type: "SET_STATE", payload: { ...emptyState, loading: false } });
      return null;
    }
    try {
      const data = await api.fetchCrmState();
      dispatch({ type: "SET_STATE", payload: { ...data, loading: false } });
      return data;
    } catch (err) {
      console.error("Backend error loading state:", err);
      dispatch({ type: "SET_STATE", payload: { loading: false } });
      return null;
    }
  };

  // Load from API backend on user mount or change & auto-poll every 5 seconds for live telephony updates
  useEffect(() => {
    let intervalId = null;
    refreshData();

    // Poll backend every 5 seconds for real-time telephony, leads, and call logs
    if (user) {
      intervalId = setInterval(() => {
        refreshData();
      }, 5000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user]);

  // Async dispatch wrapper that synchronizes with the backend API
  const asyncDispatch = async (action) => {
    // Immediate UI update
    dispatch(action);

    // Sync to backend API
    try {
      switch (action.type) {
        case "ADD_LEAD":
          await api.createLead(action.payload);
          break;
        case "BATCH_ADD_LEADS":
          if (api.bulkCreateLeads) {
            await api.bulkCreateLeads(action.payload);
          } else if (api.createBatchLeads) {
            await api.createBatchLeads(action.payload);
          }
          break;
        case "CONVERT_LEAD":
          await api.convertLead(action.payload);
          break;
        case "UPDATE_LEAD":
          await api.updateLead(action.payload.id, action.payload);
          break;
        case "DELETE_LEAD":
          await api.deleteLead(action.payload);
          break;
        case "ADD_DEAL":
          await api.createDeal(action.payload);
          break;
        case "MOVE_DEAL":
        case "UPDATE_DEAL":
          await api.updateDeal(action.payload.id, action.payload);
          break;
        case "DELETE_DEAL":
          await api.deleteDeal(action.payload);
          break;
        case "ADD_CUSTOMER":
          await api.createCustomer(action.payload);
          break;
        case "UPDATE_CUSTOMER":
          await api.updateCustomer(action.payload.id, action.payload);
          break;
        case "DELETE_CUSTOMER":
          await api.deleteCustomer(action.payload);
          break;
        case "ADD_TASK":
          await api.createTask(action.payload);
          break;
        case "TOGGLE_TASK":
          await api.toggleTask(action.payload);
          break;
        case "DELETE_TASK":
          await api.deleteTask(action.payload);
          break;
        case "ADD_CALL":
          await api.createCall(action.payload);
          break;
        case "UPDATE_CALL":
          await api.updateCall(action.payload.id, action.payload);
          break;
        case "ADD_MEETING":
          await api.createMeeting(action.payload);
          break;
        case "UPDATE_MEETING":
          await api.updateMeeting(action.payload.id, action.payload);
          break;
        case "DELETE_MEETING":
          await api.deleteMeeting(action.payload);
          break;
        case "ADD_ACTIVITY":
          await api.createActivity(action.payload);
          break;
        case "DELETE_ACTIVITY":
          await api.deleteActivity(action.payload);
          break;
        case "ADD_COMPANY":
          await api.createCompany(action.payload);
          break;
        case "UPDATE_COMPANY":
          await api.updateCompany(action.payload.id, action.payload);
          break;
        case "DELETE_COMPANY":
          await api.deleteCompany(action.payload);
          break;
        case "ADD_TEAM":
          await api.createTeam(action.payload);
          break;
        case "DELETE_TEAM":
          await api.deleteTeam(action.payload);
          break;
        case "ADD_TEAM_MEMBER":
          await api.createTeamMember(action.payload);
          break;
        case "UPDATE_TEAM_MEMBER":
          await api.updateTeamMember(action.payload.id, action.payload);
          break;
        case "DELETE_TEAM_MEMBER":
          await api.deleteTeamMember(action.payload);
          break;
        case "TOGGLE_AUTOMATION":
          await api.toggleAutomation(action.payload);
          break;
        case "ADD_AUTOMATION":
          await api.createAutomation(action.payload);
          break;
        case "ADD_CAMPAIGN":
          await api.createCampaign(action.payload);
          break;
        case "ADD_INTEGRATION":
          await api.createIntegration(action.payload);
          break;
        case "UPDATE_INTEGRATION":
          await api.updateIntegration(action.payload.id, action.payload);
          break;
        case "TOGGLE_INTEGRATION":
          await api.toggleIntegration(action.payload);
          break;
        case "DELETE_INTEGRATION":
          await api.deleteIntegration(action.payload);
          break;
        default:
          break;
      }
    } catch (err) {
      console.error("Backend sync failed for action:", action.type, err);
    }
  };

  return <CrmContext.Provider value={{ state, dispatch: asyncDispatch, refreshData }}>{children}</CrmContext.Provider>;
}

export function useCrm() {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error("useCrm must be used within CrmProvider");
  return ctx;
}
