// Central API Client for Saivyy CRM Backend with Authentication Segregation

function getHeaders(extraHeaders = {}) {
  let userId = "U-admin";
  try {
    const saved = localStorage.getItem("saivyy_crm_user");
    if (saved) {
      const u = JSON.parse(saved);
      if (u && u.id) userId = u.id;
    }
  } catch (e) {
    console.error("Auth header extract error:", e);
  }
  return {
    ...extraHeaders,
    'x-user-id': userId
  };
}

export async function fetchCrmState() {
  const res = await fetch('/api/crm/state', {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to load CRM state');
  return res.json();
}

export async function createLead(data) {
  const res = await fetch('/api/leads', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateLead(id, data) {
  const res = await fetch(`/api/leads/${id}`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteLead(id) {
  const res = await fetch(`/api/leads/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return res.json();
}

export async function createDeal(data) {
  const res = await fetch('/api/deals', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateDeal(id, data) {
  const res = await fetch(`/api/deals/${id}`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteDeal(id) {
  const res = await fetch(`/api/deals/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return res.json();
}

export async function createCustomer(data) {
  const res = await fetch('/api/customers', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteCustomer(id) {
  const res = await fetch(`/api/customers/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return res.json();
}

export async function createTask(data) {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function toggleTask(id) {
  const res = await fetch(`/api/tasks/${id}/toggle`, {
    method: 'PUT',
    headers: getHeaders()
  });
  return res.json();
}

export async function deleteTask(id) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return res.json();
}

export async function createCall(data) {
  const res = await fetch('/api/calls', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function createMeeting(data) {
  const res = await fetch('/api/meetings', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function createActivity(data) {
  const res = await fetch('/api/activities', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteActivity(id) {
  const res = await fetch(`/api/activities/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return res.json();
}

export async function createCompany(data) {
  const res = await fetch('/api/companies', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function createTeam(data) {
  const res = await fetch('/api/teams', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteTeam(id) {
  const res = await fetch(`/api/teams/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return res.json();
}

export async function createTeamMember(data) {
  const res = await fetch('/api/team-members', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateTeamMember(id, data) {
  const res = await fetch(`/api/team-members/${id}`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteTeamMember(id) {
  const res = await fetch(`/api/team-members/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return res.json();
}

export async function toggleAutomation(id) {
  const res = await fetch(`/api/automations/${id}/toggle`, {
    method: 'PUT',
    headers: getHeaders()
  });
  return res.json();
}

export async function createAutomation(data) {
  const res = await fetch('/api/automations', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function createCampaign(data) {
  const res = await fetch('/api/campaigns', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function createIntegration(data) {
  const res = await fetch('/api/integrations', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateIntegration(id, data) {
  const res = await fetch(`/api/integrations/${id}`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function toggleIntegration(id) {
  const res = await fetch(`/api/integrations/${id}/toggle`, {
    method: 'PUT',
    headers: getHeaders()
  });
  return res.json();
}

export async function testIntegration(id) {
  const res = await fetch(`/api/integrations/${id}/test`, {
    method: 'POST',
    headers: getHeaders()
  });
  return res.json();
}

export async function deleteIntegration(id) {
  const res = await fetch(`/api/integrations/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return res.json();
}

export async function resetCrmDatabase() {
  const res = await fetch('/api/crm/reset', {
    method: 'POST',
    headers: getHeaders()
  });
  return res.json();
}
