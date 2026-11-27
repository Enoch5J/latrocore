/**
 * LATROCORE API Client
 * Routes all protected endpoints through `apiClient` (Axios with in-memory JWT + 401 refresh queue)
 * and auth lifecycle endpoints through `authClient` (same-origin Vite proxy or configured API origin).
 */

import { apiClient, authClient, getAccessToken, setAccessToken } from '../lib/axios';

function resolveApiPrefix() {
  const explicit = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || '';
  if (!explicit) {
    // Always use relative same-origin '/api/v1' so Vite proxy and SameSite=Strict cookies stay same-origin
    return '/api/v1';
  }
  let base = explicit;
  if (!base.startsWith('http://') && !base.startsWith('https://') && !base.startsWith('/')) {
    base = `https://${base}`;
  }
  if (!base.endsWith('/api/v1') && !base.endsWith('/api')) {
    base = base.replace(/\/+$/, '') + '/api/v1';
  }
  return base;
}

const API_PREFIX = resolveApiPrefix();

export function setToken(token) {
  setAccessToken(token || null);
}

export function getToken() {
  return getAccessToken() || '';
}

function extractApiError(err) {
  const detail = err?.response?.data?.detail || err?.message || 'Request failed';
  const wrapped = new Error(detail);
  wrapped.status = err?.response?.status;
  wrapped.response = err?.response;
  return wrapped;
}

async function request(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const useAuthTransport = Boolean(options.useAuthClient);
  const client = useAuthTransport ? authClient : apiClient;
  const url = useAuthTransport ? endpoint : `${API_PREFIX}${endpoint}`;

  let data = options.body;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      // Keep raw string if not JSON
    }
  }

  try {
    const res = await client.request({
      url,
      method,
      data,
      headers: options.headers,
      withCredentials: true,
    });
    if (res.status === 204) {
      return null;
    }
    return res.data;
  } catch (err) {
    throw extractApiError(err);
  }
}

