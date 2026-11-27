import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { applyAIPrescriptionToPatient } from '../../services/dataService';
import {
  CARE_PLAN_STEPS,
  formatMedicineReviewItem,
  normalizeDailyRoutine,
  normalizeDietPlan,
  normalizePrescriptionMetadata,
  submitCarePlanApplication,
} from '../../utils/carePlanReview';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Droplets,
  FileText,
  Pill,
  RefreshCw,
  Salad,
  UploadCloud,
  X,
} from 'lucide-react';

const SAMPLE_PRESCRIPTIONS = [
  {
    title: 'Dual Oral Regimen (Metformin + Glimepiride + Statin)',
    text: `APOLLO HOSPITALS - DEPARTMENT OF ENDOCRINOLOGY
Dr. K. Ramanathan, MD, DM (Endocrinology)
Reg. No: TN-MC-44821 | Date: 03-Nov-2026
Diagnosis: Type 2 Diabetes Mellitus with Dyslipidemia

Rx:
1. Tab. Glycomet-GP 1 (Metformin 500mg + Glimepiride 1mg)
   1 tablet twice daily - 15 minutes before breakfast and dinner (07:45 AM, 07:45 PM)
   Duration: 30 days
2. Tab. Atorva 10mg (Atorvastatin)
   1 tablet once daily at bedtime (09:30 PM)
   Duration: 30 days
3. Tab. Januvia 100mg (Sitagliptin)
   1 tablet once daily in the morning after breakfast (08:30 AM)
   Duration: 30 days

Diet & Lifestyle Advice:
- Strict diabetic diet: Low glycemic index, high soluble fiber, split into 4 portion-controlled meals.
- Avoid sweets, sugary beverages, and deep fried foods.
- 2.5 Liters water daily.
- 30-minute brisk walk daily after dinner.`,
  },
  {
    title: 'Basal Insulin + Metformin Regimen',
    text: `FORTIS MEMORIAL CLINICAL INSTITUTE
Dr. Anita Deshmukh, MD (Internal Medicine)
Date: 03-Nov-2026
Diagnosis: Poorly Controlled Type 2 Diabetes Mellitus (HbA1c 8.8%)

Rx:
1. Inj. Lantus (Insulin Glargine 100 IU/mL)
   16 units subcutaneous once daily at bedtime (10:00 PM)
   Instructions: Rotate injection sites across abdomen and thighs. Never skip meals.
2. Tab. Metformin 1000mg ER (Extended Release)
   1 tablet twice daily with breakfast and dinner (08:00 AM, 08:00 PM)
   Instructions: Swallow whole with meals to avoid gastric discomfort.

Diet & Nutrition Plan:
- Consistent carbohydrate distribution across meals (max 45g carbs per meal).
- Carry fast-acting glucose tablets at all times for hypoglycemia safety.
- 3 Liters water daily.`,
  },
];

