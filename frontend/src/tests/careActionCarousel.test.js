import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../hooks/useScrollMotion', () => ({
  usePrefersReducedMotion: () => false,
}));

import CareActionCarousel from '../components/home/CareActionCarousel';

describe('Homepage care action carousel', () => {
  it('renders the heading, five labeled patient links, marquee clones, and no arrow buttons', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/'] },
        React.createElement(CareActionCarousel)
      )
    );

    expect(html).toContain('What would you like to do?');
    expect(html).not.toContain('Show previous actions');
    expect(html).not.toContain('Show next actions');
    expect(html).toContain('aria-label="Patient care actions"');

    const actions = [
      ['View lab reports', '/patient/investigations'],
      ['Read visit notes', '/patient/dashboard'],
      ['Order medicines', '/patient/medications'],
      ['Track blood sugar', '/patient/glucose'],
      ['Check screenings', '/patient/screening'],
    ];
    let previousPosition = -1;
    for (const [label, route] of actions) {
      const position = html.indexOf(`>${label}</span>`);
      expect(position).toBeGreaterThan(previousPosition);
      expect(html).toContain(`href="${route}"`);
      previousPosition = position;
    }

    // 3 seamless copies of 5 cards for continuous marquee rendering
    expect((html.match(/alt=""/g) || [])).toHaveLength(15);
    expect((html.match(/tabindex="-1"/gi) || [])).toHaveLength(10);
  });
});
