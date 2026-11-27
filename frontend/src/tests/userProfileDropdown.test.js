import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import UserProfileDropdown from '../components/common/UserProfileDropdown';
import { getUserInitial, getRoleDisplayLabel } from '../utils/userProfile';

describe('UserProfileDropdown Component', () => {
  const adminUser = {
    id: 'demo-admin',
    name: 'System Admin',
    email: 'admin@latrocore.com',
    role: 'admin',
  };

  it('extracts clean single uppercase initial while stripping honorific prefixes', () => {
    expect(getUserInitial({ name: 'System Admin' })).toBe('S');
    expect(getUserInitial({ name: 'Dr. Priya Sharma' })).toBe('P');
    expect(getUserInitial({ name: 'Pharm. Rajesh Kumar' })).toBe('R');
    expect(getUserInitial({ email: 'enoch@latrocore.com' })).toBe('E');
  });

  it('formats role labels consistently for all platform roles', () => {
    expect(getRoleDisplayLabel('admin')).toBe('Admin');
    expect(getRoleDisplayLabel('doctor')).toBe('Doctor');
    expect(getRoleDisplayLabel('pharmacist')).toBe('Pharmacist');
    expect(getRoleDisplayLabel('care_team')).toBe('Pharmacist');
    expect(getRoleDisplayLabel('patient')).toBe('Patient');
  });

  it('renders clean white trigger pill when closed without showing dropdown menu', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(UserProfileDropdown, { user: adminUser, initialOpen: false })
      )
    );

    expect(html).toContain('id="header-user-profile-trigger"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('System Admin');
    expect(html).toContain('Admin');
    expect(html).not.toContain('ADMIN PORTAL');
    expect(html).not.toContain('role="menu"');
    expect(html).not.toContain('My Profile');
  });

  it('renders template-matched dropdown card with inner summary card, navigation links, and Log Out when open', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(UserProfileDropdown, { user: adminUser, initialOpen: true })
      )
    );

    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('role="menu"');
    expect(html).toContain('System Admin');
    expect(html).toContain('admin@latrocore.com');
    expect(html).toContain('ADMIN');
    expect(html).toContain('Dashboard');
    expect(html).toContain('My Profile');
    expect(html).toContain('Settings');
    expect(html).toContain('Log Out');
    expect(html).toContain('rotate-180');
  });
});