export function CarePlanStepIndicator({ reviewStep, onSelectStep, disabled = false }) {
  return (
    <nav
      aria-label="Care plan review steps"
      className="shrink-0 bg-[#FAF6EF] border-b border-[#E8DCC8] px-4 sm:px-6 py-3"
    >
      <ol className="flex flex-wrap items-center gap-2">
        {CARE_PLAN_STEPS.map((step, index) => {
          const isActive = step.id === reviewStep;
          const isCompleted = step.id < reviewStep;
          const isReachable = isCompleted && !disabled;

          const badgeEl = (
            <span
              aria-hidden="true"
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[16px] font-bold shrink-0 ${
                isActive
                  ? 'bg-white text-[#046A38]'
                  : isCompleted
                  ? 'bg-[#046A38] text-white'
                  : 'bg-[#FAF6EF] border border-[#D8C6AC] text-[#111111]'
              }`}
            >
              {isCompleted ? <Check size={14} strokeWidth={2.7} /> : step.id}
            </span>
          );

          return (
            <li key={step.id} className="flex items-center gap-2">
              {isActive ? (
                <span
                  aria-current="step"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[16px] leading-snug bg-[#046A38] text-white font-bold shadow-xs"
                >
                  {badgeEl}
                  <span>{step.label}</span>
                </span>
              ) : isCompleted ? (
                <button
                  type="button"
                  onClick={() => isReachable && onSelectStep(step.id)}
                  disabled={!isReachable}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[16px] leading-snug transition-colors bg-[#E8F5EE] hover:bg-[#D1EBDD] text-[#111111] border border-[#046A38]/40 font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2"
                >
                  {badgeEl}
                  <span>{step.label}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[16px] leading-snug bg-white text-[#111111] border border-[#E8DCC8] font-medium opacity-75 cursor-not-allowed"
                >
                  {badgeEl}
                  <span>{step.label}</span>
                </button>
              )}

              {index < CARE_PLAN_STEPS.length - 1 && (
                <span aria-hidden="true" className="text-[16px] font-bold text-[#111111] select-none">
                  →
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function MedicationsStepPanel({ rx, headingRef }) {
  const metadata = normalizePrescriptionMetadata(rx);
  const medicines = Array.isArray(rx?.medicines) ? rx.medicines : [];
  const hasMetadata = Boolean(
    metadata.clinicName || metadata.doctorName || metadata.prescriptionDate || metadata.diagnosis
  );

  return (
    <div className="space-y-4">
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="text-[22px] font-bold text-[#111111] leading-snug focus:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:rounded"
      >
        Medications
      </h3>

      {hasMetadata && (
        <div className="rounded-xl bg-white border border-[#E8DCC8] p-4 space-y-2 text-[16px] text-[#111111]">
          {metadata.clinicName && (
            <p className="font-bold text-[#111111] leading-snug">{metadata.clinicName}</p>
          )}
          {(metadata.doctorName || metadata.prescriptionDate) && (
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-x-4 gap-y-1 text-[16px] text-[#111111]">
              {metadata.doctorName && <span>Doctor: {metadata.doctorName}</span>}
              {metadata.prescriptionDate && <span>Date: {metadata.prescriptionDate}</span>}
            </div>
          )}
          {metadata.diagnosis && (
            <p className="text-[16px] text-[#111111]">
              <span className="font-bold">Diagnosis: </span>
              <span>{metadata.diagnosis}</span>
            </p>
          )}
        </div>
      )}

      {medicines.length === 0 ? (
        <div className="rounded-xl bg-white border border-[#E8DCC8] p-5 text-[16px] text-[#111111]">
          <p className="leading-relaxed">No medications were found on this prescription.</p>
        </div>
      ) : (
        <ul className="space-y-3" aria-label="Prescribed medications">
          {medicines.map((rawMed, idx) => {
            const med = formatMedicineReviewItem(rawMed, idx);
            return (
              <li
                key={med.id}
                className="rounded-xl bg-white border border-[#E8DCC8] p-4 space-y-3 text-[16px] text-[#111111] shadow-2xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#FAF6EF] pb-2">
                  <h4 className="text-[18px] font-bold text-[#111111] leading-snug flex items-center gap-2">
                    <Pill size={18} aria-hidden="true" className="text-[#046A38] shrink-0" />
                    <span>{med.name}</span>
                  </h4>
                  {med.isInsulin && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#E8F5EE] border border-[#A8D7BD] text-[16px] font-semibold text-[#111111]">
                      Insulin
                    </span>
                  )}
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[16px] text-[#111111]">
                  <div>
                    <dt className="font-bold text-[#111111]">Dose</dt>
                    <dd className="mt-0.5 leading-relaxed break-words">{med.dose}</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-[#111111]">Frequency</dt>
                    <dd className="mt-0.5 leading-relaxed break-words">{med.frequency}</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-[#111111]">Timing</dt>
                    <dd className="mt-0.5 leading-relaxed break-words">{med.timing}</dd>
                  </div>
                </dl>

                {(med.route || med.careInstruction) && (
                  <div className="pt-2 border-t border-[#FAF6EF] space-y-1 text-[16px] text-[#111111]">
                    {med.route && (
                      <p className="leading-relaxed">
                        <span className="font-bold text-[#111111]">Route: </span>
                        <span>{med.route}</span>
                      </p>
                    )}
                    {med.careInstruction && (
                      <p className="leading-relaxed whitespace-pre-wrap">
                        <span className="font-bold text-[#111111]">Care: </span>
                        <span>{med.careInstruction}</span>
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function DietPlanStepPanel({ rx, headingRef }) {
  const diet = normalizeDietPlan(rx?.diet_plan || rx?.dietPlan);

  return (
    <div className="space-y-4">
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="text-[22px] font-bold text-[#111111] leading-snug focus:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:rounded"
      >
        Diet Plan
      </h3>

      {!diet.hasContent ? (
        <div className="rounded-xl bg-white border border-[#E8DCC8] p-5 text-[16px] text-[#111111]">
          <p className="leading-relaxed">
            No dietary plan instructions were included in this prescription.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(diet.summary || diet.hydration) && (
            <div className="rounded-xl bg-[#E8F5EE] border border-[#A8D7BD] p-4 space-y-2 text-[16px] text-[#111111]">
              {diet.summary && (
                <p className="leading-relaxed flex items-start gap-2">
                  <Salad size={20} aria-hidden="true" className="text-[#046A38] shrink-0 mt-1" />
                  <span>{diet.summary}</span>
                </p>
              )}
              {diet.hydration && (
                <p className="font-bold flex items-center gap-2">
                  <Droplets size={18} aria-hidden="true" className="text-[#046A38] shrink-0" />
                  <span>Hydration: {diet.hydration}</span>
                </p>
              )}
            </div>
          )}

          {diet.meals.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {diet.meals.map((meal) => (
                <article
                  key={meal.id}
                  className="rounded-xl bg-white border border-[#E8DCC8] p-4 space-y-2 text-[16px] text-[#111111]"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="font-bold text-[#111111] text-[18px] leading-snug">
                      {meal.type}
                    </h4>
                    {meal.recommendedTime && (
                      <span className="font-bold text-[#111111] text-[16px]">
                        {meal.recommendedTime}
                      </span>
                    )}
                  </div>
                  {meal.suggestedFoods && (
                    <p className="leading-relaxed whitespace-normal break-words">
                      {meal.suggestedFoods}
                    </p>
                  )}
                  {(meal.carbTarget || meal.instructions) && (
                    <div className="pt-1 border-t border-[#FAF6EF] space-y-1 text-[16px]">
                      {meal.carbTarget && (
                        <p className="font-semibold text-[#111111]">Target: {meal.carbTarget}</p>
                      )}
                      {meal.instructions && (
                        <p className="leading-relaxed whitespace-normal break-words">
                          {meal.instructions}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          {diet.foodsToAvoid.length > 0 && (
            <div className="rounded-xl bg-white border border-[#E8DCC8] p-4 space-y-2 text-[16px] text-[#111111]">
              <h4 className="font-bold text-[#111111] text-[18px]">Foods to avoid</h4>
              <ul className="list-disc pl-5 space-y-1.5">
                {diet.foodsToAvoid.map((item, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {diet.precautions.length > 0 && (
            <div className="rounded-xl bg-white border border-[#E8DCC8] p-4 space-y-2 text-[16px] text-[#111111]">
              <h4 className="font-bold text-[#111111] text-[18px]">Care notes</h4>
              <ul className="list-disc pl-5 space-y-1.5">
                {diet.precautions.map((item, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DailyRoutineStepPanel({ rx, headingRef }) {
  const slots = normalizeDailyRoutine(rx?.daily_schedule || rx?.dailySchedule);

  return (
    <div className="space-y-4">
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="text-[22px] font-bold text-[#111111] leading-snug focus:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:rounded"
      >
        Daily Routine
      </h3>

      {slots.length === 0 ? (
        <div className="rounded-xl bg-white border border-[#E8DCC8] p-5 text-[16px] text-[#111111]">
          <p className="leading-relaxed">
            No daily routine schedule was provided for this prescription.
          </p>
        </div>
      ) : (
        <ol className="space-y-3" aria-label="Daily routine in chronological order">
          {slots.map((slot) => (
            <li
              key={slot.key}
              className="rounded-xl bg-white border border-[#E8DCC8] p-4 space-y-1.5 text-[16px] text-[#111111]"
            >
              <div className="flex items-center gap-2">
                <Clock size={18} aria-hidden="true" className="text-[#046A38] shrink-0" />
                <h4 className="font-bold text-[#111111] text-[18px] leading-snug">
                  {slot.label}
                </h4>
              </div>
              <p className="leading-relaxed whitespace-pre-wrap break-words">
                {slot.description}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function CarePlanReviewModalContent({
  onClose,
  onPrescriptionApplied,
  initialPrescription = null,
  onApplyPrescription = null,
}) {
  const { currentUser, refreshData, addToast } = useApp();
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [rxText, setRxText] = useState('');
  const [inputMode, setInputMode] = useState('file');
  const [loading, setLoading] = useState(false);
  const [analyzingStep, setAnalyzingStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [electronicRx, setElectronicRx] = useState(initialPrescription);
  const [reviewStep, setReviewStep] = useState(1);
  const [applying, setApplying] = useState(false);

  const fileInputRef = useRef(null);
  const scrollBodyRef = useRef(null);
  const stepHeadingRef = useRef(null);
  const applyingRef = useRef(false);

  const patientId = currentUser?.id;

  // Whenever the dialog enters review or changes step, reset scroll to top and focus the new heading
  useEffect(() => {
    if (!electronicRx) return;
    if (scrollBodyRef.current) {
      if (typeof scrollBodyRef.current.scrollTo === 'function') {
        scrollBodyRef.current.scrollTo({ top: 0, behavior: 'auto' });
      }
      scrollBodyRef.current.scrollTop = 0;
    }
    stepHeadingRef.current?.focus({ preventScroll: true });
  }, [electronicRx, reviewStep]);

  // Keep the dialog open while analysis or saving is in progress.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading && !applyingRef.current) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, onClose]);

  const handleFileChange = (e) => {
    if (loading) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (loading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setErrorMsg('');
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setFilePreview(reader.result);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const getRxActionErrorMessage = (err, fallbackMsg) => {
    const msg = err?.response?.data?.detail || err?.message || '';
    const isAuthError =
      err?.status === 401 ||
      err?.response?.status === 401 ||
      msg.includes('401') ||
      msg.toLowerCase().includes('authenticated') ||
      msg.toLowerCase().includes('session') ||
      msg.toLowerCase().includes('token');

    return isAuthError
      ? 'Your session has expired. Please refresh the page or log in again to continue.'
      : msg || fallbackMsg;
  };

  const handleAnalyze = async () => {
    setErrorMsg('');
    if (inputMode === 'file' && !selectedFile) {
      setErrorMsg('Please select or drag a prescription file (image or PDF).');
      return;
    }
    if (inputMode === 'text' && !rxText.trim()) {
      setErrorMsg('Please paste or enter the prescription details.');
      return;
    }

    setLoading(true);
    setAnalyzingStep(1);

    const stepInterval = setInterval(() => {
      setAnalyzingStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 1200);

    try {
      const result =
        inputMode === 'file'
          ? await api.analyzePrescriptionAI(selectedFile)
          : await api.analyzePrescriptionAI(rxText);

      clearInterval(stepInterval);
      if (!result || !Array.isArray(result.medicines) || result.medicines.length === 0) {
        throw new Error('Could not identify any prescribed medications in this document.');
      }

      setElectronicRx(result);
      setReviewStep(1);
      addToast?.({
        type: 'success',
        message: 'Prescription extracted. Review your care plan.',
      });
    } catch (err) {
      clearInterval(stepInterval);
      console.error('Prescription extraction failure:', err);
      setErrorMsg(
        getRxActionErrorMessage(
          err,
          'Unable to parse this prescription. Please ensure the document is clear and try again.'
        )
      );
    } finally {
      setLoading(false);
      setAnalyzingStep(0);
    }
  };

  const goToStep = (nextStep) => {
    if (applyingRef.current) return;
    setErrorMsg('');
    setReviewStep(nextStep);
  };

  const handleConfirmAndApply = async () => {
    if (!electronicRx || applyingRef.current) return;
    applyingRef.current = true;
    setApplying(true);
    setErrorMsg('');

    try {
      await submitCarePlanApplication({
        electronicRx,
        patientId,
        applyApi: (payload) => api.applyAIPrescription(payload),
        applyLocal: (pid, rx) => applyAIPrescriptionToPatient(pid, rx),
        refreshData,
        onPrescriptionApplied,
        onApplyPrescription,
      });

      addToast?.({
        type: 'success',
        message: 'Care plan applied! Medications, diet plan, and daily routine are now active.',
      });

      onClose?.();
    } catch (err) {
      console.error('Failed to apply electronic prescription:', err);
      const friendlyError = getRxActionErrorMessage(
        err,
        'Failed to save your care plan. Please try again.'
      );

      setErrorMsg(friendlyError);
      if (scrollBodyRef.current) {
        if (typeof scrollBodyRef.current.scrollTo === 'function') {
          scrollBodyRef.current.scrollTo({ top: 0, behavior: 'auto' });
        }
        scrollBodyRef.current.scrollTop = 0;
      }
      addToast?.({
        type: 'error',
        message: friendlyError,
      });
    } finally {
      applyingRef.current = false;
      setApplying(false);
    }
  };

  const resetUpload = () => {
    if (applyingRef.current) return;
    setElectronicRx(null);
    setReviewStep(1);
    setSelectedFile(null);
    setFilePreview(null);
    setRxText('');
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-[70] bg-stone-950/65 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="care-plan-dialog-title"
        aria-busy={loading}
        className="relative bg-[#FAF6EF] w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl border border-[#E8DCC8] overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh]"
      >
        {/* High-contrast Dark-Green Modal Header */}
        <header className="bg-[#046A38] text-white px-4 sm:px-6 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-white shrink-0">
              <FileText size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2
                id="care-plan-dialog-title"
                className="text-[20px] sm:text-[22px] font-bold text-white leading-tight"
              >
                {electronicRx ? 'Review your care plan' : 'Upload prescription'}
              </h2>
              {!electronicRx && (
                <p className="text-[16px] text-white font-medium mt-0.5">
                  Upload a photo, PDF, or text to extract your care plan
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => !applying && !loading && onClose?.()}
            disabled={applying || loading}
            aria-label="Close dialog"
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center transition cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X size={20} />
          </button>
        </header>

        {/* Pinned Step Progress Bar during Review */}
        {electronicRx && (
          <CarePlanStepIndicator
            reviewStep={reviewStep}
            onSelectStep={goToStep}
            disabled={applying}
          />
        )}

        {/* Scrollable Dialog Body */}
        <div
          ref={scrollBodyRef}
          className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 min-h-0 bg-[#FAF6EF]"
        >
          {errorMsg && (
            <div
              role="alert"
              className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-[#111111] flex items-start gap-3 text-[16px]"
            >
              <AlertCircle size={20} aria-hidden="true" className="text-rose-700 shrink-0 mt-0.5" />
              <p className="font-semibold leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {!electronicRx ? (
            <div className="space-y-4 text-[16px] text-[#111111]">
              {/* Mode Toggle */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setInputMode('file');
                    setErrorMsg('');
                  }}
                  className={`text-[16px] font-bold px-4 py-2.5 rounded-xl transition cursor-pointer disabled:cursor-not-allowed flex items-center gap-2 ${
                    inputMode === 'file'
                      ? 'bg-[#046A38] text-white shadow-xs'
                      : 'bg-white border border-[#E8DCC8] hover:bg-[#E8F5EE] text-[#111111]'
                  }`}
                >
                  <UploadCloud size={18} aria-hidden="true" />
                  <span>Image / PDF</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setInputMode('text');
                    setErrorMsg('');
                  }}
                  className={`text-[16px] font-bold px-4 py-2.5 rounded-xl transition cursor-pointer disabled:cursor-not-allowed flex items-center gap-2 ${
                    inputMode === 'text'
                      ? 'bg-[#046A38] text-white shadow-xs'
                      : 'bg-white border border-[#E8DCC8] hover:bg-[#E8F5EE] text-[#111111]'
                  }`}
                >
                  <FileText size={18} aria-hidden="true" />
                  <span>Paste Text</span>
                </button>
              </div>

              {inputMode === 'file' ? (
                <div
                  onDragOver={(e) => {
                    if (!loading) e.preventDefault();
                  }}
                  onDrop={handleDrop}
                  onClick={() => !loading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center gap-3 ${
                    loading ? 'cursor-wait' : 'cursor-pointer'
                  } ${
                    selectedFile
                      ? 'border-[#046A38] bg-[#E8F5EE]/70'
                      : 'border-[#D8C6AC] hover:border-[#046A38] bg-white hover:bg-[#E8F5EE]/30'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileChange}
                    disabled={loading}
                    className="hidden"
                  />

                  {filePreview ? (
                    <div className="relative group max-h-40 overflow-hidden rounded-xl border border-[#A8D7BD] shadow-sm">
                      <img
                        src={filePreview}
                        alt="Prescription preview"
                        className="object-contain max-h-40 mx-auto"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[#E8F5EE] border border-[#A8D7BD] text-[#046A38] flex items-center justify-center">
                      <UploadCloud size={24} aria-hidden="true" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="font-bold text-[#111111] text-[16px]">
                      {selectedFile ? selectedFile.name : 'Click or drag & drop prescription'}
                    </p>
                    <p className="text-[16px] text-[#111111]">
                      {selectedFile
                        ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB — ready to extract`
                        : 'PNG, JPG, WEBP, or PDF up to 12 MB'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    rows={6}
                    disabled={loading}
                    value={rxText}
                    onChange={(e) => setRxText(e.target.value)}
                    placeholder="Paste prescription text here…"
                    className="w-full text-[16px] p-3.5 rounded-xl border border-[#D8C6AC] text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#046A38] bg-white resize-y"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[16px] font-bold text-[#111111]">Samples:</span>
                    {SAMPLE_PRESCRIPTIONS.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={loading}
                        onClick={() => setRxText(s.text)}
                        className="text-[16px] font-semibold px-3 py-1.5 rounded-xl border border-[#A8D7BD] bg-[#E8F5EE] hover:bg-[#D1EBDD] disabled:opacity-60 disabled:cursor-not-allowed text-[#111111] transition cursor-pointer"
                      >
                        {s.title.split('(')[0].trim()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loading && (
                <div className="p-4 rounded-xl bg-[#E8F5EE] border border-[#A8D7BD] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#046A38] text-white flex items-center justify-center font-bold text-[16px] shrink-0">
                    {analyzingStep}
                  </div>
                  <p className="text-[16px] font-bold text-[#111111]">
                    {analyzingStep === 1 && 'Reading prescription details…'}
                    {analyzingStep === 2 && 'Extracting medications & dosing…'}
                    {analyzingStep === 3 && 'Preparing diet plan & daily routine…'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {reviewStep === 1 && (
                <MedicationsStepPanel rx={electronicRx} headingRef={stepHeadingRef} />
              )}
              {reviewStep === 2 && (
                <DietPlanStepPanel rx={electronicRx} headingRef={stepHeadingRef} />
              )}
              {reviewStep === 3 && (
                <DailyRoutineStepPanel rx={electronicRx} headingRef={stepHeadingRef} />
              )}
            </div>
          )}
        </div>

        {/* Pinned High-Contrast Modal Footer */}
        <footer className="shrink-0 bg-white border-t border-[#E8DCC8] px-4 sm:px-6 py-4">
          {!electronicRx ? (
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
              <button
                type="button"
                onClick={() => !loading && onClose?.()}
                disabled={loading}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#D8C6AC] bg-white hover:bg-[#FAF6EF] disabled:opacity-60 disabled:cursor-not-allowed text-[#111111] text-[16px] font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleAnalyze}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#046A38] hover:bg-[#03542C] disabled:opacity-60 text-white text-[16px] font-bold shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin text-white" />
                    <span>Analyzing…</span>
                  </>
                ) : (
                  <>
                    <FileText size={18} className="text-white" />
                    <span>Extract Prescription</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {reviewStep === 3 && (
                <p className="text-[16px] font-medium text-[#111111] leading-snug">
                  Accept &amp; Apply saves your medications, diet plan, and daily routine together.
                </p>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                {reviewStep === 1 ? (
                  <button
                    type="button"
                    onClick={resetUpload}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#D8C6AC] bg-white hover:bg-[#FAF6EF] text-[#111111] text-[16px] font-semibold transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={17} aria-hidden="true" />
                    <span>Re-upload</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={applying}
                    onClick={() => goToStep(reviewStep - 1)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#D8C6AC] bg-white hover:bg-[#FAF6EF] disabled:opacity-50 text-[#111111] text-[16px] font-semibold transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ArrowLeft size={17} aria-hidden="true" />
                    <span>Back</span>
                  </button>
                )}

                {reviewStep === 1 && (
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#046A38] hover:bg-[#03542C] text-white text-[16px] font-bold shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Next: Diet Plan</span>
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>
                )}

                {reviewStep === 2 && (
                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#046A38] hover:bg-[#03542C] text-white text-[16px] font-bold shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Next: Daily Routine</span>
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>
                )}

                {reviewStep === 3 && (
                  <button
                    type="button"
                    disabled={applying}
                    onClick={handleConfirmAndApply}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#046A38] hover:bg-[#03542C] disabled:opacity-60 text-white text-[16px] font-bold shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    {applying ? (
                      <>
                        <RefreshCw size={18} className="animate-spin text-white" />
                        <span>Applying…</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} className="text-white" />
                        <span>Accept &amp; Apply</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </footer>

        {loading && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 z-40 flex items-center justify-center bg-white/35 p-5 backdrop-blur-md"
          >
            <div className="w-full max-w-sm rounded-2xl border border-white/80 bg-white/95 p-6 text-center shadow-[0_20px_60px_-24px_rgba(9,51,34,0.42)]">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F5EE] text-[#046A38]">
                <RefreshCw size={22} className="animate-spin" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-[#093322]">
                Analyzing your prescription
              </h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-[#24383F]">
                {analyzingStep === 1 && 'Reading prescription details…'}
                {analyzingStep === 2 && 'Extracting medications and dosing…'}
                {analyzingStep >= 3 && 'Preparing your care plan…'}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-[#48616A]">
                This may take a moment. Please keep this window open while we prepare your results.
              </p>
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#E8F5EE]">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-[#046A38]" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PrescriptionUploadModal({
  isOpen,
  onClose,
  onPrescriptionApplied,
  initialPrescription = null,
  onApplyPrescription = null,
}) {
  if (!isOpen) return null;

  const instanceKey = initialPrescription
    ? `rx-${initialPrescription._reviewInstanceId || initialPrescription.upload_id || initialPrescription.createdAt || 'review'}`
    : 'rx-upload';

  const modalNode = (
    <CarePlanReviewModalContent
      key={instanceKey}
      onClose={onClose}
      onPrescriptionApplied={onPrescriptionApplied}
      initialPrescription={initialPrescription}
      onApplyPrescription={onApplyPrescription}
    />
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
}