export const api = {
  // Auth (uses raw authClient so /auth/* requests never enter the 401 retry loop)
  login: (identifier, password) => {
    const cleanId = (identifier || '').trim();
    return request('/auth/login', {
      method: 'POST',
      useAuthClient: true,
      body: { identifier: cleanId, email: cleanId, password },
    });
  },
  logout: () =>
    request('/auth/logout', {
      method: 'POST',
      useAuthClient: true,
    }),
  sendOtp: (email, purpose) =>
    request('/auth/send-otp', {
      method: 'POST',
      useAuthClient: true,
      body: { email, purpose },
    }),
  verifyOtp: (email, otp, purpose) =>
    request('/auth/verify-otp', {
      method: 'POST',
      useAuthClient: true,
      body: { email, otp, purpose },
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
      useAuthClient: true,
      body: data,
    }),
  registerDoctor: (data) =>
    request('/auth/register/doctor', {
      method: 'POST',
      useAuthClient: true,
      body: data,
    }),
  registerPharmacist: (data) =>
    request('/auth/register/pharmacist', {
      method: 'POST',
      useAuthClient: true,
      body: data,
    }),
  forgotPassword: (email) =>
    request('/auth/forgot-password', {
      method: 'POST',
      useAuthClient: true,
      body: { email },
    }),
  resetPassword: (data) =>
    request('/auth/reset-password', {
      method: 'POST',
      useAuthClient: true,
      body: data,
    }),
  getMe: () => request('/auth/me'),
  updateMe: (data) =>
    request('/auth/me', {
      method: 'PATCH',
      body: data,
    }),
  changePassword: (data) =>
    request('/auth/change-password', {
      method: 'POST',
      body: data,
    }),
  getAuthStatus: () => request('/auth/status'),

  // Admin Clinical Approval & User Governance
  getApprovalsSummary: () => request('/admin/approvals/summary'),
  getPendingDoctors: () => request('/admin/doctors/pending'),
  approveDoctor: (profileId) =>
    request(`/admin/doctors/${encodeURIComponent(profileId)}/approve`, {
      method: 'POST',
    }),
  rejectDoctor: (profileId, reason) =>
    request(`/admin/doctors/${encodeURIComponent(profileId)}/reject`, {
      method: 'POST',
      body: { reason },
    }),
  getPendingPharmacists: () => request('/admin/pharmacists/pending'),
  approvePharmacist: (profileId) =>
    request(`/admin/pharmacists/${encodeURIComponent(profileId)}/approve`, {
      method: 'POST',
    }),
  rejectPharmacist: (profileId, reason) =>
    request(`/admin/pharmacists/${encodeURIComponent(profileId)}/reject`, {
      method: 'POST',
      body: { reason },
    }),
  getPendingPatients: () => request('/admin/patients/pending'),
  approvePatient: (patientId) =>
    request(`/admin/patients/${encodeURIComponent(patientId)}/approve`, {
      method: 'POST',
    }),
  rejectPatient: (patientId, reason) =>
    request(`/admin/patients/${encodeURIComponent(patientId)}/reject`, {
      method: 'POST',
      body: { reason },
    }),
  batchApprove: (data) =>
    request('/admin/approvals/batch-approve', {
      method: 'POST',
      body: data,
    }),
  getAllUsers: () => request('/admin/users/all'),
  updateUserStatus: (userId, status) =>
    request(`/admin/users/${encodeURIComponent(userId)}/status`, {
      method: 'POST',
      body: { status },
    }),
  deleteUser: (userId) =>
    request(`/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    }),
  purgeDemoData: () =>
    request('/admin/purge-demo-data', {
      method: 'POST',
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
      body: data,
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
      body: data,
    }),
  activatePrescription: (rxId, version) =>
    request(`/prescriptions/${encodeURIComponent(rxId)}/activate`, {
      method: 'POST',
      body: { version },
    }),
  updatePrescriptionStatus: (rxId, status, notes = '') =>
    request(`/prescriptions/${encodeURIComponent(rxId)}/status`, {
      method: 'PATCH',
      body: { status, notes },
    }),

  // Gemini AI Prescription Digitization & Plan Synthesis
  analyzePrescriptionAI: (fileOrText) => {
    if (fileOrText instanceof File) {
      const formData = new FormData();
      formData.append('file', fileOrText);
      return request('/prescriptions/analyze', {
        method: 'POST',
        body: formData,
      });
    }
    if (typeof fileOrText === 'string') {
      return request('/prescriptions/analyze-json', {
        method: 'POST',
        body: { text: fileOrText },
      });
    }
    if (fileOrText && typeof fileOrText === 'object') {
      const formData = new FormData();
      if (fileOrText.file) formData.append('file', fileOrText.file);
      if (fileOrText.text) formData.append('text', fileOrText.text);
      return request('/prescriptions/analyze', {
        method: 'POST',
        body: formData,
      });
    }
    throw new Error('Please select a prescription file or enter prescription text.');
  },
  applyAIPrescription: (data) =>
    request('/prescriptions/apply', {
      method: 'POST',
      body: data,
    }),

  // Doses
  getDoseSchedule: (patientId, days = 7) =>
    request(`/patients/${encodeURIComponent(patientId)}/schedule?days=${days}`),
  recordDoseEvent: (doseInstanceId, data) =>
    request(`/dose-instances/${encodeURIComponent(doseInstanceId)}/events`, {
      method: 'POST',
      body: data,
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
      body: data,
    }),
  createTicket: (patientId, data) =>
    request(`/patients/${encodeURIComponent(patientId)}/tickets`, {
      method: 'POST',
      body: data,
    }),

  // AI Assistant
  getConversations: (patientId) =>
    request(`/conversations?patient_id=${encodeURIComponent(patientId)}`),
  sendMessage: (conversationId, content) =>
    request('/conversations/messages', {
      method: 'POST',
      body: { conversation_id: conversationId, content },
    }),
  askAssistant: (content, language = 'en', prescription_context = null, history = null, options = {}) => {
    const payload = { content, language, prescription_context };
    if (Array.isArray(history) && history.length > 0) {
      payload.history = history;
    }
    if (options?.uploadId) payload.upload_id = options.uploadId;
    if (options?.upload_id) payload.upload_id = options.upload_id;
    if (options?.prescriptionId) payload.prescription_id = options.prescriptionId;
    if (options?.conversationId) payload.conversation_id = options.conversationId;
    return request('/conversations/chat', {
      method: 'POST',
      body: payload,
    });
  },

  // Notifications
  getNotifications: () => request('/notifications'),

  // Public Contact Enquiries (works without signing in)
  submitContactEnquiry: (payload) =>
    request('/contact/enquiries', {
      method: 'POST',
      body: payload,
    }),
};

export default api;
