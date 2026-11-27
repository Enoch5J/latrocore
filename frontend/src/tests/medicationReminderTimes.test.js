import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  initializeData,
  updatePatientMedicationReminderTimes,
} from '../services/dataService';

const STORAGE_KEY = 'latrocore_data';

function createStorage(initialData) {
  const values = new Map([[STORAGE_KEY, JSON.stringify(initialData)]]);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function makeTodayEvent(id, time, status = 'pending') {
  const scheduledAt = new Date();
  const [hour, minute] = time.split(':').map(Number);
  scheduledAt.setHours(hour, minute, 0, 0);
  return {
    id,
    patientId: 'patient-1',
    medicineId: 'medicine-1',
    medicineName: 'Metformin',
    scheduledTime: scheduledAt.toISOString(),
    status,
    actualTime: status === 'taken' ? scheduledAt.toISOString() : null,
  };
}

function createData(doseEvents = []) {
  return {
    users: {},
    progressions: {},
    prescriptions: [{
      id: 'prescription-1',
      patientId: 'patient-1',
      status: 'active',
      medicines: [{
        id: 'medicine-1',
        name: 'Metformin',
        dose: '500 mg',
        times: ['08:00 AM', '08:00 PM'],
        scheduleTimes: ['08:00 AM', '08:00 PM'],
      }],
    }],
    doseEvents,
  };
}

function readStoredData() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY));
}

describe('patient medication reminder times', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorage(createData()));
  });

  it('updates personal reminders and today’s pending doses without changing the prescription', async () => {
    const data = createData([
      makeTodayEvent('pending-1', '08:00'),
      makeTodayEvent('pending-2', '20:00'),
      makeTodayEvent('taken-1', '07:00', 'taken'),
    ]);
    vi.stubGlobal('localStorage', createStorage(data));

    await updatePatientMedicationReminderTimes(
      'patient-1',
      'prescription-1',
      'medicine-1',
      ['09:30', '19:45']
    );

    const saved = readStoredData();
    const medicine = saved.prescriptions[0].medicines[0];
    expect(medicine.reminderTimes).toEqual(['09:30', '19:45']);
    expect(medicine.times).toEqual(['08:00 AM', '08:00 PM']);
    expect(medicine.scheduleTimes).toEqual(['08:00 AM', '08:00 PM']);
    expect(saved.doseEvents).toHaveLength(3);

    const pending = saved.doseEvents.filter((event) => event.status === 'pending');
    expect(pending.map((event) => {
      const date = new Date(event.scheduledTime);
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }).sort()).toEqual(['09:30', '19:45']);
    expect(saved.doseEvents.find((event) => event.id === 'taken-1').status).toBe('taken');
  });

  it('creates the saved daily reminders on initialization without duplicates', () => {
    vi.stubGlobal('localStorage', createStorage(createData()));

    const firstLoad = initializeData();
    expect(firstLoad.doseEvents).toHaveLength(2);
    expect(firstLoad.doseEvents.map((event) => new Date(event.scheduledTime).getHours()).sort((a, b) => a - b)).toEqual([8, 20]);

    const secondLoad = initializeData();
    expect(secondLoad.doseEvents).toHaveLength(2);
  });

  it('rejects attempts to change another patient’s medication reminders', async () => {
    await expect(updatePatientMedicationReminderTimes(
      'different-patient',
      'prescription-1',
      'medicine-1',
      ['09:00']
    )).rejects.toThrow('could not be found');

    expect(readStoredData().prescriptions[0].medicines[0].reminderTimes).toBeUndefined();
  });
});
