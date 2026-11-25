import { describe, it, expect } from 'vitest';
import {
  normalizeRole,
  getDefaultDashboardRoute,
  isRoleAllowed,
} from '../auth/ProtectedRoute';
import { ROLE_NAV } from '../layouts/AppLayout';

describe('Role-Based Access Control & Layout Navigation', () => {
  it('normalizes care_team to pharmacist and trims/lowercases roles', () => {
    expect(normalizeRole('Patient')).toBe('patient');
    expect(normalizeRole(' ADMIN ')).toBe('admin');
    expect(normalizeRole('care_team')).toBe('pharmacist');
    expect(normalizeRole('doctor')).toBe('doctor');
  });

  it('resolves default dashboard routes accurately for each role', () => {
    expect(getDefaultDashboardRoute({ role: 'patient', email: 'enoch@example.com' })).toBe('/patient/dashboard');
    expect(getDefaultDashboardRoute({ role: 'doctor', email: 'doc@example.com' })).toBe('/doctor/dashboard');
    expect(getDefaultDashboardRoute({ role: 'pharmacist', email: 'pharm@example.com' })).toBe('/pharmacist/dashboard');
    expect(getDefaultDashboardRoute({ role: 'care_team', email: 'care@example.com' })).toBe('/pharmacist/dashboard');
    expect(getDefaultDashboardRoute({ role: 'admin', email: 'admin@latrocore.com' })).toBe('/admin/dashboard');
  });

  it('prevents patients, doctors, and pharmacists from accessing admin routes', () => {
    expect(isRoleAllowed('patient', ['admin'])).toBe(false);
    expect(isRoleAllowed('doctor', ['admin'])).toBe(false);
    expect(isRoleAllowed('pharmacist', ['admin'])).toBe(false);
    expect(isRoleAllowed('care_team', ['admin'])).toBe(false);
    expect(isRoleAllowed('admin', ['admin'])).toBe(true);
  });

  it('prevents cross-role access between patient, doctor, and pharmacist portals', () => {
    expect(isRoleAllowed('patient', ['doctor'])).toBe(false);
    expect(isRoleAllowed('patient', ['pharmacist', 'care_team'])).toBe(false);
    expect(isRoleAllowed('doctor', ['patient'])).toBe(false);
    expect(isRoleAllowed('admin', ['patient'])).toBe(false);
    expect(isRoleAllowed('care_team', ['pharmacist'])).toBe(true);
  });

  it('ensures ROLE_NAV matches dedicated routes for every role', () => {
    expect(ROLE_NAV.patient.every((i) => i.to.startsWith('/patient') || ['/doctors', '/appointments'].includes(i.to))).toBe(true);
    expect(ROLE_NAV.doctor.every((i) => i.to.startsWith('/doctor') || ['/appointments', '/messages'].includes(i.to))).toBe(true);
    expect(ROLE_NAV.pharmacist.every((i) => i.to.startsWith('/pharmacist') || ['/appointments', '/messages'].includes(i.to))).toBe(true);
    expect(ROLE_NAV.admin.every((i) => i.to.startsWith('/admin'))).toBe(true);
  });
});
