import { describe, expect, it } from 'vitest';
import { calculateProgression, isMealWindowExpired } from '../services/dataService';

describe('Daily meal time-window missed logic', () => {
  it('marks unmarked past meals as missed once their 3-hour window expires', () => {
    const lateNight = new Date(2026, 10, 27, 23, 47, 0);

    expect(isMealWindowExpired({ type: 'Breakfast', time: '08:00 AM', taken: null }, lateNight)).toBe(true);
    expect(isMealWindowExpired({ type: 'Lunch', time: '01:00 PM', taken: null }, lateNight)).toBe(true);
    expect(isMealWindowExpired({ type: 'Breakfast', time: '08:00 AM', taken: true }, lateNight)).toBe(false);

    const morning = new Date(2026, 10, 27, 9, 30, 0);
    expect(isMealWindowExpired({ type: 'Breakfast', time: '08:00 AM', taken: null }, morning)).toBe(false);
    expect(isMealWindowExpired({ type: 'Lunch', time: '01:00 PM', taken: null }, morning)).toBe(false);
  });

  it('counts expired unmarked meals as missed in calculateProgression', () => {
    const lateNight = new Date(2026, 10, 27, 23, 47, 0);
    const result = calculateProgression(
      {
        meals: [
          { id: 'm1', type: 'Breakfast', time: '08:00 AM', taken: null },
          { id: 'm2', type: 'Lunch', time: '01:00 PM', taken: null },
          { id: 'm3', type: 'Dinner', time: '07:30 PM', taken: true },
        ],
        tablets: [],
        activityMinutes: 30,
        targetActivityMinutes: 30,
        glucoseChecked: true,
      },
      lateNight
    );

    expect(result.stats.mealsTaken).toBe(1);
    expect(result.stats.mealsMissed).toBe(2);
  });
});
