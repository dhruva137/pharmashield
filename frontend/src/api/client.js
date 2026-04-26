// In dev the Vite proxy forwards /api and /healthz to localhost:8000.
// Set VITE_BACKEND_URL in .env only when deploying with a separate origin.
const BASE_URL = import.meta.env.VITE_BACKEND_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.detail || err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  health: () => request('/healthz'),

  getDrugs: (params = {}) => {
    const q = new URLSearchParams();
    if (params.tier) q.set('tier', params.tier);
    if (params.severity) q.set('severity', params.severity);
    if (params.limit) q.set('limit', params.limit);
    if (params.offset) q.set('offset', params.offset);
    return request(`/api/v1/drugs?${q}`);
  },

  getDrug: (id) => request(`/api/v1/drug/${id}`),

  getAlerts: (params = {}) => {
    const q = new URLSearchParams();
    if (params.severity) q.set('severity', params.severity);
    if (params.drug_id) q.set('drug_id', params.drug_id);
    if (params.source) q.set('source', params.source);
    if (params.limit) q.set('limit', params.limit);
    if (params.offset) q.set('offset', params.offset);
    return request(`/api/v1/alerts?${q}`);
  },

  getAlert: (id) => request(`/api/v1/alert/${id}`),

  getGraph: () => request('/api/v1/graph'),

  getStateRisks: () => request('/api/v1/graph/states'),

  query: (question, context_filters = {}) =>
    request('/api/v1/query', {
      method: 'POST',
      body: JSON.stringify({ question, context_filters }),
    }),

  simulate: (province, duration_days, severity) =>
    request('/api/v1/simulate', {
      method: 'POST',
      body: JSON.stringify({ province, duration_days, severity }),
    }),

  getSectors: () => request('/api/v1/sectors'),

  getShocks: (params = {}) => {
    const q = new URLSearchParams();
    if (params.sector) q.set('sector', params.sector);
    if (params.severity) q.set('severity', params.severity);
    if (params.limit) q.set('limit', params.limit);
    return request(`/api/v1/shocks?${q}`);
  },

  getShock: (id) => request(`/api/v1/shocks/${id}`),

  getShockWarRoom: (id) => request(`/api/v1/shocks/${id}/war-room`),

  simulateShockAction: (id, actionId) =>
    request(`/api/v1/shocks/${id}/simulate-action`, {
      method: 'POST',
      body: JSON.stringify({ action_id: actionId }),
    }),

  // Engine 2: Propagation + Communities
  getPropagation: (province, sector = 'pharma') =>
    request(`/api/v1/propagation/${encodeURIComponent(province)}?sector=${sector}`),

  getCommunities: () => request('/api/v1/communities'),

  getNodeCommunity: (nodeId) =>
    request(`/api/v1/communities/${encodeURIComponent(nodeId)}`),

  getCriticality: (nodeId) =>
    request(`/api/v1/criticality/${encodeURIComponent(nodeId)}`),

  // Engine 3: Action Intelligence
  getActionPlan: (region, shockType = 'factory_shutdown', sector = 'pharma') =>
    request('/api/v1/action-plan', {
      method: 'POST',
      body: JSON.stringify({ region, shock_type: shockType, sector }),
    }),

  // Engine Status
  getEngineStatus: () => request('/api/v1/engines'),
};
