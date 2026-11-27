import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  findDueOrOverdueDoses,
  formatOverdueDuration,
} from '../utils/medicationAlarm';
import MedicationAlarmModal from '../components/patient/MedicationAlarmModal';

describe('Medication overdue alarm helpers and modal', () => {
  it('returns only today pending doses that have reached or exceeded scheduled time', () => {
    const now = new Date(2026, 10, 27, 10, 30, 0);
    const yesterday = new Date(2026, 10, 26, 8, 0, 0).toISOString();
    const overdueEarly = new Date(2026, 10, 27, 8, 0, 0).toISOString();
    const dueNow = new Date(2026, 10, 27, 10, 30, 0).toISOString();
    const futureDose = new Date(2026, 10, 27, 20, 0, 0).toISOString();

    const doses = [
      { id: 'd-yesterday', patientId: 'pat-1', status: 'pending', scheduledTime: yesterday },
      { id: 'd-taken', patientId: 'pat-1', status: 'taken', scheduledTime: overdueEarly },
      { id: 'd-snoozed', patientId: 'pat-1', status: 'pending', scheduledTime: overdueEarly },
      { id: 'd-dismissed', patientId: 'pat-1', status: 'pending', scheduledTime: overdueEarly },
      { id: 'd-due', patientId: 'pat-1', status: 'pending', scheduledTime: dueNow },
      { id: 'd-overdue', patientId: 'pat-1', status: 'pending', scheduledTime: overdueEarly },
      { id: 'd-future', patientId: 'pat-1', status: 'pending', scheduledTime: futureDose },
      { id: 'd-other-pat', patientId: 'pat-2', status: 'pending', scheduledTime: overdueEarly },
    ];

    const snoozed = { 'd-snoozed': now.getTime() + 60_000 };
    const dismissed = new Set(['d-dismissed']);

    const result = findDueOrOverdueDoses(doses, 'pat-1', now, snoozed, dismissed);
    expect(result.map((d) => d.id)).toEqual(['d-overdue', 'd-due']);
  });

  it('formats overdue durations clearly', () => {
    const now = new Date(2026, 10, 27, 10, 30, 0);
    expect(formatOverdueDuration(now.toISOString(), now)).toBe('Due now');
    expect(formatOverdueDuration(new Date(2026, 10, 27, 10, 18, 0).toISOString(), now)).toBe('12 min overdue');
    expect(formatOverdueDuration(new Date(2026, 10, 27, 8, 10, 0).toISOString(), now)).toBe('2h 20m overdue');
  });

  it('renders the alarm modal with medicine details and Mark as Taken / Snooze actions', () => {
    const html = renderToStaticMarkup(
      React.createElement(MedicationAlarmModal, {
        dose: {
          id: 'dose-1',
          medicineName: 'Metformin 500mg',
          dosage: '1 tablet',
          scheduledTime: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        },
        pendingCount: 2,
        onMarkTaken: vi.fn(),
        onSnooze: vi.fn(),
        onToggleMute: vi.fn(),
        onDismiss: vi.fn(),
      })
    );

    expect(html).toContain('Time for your medicine');
    expect(html).toContain('Metformin 500mg');
    expect(html).toContain('1 tablet');
    expect(html).toContain('Mark as Taken');
    expect(html).toContain('Snooze 10 min');
    expect(html).toContain('+1 more scheduled dose due');
  });
});
