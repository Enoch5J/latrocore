import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../services/api';

describe('Auth & Registration API client tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn();
  });

  it('sends OTP with correct purpose and CSRF header', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ message: 'OTP sent', cooldownSeconds: 60 }),
    });

    const res = await api.sendOtp('patient@example.com', 'patient_signup');
    expect(res.cooldownSeconds).toBe(60);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/send-otp'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ email: 'patient@example.com', purpose: 'patient_signup' }),
      })
    );
  });

  it('verifies OTP and receives verification token', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        message: 'Email verified',
        verificationToken: 'secure-token-123',
        email: 'patient@example.com',
      }),
    });

    const res = await api.verifyOtp('patient@example.com', '123456', 'patient_signup');
    expect(res.verificationToken).toBe('secure-token-123');
  });

  it('submits patient signup with verified token, age, phone, and conditions', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        accessToken: 'jwt-access-token',
        user: {
          id: 'user-pat-1',
          name: 'Priya Sharma',
          role: 'patient',
          displayId: 'PAT-123456',
        },
      }),
    });

    const patientPayload = {
      name: 'Priya Sharma',
      email: 'priya@example.com',
      phone: '9876543210',
      countryCode: '+91',
      age: 38,
      conditions: ['Type 2 Diabetes'],
      password: 'SecurePassword123#',
      confirmPassword: 'SecurePassword123#',
      verificationToken: 'secure-token-123',
      consentHealthData: true,
      acceptTerms: true,
    };

    const res = await api.registerPatient(patientPayload);
    expect(res.user.displayId).toBe('PAT-123456');
    expect(res.user.role).toBe('patient');
  });

  it('submits doctor signup with license and council info', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        accessToken: 'jwt-doctor-token',
        user: {
          id: 'user-doc-1',
          name: 'Dr. Ramesh Gupta',
          role: 'doctor',
          status: 'pending',
          displayId: 'DOC-987654',
        },
      }),
    });

    const doctorPayload = {
      name: 'Dr. Ramesh Gupta',
      email: 'ramesh@example.com',
      phone: '9812345678',
      countryCode: '+91',
      licenseNumber: 'MCI-998877',
      council: 'Medical Council of India',
      specialization: 'Diabetology',
      password: 'DoctorPassword123#',
      confirmPassword: 'DoctorPassword123#',
      verificationToken: 'secure-doc-token',
      acceptTerms: true,
    };

    const res = await api.registerDoctor(doctorPayload);
    expect(res.user.displayId).toBe('DOC-987654');
    expect(res.user.status).toBe('pending');
  });

  it('handles admin doctor approval and rejection', async () => {
    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: 'doc-prof-1',
            name: 'Dr. Ramesh Gupta',
            doctorIdDisplay: 'DOC-987654',
            approvalStatus: 'pending',
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: 'approved' }),
      });

    const pending = await api.getPendingDoctors();
    expect(pending).toHaveLength(1);
    expect(pending[0].doctorIdDisplay).toBe('DOC-987654');

    const approval = await api.approveDoctor('doc-prof-1');
    expect(approval.status).toBe('approved');
  });
});
