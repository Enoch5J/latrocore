import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../context/AppContext', () => ({
  useApp: () => ({ data: {}, refreshData: vi.fn(), addToast: vi.fn() }),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false }),
}));

vi.mock('../hooks/useScrollMotion', () => ({
  usePrefersReducedMotion: () => false,
}));

import FloatingAIAssistant, { AIFaceAvatar } from '../components/FloatingAIAssistant';
import {
  DOCTOR_GREETING_DURATION_MS,
  DOCTOR_GREETING_REPEAT_INTERVAL_MS,
  startGreetingCycle,
} from '../utils/aiCompanionChat';

describe('Doctor Bot AI Avatar and Greeting Popup', () => {
  it('renders the transparent full doctor portrait for AIFaceAvatar without cropping, white fill, or robot SVG', () => {
    const html = renderToStaticMarkup(React.createElement(AIFaceAvatar, { size: 40 }));

    expect(html).toContain('src="/doctor-avatar.png"');
    expect(html).toContain('alt="Dr. Latro AI"');
    expect(html).toContain('bg-transparent object-contain');
    expect(html).not.toContain('bg-white');
    expect(html).not.toContain('rounded-full');
    expect(html).not.toContain('scale-105');
    expect(html).not.toContain('<svg');
    expect(html).not.toContain('ai-face-visor');
  });

  it('uses a 3-second repeating greeting cycle and renders standalone doctor launcher with cancel button', () => {
    expect(DOCTOR_GREETING_DURATION_MS).toBe(3000);
    expect(DOCTOR_GREETING_REPEAT_INTERVAL_MS).toBe(3000);

    const closedHtml = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/'] },
        React.createElement(FloatingAIAssistant, { initialGreeting: true })
      )
    );

    expect(closedHtml).toContain('Open Latro AI Assistant');
    expect(closedHtml).toContain('aria-label="Close greeting"');
    expect(closedHtml).toContain('src="/doctor-avatar.png"');
    expect(closedHtml).toContain('bg-transparent object-contain');
    expect(closedHtml).toContain('Latro AI');
    expect(closedHtml).toContain('Hi there!');
    expect(closedHtml).toContain('Dr. Latro AI');
    expect(closedHtml).not.toContain('blur-md');
    expect(closedHtml).not.toContain('animate-ping');
    expect(closedHtml).not.toContain('scale-115');
    expect(closedHtml).not.toContain('ai-face-visor');
  });

  it('renders the doctor avatar inside the opened chat drawer header and welcome message', () => {
    const openHtml = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/'] },
        React.createElement(FloatingAIAssistant, { initialOpen: true })
      )
    );

    expect(openHtml).toContain('Doctor AI Decision Support');
    expect(openHtml).toContain('src="/doctor-avatar.png"');
    expect(openHtml).not.toContain('ai-face-visor');
  });

  it('repeats showing and hiding the greeting popup every 3 seconds until cancelled', () => {
    vi.useFakeTimers();
    try {
      const onShow = vi.fn();
      const onHide = vi.fn();
      let stopped = false;

      const cancel = startGreetingCycle({
        onShow,
        onHide,
        shouldStop: () => stopped,
      });

      vi.advanceTimersByTime(150);
      expect(onShow).toHaveBeenCalledTimes(1);
      expect(onHide).toHaveBeenCalledTimes(0);

      vi.advanceTimersByTime(3000);
      expect(onHide).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(3000);
      expect(onShow).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(3000);
      expect(onHide).toHaveBeenCalledTimes(2);

      stopped = true;
      cancel();
      vi.advanceTimersByTime(10000);
      expect(onShow).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
