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

async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.warn(`API returned non-JSON response (${res.status}) from ${url}:`, text);
      return { success: false, error: res.status >= 500 ? "Server error" : text };
    }
    return data;
  } catch (err) {
    console.error(`Fetch network error for ${url}:`, err);
    return { success: false, error: err.message };
  }
}

export async function fetchCrmState() {
  const data = await safeFetch('/api/crm/state', {
    headers: getHeaders()
  });
  if (data.error) throw new Error(data.error);
  return data;
}

export async function createLead(data) {
  return safeFetch('/api/leads', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
}

// Bulk import — send all leads in a single HTTP request for maximum speed
export async function bulkCreateLeads(leadsArray) {
  const payload = Array.isArray(leadsArray) ? leadsArray : (leadsArray?.leads || []);
  return safeFetch('/api/leads/bulk', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
}


export async function updateLead(id, data) {
  return safeFetch(`/api/leads/${id}`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
}

export async function deleteLead(id) {
  return safeFetch(`/api/leads/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
}

export async function createDeal(data) {
  return safeFetch('/api/deals', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
}

export async function updateDeal(id, data) {
  return safeFetch(`/api/deals/${id}`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
}

export async function deleteDeal(id) {
  return safeFetch(`/api/deals/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
}

export async function createCustomer(data) {
  return safeFetch('/api/customers', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
}

export async function deleteCustomer(id) {
  return safeFetch(`/api/customers/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
}

export async function createTask(data) {
  return safeFetch('/api/tasks', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
}

export async function toggleTask(id) {
  return safeFetch(`/api/tasks/${id}/toggle`, {
    method: 'PUT',
    headers: getHeaders()
  });
}

export async function deleteTask(id) {
  return safeFetch(`/api/tasks/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
}

export async function createCall(data) {
  return safeFetch('/api/calls', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
}

export async function createMeeting(data) {
  return safeFetch('/api/meetings', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
}

export async function createActivity(data) {
  return safeFetch('/api/activities', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
}

export async function deleteActivity(id) {
  return safeFetch(`/api/activities/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
}

export async function createCompany(data) {
  return safeFetch('/api/companies', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
}

export async function createTeam(data) {
  return safeFetch('/api/teams', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
}

export async function deleteTeam(id) {
  return safeFetch(`/api/teams/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
}

export async function createTeamMember(data) {
  return safeFetch('/api/team-members', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
}

export async function updateTeamMember(id, data) {
  return safeFetch(`/api/team-members/${id}`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
}

export async function deleteTeamMember(id) {
  return safeFetch(`/api/team-members/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
}

export async function toggleAutomation(id) {
  return safeFetch(`/api/automations/${id}/toggle`, {
    method: 'PUT',
    headers: getHeaders()
  });
}

export async function createAutomation(data) {
  return safeFetch('/api/automations', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
}

export async function createCampaign(data) {
  return safeFetch('/api/campaigns', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
}

export async function createIntegration(data) {
  return safeFetch('/api/integrations', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
}

export async function updateIntegration(id, data) {
  return safeFetch(`/api/integrations/${id}`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
}

export async function toggleIntegration(id) {
  return safeFetch(`/api/integrations/${id}/toggle`, {
    method: 'PUT',
    headers: getHeaders()
  });
}

export async function testIntegration(id) {
  return safeFetch(`/api/integrations/${id}/test`, {
    method: 'POST',
    headers: getHeaders()
  });
}

export async function deleteIntegration(id) {
  return safeFetch(`/api/integrations/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
}

export async function resetCrmDatabase() {
  return safeFetch('/api/crm/reset', {
    method: 'POST',
    headers: getHeaders()
  });
}

export async function createBatchLeads(leads) {
  return bulkCreateLeads(leads);
}

export async function convertLead(data) {
  return safeFetch('/api/leads/convert', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
}

export async function updateCustomer(id, data) {
  return safeFetch(`/api/customers/${id}`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
}

export async function updateCompany(id, data) {
  return safeFetch(`/api/companies/${id}`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
}

export async function deleteCompany(id) {
  return safeFetch(`/api/companies/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
}

export async function updateMeeting(id, data) {
  return safeFetch(`/api/meetings/${id}`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
}

export async function deleteMeeting(id) {
  return safeFetch(`/api/meetings/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
}

export async function updateCall(id, data) {
  return safeFetch(`/api/calls/${id}`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
}

export async function saveSettings(data) {
  return safeFetch('/api/settings', {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
}

