import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const authState = {
  user: null,
  isAuthenticated: false,
  loading: false,
};

const appState = {
  currentUser: null,
  data: { prescriptions: [] },
  refreshData: vi.fn(),
  addToast: vi.fn(),
};

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => authState,
  AuthProvider: ({ children }) => children,
}));

vi.mock('../context/AppContext', () => ({
  useApp: () => appState,
  AppProvider: ({ children }) => children,
}));

import FloatingAIAssistant from '../components/FloatingAIAssistant';
import Assistant from '../pages/patient/Assistant';
import { getAssistantResponse } from '../services/assistantEngine';

function renderWithRouter(element) {
  return renderToStaticMarkup(
    React.createElement(MemoryRouter, { initialEntries: ['/'] }, element)
  );
}

describe('Latro AI Rename, Patient-Only Upload Controls & Dual-Intent Q&A', () => {
  beforeEach(() => {
    authState.user = null;
    authState.isAuthenticated = false;
    appState.currentUser = null;
    appState.data = { prescriptions: [] };
  });

  it('displays "Latro AI" on the homepage launcher and hides upload controls for guests', () => {
    const html = renderWithRouter(React.createElement(FloatingAIAssistant, { initialOpen: false }));

    expect(html).toContain('Latro AI');
    expect(html).toContain('aria-label="Open Latro AI Assistant"');
    expect(html).not.toMatch(/Clinical AI/i);
    expect(html).not.toContain('type="file"');
    expect(html).not.toContain('Upload prescription');
  });

  it('displays "Latro AI" in the open chat header & welcome message while hiding upload controls for guests', () => {
    const html = renderWithRouter(React.createElement(FloatingAIAssistant, { initialOpen: true }));

    expect(html).toContain('aria-label="Latro AI Assistant"');
    expect(html).toContain('>Latro AI<');
    expect(html).not.toMatch(/Clinical AI/i);

    // Guests can send text chat but have no attachment button or file input
    expect(html).toContain('aria-label="Send message"');
    expect(html).not.toContain('type="file"');
    expect(html).not.toContain('aria-label="Upload prescription"');
  });

  it('hides upload controls on the homepage chatbot for signed-in non-patients (doctor, pharmacist, admin)', () => {
    for (const role of ['doctor', 'pharmacist', 'admin']) {
      authState.isAuthenticated = true;
      authState.user = { id: `${role}-1`, role, name: `Signed In ${role}` };
      appState.currentUser = authState.user;

      const html = renderWithRouter(React.createElement(FloatingAIAssistant, { initialOpen: true }));
      expect(html).toContain('aria-label="Send message"');
      expect(html).not.toContain('type="file"');
      expect(html).not.toContain('aria-label="Upload prescription"');
    }
  });

  it('shows attachment button and file input in Latro AI chat and Assistant page for signed-in patients', () => {
    authState.isAuthenticated = true;
    authState.user = { id: 'pat-1', role: 'patient', name: 'Ananya' };
    appState.currentUser = authState.user;

    const floatingHtml = renderWithRouter(React.createElement(FloatingAIAssistant, { initialOpen: true }));
    expect(floatingHtml).toContain('>Latro AI<');
    expect(floatingHtml).toContain('type="file"');
    expect(floatingHtml).toContain('aria-label="Upload prescription"');
    expect(floatingHtml).not.toMatch(/Clinical AI/i);

    const assistantHtml = renderWithRouter(React.createElement(Assistant));
    expect(assistantHtml).toContain('Latro AI');
    expect(assistantHtml).toContain('type="file"');
    expect(assistantHtml).toContain('aria-label="Upload prescription"');
    expect(assistantHtml).not.toMatch(/Clinical AI/i);
  });

  it('answers general medicine/disease questions, explains prescription timings cleanly, and resolves follow-ups', () => {
    // 1. Guest general medicine query without upload
    const metforminGeneral = getAssistantResponse('What is metformin used for?', 'en', null, null, []);
    expect(metforminGeneral.text.toLowerCase()).toContain('blood sugar');
    expect(metforminGeneral.text.toLowerCase()).toContain('type 2 diabetes');

    // 2. Single-medicine prescription with missing timing: must never invent "With meals"
    const missingTimingMeds = [
      { name: 'Glimepiride 1mg', dose: '1mg', frequency: 'Once daily', mealTiming: 'not specified' },
    ];
    const missingTimingRes = getAssistantResponse(
      'What timing is written for this medicine?',
      'en',
      null,
      missingTimingMeds,
      []
    );
    expect(missingTimingRes.text).not.toContain('With meals');
    expect(missingTimingRes.text.toLowerCase()).toMatch(/not clearly specified|unclear/);
    expect(missingTimingRes.text.toLowerCase()).toMatch(/pharmacist|prescriber/);

    // 3. Multi-medicine prescription with ambiguous "this medicine": asks which medicine user means
    const twoMeds = [
      { name: 'Metformin 500mg', dose: '500mg', frequency: 'Twice daily', foodInstruction: 'After meals' },
      { name: 'Glimepiride 1mg', dose: '1mg', frequency: 'Once daily', foodInstruction: 'Before breakfast' },
    ];
    const ambigRes = getAssistantResponse('What timing is written for this medicine?', 'en', null, twoMeds, []);
    expect(ambigRes.text.toLowerCase()).toContain('which');
    expect(ambigRes.text).toContain('Metformin 500mg');
    expect(ambigRes.text).toContain('Glimepiride 1mg');

    // 4. Follow-up "that medicine" resolved via history
    const followUpRes = getAssistantResponse(
      'What timing is written for that medicine?',
      'en',
      null,
      twoMeds,
      [
        { role: 'user', content: 'Tell me about Glimepiride 1mg' },
        { role: 'assistant', content: 'Glimepiride 1mg is on your prescription.' },
      ]
    );
    expect(followUpRes.text).toContain('Glimepiride 1mg');
    expect(followUpRes.text.toLowerCase()).toContain('before breakfast');

    // 5. Same chat general question "What is asthma?" answered without requiring new upload
    const asthmaRes = getAssistantResponse('What is asthma?', 'en', null, twoMeds, []);
    expect(asthmaRes.text.toLowerCase()).toMatch(/lung|airway/);
    expect(asthmaRes.text.toLowerCase()).not.toContain('prescribed');
  });
});
