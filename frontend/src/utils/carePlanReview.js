/**
 * Formatting, deduplication, and chronological normalization helpers for the
 * 3-step "Review your care plan" modal flow.
 */

export const CARE_PLAN_STEPS = [
  { id: 1, label: 'Medications' },
  { id: 2, label: 'Diet Plan' },
  { id: 3, label: 'Daily Routine' },
];

const MISSING_MARKERS = new Set([
  '',
  'not specified',
  'not provided',
  'none',
  'n/a',
  'na',
  'null',
  'undefined',
  'unknown',
  'unclear',
  'frequency unclear',
  'schedule not specified',
  'timing not specified',
  'dose not specified',
  'dosage not specified',
]);

export function isMissingOrUnclear(value) {
  if (value == null) return true;
  const trimmed = String(value).trim();
  if (!trimmed) return true;
  return MISSING_MARKERS.has(trimmed.toLowerCase());
}

function cleanText(value) {
  if (isMissingOrUnclear(value)) return null;
  return String(value).trim().replace(/\s+/g, ' ');
}

function normalizeForCompare(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function containsSameInfo(candidate, existingSegments) {
  const normCandidate = normalizeForCompare(candidate);
  if (!normCandidate) return true;
  return existingSegments.some((seg) => {
    const normSeg = normalizeForCompare(seg);
    return normSeg && (normSeg === normCandidate || normSeg.includes(normCandidate));
  });
}

export function formatDoctorDisplayName(rawName) {
  const cleaned = cleanText(rawName);
  if (!cleaned) return null;
  const withoutPrefix = cleaned.replace(/^(?:dr\.?\s+)+/i, '').trim();
  if (!withoutPrefix) return null;
  return `Dr. ${withoutPrefix}`;
}

export function normalizePrescriptionMetadata(rx) {
  if (!rx || typeof rx !== 'object') {
    return {
      clinicName: null,
      doctorName: null,
      prescriptionDate: null,
      diagnosis: null,
    };
  }

  return {
    clinicName: cleanText(rx.clinic_name || rx.clinicName),
    doctorName: formatDoctorDisplayName(rx.doctor_name || rx.doctorName),
    prescriptionDate: cleanText(rx.prescription_date || rx.prescriptionDate),
    diagnosis: cleanText(rx.diagnosis),
  };
}

export function formatMedicineReviewItem(med, index = 0) {
  const rawName = med?.name ? String(med.name).trim() : '';
  const nameMissing = !rawName || isMissingOrUnclear(rawName);
  const displayName = nameMissing ? 'Medication name not provided' : rawName;

  const rawDose = med?.dose;
  const doseText = cleanText(rawDose);
  const doseProvided = Boolean(doseText && !doseText.toLowerCase().includes('unclear'));

  const rawFrequency = med?.frequency;
  const frequencyText = cleanText(rawFrequency);
  const frequencyProvided = Boolean(frequencyText && !frequencyText.toLowerCase().includes('unclear'));

  const scheduleTimes = Array.isArray(med?.schedule_times)
    ? med.schedule_times.map(cleanText).filter(Boolean)
    : Array.isArray(med?.scheduleTimes)
    ? med.scheduleTimes.map(cleanText).filter(Boolean)
    : [];

  const mealTiming =
    cleanText(med?.meal_timing) ||
    cleanText(med?.mealTiming) ||
    cleanText(med?.foodInstruction);

  const timingParts = [];
  if (mealTiming && !mealTiming.toLowerCase().includes('unclear')) {
    timingParts.push(mealTiming);
  }
  if (scheduleTimes.length > 0) {
    const joinedTimes = scheduleTimes.join(', ');
    if (!containsSameInfo(joinedTimes, timingParts)) {
      timingParts.push(joinedTimes);
    }
  }

  const timingValue = timingParts.length > 0 ? timingParts.join(' · ') : 'Timing not provided.';

  const existingSummary = [displayName, doseText, frequencyText, ...timingParts].filter(Boolean);

  const instructionCandidates = [med?.instructions, med?.care_instructions, med?.notes];
  let careInstruction = null;
  for (const candidate of instructionCandidates) {
    const cleaned = cleanText(candidate);
    if (
      cleaned &&
      !cleaned.toLowerCase().includes('unclear') &&
      !containsSameInfo(cleaned, existingSummary)
    ) {
      careInstruction = cleaned;
      break;
    }
  }

  const routeText = cleanText(med?.route);
  const route =
    routeText && routeText.toLowerCase() !== 'oral' && !containsSameInfo(routeText, existingSummary)
      ? routeText
      : null;

  return {
    id: med?.id || `med-${index}`,
    name: displayName,
    dose: doseProvided ? doseText : 'Dose not provided.',
    frequency: frequencyProvided ? frequencyText : 'Frequency not provided.',
    timing: timingValue,
    route,
    careInstruction,
    isInsulin: Boolean(med?.is_insulin ?? med?.isInsulin),
  };
}

export function normalizeDietPlan(dietPlan) {
  if (!dietPlan || typeof dietPlan !== 'object') {
    return {
      summary: null,
      hydration: null,
      meals: [],
      foodsToAvoid: [],
      precautions: [],
      hasContent: false,
    };
  }

  const summary = cleanText(dietPlan.summary);

  let hydration = null;
  const rawHydration = dietPlan.hydration_target_liters ?? dietPlan.hydrationTargetLiters;
  if (typeof rawHydration === 'number' && Number.isFinite(rawHydration) && rawHydration > 0) {
    hydration = `${rawHydration} L / day`;
  } else {
    const strHydration = cleanText(rawHydration || dietPlan.hydration);
    if (strHydration) {
      hydration = /l/i.test(strHydration) ? strHydration : `${strHydration} L / day`;
    }
  }

  const rawMeals = Array.isArray(dietPlan.meals) ? dietPlan.meals : [];
  const meals = rawMeals
    .map((meal, idx) => {
      if (!meal || typeof meal !== 'object') return null;
      const type = cleanText(meal.type || meal.name) || `Meal ${idx + 1}`;
      const recommendedTime = cleanText(meal.recommended_time || meal.recommendedTime);
      const suggestedFoods = cleanText(meal.suggested_foods || meal.suggestedFoods || meal.description);
      const rawInstructions = cleanText(meal.instructions);
      const instructions =
        rawInstructions && !containsSameInfo(rawInstructions, [suggestedFoods].filter(Boolean))
          ? rawInstructions
          : null;
      const carbTarget =
        typeof meal.carb_target_grams === 'number' && Number.isFinite(meal.carb_target_grams)
          ? `${meal.carb_target_grams}g carbs`
          : null;

      if (!suggestedFoods && !instructions && !recommendedTime) return null;

      return {
        id: `${type}-${idx}`,
        type,
        recommendedTime,
        suggestedFoods,
        carbTarget,
        instructions,
      };
    })
    .filter(Boolean);

  const rawAvoid = Array.isArray(dietPlan.foods_to_avoid || dietPlan.foodsToAvoid)
    ? (dietPlan.foods_to_avoid || dietPlan.foodsToAvoid)
    : [];
  const foodsToAvoid = [];
  for (const item of rawAvoid) {
    const cleaned = cleanText(item);
    if (cleaned && !containsSameInfo(cleaned, foodsToAvoid)) {
      foodsToAvoid.push(cleaned);
    }
  }

  const rawPrecautions = Array.isArray(dietPlan.clinical_precautions || dietPlan.clinicalPrecautions)
    ? (dietPlan.clinical_precautions || dietPlan.clinicalPrecautions)
    : [];
  const precautions = [];
  for (const item of rawPrecautions) {
    const cleaned = cleanText(item);
    if (cleaned && !containsSameInfo(cleaned, precautions)) {
      precautions.push(cleaned);
    }
  }

  const hasContent = Boolean(
    summary ||
      hydration ||
      meals.length > 0 ||
      foodsToAvoid.length > 0 ||
      precautions.length > 0
  );

  return {
    summary,
    hydration,
    meals,
    foodsToAvoid,
    precautions,
    hasContent,
  };
}

const CHRONOLOGICAL_PERIODS = [
  { key: 'morning', label: 'Morning', aliases: ['morning', 'am', 'breakfast'] },
  { key: 'afternoon', label: 'Afternoon', aliases: ['afternoon', 'midday', 'lunch'] },
  { key: 'evening', label: 'Evening', aliases: ['evening', 'night', 'dinner'] },
  { key: 'bedtime', label: 'Bedtime', aliases: ['bedtime', 'sleep', 'hs'] },
];

export function normalizeDailyRoutine(dailySchedule) {
  if (!dailySchedule || typeof dailySchedule !== 'object') {
    return [];
  }

  if (Array.isArray(dailySchedule)) {
    const rankOf = (periodText) => {
      const lower = String(periodText || '').toLowerCase();
      const idx = CHRONOLOGICAL_PERIODS.findIndex((p) =>
        p.aliases.some((alias) => lower.includes(alias))
      );
      return idx === -1 ? 99 : idx;
    };

    return dailySchedule
      .map((entry, index) => {
        if (!entry || typeof entry !== 'object') return null;
        const rawLabel = cleanText(entry.time_of_day || entry.period || entry.label || entry.time);
        const description = cleanText(entry.instructions || entry.description || entry.activity || entry.summary);
        if (!description) return null;
        const matched = CHRONOLOGICAL_PERIODS[rankOf(rawLabel)];
        return {
          key: `${matched?.key || 'slot'}-${index}`,
          label: matched?.label || rawLabel || 'Routine',
          description,
          order: rankOf(rawLabel),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.order - b.order);
  }

  const slots = [];
  for (const period of CHRONOLOGICAL_PERIODS) {
    let description = null;
    for (const alias of period.aliases) {
      if (Object.prototype.hasOwnProperty.call(dailySchedule, alias)) {
        const cleaned = cleanText(dailySchedule[alias]);
        if (cleaned) {
          description = cleaned;
          break;
        }
      }
    }
    if (description) {
      slots.push({
        key: period.key,
        label: period.label,
        description,
      });
    }
  }

  return slots;
}

/**
 * Executes final Accept & Apply persistence and throws on failure so the caller
 * can keep the review dialog open for retry.
 */
export async function submitCarePlanApplication({
  electronicRx,
  patientId,
  applyApi,
  applyLocal,
  refreshData,
  onPrescriptionApplied,
  onApplyPrescription,
}) {
  if (!electronicRx) {
    throw new Error('No extracted prescription available to apply.');
  }
  if (!patientId) {
    throw new Error('Signed-in patient account is required to apply this care plan.');
  }

  const payload = {
    patient_id: patientId,
    doctor_name: electronicRx.doctor_name,
    clinic_name: electronicRx.clinic_name,
    diagnosis: electronicRx.diagnosis,
    prescription_date: electronicRx.prescription_date,
    medicines: electronicRx.medicines,
    diet_plan: electronicRx.diet_plan,
    daily_schedule: electronicRx.daily_schedule,
    file_url: electronicRx.file_url || null,
  };

  if (typeof onApplyPrescription === 'function') {
    await onApplyPrescription(electronicRx, payload);
  } else {
    await applyApi(payload);
    const applied = applyLocal(patientId, electronicRx);
    if (!applied) {
      throw new Error('Failed to save your care plan. Please try again.');
    }
  }

  refreshData?.();

  if (onPrescriptionApplied) {
    await onPrescriptionApplied(electronicRx);
  }

  return payload;
}
