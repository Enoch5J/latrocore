import { describe, it, expect, vi, afterEach } from 'vitest';
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

import HeroCarousel from '../components/home/HeroCarousel';
import { HERO_SLIDES, getNextHeroIndex } from '../components/home/heroCarouselSlides';
import Welcome from '../pages/Welcome';

describe('Homepage HeroCarousel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defines the 4 slides in exact order with exact copy and assets', () => {
    expect(HERO_SLIDES.map((s) => s.label)).toEqual([
      'Medicines',
      'Monitoring',
      'Latro AI',
      'Follow-ups',
    ]);

    expect(HERO_SLIDES.map((s) => s.headline)).toEqual([
      'Turn your prescription into daily reminders.',
      'See your glucose readings over time.',
      'Ask about diabetes in your language.',
      'Know what’s due before your next visit.',
    ]);

    expect(HERO_SLIDES.map((s) => s.body)).toEqual([
      'See when each medicine is due, log a dose and keep track of refills.',
      'Keep readings and notes together to review with your care team.',
      'Ask about medicines, lab tests and everyday care in English, Tamil or Hindi.',
      'Keep tests and follow-ups in view, and prepare questions for your care team.',
    ]);

    expect(HERO_SLIDES.map((s) => s.buttonLabel)).toEqual([
      'See how reminders work',
      'Explore glucose tracking',
      'Ask Latro AI',
      'Explore follow-up care',
    ]);

    expect(HERO_SLIDES[0].image).toContain('medicines');
    expect(HERO_SLIDES[1].image).toContain('monitoring');
    expect(HERO_SLIDES[2].image).toContain('latro-ai');
    expect(HERO_SLIDES[3].image).toContain('follow-ups');

    expect(HERO_SLIDES[0].target).toBe('/patient/medications');
    expect(HERO_SLIDES[1].target).toBe('/patient/glucose');
    expect(HERO_SLIDES[2].actionType).toBe('chat');
    expect(HERO_SLIDES[3].target).toBe('/patient/test-reminders');
  });

  it('opens immediately on Medicines, renders live HTML copy, object-contain artwork, and 4 flat tabs', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/'] },
        React.createElement(HeroCarousel)
      )
    );

    expect(html).toContain('id="hero-carousel"');
    expect(html).toContain('data-hero-slide="medicines" data-active="true"');
    expect(html).toContain('data-hero-slide="monitoring" data-active="false"');
    expect(html).toContain('data-hero-slide="latro-ai" data-active="false"');
    expect(html).toContain('data-hero-slide="follow-ups" data-active="false"');

    // Only one H1 rendered (for the active slide)
    const h1Matches = html.match(/<h1\b/g) || [];
    expect(h1Matches).toHaveLength(1);
    expect(html).toContain('<h1 class="latro-hero-headline');

    // All 4 slides present in DOM for crossfade + breakpoint height reservation
    for (const slide of HERO_SLIDES) {
      expect(html).toContain(slide.headline);
      expect(html).toContain(slide.body);
      expect(html).toContain(slide.buttonLabel);
      expect(html).toContain(`id="hero-tab-${slide.id}"`);
    }

    expect(html).toContain('object-contain');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-selected="true"');
    expect((html.match(/role="tab"/g) || [])).toHaveLength(4);
    expect((html.match(/class="latro-hero-background"/g) || [])).toHaveLength(1);
    expect(html).toContain('<div class="latro-hero-background" aria-hidden="true">');
    expect(html).toContain('<div class="latro-hero-content');
    expect(html.indexOf('class="latro-hero-background"')).toBeLessThan(
      html.indexOf('class="latro-hero-content')
    );
  });

  it('supports keyboard arrow, Home, and End tab navigation with wrap-around', () => {
    expect(getNextHeroIndex(0, 'ArrowRight')).toBe(1);
    expect(getNextHeroIndex(3, 'ArrowRight')).toBe(0);
    expect(getNextHeroIndex(0, 'ArrowLeft')).toBe(3);
    expect(getNextHeroIndex(2, 'ArrowUp')).toBe(1);
    expect(getNextHeroIndex(1, 'ArrowDown')).toBe(2);
    expect(getNextHeroIndex(2, 'Home')).toBe(0);
    expect(getNextHeroIndex(0, 'End')).toBe(3);
    expect(getNextHeroIndex(1, 'Enter')).toBe(1);
  });

  it('replaces only the hero section on Welcome while keeping navbar and sections below intact', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/'] },
        React.createElement(Welcome)
      )
    );

    const headerEnd = html.indexOf('</header>');
    const heroIdx = html.indexOf('id="hero-carousel"');
    const aboutIdx = html.indexOf('id="about-latrocore"');
    const careIdx = html.indexOf('id="care-continuum"');
    const aiCarouselIdx = html.indexOf('id="ai-companion-explore"');
    const companionIdx = html.indexOf('id="daily-care-companion"');
    const workstationsIdx = html.indexOf('id="workstations"');
    const faqIdx = html.indexOf('id="faq"');

    expect(headerEnd).toBeGreaterThan(-1);
    expect(heroIdx).toBeGreaterThan(headerEnd);
    expect(aboutIdx).toBeGreaterThan(heroIdx);
    expect(careIdx).toBeGreaterThan(aboutIdx);
    expect(aiCarouselIdx).toBeGreaterThan(careIdx);
    expect(companionIdx).toBeGreaterThan(aiCarouselIdx);
    expect(workstationsIdx).toBeGreaterThan(companionIdx);
    expect(faqIdx).toBeGreaterThan(workstationsIdx);

    // Navbar elements remain intact
    expect(html).toContain('id="header-login-btn"');
    expect(html).toContain('Latro AI');
    expect(html).toContain('Our Solutions');
    expect(html).toContain('Contact');
    expect(html).toContain('>Log In</span>');
    expect(html).toContain('aria-label="Main navigation"');
    expect(html).not.toContain('Search specialists');
    expect(html).not.toContain('href="/#workstations"');
    expect(html).toContain('LATROCORE');
  });
});
