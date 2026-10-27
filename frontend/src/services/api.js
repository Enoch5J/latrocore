/**
 * LATROCORE API Client
 * Interfaces with FastAPI backend (/api/v1) with JWT auth support.
 */

function resolveApiBase() {
  let base = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || '';
  if (!base && typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      base = 'http://127.0.0.1:8000/api/v1';
    } else {
      base = '/api/v1';
    }
  }
  if (base && !base.startsWith('http://') && !base.startsWith('https://') && !base.startsWith('/')) {
    base = `https://${base}`;
  }
  if (base && !base.endsWith('/api/v1') && !base.endsWith('/api')) {
    base = base.replace(/\/+$/, '') + '/api/v1';
  }
  return base;
}

const API_BASE = resolveApiBase();

function getToken() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('latrocore_token') || '';
  }
  return '';
}

export function setToken(token) {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (token) {
      localStorage.setItem('latrocore_token', token);
    } else {
      localStorage.removeItem('latrocore_token');
    }
  }
}

async function request(endpoint, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = {
    'X-Requested-With': 'XMLHttpRequest',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      credentials: 'include',
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Request failed: ${res.status}`);
    }

    if (res.status === 204) {
      return null;
    }

    return await res.json();
  } catch (err) {
    console.warn(`[API] ${endpoint} fetch issue:`, err.message);
    throw err;
  }
}

export const api = {
  // Auth
  login: (identifier, password) => {
    const cleanId = (identifier || '').trim();
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: cleanId, email: cleanId, password }),
    });
  },
  logout: () =>
    request('/auth/logout', {
      method: 'POST',
    }),
  sendOtp: (email, purpose) =>
    request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email, purpose }),
    }),
  verifyOtp: (email, otp, purpose) =>
    request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp, purpose }),
    }),
  uploadPrescription: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/auth/upload-prescription', {
      method: 'POST',
      body: formData,
    });
  },
  registerPatient: (data) =>
    request('/auth/register/patient', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  registerDoctor: (data) =>
    request('/auth/register/doctor', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  registerPharmacist: (data) =>
    request('/auth/register/pharmacist', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  forgotPassword: (email) =>
    request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (data) =>
    request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMe: () => request('/auth/me'),

  // Admin Doctor Management
  getPendingDoctors: () => request('/admin/doctors/pending'),
  approveDoctor: (profileId) =>
    request(`/admin/doctors/${encodeURIComponent(profileId)}/approve`, {
      method: 'POST',
    }),
  rejectDoctor: (profileId, reason) =>
    request(`/admin/doctors/${encodeURIComponent(profileId)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

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
  updatePrescriptionStatus: (rxId, status, notes = '') =>
    request(`/prescriptions/${encodeURIComponent(rxId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
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
