import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initScrollReveals, getPrefersReducedMotion } from '../utils/scrollReveal';

function createMockElement({
  reveal = null,
  rect = { top: 900, left: 0, width: 240, height: 220 },
  children = [],
} = {}) {
  const attrs = new Map();
  if (reveal) attrs.set('data-reveal', reveal);

  const styleMap = new Map();
  const listeners = new Map();

  const el = {
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
    setRect(nextRect) {
      this._rect = {
        top: nextRect.top,
        left: nextRect.left,
        width: nextRect.width ?? this._rect.width,
        height: nextRect.height ?? this._rect.height,
        bottom: nextRect.bottom ?? nextRect.top + (nextRect.height ?? this._rect.height),
        right: nextRect.right ?? nextRect.left + (nextRect.width ?? this._rect.width),
      };
    },
    getAttribute: (name) => attrs.get(name) ?? null,
    setAttribute: (name, value) => attrs.set(name, String(value)),
    hasAttribute: (name) => attrs.has(name),
    style: {
      setProperty: (k, v) => styleMap.set(k, String(v)),
      removeProperty: (k) => styleMap.delete(k),
      getPropertyValue: (k) => styleMap.get(k) ?? '',
    },
    getBoundingClientRect: () => ({ ...el._rect }),
    compareDocumentPosition: (other) => {
      const idxA = el._order ?? 0;
      const idxB = other._order ?? 0;
      if (idxA < idxB) return 4; // DOCUMENT_POSITION_FOLLOWING
      if (idxA > idxB) return 2; // DOCUMENT_POSITION_PRECEDING
      return 0;
    },
    closest: (selector) => {
      const selectors = selector.split(',').map((s) => s.trim());
      let cur = el;
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
    querySelector: (selector) => {
      if (selector === '[data-reveal="section"]') {
        return el._descendants?.find((d) => d.getAttribute('data-reveal') === 'section') ?? null;
      }
      return null;
    },
    querySelectorAll: (selector) => {
      if (selector === '[data-reveal]') {
        return el._descendants?.filter((d) => d.getAttribute('data-reveal')) ?? [];
      }
      return [];
    },
    addEventListener: (type, fn) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener: (type, fn) => {
      listeners.get(type)?.delete(fn);
    },
    dispatchEvent: (event) => {
      listeners.get(event.type)?.forEach((fn) => fn(event));
    },
  };

  children.forEach((c) => {
    c.parentElement = el;
  });

  return el;
}

describe('Scroll Reveal & Stagger Controller', () => {
  let originalWindow;
  let originalDocument;
  let originalIO;
  let originalNode;
  let originalRAF;
  let originalCAF;
  let ioInstances;
  let windowListeners;
  let mediaListeners;
  let reducedMotionMatches;

  beforeEach(() => {
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;
    originalIO = globalThis.IntersectionObserver;
    originalNode = globalThis.Node;
    originalRAF = globalThis.requestAnimationFrame;
    originalCAF = globalThis.cancelAnimationFrame;

    ioInstances = [];
    windowListeners = new Map();
    mediaListeners = new Set();
    reducedMotionMatches = false;

    globalThis.Node = {
      DOCUMENT_POSITION_PRECEDING: 2,
      DOCUMENT_POSITION_FOLLOWING: 4,
    };

    globalThis.requestAnimationFrame = (cb) => {
      cb(0);
      return 1;
    };
    globalThis.cancelAnimationFrame = () => {};

    globalThis.document = {
      documentElement: {
        clientHeight: 800,
        scrollHeight: 2800,
      },
    };

    globalThis.window = {
      innerHeight: 800,
      scrollY: 0,
      matchMedia: vi.fn((query) => ({
        matches: query.includes('prefers-reduced-motion') ? reducedMotionMatches : false,
        addEventListener: (_type, fn) => mediaListeners.add(fn),
        removeEventListener: (_type, fn) => mediaListeners.delete(fn),
      })),
      addEventListener: (type, fn) => {
        if (!windowListeners.has(type)) windowListeners.set(type, new Set());
        windowListeners.get(type).add(fn);
      },
      removeEventListener: (type, fn) => {
        windowListeners.get(type)?.delete(fn);
      },
    };

    globalThis.IntersectionObserver = class MockIntersectionObserver {
      constructor(callback, options) {
        this.callback = callback;
        this.options = options;
        this.observed = new Set();
        this.disconnected = false;
        ioInstances.push(this);
      }
      observe(target) {
        this.observed.add(target);
      }
      unobserve(target) {
        this.observed.delete(target);
      }
      disconnect() {
        this.disconnected = true;
        this.observed.clear();
      }
      trigger(entries) {
        this.callback(entries, this);
      }
    };
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    globalThis.IntersectionObserver = originalIO;
    globalThis.Node = originalNode;
    globalThis.requestAnimationFrame = originalRAF;
    globalThis.cancelAnimationFrame = originalCAF;
    vi.restoreAllMocks();
  });

  function buildSectionAndCards(rects) {
    const sectionHeading = createMockElement({
      reveal: 'section',
      rect: { top: rects[0].top - 80, left: 100, width: 500, height: 60 },
    });
    const cards = rects.map((rect, idx) => {
      const card = createMockElement({ reveal: 'card', rect });
      card._order = idx + 1;
      return card;
    });
    sectionHeading._order = 0;

    const grid = createMockElement({ children: cards });
    grid.setAttribute('data-reveal-grid', 'workstations');

    const section = createMockElement({ children: [sectionHeading, grid] });
    section._tagName = 'section';
    section._descendants = [sectionHeading, ...cards];

    const root = createMockElement({ children: [section] });
    root._descendants = [sectionHeading, ...cards];

    return { root, section, sectionHeading, grid, cards };
  }

  it('gathers desktop row of 4 cards toward the middle and reveals symmetrically center-outward', () => {
    const { root, sectionHeading, cards } = buildSectionAndCards([
      { top: 1000, left: 40, width: 250, height: 260 },
      { top: 1000, left: 310, width: 250, height: 260 },
      { top: 1000, left: 580, width: 250, height: 260 },
      { top: 1000, left: 850, width: 250, height: 260 },
    ]);

    const cleanup = initScrollReveals(root);
    expect(ioInstances).toHaveLength(1);
    expect(sectionHeading.getAttribute('data-reveal-state')).toBe('pending');
    cards.forEach((c) => expect(c.getAttribute('data-reveal-state')).toBe('pending'));

    // Outer left/right cards pull inward toward row center; inner cards pull less
    const fromX = cards.map((c) => parseInt(c.style.getPropertyValue('--reveal-from-x'), 10));
    expect(fromX[0]).toBeGreaterThan(0);
    expect(fromX[1]).toBeGreaterThan(0);
    expect(fromX[0]).toBeGreaterThan(fromX[1]);
    expect(fromX[2]).toBeLessThan(0);
    expect(fromX[3]).toBeLessThan(0);
    expect(fromX[3]).toBeLessThan(fromX[2]);
    expect(fromX[0]).toBe(-fromX[3]);
    expect(fromX[1]).toBe(-fromX[2]);

    // Simulate scrolling the section and all 4 cards into the viewport
    sectionHeading.setRect({ top: 320 });
    cards.forEach((c) => c.setRect({ top: 400 }));

    ioInstances[0].trigger([
      { target: sectionHeading, isIntersecting: true, boundingClientRect: sectionHeading.getBoundingClientRect() },
      ...cards.map((c) => ({ target: c, isIntersecting: true, boundingClientRect: c.getBoundingClientRect() })),
    ]);

    expect(sectionHeading.getAttribute('data-reveal-state')).toBe('visible');
    expect(sectionHeading.style.getPropertyValue('--reveal-delay')).toBe('');

    expect(cards.map((c) => c.getAttribute('data-reveal-state'))).toEqual([
      'visible',
      'visible',
      'visible',
      'visible',
    ]);
    // Symmetrical center-outward stagger: inner pair opens first (0ms), outer pair follows (65ms)
    expect(cards.map((c) => c.style.getPropertyValue('--reveal-delay'))).toEqual([
      '65ms',
      '',
      '',
      '65ms',
    ]);
    // Observer stays active to detect exits and replay on subsequent visits
    expect(ioInstances[0].disconnected).toBe(false);
    cleanup();
    expect(ioInstances[0].disconnected).toBe(true);
  });

  it('gathers and reveals only cards sharing a visible row on tablet (2 rows of 2)', () => {
    const { root, sectionHeading, cards } = buildSectionAndCards([
      { top: 1000, left: 40, width: 320, height: 260 },
      { top: 1000, left: 380, width: 320, height: 260 },
      { top: 1290, left: 40, width: 320, height: 260 },
      { top: 1290, left: 380, width: 320, height: 260 },
    ]);

    const cleanup = initScrollReveals(root);

    // Row 1 enters viewport first
    sectionHeading.setRect({ top: 420 });
    cards[0].setRect({ top: 500 });
    cards[1].setRect({ top: 500 });

    ioInstances[0].trigger([
      { target: sectionHeading, isIntersecting: true, boundingClientRect: sectionHeading.getBoundingClientRect() },
      { target: cards[0], isIntersecting: true, boundingClientRect: cards[0].getBoundingClientRect() },
      { target: cards[1], isIntersecting: true, boundingClientRect: cards[1].getBoundingClientRect() },
    ]);

    expect(cards[0].getAttribute('data-reveal-state')).toBe('visible');
    expect(cards[1].getAttribute('data-reveal-state')).toBe('visible');
    expect(parseInt(cards[0].style.getPropertyValue('--reveal-from-x'), 10)).toBeGreaterThan(0);
    expect(parseInt(cards[1].style.getPropertyValue('--reveal-from-x'), 10)).toBeLessThan(0);
    expect(cards[0].style.getPropertyValue('--reveal-delay')).toBe('');
    expect(cards[1].style.getPropertyValue('--reveal-delay')).toBe('');
    expect(cards[2].getAttribute('data-reveal-state')).toBe('pending');
    expect(cards[3].getAttribute('data-reveal-state')).toBe('pending');

    // Row 2 enters later and fans symmetrically from its own row midpoint
    cards[2].setRect({ top: 520 });
    cards[3].setRect({ top: 520 });
    ioInstances[0].trigger([
      { target: cards[2], isIntersecting: true, boundingClientRect: cards[2].getBoundingClientRect() },
      { target: cards[3], isIntersecting: true, boundingClientRect: cards[3].getBoundingClientRect() },
    ]);

    expect(cards[2].getAttribute('data-reveal-state')).toBe('visible');
    expect(cards[3].getAttribute('data-reveal-state')).toBe('visible');
    expect(cards[2].style.getPropertyValue('--reveal-delay')).toBe('');
    expect(cards[3].style.getPropertyValue('--reveal-delay')).toBe('');
    cleanup();
  });

  it('reveals stacked mobile cards individually with 0px horizontal pull and replays on scroll-up', () => {
    const { root, sectionHeading, cards } = buildSectionAndCards([
      { top: 980, left: 16, width: 340, height: 260 },
      { top: 1260, left: 16, width: 340, height: 260 },
      { top: 1540, left: 16, width: 340, height: 260 },
      { top: 1820, left: 16, width: 340, height: 260 },
    ]);

    const cleanup = initScrollReveals(root);
    expect(cards[0].style.getPropertyValue('--reveal-from-x')).toBe('0px');

    sectionHeading.setRect({ top: 540 });
    cards[0].setRect({ top: 620 });
    ioInstances[0].trigger([
      { target: cards[0], isIntersecting: true, boundingClientRect: cards[0].getBoundingClientRect() },
    ]);
    expect(sectionHeading.getAttribute('data-reveal-state')).toBe('visible');
    expect(cards[0].getAttribute('data-reveal-state')).toBe('visible');
    expect(cards[0].style.getPropertyValue('--reveal-delay')).toBe('');
    expect(cards[1].getAttribute('data-reveal-state')).toBe('pending');

    // Finish scrolling down through the rest of the section, then completely past it
    sectionHeading.setRect({ top: -1200 });
    cards[0].setRect({ top: -1120 });
    cards[1].setRect({ top: -840 });
    cards[2].setRect({ top: -560 });
    cards[3].setRect({ top: -280 });
    globalThis.window.scrollY = 2200;
    windowListeners.get('scroll')?.forEach((fn) => fn());

    expect(sectionHeading.getAttribute('data-reveal-state')).toBe('pending');
    expect(cards.every((c) => c.getAttribute('data-reveal-state') === 'pending')).toBe(true);

    // Scroll back up so bottom card (cards[3]) enters from top first while cards[0..2] stay pending
    cards[3].setRect({ top: -200, bottom: 60 });
    cards[2].setRect({ top: -480, bottom: -220 });
    cards[1].setRect({ top: -760, bottom: -500 });
    cards[0].setRect({ top: -1040, bottom: -780 });
    sectionHeading.setRect({ top: -1120, bottom: -1060 });
    globalThis.window.scrollY = 1900;
    windowListeners.get('scroll')?.forEach((fn) => fn());

    expect(cards[3].getAttribute('data-reveal-state')).toBe('visible');
    expect(cards[2].getAttribute('data-reveal-state')).toBe('pending');
    expect(sectionHeading.getAttribute('data-reveal-state')).toBe('pending');

    // Keep scrolling up so cards[2] enters from top too
    cards[3].setRect({ top: 80, bottom: 340 });
    cards[2].setRect({ top: -200, bottom: 60 });
    windowListeners.get('scroll')?.forEach((fn) => fn());
    expect(cards[2].getAttribute('data-reveal-state')).toBe('visible');
    expect(cards[3].getAttribute('data-reveal-state')).toBe('visible');

    cleanup();
  });

  it('resets a section when it fully exits either edge and replays across multiple visits without flickering on mid-view reversal', () => {
    const { root, sectionHeading, cards } = buildSectionAndCards([
      { top: 1000, left: 40, width: 250, height: 260 },
      { top: 1000, left: 310, width: 250, height: 260 },
      { top: 1000, left: 580, width: 250, height: 260 },
      { top: 1000, left: 850, width: 250, height: 260 },
    ]);

    const cleanup = initScrollReveals(root);

    // Visit 1: scroll down into view
    sectionHeading.setRect({ top: 320 });
    cards.forEach((c) => c.setRect({ top: 400 }));
    globalThis.window.scrollY = 680;
    windowListeners.get('scroll')?.forEach((fn) => fn());

    expect(sectionHeading.getAttribute('data-reveal-state')).toBe('visible');
    expect(cards.every((c) => c.getAttribute('data-reveal-state') === 'visible')).toBe(true);

    // Scroll partially past top (heading exits top, cards still visible) then reverse direction:
    // section is still visible so nothing resets or flickers
    sectionHeading.setRect({ top: -80, bottom: -20 });
    cards.forEach((c) => c.setRect({ top: 20, bottom: 280 }));
    globalThis.window.scrollY = 1080;
    windowListeners.get('scroll')?.forEach((fn) => fn());
    expect(sectionHeading.getAttribute('data-reveal-state')).toBe('visible');
    expect(cards.every((c) => c.getAttribute('data-reveal-state') === 'visible')).toBe(true);

    // Reverse back up while still visible -> stays visible
    sectionHeading.setRect({ top: 120, bottom: 180 });
    cards.forEach((c) => c.setRect({ top: 220, bottom: 480 }));
    globalThis.window.scrollY = 880;
    windowListeners.get('scroll')?.forEach((fn) => fn());
    expect(sectionHeading.getAttribute('data-reveal-state')).toBe('visible');
    expect(cards.every((c) => c.getAttribute('data-reveal-state') === 'visible')).toBe(true);

    // Scroll all the way past the section so it completely leaves the top -> resets to pending
    sectionHeading.setRect({ top: -600, bottom: -540 });
    cards.forEach((c) => c.setRect({ top: -500, bottom: -240 }));
    globalThis.window.scrollY = 1600;
    windowListeners.get('scroll')?.forEach((fn) => fn());
    expect(sectionHeading.getAttribute('data-reveal-state')).toBe('pending');
    expect(cards.every((c) => c.getAttribute('data-reveal-state') === 'pending')).toBe(true);
    expect(ioInstances[0].disconnected).toBe(false);

    // Visit 2 (from below, scrolling UP): cards re-enter from top and replay entrance
    sectionHeading.setRect({ top: -180, bottom: -120 });
    cards.forEach((c) => c.setRect({ top: -100, bottom: 160 }));
    globalThis.window.scrollY = 1200;
    windowListeners.get('scroll')?.forEach((fn) => fn());
    expect(cards.every((c) => c.getAttribute('data-reveal-state') === 'visible')).toBe(true);
    expect(cards.map((c) => c.style.getPropertyValue('--reveal-delay'))).toEqual([
      '65ms',
      '',
      '',
      '65ms',
    ]);
    expect(sectionHeading.getAttribute('data-reveal-state')).toBe('pending');

    // Heading enters from top as scroll-up continues
    sectionHeading.setRect({ top: -10, bottom: 50 });
    cards.forEach((c) => c.setRect({ top: 70, bottom: 330 }));
    globalThis.window.scrollY = 1030;
    windowListeners.get('scroll')?.forEach((fn) => fn());
    expect(sectionHeading.getAttribute('data-reveal-state')).toBe('visible');

    // Scroll up until the section completely exits the bottom -> resets to pending
    sectionHeading.setRect({ top: 820, bottom: 880 });
    cards.forEach((c) => c.setRect({ top: 900, bottom: 1160 }));
    globalThis.window.scrollY = 100;
    windowListeners.get('scroll')?.forEach((fn) => fn());
    expect(sectionHeading.getAttribute('data-reveal-state')).toBe('pending');
    expect(cards.every((c) => c.getAttribute('data-reveal-state') === 'pending')).toBe(true);

    // Visit 3 (from above, scrolling DOWN again): replays cleanly
    sectionHeading.setRect({ top: 320, bottom: 380 });
    cards.forEach((c) => c.setRect({ top: 400, bottom: 660 }));
    globalThis.window.scrollY = 680;
    windowListeners.get('scroll')?.forEach((fn) => fn());
    expect(sectionHeading.getAttribute('data-reveal-state')).toBe('visible');
    expect(cards.every((c) => c.getAttribute('data-reveal-state') === 'visible')).toBe(true);

    cleanup();
  });

  it('resets multiple sections independently based on their own viewport visibility', () => {
    const first = buildSectionAndCards([
      { top: 950, left: 40, width: 250, height: 260 },
      { top: 950, left: 310, width: 250, height: 260 },
    ]);
    const second = buildSectionAndCards([
      { top: 1500, left: 40, width: 250, height: 260 },
      { top: 1500, left: 310, width: 250, height: 260 },
    ]);
    const root = createMockElement({ children: [first.section, second.section] });
    root._descendants = [
      first.sectionHeading,
      ...first.cards,
      second.sectionHeading,
      ...second.cards,
    ];

    const cleanup = initScrollReveals(root);

    // Both sections come into view sequentially; first exits above while second enters
    first.sectionHeading.setRect({ top: -400, bottom: -340 });
    first.cards.forEach((c) => c.setRect({ top: -320, bottom: -60 }));
    second.sectionHeading.setRect({ top: 200, bottom: 260 });
    second.cards.forEach((c) => c.setRect({ top: 280, bottom: 540 }));
    globalThis.window.scrollY = 1200;
    windowListeners.get('scroll')?.forEach((fn) => fn());

    expect(first.sectionHeading.getAttribute('data-reveal-state')).toBe('pending');
    expect(first.cards.every((c) => c.getAttribute('data-reveal-state') === 'pending')).toBe(true);
    expect(second.sectionHeading.getAttribute('data-reveal-state')).toBe('visible');
    expect(second.cards.every((c) => c.getAttribute('data-reveal-state') === 'visible')).toBe(true);

    cleanup();
  });

  it('reveals focused element and section heading immediately on keyboard focusin', () => {
    const { root, sectionHeading, cards } = buildSectionAndCards([
      { top: 1100, left: 40, width: 250, height: 260 },
      { top: 1100, left: 310, width: 250, height: 260 },
      { top: 1100, left: 580, width: 250, height: 260 },
      { top: 1100, left: 850, width: 250, height: 260 },
    ]);
    const innerButton = createMockElement();
    innerButton.parentElement = cards[1];

    const cleanup = initScrollReveals(root);

    root.dispatchEvent({ type: 'focusin', target: innerButton });

    expect(cards[1].getAttribute('data-reveal-state')).toBe('immediate');
    expect(sectionHeading.getAttribute('data-reveal-state')).toBe('immediate');
    cleanup();
  });

  it('respects prefers-reduced-motion on load and when toggled dynamically', () => {
    reducedMotionMatches = true;
    expect(getPrefersReducedMotion()).toBe(true);

    const { root, sectionHeading, cards } = buildSectionAndCards([
      { top: 1100, left: 40, width: 250, height: 260 },
    ]);
    const cleanupImmediate = initScrollReveals(root);
    expect(sectionHeading.getAttribute('data-reveal-state')).toBe('immediate');
    expect(cards[0].getAttribute('data-reveal-state')).toBe('immediate');
    expect(ioInstances).toHaveLength(0);
    cleanupImmediate();

    // Now test toggling reduced motion on while elements are still pending
    reducedMotionMatches = false;
    const second = buildSectionAndCards([
      { top: 1200, left: 40, width: 250, height: 260 },
    ]);
    const cleanupToggle = initScrollReveals(second.root);
    expect(second.cards[0].getAttribute('data-reveal-state')).toBe('pending');

    mediaListeners.forEach((fn) => fn({ matches: true }));
    expect(second.sectionHeading.getAttribute('data-reveal-state')).toBe('immediate');
    expect(second.cards[0].getAttribute('data-reveal-state')).toBe('immediate');
    expect(ioInstances[0].disconnected).toBe(true);
    cleanupToggle();
  });
});
