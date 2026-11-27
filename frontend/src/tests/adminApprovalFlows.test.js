import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../services/api';
import { apiClient, setAccessToken } from '../lib/axios';

function parseAdapterBody(data) {
  if (typeof data === 'string') {
    return JSON.parse(data);
  }
  return data;
}

describe('Admin Approvals & Status API Client Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAccessToken('admin-access-jwt');
    apiClient.defaults.adapter = null;
  });

  it('fetches approvals summary correctly', async () => {
    const mockSummary = {
      pendingDoctors: 2,
      pendingPharmacists: 1,
      pendingPatients: 3,
      totalPending: 6,
      totalUsers: 25,
      activeDoctors: 4,
      activePharmacists: 3,
      activePatients: 15,
    };

    const adapterSpy = vi.fn(async (config) => ({
      data: mockSummary,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    apiClient.defaults.adapter = adapterSpy;

    const res = await api.getApprovalsSummary();
    expect(res.totalPending).toBe(6);
    expect(res.pendingPatients).toBe(3);
    expect(adapterSpy.mock.calls[0][0].url).toContain('/admin/approvals/summary');
  });

  it('fetches pending patients with clinical metadata', async () => {
    const mockPatients = [
      {
        id: 'pat-1',
        name: 'Aarav Kumar',
        email: 'aarav@latrocore.com',
        patientIdDisplay: 'PAT-881290',
        age: 38,
        conditions: ['Type 2 Diabetes', 'Hypertension'],
        approvalStatus: 'pending',
      },
    ];

    apiClient.defaults.adapter = async (config) => ({
      data: mockPatients,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });

    const res = await api.getPendingPatients();
    expect(res.length).toBe(1);
    expect(res[0].patientIdDisplay).toBe('PAT-881290');
    expect(res[0].conditions).toContain('Type 2 Diabetes');
  });

  it('approves a patient and updates status to approved', async () => {
    const adapterSpy = vi.fn(async (config) => ({
      data: {
        message: 'Patient approved successfully',
        status: 'approved',
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    apiClient.defaults.adapter = adapterSpy;

    const res = await api.approvePatient('pat-1');
    expect(res.status).toBe('approved');
    expect(adapterSpy.mock.calls[0][0].url).toContain('/admin/patients/pat-1/approve');
    expect(adapterSpy.mock.calls[0][0].method.toUpperCase()).toBe('POST');
  });

  it('approves a pharmacist and updates status', async () => {
    const adapterSpy = vi.fn(async (config) => ({
      data: {
        message: 'Pharmacist approved successfully',
        status: 'approved',
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    apiClient.defaults.adapter = adapterSpy;

    const res = await api.approvePharmacist('pharm-1');
    expect(res.status).toBe('approved');
    expect(adapterSpy.mock.calls[0][0].url).toContain('/admin/pharmacists/pharm-1/approve');
    expect(adapterSpy.mock.calls[0][0].method.toUpperCase()).toBe('POST');
  });

  it('checks auth status for waiting approval page', async () => {
    const adapterSpy = vi.fn(async (config) => ({
      data: {
        id: 'user-123',
        name: 'Pending User',
        email: 'pending@latrocore.com',
        role: 'patient',
        status: 'pending',
        approvalStatus: 'pending',
        displayId: 'PAT-991244',
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    apiClient.defaults.adapter = adapterSpy;

    const res = await api.getAuthStatus();
    expect(res.status).toBe('pending');
    expect(res.approvalStatus).toBe('pending');
    expect(res.displayId).toBe('PAT-991244');
    expect(adapterSpy.mock.calls[0][0].url).toContain('/auth/status');
  });

  it('batch approves accounts across roles', async () => {
    const adapterSpy = vi.fn(async (config) => ({
      data: {
        message: 'Successfully approved 3 account(s).',
        approvedCount: 3,
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    apiClient.defaults.adapter = adapterSpy;

    const payload = {
      doctorProfileIds: ['doc-1'],
      pharmacistProfileIds: ['pharm-1'],
      patientIds: ['pat-1'],
    };

    const res = await api.batchApprove(payload);
    expect(res.approvedCount).toBe(3);
    expect(adapterSpy.mock.calls[0][0].url).toContain('/admin/approvals/batch-approve');
    expect(adapterSpy.mock.calls[0][0].method.toUpperCase()).toBe('POST');
    expect(parseAdapterBody(adapterSpy.mock.calls[0][0].data)).toEqual(payload);
  });
});
