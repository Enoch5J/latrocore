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

import FaqSection, {
  LEFT_FAQ_ITEMS,
  RIGHT_FAQ_ITEMS,
  toggleFaqItem,
} from '../components/home/FaqSection';
import Welcome from '../pages/Welcome';

describe('Homepage FAQ Section', () => {
  it('renders centered eyebrow label, two-tone Playfair Display heading, and exact 6 Q&As in two independent columns', () => {
    const html = renderToStaticMarkup(React.createElement(FaqSection));

    expect(html).toContain('FREQUENTLY ASKED QUESTIONS');
    expect(html).toContain('font-serif');
    expect(html).toContain('text-[#093322]');
    expect(html).toContain('How can Latrocore help');
    expect(html).toContain('text-[#046A38]');
    expect(html).toContain('between visits?');

    expect(LEFT_FAQ_ITEMS).toHaveLength(3);
    expect(RIGHT_FAQ_ITEMS).toHaveLength(3);

    // Two independent equal-width vertical stacks on desktop
    expect(html).toContain('md:grid-cols-2');
    expect(html).toContain('items-start');
    expect(html).toContain('data-faq-column="left"');
    expect(html).toContain('data-faq-column="right"');
    expect(html).toContain('home-band-mint');
    expect(html).toContain('bg-[#E8F5EE]');

    // Exact copy order 1..6 across left & right columns
    const allItems = [...LEFT_FAQ_ITEMS, ...RIGHT_FAQ_ITEMS];
    let lastPos = -1;
    for (const item of allItems) {
      const qPos = html.indexOf(item.question);
      const aPos = html.indexOf(item.answer);
      expect(qPos).toBeGreaterThan(lastPos);
      expect(aPos).toBeGreaterThan(qPos);
      lastPos = aPos;
    }
  });

  it('opens only the first FAQ by default with accessible button/region attributes', () => {
    const html = renderToStaticMarkup(React.createElement(FaqSection));

    const expandedMatches = html.match(/aria-expanded="true"/g) || [];
    const collapsedMatches = html.match(/aria-expanded="false"/g) || [];
    expect(expandedMatches).toHaveLength(1);
    expect(collapsedMatches).toHaveLength(5);

    expect(html).toContain('id="faq-1-button"');
    expect(html).toContain('aria-controls="faq-1-panel"');
    expect(html).toContain('data-open="true"');
  });

  it('is placed on the Latrocore homepage immediately above the footer', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/'] },
        React.createElement(Welcome)
      )
    );

    const faqIndex = html.indexOf('id="faq"');
    const trustIndex = html.indexOf('id="trust-pillars"');
    const ctaIndex = html.indexOf('id="contact-cta"');
    const footerIndex = html.indexOf('<footer');

    expect(trustIndex).toBeGreaterThan(-1);
    expect(faqIndex).toBeGreaterThan(trustIndex);
    expect(ctaIndex).toBeGreaterThan(faqIndex);
    expect(footerIndex).toBeGreaterThan(ctaIndex);
  });

  it('allows only one answer open at a time and toggles closed when clicked again across all 6 items', () => {
    let openId = LEFT_FAQ_ITEMS[0].id;
    const allIds = [...LEFT_FAQ_ITEMS, ...RIGHT_FAQ_ITEMS].map((item) => item.id);

    for (const id of allIds) {
      openId = toggleFaqItem(openId, id);
      if (id === LEFT_FAQ_ITEMS[0].id) {
        expect(openId).toBeNull();
        openId = toggleFaqItem(openId, id);
      }
      expect(openId).toBe(id);
      openId = toggleFaqItem(openId, id);
      expect(openId).toBeNull();
    }
  });
});
