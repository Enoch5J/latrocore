import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../services/api';

describe('Admin Approvals & Status API Client Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn();
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

    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockSummary,
    });

    const res = await api.getApprovalsSummary();
    expect(res.totalPending).toBe(6);
    expect(res.pendingPatients).toBe(3);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/approvals/summary'),
      expect.any(Object)
    );
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

    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockPatients,
    });

    const res = await api.getPendingPatients();
    expect(res.length).toBe(1);
    expect(res[0].patientIdDisplay).toBe('PAT-881290');
    expect(res[0].conditions).toContain('Type 2 Diabetes');
  });

  it('approves a patient and updates status to approved', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        message: 'Patient approved successfully',
        status: 'approved',
      }),
    });

    const res = await api.approvePatient('pat-1');
    expect(res.status).toBe('approved');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/patients/pat-1/approve'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('approves a pharmacist and updates status', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        message: 'Pharmacist approved successfully',
        status: 'approved',
      }),
    });

    const res = await api.approvePharmacist('pharm-1');
    expect(res.status).toBe('approved');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/pharmacists/pharm-1/approve'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('checks auth status for waiting approval page', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'user-123',
        name: 'Pending User',
        email: 'pending@latrocore.com',
        role: 'patient',
        status: 'pending',
        approvalStatus: 'pending',
        displayId: 'PAT-991244',
      }),
    });

    const res = await api.getAuthStatus();
    expect(res.status).toBe('pending');
    expect(res.approvalStatus).toBe('pending');
    expect(res.displayId).toBe('PAT-991244');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/status'),
      expect.any(Object)
    );
  });

  it('batch approves accounts across roles', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        message: 'Successfully approved 3 account(s).',
        approvedCount: 3,
      }),
    });

    const payload = {
      doctorProfileIds: ['doc-1'],
      pharmacistProfileIds: ['pharm-1'],
      patientIds: ['pat-1'],
    };

    const res = await api.batchApprove(payload);
    expect(res.approvedCount).toBe(3);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/approvals/batch-approve'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      })
    );
  });
});

