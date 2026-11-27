import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    currentUser: { id: 'pat-test-1', role: 'patient', name: 'Test Patient' },
    refreshData: vi.fn(),
    addToast: vi.fn(),
  }),
}));

vi.mock('../services/api', () => ({
  api: {
    analyzePrescriptionAI: vi.fn(),
    applyAIPrescription: vi.fn(),
  },
}));

vi.mock('../services/dataService', () => ({
  applyAIPrescriptionToPatient: vi.fn(() => ({ prescriptions: [] })),
}));

import {
  CARE_PLAN_STEPS,
  formatDoctorDisplayName,
  formatMedicineReviewItem,
  normalizeDailyRoutine,
  normalizeDietPlan,
  normalizePrescriptionMetadata,
  submitCarePlanApplication,
} from '../utils/carePlanReview';
import PrescriptionUploadModal, {
  CarePlanStepIndicator,
  DailyRoutineStepPanel,
  DietPlanStepPanel,
  MedicationsStepPanel,
} from '../components/patient/PrescriptionUploadModal';

describe('Care Plan 3-Step Review Helpers and Dialog', () => {
  it('defines the exact 3 review steps in order', () => {
    expect(CARE_PLAN_STEPS).toEqual([
      { id: 1, label: 'Medications' },
      { id: 2, label: 'Diet Plan' },
      { id: 3, label: 'Daily Routine' },
    ]);
  });

  it('normalizes doctor names without duplicate Dr. prefix and omits missing metadata', () => {
    expect(formatDoctorDisplayName('Dr. Vinoth Kumar .G')).toBe('Dr. Vinoth Kumar .G');
    expect(formatDoctorDisplayName('Anita Deshmukh')).toBe('Dr. Anita Deshmukh');
    expect(formatDoctorDisplayName('not specified')).toBeNull();

    const meta = normalizePrescriptionMetadata({
      clinic_name: "Dr. Vinoth's Multispeciality Clinic",
      doctor_name: 'Dr. Vinoth Kumar .G',
      prescription_date: '',
      diagnosis: 'not specified',
    });

    expect(meta.clinicName).toBe("Dr. Vinoth's Multispeciality Clinic");
    expect(meta.doctorName).toBe('Dr. Vinoth Kumar .G');
    expect(meta.prescriptionDate).toBeNull();
    expect(meta.diagnosis).toBeNull();
  });

  it('uses concise field-specific missing wording without inferring or repeating descriptions', () => {
    const missingTimingMed = formatMedicineReviewItem({
      name: 'Thiodoc ET',
      dose: 'not specified',
      frequency: 'Once daily',
      schedule_times: [],
      meal_timing: 'not specified',
      instructions: 'Once daily',
    });

    expect(missingTimingMed.name).toBe('Thiodoc ET');
    expect(missingTimingMed.dose).toBe('Dose not provided.');
    expect(missingTimingMed.frequency).toBe('Once daily');
    expect(missingTimingMed.timing).toBe('Timing not provided.');
    expect(missingTimingMed.careInstruction).toBeNull();

    const fullMed = formatMedicineReviewItem({
      name: 'Metformin 1000mg ER',
      dose: '1 tablet',
      frequency: 'Twice daily',
      schedule_times: ['08:00 AM', '08:00 PM'],
      meal_timing: 'With breakfast and dinner',
      instructions: 'Swallow whole with a full glass of water; do not crush or chew.',
    });

    expect(fullMed.dose).toBe('1 tablet');
    expect(fullMed.frequency).toBe('Twice daily');
    expect(fullMed.timing).toBe('With breakfast and dinner · 08:00 AM, 08:00 PM');
    expect(fullMed.careInstruction).toBe(
      'Swallow whole with a full glass of water; do not crush or chew.'
    );
  });

  it('normalizes full diet plan without truncation and detects empty diet sections', () => {
    const fullDiet = normalizeDietPlan({
      summary: 'High-fiber low glycemic meal plan.',
      hydration_target_liters: 2.5,
      meals: [
        {
          type: 'Lunch',
          recommended_time: '01:00 PM',
          suggested_foods:
            'Brown rice or whole wheat chapati paired with thick dal, stir-fried greens, cucumber salad, and grilled protein',
          instructions:
            'Brown rice or whole wheat chapati paired with thick dal, stir-fried greens, cucumber salad, and grilled protein',
        },
      ],
      foods_to_avoid: ['Sugary drinks', 'Sugary drinks', 'Deep fried snacks'],
    });

    expect(fullDiet.hasContent).toBe(true);
    expect(fullDiet.hydration).toBe('2.5 L / day');
    expect(fullDiet.meals[0].suggestedFoods).toContain('grilled protein');
    // Identical meal instruction is deduplicated cleanly
    expect(fullDiet.meals[0].instructions).toBeNull();
    expect(fullDiet.foodsToAvoid).toEqual(['Sugary drinks', 'Deep fried snacks']);

    expect(normalizeDietPlan(null).hasContent).toBe(false);
    expect(normalizeDietPlan({ meals: [], foods_to_avoid: [] }).hasContent).toBe(false);
  });

  it('sorts daily routine chronologically by time of day and handles empty routine', () => {
    const ordered = normalizeDailyRoutine({
      bedtime: '10:00 PM: Check hydration and take bedtime dose.',
      evening: '08:00 PM: Dinner followed by a 15-minute walk.',
      afternoon: '01:00 PM: Balanced lunch and midday water intake.',
      morning: '08:00 AM: Breakfast with morning tablets.',
    });

    expect(ordered.map((s) => s.label)).toEqual(['Morning', 'Afternoon', 'Evening', 'Bedtime']);
    expect(normalizeDailyRoutine({}).length).toBe(0);
    expect(normalizeDailyRoutine(null).length).toBe(0);
  });

  it('renders Review your care plan starting on Step 1 with strict contrast, font sizes, and full lists', () => {
    const longMedicines = Array.from({ length: 8 }, (_, idx) => ({
      name: `Medicine Option ${idx + 1}`,
      dose: idx % 2 === 0 ? '500 mg' : 'not specified',
      frequency: idx % 3 === 0 ? 'not specified' : 'Once daily',
      schedule_times: idx === 0 ? ['08:00 AM'] : [],
      meal_timing: idx === 0 ? 'After breakfast' : 'not specified',
    }));

    const html = renderToStaticMarkup(
      React.createElement(PrescriptionUploadModal, {
        isOpen: true,
        onClose: () => {},
        initialPrescription: {
          clinic_name: "Dr. Vinoth's Multispeciality Clinic",
          doctor_name: 'Dr. Vinoth Kumar .G',
          prescription_date: '25/2/22',
          medicines: longMedicines,
          diet_plan: { meals: [], foods_to_avoid: [] },
          daily_schedule: {},
        },
      })
    );

    // Single dialog titled "Review your care plan" with white header text
    expect(html).toContain('Review your care plan');
    expect(html).toContain('text-white');
    expect(html).toContain('text-[#111111]');
    expect(html).toContain('text-[22px]');
    expect(html).toContain('text-[18px] font-bold');
    expect(html).toContain('text-[16px]');

    // Progress indicator shows all 3 steps in order; starts on Step 1
    expect(html).toContain('Medications');
    expect(html).toContain('Diet Plan');
    expect(html).toContain('Daily Routine');
    expect(html).toContain('aria-current="step"');

    // Step 1 content + missing-field wording + no "Dr. Dr." duplication + Step 1 footer
    expect(html).toContain('Dr. Vinoth Kumar .G');
    expect(html).not.toContain('Dr. Dr.');
    expect(html).toContain('Medicine Option 1');
    expect(html).toContain('Medicine Option 8');
    expect(html).toContain('Dose not provided.');
    expect(html).toContain('Frequency not provided.');
    expect(html).toContain('Timing not provided.');
    expect(html).toContain('Re-upload');
    expect(html).toContain('Next: Diet Plan');
    expect(html).not.toContain('Accept &amp; Apply');
    expect(html).not.toContain('line-clamp-');
    expect(html).not.toContain('Verify missing details');
  });

  it('renders Step 2 Diet Plan and Step 3 Daily Routine panels cleanly for both full and empty sections', () => {
    const fullRx = {
      diet_plan: {
        summary: 'Balanced glycemic nutrition plan.',
        hydration_target_liters: 2.5,
        meals: [
          {
            type: 'Lunch',
            recommended_time: '01:00 PM',
            suggested_foods:
              'Whole wheat chapati, thick dal, steamed green vegetables, and cucumber salad without truncation',
            carb_target_grams: 50,
          },
        ],
        foods_to_avoid: ['Sugary sodas', 'Deep-fried snacks'],
      },
      daily_schedule: {
        bedtime: '10:00 PM: Final hydration check and sleep.',
        afternoon: '01:00 PM: Midday lunch.',
        morning: '08:00 AM: Morning tablets with breakfast.',
        evening: '08:00 PM: Dinner and 15-minute walk.',
      },
    };

    const dietHtml = renderToStaticMarkup(React.createElement(DietPlanStepPanel, { rx: fullRx }));
    expect(dietHtml).toContain('Diet Plan');
    expect(dietHtml).toContain('text-[22px]');
    expect(dietHtml).toContain('Hydration: 2.5 L / day');
    expect(dietHtml).toContain('cucumber salad without truncation');
    expect(dietHtml).toContain('Sugary sodas');
    expect(dietHtml).not.toContain('line-clamp-');

    const emptyMedsHtml = renderToStaticMarkup(
      React.createElement(MedicationsStepPanel, { rx: { medicines: [] } })
    );
    expect(emptyMedsHtml).toContain('No medications were found on this prescription.');

    const emptyDietHtml = renderToStaticMarkup(
      React.createElement(DietPlanStepPanel, { rx: { diet_plan: null } })
    );
    expect(emptyDietHtml).toContain('No dietary plan instructions were included');

    const routineHtml = renderToStaticMarkup(
      React.createElement(DailyRoutineStepPanel, { rx: fullRx })
    );
    expect(routineHtml).toContain('Daily Routine');
    expect(routineHtml.indexOf('Morning')).toBeLessThan(routineHtml.indexOf('Afternoon'));
    expect(routineHtml.indexOf('Afternoon')).toBeLessThan(routineHtml.indexOf('Evening'));
    expect(routineHtml.indexOf('Evening')).toBeLessThan(routineHtml.indexOf('Bedtime'));

    const emptyRoutineHtml = renderToStaticMarkup(
      React.createElement(DailyRoutineStepPanel, { rx: { daily_schedule: {} } })
    );
    expect(emptyRoutineHtml).toContain('No daily routine schedule was provided');
  });

  it('enforces advancing only via Next while letting patients revisit completed steps', () => {
    const step1Indicator = renderToStaticMarkup(
      React.createElement(CarePlanStepIndicator, { reviewStep: 1, onSelectStep: () => {} })
    );
    expect(step1Indicator).toContain('aria-current="step"');
    // Steps 2 & 3 are locked when starting on step 1
    expect(step1Indicator.match(/aria-disabled="true"/g)).toHaveLength(2);

    const step3Indicator = renderToStaticMarkup(
      React.createElement(CarePlanStepIndicator, { reviewStep: 3, onSelectStep: () => {} })
    );
    // Completed steps 1 & 2 are clickable; step 3 is active (none locked)
    expect(step3Indicator).not.toContain('aria-disabled="true"');
  });

  it('preserves review data on save failure for retry and only applies once on final submission', async () => {
    const sampleRx = {
      doctor_name: 'Dr. K. Ramanathan',
      clinic_name: 'Apollo Hospitals',
      medicines: [{ name: 'Metformin', dose: '500mg', frequency: 'Twice daily' }],
      diet_plan: { summary: 'Low GI meals' },
      daily_schedule: { morning: '08:00 AM breakfast' },
    };

    let failFirst = true;
    const applyApi = vi.fn(async () => {
      if (failFirst) {
        failFirst = false;
        throw new Error('Temporary save failure');
      }
      return { status: 'active' };
    });
    const applyLocal = vi.fn(() => ({ prescriptions: [sampleRx] }));
    const refreshData = vi.fn();
    const onPrescriptionApplied = vi.fn();

    await expect(
      submitCarePlanApplication({
        electronicRx: sampleRx,
        patientId: 'pat-1',
        applyApi,
        applyLocal,
        refreshData,
        onPrescriptionApplied,
      })
    ).rejects.toThrow('Temporary save failure');

    expect(applyLocal).not.toHaveBeenCalled();
    expect(refreshData).not.toHaveBeenCalled();
    expect(onPrescriptionApplied).not.toHaveBeenCalled();

    // Retry succeeds cleanly with preserved sampleRx data
    await submitCarePlanApplication({
      electronicRx: sampleRx,
      patientId: 'pat-1',
      applyApi,
      applyLocal,
      refreshData,
      onPrescriptionApplied,
    });

    expect(applyApi).toHaveBeenCalledTimes(2);
    expect(applyLocal).toHaveBeenCalledWith('pat-1', sampleRx);
    expect(refreshData).toHaveBeenCalledTimes(1);
    expect(onPrescriptionApplied).toHaveBeenCalledWith(sampleRx);
  });
});
