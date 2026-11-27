import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { initScrollReveals } from '../utils/scrollReveal';

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

import AboutSection from '../components/home/AboutSection';
import { ABOUT_CARDS } from '../components/home/aboutCards';
import Welcome from '../pages/Welcome';

function createRevealNode({ reveal = null, rect = { top: 900, left: 0, width: 520, height: 112 }, children = [] } = {}) {
  const attrs = new Map();
  if (reveal) attrs.set('data-reveal', reveal);
  const styleMap = new Map();

  const node = {
    parentElement: null,
    children: [...children],
    _rect: {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom ?? rect.top + rect.height,
      right: rect.right ?? rect.left + rect.width,
    },
    setRect(next) {
      this._rect = {
        top: next.top,
        left: next.left ?? this._rect.left,
        width: next.width ?? this._rect.width,
        height: next.height ?? this._rect.height,
        bottom: next.bottom ?? next.top + (next.height ?? this._rect.height),
        right: next.right ?? (next.left ?? this._rect.left) + (next.width ?? this._rect.width),
      };
    },
    getAttribute: (k) => attrs.get(k) ?? null,
    setAttribute: (k, v) => attrs.set(k, String(v)),
    style: {
      setProperty: (k, v) => styleMap.set(k, String(v)),
      removeProperty: (k) => styleMap.delete(k),
      getPropertyValue: (k) => styleMap.get(k) ?? '',
    },
    getBoundingClientRect: () => ({ ...node._rect }),
    compareDocumentPosition: (other) => {
      const a = node._order ?? 0;
      const b = other._order ?? 0;
      if (a < b) return 4;
      if (a > b) return 2;
      return 0;
    },
    closest: (selector) => {
      const selectors = selector.split(',').map((s) => s.trim());
      let cur = node;
      while (cur) {
        for (const s of selectors) {
          if (s === '[data-reveal]' && cur.getAttribute('data-reveal')) return cur;
          if (s === '[data-reveal-grid]' && cur.getAttribute('data-reveal-grid')) return cur;
          if ((s === 'section' || s === 'footer') && cur._tagName === s) return cur;
        }
        cur = cur.parentElement;
      }
      return null;
    },
    querySelector: () => null,
    querySelectorAll: (sel) => (sel === '[data-reveal]' ? node._descendants ?? [] : []),
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  children.forEach((c) => {
    c.parentElement = node;
  });

  return node;
}

describe('Homepage About Latrocore Section', () => {
  let origWindow;
  let origDocument;
  let origIO;
  let origNode;
  let origRAF;
  let origCAF;

  beforeEach(() => {
    origWindow = globalThis.window;
    origDocument = globalThis.document;
    origIO = globalThis.IntersectionObserver;
    origNode = globalThis.Node;
    origRAF = globalThis.requestAnimationFrame;
    origCAF = globalThis.cancelAnimationFrame;
  });

  afterEach(() => {
    globalThis.window = origWindow;
    globalThis.document = origDocument;
    globalThis.IntersectionObserver = origIO;
    globalThis.Node = origNode;
    globalThis.requestAnimationFrame = origRAF;
    globalThis.cancelAnimationFrame = origCAF;
    vi.restoreAllMocks();
  });

  it('renders exact left-column editorial copy, two-line heading, and Explore our solutions link', () => {
    const html = renderToStaticMarkup(React.createElement(AboutSection));

    expect(html).toContain('ABOUT LATROCORE');
    expect(html).toContain('font-sans');
    expect(html).toContain('text-[#0D261C] block">Diabetes care');
    expect(html).toContain('text-[#169B53] block">between visits.');
    expect(html).toContain(
      'Most diabetes care happens at home. That’s where readings get written down, medicines are taken, and questions come up.'
    );
    expect(html).toContain(
      'We built Latrocore to keep those details together, so you can bring a clear record to your next appointment.'
    );
    expect(html).toContain('href="#care-continuum"');
    expect(html).toContain('Explore our solutions');
    expect(html).toContain('→');
    expect(html).toContain('home-band-mint');
  });

  it('renders four care highlights in one timeline panel with Lucide icons and highlighted first row', () => {
    const html = renderToStaticMarkup(React.createElement(AboutSection));

    expect(ABOUT_CARDS).toHaveLength(4);
    expect(html).toContain('data-reveal-grid="about-latrocore"');
    expect(html).toContain('data-reveal-order="sequential"');
    expect(html).toContain('data-reveal-step="60"');
    expect(html).toContain('bg-white');
    expect(html).toContain('bg-[#E5F6EC]');
    expect(html).toContain('Medicine reminders');
    expect(html).toContain('Keep track of doses and upcoming refills.');
    expect(html).toContain('Glucose journal');
    expect(html).toContain('Save readings with a note about your day.');
    expect(html).toContain('Latro AI in your language');
    expect(html).toContain('Ask questions in English, Tamil or Hindi.');
    expect(html).toContain('Your next visit');
    expect(html).toContain('Keep tests, appointments and questions together.');

    // Lucide outline icons matching the design
    expect(html).toContain('lucide-pill');
    expect(html).toContain('lucide-droplet');
    expect(html).toContain('lucide-message-square-more');
    expect(html).toContain('lucide-calendar-days');

    let lastPos = -1;
    for (const card of ABOUT_CARDS) {
      const titlePos = html.indexOf(card.title);
      const descPos = html.indexOf(card.description);
      expect(titlePos).toBeGreaterThan(lastPos);
      expect(descPos).toBeGreaterThan(titlePos);
      lastPos = descPos;
    }
  });

  it('is placed on the homepage immediately after the hero and before the Care Continuum solutions section', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/'] },
        React.createElement(Welcome)
      )
    );

    const heroIndex = html.indexOf('id="hero-carousel"');
    const aboutIndex = html.indexOf('id="about-latrocore"');
    const solutionsIndex = html.indexOf('id="care-continuum"');
    const carouselIndex = html.indexOf('id="ai-companion-explore"');

    expect(heroIndex).toBeGreaterThan(-1);
    expect(aboutIndex).toBeGreaterThan(heroIndex);
    expect(solutionsIndex).toBeGreaterThan(aboutIndex);
    expect(carouselIndex).toBeGreaterThan(solutionsIndex);

    // No extra section sits between Hero -> About or About -> Solutions
    const aboutSectionStart = html.lastIndexOf('<section', aboutIndex);
    const betweenHeroAndAbout = html.slice(heroIndex, aboutSectionStart);
    expect(betweenHeroAndAbout.indexOf('<section')).toBe(-1);

    const solutionsSectionStart = html.lastIndexOf('<section', solutionsIndex);
    const betweenAboutAndSolutions = html.slice(aboutIndex, solutionsSectionStart);
    expect(betweenAboutAndSolutions.indexOf('<section')).toBe(-1);
  });

  it('reveals the four stacked cards sequentially with a 60ms stagger and respects prefers-reduced-motion', () => {
    const windowListeners = new Map();
    let reducedMotionMatches = false;
    const ioInstances = [];

    globalThis.Node = { DOCUMENT_POSITION_PRECEDING: 2, DOCUMENT_POSITION_FOLLOWING: 4 };
    globalThis.requestAnimationFrame = (cb) => {
      cb(0);
      return 1;
    };
    globalThis.cancelAnimationFrame = () => {};
    globalThis.document = {
      documentElement: { clientHeight: 800, scrollHeight: 2800 },
    };
    globalThis.window = {
      innerHeight: 800,
      scrollY: 0,
      matchMedia: () => ({
        matches: reducedMotionMatches,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
      addEventListener: (t, fn) => {
        if (!windowListeners.has(t)) windowListeners.set(t, new Set());
        windowListeners.get(t).add(fn);
      },
      removeEventListener: (t, fn) => windowListeners.get(t)?.delete(fn),
    };
    globalThis.IntersectionObserver = class {
      constructor(cb) {
        this.cb = cb;
        ioInstances.push(this);
      }
      observe() {}
      disconnect() {}
    };

    const buildTree = () => {
      const intro = createRevealNode({
        reveal: 'section',
        rect: { top: 960, left: 32, width: 520, height: 380 },
      });
      intro._order = 0;

      const cards = [0, 1, 2, 3].map((i) => {
        const card = createRevealNode({
          reveal: 'card',
          rect: { top: 960 + i * 124, left: 600, width: 560, height: 110 },
        });
        card._order = i + 1;
        return card;
      });

      const grid = createRevealNode({ children: cards });
      grid.setAttribute('data-reveal-grid', 'about-latrocore');
      grid.setAttribute('data-reveal-order', 'sequential');
      grid.setAttribute('data-reveal-step', '60');

      const section = createRevealNode({ children: [intro, grid] });
      section._tagName = 'section';
      section._descendants = [intro, ...cards];

      const root = createRevealNode({ children: [section] });
      root._descendants = [intro, ...cards];

      return { root, intro, cards };
    };

    const { root, intro, cards } = buildTree();
    const cleanup = initScrollReveals(root);

    expect(intro.getAttribute('data-reveal-state')).toBe('pending');
    expect(cards.every((c) => c.getAttribute('data-reveal-state') === 'pending')).toBe(true);

    // Scroll section into view
    intro.setRect({ top: 180 });
    cards.forEach((c, i) => c.setRect({ top: 180 + i * 124 }));
    globalThis.window.scrollY = 780;
    windowListeners.get('scroll')?.forEach((fn) => fn());

    expect(intro.getAttribute('data-reveal-state')).toBe('visible');
    expect(cards.every((c) => c.getAttribute('data-reveal-state') === 'visible')).toBe(true);
    expect(cards.map((c) => c.style.getPropertyValue('--reveal-delay'))).toEqual([
      '',
      '60ms',
      '120ms',
      '180ms',
    ]);
    cleanup();

    // Reduced motion reveals immediately with no observer or stagger
    reducedMotionMatches = true;
    const reduced = buildTree();
    const cleanupReduced = initScrollReveals(reduced.root);
    expect(reduced.intro.getAttribute('data-reveal-state')).toBe('immediate');
    expect(reduced.cards.every((c) => c.getAttribute('data-reveal-state') === 'immediate')).toBe(true);
    expect(reduced.cards.every((c) => c.style.getPropertyValue('--reveal-delay') === '')).toBe(true);
    expect(ioInstances).toHaveLength(1);
    cleanupReduced();
  });
});
