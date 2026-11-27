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

import HowWeWorkSection from '../components/home/HowWeWorkSection';
import Welcome from '../pages/Welcome';

describe('Homepage How We Work Section', () => {
  it('renders the three-step workflow cleanly with step numbers and descriptions', () => {
    const html = renderToStaticMarkup(React.createElement(HowWeWorkSection));

    expect(html).toContain('HOW WE WORK');
    expect(html).toContain('Simple care in three clear steps');
    expect(html).toContain('01');
    expect(html).toContain('Record at home');
    expect(html).toContain('02');
    expect(html).toContain('Review &amp; verify');
    expect(html).toContain('03');
    expect(html).toContain('Visit prepared');
  });

  it('renders on the homepage before the FAQ section', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/'] },
        React.createElement(Welcome)
      )
    );

    const howWeWorkIdx = html.indexOf('id="how-we-work"');
    const faqIdx = html.indexOf('Simple care in three clear steps');
    expect(howWeWorkIdx).toBeGreaterThan(-1);
    expect(faqIdx).toBeGreaterThan(howWeWorkIdx);
  });
});
