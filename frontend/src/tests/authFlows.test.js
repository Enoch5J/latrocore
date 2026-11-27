import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../services/api';
import { apiClient, authClient, setAccessToken } from '../lib/axios';

function parseAdapterBody(data) {
  if (typeof data === 'string') {
    return JSON.parse(data);
  }
  return data;
}

describe('Auth & Registration API client tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAccessToken(null);
    authClient.defaults.adapter = null;
    apiClient.defaults.adapter = null;
  });

  it('sends OTP with correct purpose and CSRF header', async () => {
    const adapterSpy = vi.fn(async (config) => ({
      data: { message: 'OTP sent', cooldownSeconds: 60 },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    authClient.defaults.adapter = adapterSpy;

    const res = await api.sendOtp('patient@example.com', 'patient_signup');
    expect(res.cooldownSeconds).toBe(60);
    expect(adapterSpy).toHaveBeenCalledTimes(1);

    const callConfig = adapterSpy.mock.calls[0][0];
    expect(callConfig.url).toContain('/auth/send-otp');
    expect(callConfig.method.toUpperCase()).toBe('POST');
    expect(callConfig.withCredentials).toBe(true);
    expect(callConfig.headers['X-Requested-With']).toBe('XMLHttpRequest');
    expect(callConfig.headers['Content-Type']).toContain('application/json');
    expect(parseAdapterBody(callConfig.data)).toEqual({
      email: 'patient@example.com',
      purpose: 'patient_signup',
    });
  });

  it('verifies OTP and receives verification token', async () => {
    authClient.defaults.adapter = async (config) => ({
      data: {
        message: 'Email verified',
        verificationToken: 'secure-token-123',
        email: 'patient@example.com',
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });

    const res = await api.verifyOtp('patient@example.com', '123456', 'patient_signup');
    expect(res.verificationToken).toBe('secure-token-123');
  });

  it('submits patient signup with verified token, age, phone, and conditions', async () => {
    authClient.defaults.adapter = async (config) => ({
      data: {
        accessToken: 'jwt-access-token',
        user: {
          id: 'user-pat-1',
          name: 'Priya Sharma',
          role: 'patient',
          displayId: 'PAT-123456',
        },
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
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
    authClient.defaults.adapter = async (config) => ({
      data: {
        accessToken: 'jwt-doctor-token',
        user: {
          id: 'user-doc-1',
          name: 'Dr. Ramesh Gupta',
          role: 'doctor',
          status: 'pending',
          displayId: 'DOC-987654',
        },
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
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

  it('updates profile fields and changes a password through the authenticated API', async () => {
    setAccessToken('profile-access-token');
    const adapterSpy = vi.fn(async (config) => ({
      data: config.url.endsWith('/change-password')
        ? { message: 'Password changed. Please sign in again.' }
        : { id: 'user-1', name: 'Updated User', phone: '+919876543210' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    apiClient.defaults.adapter = adapterSpy;

    const profile = await api.updateMe({ name: 'Updated User', phone: '+919876543210' });
    const password = await api.changePassword({
      currentPassword: 'ExistingPassword123!',
      newPassword: 'NewPasswordForThisUser2026!',
    });

    expect(profile.name).toBe('Updated User');
    expect(password.message).toContain('Password changed');
    expect(adapterSpy).toHaveBeenCalledTimes(2);
    expect(adapterSpy.mock.calls[0][0].method.toUpperCase()).toBe('PATCH');
    expect(adapterSpy.mock.calls[0][0].url).toContain('/auth/me');
    expect(parseAdapterBody(adapterSpy.mock.calls[0][0].data)).toEqual({
      name: 'Updated User',
      phone: '+919876543210',
    });
    expect(adapterSpy.mock.calls[1][0].url).toContain('/auth/change-password');
  });

  it('handles admin doctor approval and rejection', async () => {
    setAccessToken('admin-jwt');
    apiClient.defaults.adapter = vi
      .fn()
      .mockImplementationOnce(async (config) => ({
        data: [
          {
            id: 'doc-prof-1',
            name: 'Dr. Ramesh Gupta',
            doctorIdDisplay: 'DOC-987654',
            approvalStatus: 'pending',
          },
        ],
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }))
      .mockImplementationOnce(async (config) => ({
        data: { status: 'approved' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }));

    const pending = await api.getPendingDoctors();
    expect(pending).toHaveLength(1);
    expect(pending[0].doctorIdDisplay).toBe('DOC-987654');

    const approval = await api.approveDoctor('doc-prof-1');
    expect(approval.status).toBe('approved');
  });

  it('submits login with email or phone number in payload', async () => {
    const adapterSpy = vi.fn(async (config) => ({
      data: {
        accessToken: 'mock-jwt-token',
        user: { id: 'u1', email: 'doctor@latrocore.com' },
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    authClient.defaults.adapter = adapterSpy;

    // 1. Login with phone number
    await api.login('9876543210', 'SecretPass123!');
    expect(adapterSpy.mock.calls[0][0].url).toContain('/auth/login');
    expect(adapterSpy.mock.calls[0][0].method.toUpperCase()).toBe('POST');
    expect(parseAdapterBody(adapterSpy.mock.calls[0][0].data)).toEqual({
      identifier: '9876543210',
      email: '9876543210',
      password: 'SecretPass123!',
    });

    // 2. Login with email
    await api.login('doctor@latrocore.com', 'SecretPass123!');
    expect(adapterSpy.mock.calls[1][0].url).toContain('/auth/login');
    expect(adapterSpy.mock.calls[1][0].method.toUpperCase()).toBe('POST');
    expect(parseAdapterBody(adapterSpy.mock.calls[1][0].data)).toEqual({
      identifier: 'doctor@latrocore.com',
      email: 'doctor@latrocore.com',
      password: 'SecretPass123!',
    });
  });
});
