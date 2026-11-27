import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../context/AppContext', () => ({
  useApp: () => ({ data: {}, setUser: vi.fn(), refreshData: vi.fn(), addToast: vi.fn() }),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, logout: vi.fn() }),
}));

vi.mock('../hooks/useScrollMotion', () => ({
  usePrefersReducedMotion: () => false,
  useScrollReveals: () => {},
}));

import TrustPillarsSection from '../components/home/TrustPillarsSection';
import Welcome from '../pages/Welcome';

describe('Homepage Care You Can Follow (trust-pillars) Section', () => {
  it('renders the eyebrow, heading, and four photo-and-text cards with empty alt text', () => {
    const html = renderToStaticMarkup(React.createElement(TrustPillarsSection));

    expect(html).toContain('id="trust-pillars"');
    expect(html).toContain('CLINICAL STANDARDS');
    expect(html).toContain('Care you can follow between visits');
    expect(html).not.toContain('Why Patients &amp; Physicians Trust LATROCORE');

    expect(html).toContain('Lab results in one place');
    expect(html).toContain('Find past test results by date when you prepare for your next visit.');
    expect(html).toContain('Changes over time');
    expect(html).toContain('Compare your blood sugar readings across days and weeks.');
    expect(html).toContain('Who can see your records?');
    expect(html).toContain('What you can see depends on your role as a patient or care team member.');
    expect(html).toContain('Medicine interaction checks');
    expect(html).toContain('Potential interactions are flagged for your care team to review.');

    expect((html.match(/alt=""/g) || [])).toHaveLength(4);
    expect(html).toContain('md:grid-cols-2');
    expect(html).toContain('gap-5');
  });

  it('preserves section placement on the homepage with id="trust-pillars"', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/'] },
        React.createElement(Welcome)
      )
    );

    const workstationsIdx = html.indexOf('id="workstations"');
    const trustIdx = html.indexOf('id="trust-pillars"');
    const faqIdx = html.indexOf('id="faq"');

    expect(workstationsIdx).toBeGreaterThan(-1);
    expect(trustIdx).toBeGreaterThan(workstationsIdx);
    expect(faqIdx).toBeGreaterThan(trustIdx);
  });
});
