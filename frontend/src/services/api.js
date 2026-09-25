/**
 * LATROCORE API Client
 * Interfaces with FastAPI backend (/api/v1) with JWT auth support.
 */

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';

function getToken() {
  return localStorage.getItem('latrocore_token') || '';
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('latrocore_token', token);
  } else {
    localStorage.removeItem('latrocore_token');
  }
}

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Request failed: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.warn(`[API] ${endpoint} fetch issue:`, err.message);
    throw err;
  }
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (data) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMe: () => request('/auth/me'),

  // Patients
  getPatients: (params = '') => request(`/patients${params ? `?${params}` : ''}`),
  getPatient: (id) => request(`/patients/${id}`),
  getPatientSummary: (patientId) =>
    request(`/patients/${encodeURIComponent(patientId)}/summary`),

  // Observations (Glucose, BP, HbA1c, etc.)
  getObservations: (patientId, type = '') => {
    let url = `/patients/${encodeURIComponent(patientId)}/observations`;
    if (type) url += `?type=${encodeURIComponent(type)}`;
    return request(url);
  },
  addObservation: (patientId, data) =>
    request(`/patients/${encodeURIComponent(patientId)}/observations`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Prescriptions
  getPrescriptions: (patientId, status = '') => {
    let url = `/patients/${encodeURIComponent(patientId)}/prescriptions`;
    if (status) url += `?status_filter=${encodeURIComponent(status)}`;
    return request(url);
  },
  createPrescription: (patientId, data) =>
    request(`/patients/${encodeURIComponent(patientId)}/prescriptions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  activatePrescription: (rxId, version) =>
    request(`/prescriptions/${encodeURIComponent(rxId)}/activate`, {
      method: 'POST',
      body: JSON.stringify({ version }),
    }),

  // Doses
  getDoseSchedule: (patientId, days = 7) =>
    request(`/patients/${encodeURIComponent(patientId)}/schedule?days=${days}`),
  recordDoseEvent: (doseInstanceId, data) =>
    request(`/dose-instances/${encodeURIComponent(doseInstanceId)}/events`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Tickets / Care Coordination
  getTickets: (status = '', priority = '') => {
    let url = '/tickets';
    const params = [];
    if (status) params.push(`status=${encodeURIComponent(status)}`);
    if (priority) params.push(`priority=${encodeURIComponent(priority)}`);
    if (params.length) url += `?${params.join('&')}`;
    return request(url);
  },
  getPatientReferrals: (patientId) =>
    request(`/patients/${encodeURIComponent(patientId)}/referrals`),
  createReferral: (patientId, data) =>
    request(`/patients/${encodeURIComponent(patientId)}/referrals`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createTicket: (patientId, data) =>
    request(`/patients/${encodeURIComponent(patientId)}/tickets`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // AI Assistant
  getConversations: (patientId) =>
    request(`/conversations?patient_id=${encodeURIComponent(patientId)}`),
  sendMessage: (conversationId, content) =>
    request('/conversations/messages', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId, content }),
    }),

  // Notifications
  getNotifications: () => request('/notifications'),
};

export default api;
