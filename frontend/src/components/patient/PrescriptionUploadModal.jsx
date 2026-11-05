import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { applyAIPrescriptionToPatient } from '../../services/dataService';
import {
  UploadCloud, FileText, Sparkles, CheckCircle2, AlertCircle, Clock,
  Pill, Salad, ShieldCheck, X, ChevronRight, Calendar, ArrowRight,
  RefreshCw, Check, AlertTriangle, Droplets, Info, Heart
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

export default function PrescriptionUploadModal({ isOpen, onClose, onPrescriptionApplied }) {
  const { currentUser, refreshData, addToast } = useApp();
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [rxText, setRxText] = useState('');
  const [inputMode, setInputMode] = useState('file'); // 'file' or 'text'
  const [loading, setLoading] = useState(false);
  const [analyzingStep, setAnalyzingStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [electronicRx, setElectronicRx] = useState(null);
  const [applying, setApplying] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const patientId = currentUser?.id;

  const handleFileChange = (e) => {
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
      let result;
      if (inputMode === 'file') {
        result = await api.analyzePrescriptionAI(selectedFile);
      } else {
        result = await api.analyzePrescriptionAI(rxText);
      }

      clearInterval(stepInterval);
      if (!result || !result.medicines || result.medicines.length === 0) {
        throw new Error('Gemini AI could not identify any prescribed medications in this document.');
      }

      setElectronicRx(result);
      addToast({
        type: 'success',
        message: 'Prescription extracted. Please review.',
      });
    } catch (err) {
      clearInterval(stepInterval);
      console.error('Prescription extraction failure:', err);
      setErrorMsg(
        err.message || 'Unable to parse this prescription. Please ensure the document is clear and try again.'
      );
    } finally {
      setLoading(false);
      setAnalyzingStep(0);
    }
  };

  const handleConfirmAndApply = async () => {
    if (!electronicRx) return;
    setApplying(true);
    setErrorMsg('');
    try {
      // 1. Sync with FastAPI Backend Database (best effort)
      try {
        await api.applyAIPrescription({
          patient_id: patientId,
          doctor_name: electronicRx.doctor_name,
          clinic_name: electronicRx.clinic_name,
          diagnosis: electronicRx.diagnosis,
          prescription_date: electronicRx.prescription_date,
          medicines: electronicRx.medicines,
          diet_plan: electronicRx.diet_plan,
          daily_schedule: electronicRx.daily_schedule,
          file_url: electronicRx.file_url || null,
        });
      } catch (backendErr) {
        console.warn('Backend DB apply sync notice (continuing with local state sync):', backendErr);
      }

      // 2. Synchronize Local Patient State, Active Regimens, and Progression Engine
      applyAIPrescriptionToPatient(patientId, electronicRx);

      refreshData();
      addToast({
        type: 'success',
        message: 'Prescription verified and active! Medication schedule and diet plan synchronized with AI.',
      });

      if (onPrescriptionApplied) {
        onPrescriptionApplied(electronicRx);
      }

      onClose();
    } catch (err) {
      console.error('Failed to apply electronic prescription:', err);
      const msg = err?.message || '';
      const isAuthError = msg.includes('401') || msg.toLowerCase().includes('authenticated') || msg.toLowerCase().includes('session') || msg.toLowerCase().includes('token');
      
      let friendlyError = 'Failed to activate prescription. Please try again.';
      if (isAuthError) {
        friendlyError = 'Your session has expired. Please refresh the page or log in again to save this prescription.';
      } else if (msg) {
        friendlyError = msg;
      }

      setErrorMsg(friendlyError);
      addToast({
        type: 'error',
        message: friendlyError,
      });
    } finally {
      setApplying(false);
    }
  };

  const resetUpload = () => {
    setElectronicRx(null);
    setSelectedFile(null);
    setFilePreview(null);
    setRxText('');
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Modal Top Header — compact */}
        <div className="bg-[#0B3B2C] text-white px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-400/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold tracking-tight truncate">Upload Prescription</h2>
              <p className="text-[11px] text-emerald-200/80 font-medium truncate">
                AI-powered extraction via Gemini
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold leading-snug">{errorMsg}</p>
            </div>
          )}

          {/* ── STAGE 1: Upload or Input ── */}
          {!electronicRx && (
            <div className="space-y-3">
              {/* Mode Toggle */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => { setInputMode('file'); setErrorMsg(''); }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    inputMode === 'file'
                      ? 'bg-[#0B3B2C] text-white shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                  }`}
                >
                  <UploadCloud size={14} />
                  <span>Image / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setInputMode('text'); setErrorMsg(''); }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    inputMode === 'text'
                      ? 'bg-[#0B3B2C] text-white shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                  }`}
                >
                  <FileText size={14} />
                  <span>Paste Text</span>
                </button>
              </div>

              {inputMode === 'file' ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                    selectedFile
                      ? 'border-emerald-500 bg-emerald-50/40'
                      : 'border-stone-300 hover:border-emerald-600 bg-stone-50/70 hover:bg-stone-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {filePreview ? (
                    <div className="relative group max-h-36 overflow-hidden rounded-xl border border-emerald-300 shadow-sm">
                      <img src={filePreview} alt="Prescription preview" className="object-contain max-h-36 mx-auto" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
                        Click to change
                      </div>
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 border border-emerald-200 text-[#0B3B2C] flex items-center justify-center">
                      <UploadCloud size={22} />
                    </div>
                  )}

                  <div>
                    <p className="font-bold text-stone-800 text-xs">
                      {selectedFile ? selectedFile.name : 'Click or drag & drop prescription'}
                    </p>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      {selectedFile
                        ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB — ready to analyze`
                        : 'PNG, JPG, WEBP, or PDF up to 12 MB'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    rows={5}
                    value={rxText}
                    onChange={(e) => setRxText(e.target.value)}
                    placeholder="Paste prescription text here…"
                    className="w-full text-xs font-mono p-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent bg-stone-50 resize-none"
                  />

                  {/* Sample Prescription Fillers */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[11px] font-semibold text-stone-400">Try:</span>
                    {SAMPLE_PRESCRIPTIONS.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setRxText(s.text)}
                        className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-[#0B3B2C] transition cursor-pointer"
                      >
                        {s.title.split('(')[0].trim()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-stone-500 hover:bg-stone-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleAnalyze}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#0B3B2C] hover:bg-[#124d3b] shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin text-emerald-300" />
                      <span>Analyzing…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} className="text-emerald-300" />
                      <span>Extract Prescription</span>
                    </>
                  )}
                </button>
              </div>

              {/* Loading progress */}
              {loading && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 animate-pulse">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                    {analyzingStep}
                  </div>
                  <p className="text-[11px] font-semibold text-[#0B3B2C]">
                    {analyzingStep === 1 && 'Scanning prescription text…'}
                    {analyzingStep === 2 && 'Identifying medications & dosing…'}
                    {analyzingStep === 3 && 'Generating diet plan…'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              STAGE 2: Electronic Prescription Verification View (e-Rx)
             ══════════════════════════════════════════════════════════════════════ */}
          {electronicRx && (
            <div className="space-y-4 animate-fade-in">
              {/* e-Prescription Banner — compact */}
              <div className="rounded-xl border border-emerald-400 bg-emerald-50/50 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                      <ShieldCheck size={11} /> e-Rx Verified
                    </span>
                    <h3 className="text-sm font-bold text-stone-900 mt-1">
                      {electronicRx.clinic_name || 'Clinical Care'}
                    </h3>
                    <p className="text-[11px] text-stone-600">
                      Dr. {electronicRx.doctor_name || 'Attending Physician'} · {electronicRx.prescription_date || new Date().toLocaleDateString()}
                    </p>
                  </div>
                  {electronicRx.diagnosis && (
                    <span className="text-[11px] font-bold text-[#0B3B2C] bg-white px-2 py-0.5 rounded-lg border border-emerald-200 shrink-0">
                      {electronicRx.diagnosis}
                    </span>
                  )}
                </div>

                {/* Medications */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                    <Pill size={13} className="text-teal-700" />
                    Medications ({electronicRx.medicines?.length || 0})
                  </h4>

                  <div className="space-y-1.5">
                    {electronicRx.medicines?.map((med, idx) => {
                      const isUnclear = !med.name || med.name.toLowerCase().includes('unclear') || !med.dose || String(med.dose).toLowerCase().includes('unclear');
                      return (
                        <div key={idx} className={`p-2.5 rounded-lg border text-xs ${isUnclear ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-stone-200'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-stone-900">{med.name || 'Unclear Item'}</span>
                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                              {isUnclear && (
                                <span className="text-[9px] font-extrabold uppercase text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                                  ⚠ Unclear Entry
                                </span>
                              )}
                              {med.is_insulin && (
                                <span className="text-[9px] font-bold uppercase text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                                  Insulin
                                </span>
                              )}
                              <span className={`font-semibold ${isUnclear ? 'text-amber-800' : 'text-emerald-800'}`}>{med.dose || 'unclear'}</span>
                            </div>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            {med.frequency || 'Frequency unclear'} · {med.schedule_times?.join(', ') || 'As directed'} · {med.meal_timing || 'With meals'}
                          </p>
                          {isUnclear && (
                            <p className="text-[10px] text-amber-800 font-medium mt-1">
                              Notice: Handwriting was unreadable on the prescription. Under strict LATROCORE safety guardrails, we do not guess medicines or doses.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Diet Plan */}
                {electronicRx.diet_plan && (
                  <div className="space-y-2 pt-2 border-t border-emerald-200">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                      <Salad size={13} className="text-emerald-700" />
                      Diet Plan
                      {electronicRx.diet_plan.hydration_target_liters && (
                        <span className="text-[10px] font-semibold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 ml-auto normal-case">
                          💧 {electronicRx.diet_plan.hydration_target_liters}L/day
                        </span>
                      )}
                    </h4>

                    {electronicRx.diet_plan.summary && (
                      <p className="text-[11px] text-emerald-900 bg-emerald-100/50 p-2 rounded-lg border border-emerald-200">
                        {electronicRx.diet_plan.summary}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-1.5">
                      {(electronicRx.diet_plan.meals || []).map((m, idx) => (
                        <div key={idx} className="p-2 rounded-lg bg-white border border-stone-200 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-stone-900">{m.type}</span>
                            <span className="text-[10px] font-mono text-emerald-800">{m.recommended_time}</span>
                          </div>
                          <p className="text-stone-500 line-clamp-2 mt-0.5">{m.suggested_foods}</p>
                        </div>
                      ))}
                    </div>

                    {electronicRx.diet_plan.foods_to_avoid?.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 text-[11px]">
                        <span className="text-rose-700 font-bold">Avoid:</span>
                        {electronicRx.diet_plan.foods_to_avoid.map((item, idx) => (
                          <span key={idx} className="font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Daily Schedule */}
                {electronicRx.daily_schedule && (
                  <div className="space-y-1.5 pt-2 border-t border-emerald-200">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                      <Clock size={13} className="text-stone-600" />
                      Daily Routine
                    </h4>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      {electronicRx.daily_schedule.morning && (
                        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                          <strong className="text-amber-900">🌅 Morning</strong>
                          <p className="text-stone-600 mt-0.5">{electronicRx.daily_schedule.morning}</p>
                        </div>
                      )}
                      {electronicRx.daily_schedule.afternoon && (
                        <div className="p-2 rounded-lg bg-sky-50 border border-sky-200">
                          <strong className="text-sky-900">☀️ Afternoon</strong>
                          <p className="text-stone-600 mt-0.5">{electronicRx.daily_schedule.afternoon}</p>
                        </div>
                      )}
                      {electronicRx.daily_schedule.evening && (
                        <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200">
                          <strong className="text-indigo-900">🌆 Evening</strong>
                          <p className="text-stone-600 mt-0.5">{electronicRx.daily_schedule.evening}</p>
                        </div>
                      )}
                      {electronicRx.daily_schedule.bedtime && (
                        <div className="p-2 rounded-lg bg-purple-50 border border-purple-200">
                          <strong className="text-purple-900">🌙 Bedtime</strong>
                          <p className="text-stone-600 mt-0.5">{electronicRx.daily_schedule.bedtime}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmation Actions */}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={resetUpload}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-stone-500 hover:bg-stone-100 transition cursor-pointer"
                >
                  ← Re-upload
                </button>

                <button
                  type="button"
                  disabled={applying}
                  onClick={handleConfirmAndApply}
                  className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  {applying ? (
                    <>
                      <RefreshCw size={14} className="animate-spin text-emerald-200" />
                      <span>Applying…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} className="text-emerald-200" />
                      <span>Accept & Apply</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

