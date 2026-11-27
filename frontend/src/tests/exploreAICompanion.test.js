import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ExploreAICompanion from '../components/home/ExploreAICompanion';
import { initFanStageReveal } from '../utils/scrollReveal';
import {
  AI_COMPANION_TOPICS,
  INITIAL_ACTIVE_INDEX,
  getCircularOffset,
  getOrderedIndices,
} from '../components/home/aiCompanionTopics';
import {
  OPEN_AI_COMPANION_EVENT,
  openAICompanionWithDraft,
} from '../utils/aiCompanionChat';
import { getAssistantResponse } from '../services/assistantEngine';

describe('ExploreAICompanion Carousel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defines all seven topics in exact circular order with expected questions and assets', () => {
    expect(AI_COMPANION_TOPICS.map((t) => t.title)).toEqual([
      'Language support',
      'Medicine reminders',
      'Glucose logs',
      'Lab tests',
      'Visit preparation',
      'Meal planning',
      'Daily activity',
    ]);

    expect(AI_COMPANION_TOPICS.map((t) => t.question)).toEqual([
      'Can you explain a glucose log in Tamil?',
      'How do refill reminders work?',
      'What should I record in my glucose log?',
      'What does HbA1c mean?',
      'What should I ask my pharmacist about refills?',
      'How can I build a balanced meal with rice, dal, and vegetables?',
      'How can I fit short walks into my workday?',
    ]);

    expect(AI_COMPANION_TOPICS[0].image).toContain('language-support');
    expect(AI_COMPANION_TOPICS[1].image).toContain('medicine-reminders');
    expect(AI_COMPANION_TOPICS[2].image).toContain('glucose-logs');
    expect(AI_COMPANION_TOPICS[3].image).toContain('lab-tests');
    expect(AI_COMPANION_TOPICS[4].image).toContain('visit-preparation');
    expect(AI_COMPANION_TOPICS[5].image).toContain('meal-planning');
    expect(AI_COMPANION_TOPICS[6].image).toContain('daily-activity');
  });

  it('starts on Medicine reminders (index 1) with full 7-card left-to-right fan order', () => {
    expect(INITIAL_ACTIVE_INDEX).toBe(1);
    expect(AI_COMPANION_TOPICS[INITIAL_ACTIVE_INDEX].title).toBe('Medicine reminders');

    const ordered = getOrderedIndices(INITIAL_ACTIVE_INDEX);
    expect(ordered.map((idx) => AI_COMPANION_TOPICS[idx].title)).toEqual([
      'Meal planning',
      'Daily activity',
      'Language support',
      'Medicine reminders',
      'Glucose logs',
      'Lab tests',
      'Visit preparation',
    ]);
  });

  it('computes circular offsets across all 7 cards and wraps from last card to first', () => {
    // When Meal planning (5) is active, full 7-card fan is [2, 3, 4, 5, 6, 0, 1]
    expect(getOrderedIndices(5).map((i) => AI_COMPANION_TOPICS[i].title)).toEqual([
      'Glucose logs',
      'Lab tests',
      'Visit preparation',
      'Meal planning',
      'Daily activity',
      'Language support',
      'Medicine reminders',
    ]);

    // When Daily activity (6) is active, full 7-card fan wraps to [3, 4, 5, 6, 0, 1, 2]
    expect(getOrderedIndices(6).map((i) => AI_COMPANION_TOPICS[i].title)).toEqual([
      'Lab tests',
      'Visit preparation',
      'Meal planning',
      'Daily activity',
      'Language support',
      'Medicine reminders',
      'Glucose logs',
    ]);

    expect(getCircularOffset(0, 6)).toBe(1);
    expect(getCircularOffset(6, 0)).toBe(-1);
    expect(getCircularOffset(4, 1)).toBe(3);
    expect(getCircularOffset(5, 1)).toBe(-3);
  });

  it('renders heading, subtitle, active Medicine reminders card, 7 accessible dots, and CTA button', () => {
    const html = renderToStaticMarkup(React.createElement(ExploreAICompanion));

    expect(html).toContain('Explore the Latrocore AI companion');
    expect(html).toContain('Choose a topic to start a conversation.');
    expect(html).toContain('Ask this question');
    expect(html).toContain('aspect-[4/3]');
    expect(html).toContain('overflow-x-clip');
    expect(html).toContain('z-0 isolate');
    expect(html).toContain('z-index:4;');
    expect(html).not.toContain('z-index:40');

    expect(html).toContain('data-topic-id="meal-planning" data-offset="-3"');
    expect(html).toContain('data-topic-id="daily-activity" data-offset="-2"');
    expect(html).toContain('data-topic-id="language-support" data-offset="-1"');
    expect(html).toContain('data-topic-id="medicine-reminders" data-offset="0" data-active="true"');
    expect(html).toContain('data-topic-id="glucose-logs" data-offset="1"');
    expect(html).toContain('data-topic-id="lab-tests" data-offset="2"');
    expect(html).toContain('data-topic-id="visit-preparation" data-offset="3"');

    // All 7 cards remain visible in the desktop fan (only mobile collapses outer cards)
    expect(html).toContain('lg:opacity-90 lg:pointer-events-auto');

    // Only the active center card displays its full question so side cards never show clipped text
    expect(html).toContain('How do refill reminders work?');
    expect(html).not.toContain('What should I ask my pharmacist about refills?');
    expect(html).not.toContain('How can I build a balanced meal with rice, dal, and vegetables?');

    // Verify accessible topic labels on all 7 pagination dots
    expect(html).toContain('aria-label="Language support"');
    expect(html).toContain('aria-label="Medicine reminders"');
    expect(html).toContain('aria-label="Glucose logs"');
    expect(html).toContain('aria-label="Lab tests"');
    expect(html).toContain('aria-label="Visit preparation"');
    expect(html).toContain('aria-label="Meal planning"');
    expect(html).toContain('aria-label="Daily activity"');
  });

  it('dispatches auto-send AI companion event payload for all 7 cards and resolves answers for every topic', () => {
    const dispatched = [];
    const origWindow = globalThis.window;
    const origCustomEvent = globalThis.CustomEvent;

    globalThis.CustomEvent = class MockCustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init?.detail;
      }
    };
    globalThis.window = {
      dispatchEvent: (evt) => {
        dispatched.push(evt);
        return true;
      },
    };

    try {
      for (const topic of AI_COMPANION_TOPICS) {
        openAICompanionWithDraft(topic.question);
      }
      expect(dispatched).toHaveLength(7);
      expect(dispatched.map((e) => e.type)).toEqual(
        Array(7).fill(OPEN_AI_COMPANION_EVENT)
      );
      expect(dispatched.map((e) => e.detail.question)).toEqual(
        AI_COMPANION_TOPICS.map((t) => t.question)
      );
      expect(dispatched.every((e) => e.detail.autoSend === true)).toBe(true);
    } finally {
      globalThis.window = origWindow;
      globalThis.CustomEvent = origCustomEvent;
    }

    const tamilReply = getAssistantResponse(AI_COMPANION_TOPICS[0].question, 'en');
    expect(tamilReply.matched).toBe(true);
    expect(tamilReply.text).toMatch(/[\u0B80-\u0BFF]/);

    const refillReminderReply = getAssistantResponse(AI_COMPANION_TOPICS[1].question, 'en');
    expect(refillReminderReply.matched).toBe(true);
    expect(refillReminderReply.topic).toBe('medicine-reminders');

    const logRecordReply = getAssistantResponse(AI_COMPANION_TOPICS[2].question, 'en');
    expect(logRecordReply.matched).toBe(true);
    expect(logRecordReply.topic).toBe('glucose-logs');

    const hba1cReply = getAssistantResponse(AI_COMPANION_TOPICS[3].question, 'en');
    expect(hba1cReply.matched).toBe(true);
    expect(hba1cReply.topic).toBe('lab-tests');

    const pharmacistReply = getAssistantResponse(AI_COMPANION_TOPICS[4].question, 'en');
    expect(pharmacistReply.matched).toBe(true);
    expect(pharmacistReply.topic).toBe('visit-preparation');

    const mealReply = getAssistantResponse(AI_COMPANION_TOPICS[5].question, 'en');
    expect(mealReply.matched).toBe(true);
    expect(mealReply.topic).toBe('meal-planning');

    const walkReply = getAssistantResponse(AI_COMPANION_TOPICS[6].question, 'en');
    expect(walkReply.matched).toBe(true);
    expect(walkReply.topic).toBe('daily-activity');
  });

  it('replays fan-out animation on every scroll visit from both directions without resetting mid-view', () => {
    const origWindow = globalThis.window;
    const origDocument = globalThis.document;
    const origIO = globalThis.IntersectionObserver;
    const origRAF = globalThis.requestAnimationFrame;
    const origCAF = globalThis.cancelAnimationFrame;

    vi.useFakeTimers();
    const windowListeners = new Map();
    const ioInstances = [];

    const makeBox = (initialRect) => {
      const attrs = new Map();
      const listeners = new Map();
      let rect = { ...initialRect };
      return {
        setRect(next) {
          rect = {
            top: next.top,
            left: next.left ?? rect.left,
            width: next.width ?? rect.width,
            height: next.height ?? rect.height,
            bottom: next.bottom ?? next.top + (next.height ?? rect.height),
            right: next.right ?? (next.left ?? rect.left) + (next.width ?? rect.width),
          };
        },
        getBoundingClientRect: () => ({ ...rect }),
        getAttribute: (k) => attrs.get(k) ?? null,
        setAttribute: (k, v) => attrs.set(k, String(v)),
        addEventListener: (t, fn) => {
          if (!listeners.has(t)) listeners.set(t, new Set());
          listeners.get(t).add(fn);
        },
        removeEventListener: (t, fn) => listeners.get(t)?.delete(fn),
        closest: () => null,
      };
    };

    try {
      globalThis.requestAnimationFrame = (cb) => {
        cb(0);
        return 1;
      };
      globalThis.cancelAnimationFrame = () => {};
      globalThis.document = {
        documentElement: { clientHeight: 800, scrollHeight: 3200 },
      };
      globalThis.window = {
        innerHeight: 800,
        scrollY: 0,
        matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
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

      const section = makeBox({ top: 1000, left: 0, width: 1200, height: 680, bottom: 1680, right: 1200 });
      const stage = makeBox({ top: 1120, left: 0, width: 1200, height: 500, bottom: 1620, right: 1200 });
      stage.closest = (sel) => (sel === 'section' ? section : null);

      const cleanup = initFanStageReveal(stage);
      expect(stage.getAttribute('data-fan-phase')).toBe('converged');

      // Visit 1: scroll down into stage -> entering -> interactive
      section.setRect({ top: 120, bottom: 800 });
      stage.setRect({ top: 240, bottom: 740 });
      globalThis.window.scrollY = 880;
      windowListeners.get('scroll')?.forEach((fn) => fn());
      expect(stage.getAttribute('data-fan-phase')).toBe('entering');

      vi.advanceTimersByTime(900);
      expect(stage.getAttribute('data-fan-phase')).toBe('interactive');

      // Mid-section reversal while section bottom dots are still in view -> stays interactive
      section.setRect({ top: -540, bottom: 140 });
      stage.setRect({ top: -420, bottom: 80 });
      globalThis.window.scrollY = 1540;
      windowListeners.get('scroll')?.forEach((fn) => fn());
      expect(stage.getAttribute('data-fan-phase')).toBe('interactive');

      // Fully exit top -> resets back to converged
      section.setRect({ top: -720, bottom: -40 });
      stage.setRect({ top: -600, bottom: -100 });
      globalThis.window.scrollY = 1720;
      windowListeners.get('scroll')?.forEach((fn) => fn());
      expect(stage.getAttribute('data-fan-phase')).toBe('converged');

      // Visit 2: scroll back up into stage -> replays entering -> interactive
      section.setRect({ top: -300, bottom: 380 });
      stage.setRect({ top: -180, bottom: 320 });
      globalThis.window.scrollY = 1300;
      windowListeners.get('scroll')?.forEach((fn) => fn());
      expect(stage.getAttribute('data-fan-phase')).toBe('entering');

      vi.advanceTimersByTime(900);
      expect(stage.getAttribute('data-fan-phase')).toBe('interactive');

      // Exit bottom -> resets to converged; Visit 3 down replays again
      section.setRect({ top: 900, bottom: 1580 });
      stage.setRect({ top: 1020, bottom: 1520 });
      globalThis.window.scrollY = 100;
      windowListeners.get('scroll')?.forEach((fn) => fn());
      expect(stage.getAttribute('data-fan-phase')).toBe('converged');

      section.setRect({ top: 120, bottom: 800 });
      stage.setRect({ top: 240, bottom: 740 });
      globalThis.window.scrollY = 880;
      windowListeners.get('scroll')?.forEach((fn) => fn());
      expect(stage.getAttribute('data-fan-phase')).toBe('entering');

      cleanup();

      // Reduced motion keeps stage immediately interactive without observers
      const reducedStage = makeBox({ top: 1120, left: 0, width: 1200, height: 500, bottom: 1620, right: 1200 });
      const cleanupReduced = initFanStageReveal(reducedStage, { prefersReducedMotion: true });
      expect(reducedStage.getAttribute('data-fan-phase')).toBe('interactive');
      cleanupReduced();
    } finally {
      vi.useRealTimers();
      globalThis.window = origWindow;
      globalThis.document = origDocument;
      globalThis.IntersectionObserver = origIO;
      globalThis.requestAnimationFrame = origRAF;
      globalThis.cancelAnimationFrame = origCAF;
    }
  });
});
