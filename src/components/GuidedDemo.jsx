import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Sparkles, ChevronRight, ChevronLeft, X, Play, CheckCircle,
  ArrowRight, UserCheck, Stethoscope, Pill, Shield
} from 'lucide-react';

const DEMO_STEPS = [
  {
    title: '1. Patient Dashboard — Priya Sharma',
    role: 'patient',
    userId: 'pat-001',
    route: '/patient/dashboard',
    desc: 'Notice Priya’s latest glucose (142 mg/dL), 30-day adherence rate, upcoming screening reminders, and quick action cards.',
  },
  {
    title: '2. Continuous Glucose Monitoring',
    role: 'patient',
    userId: 'pat-001',
    route: '/patient/glucose',
    desc: 'Examine 30 days of glycemic readings. Toggle between chart and table views, filter by measurement context, and test CSV export.',
  },
  {
    title: '3. Daily Medication Schedule & Adherence',
    role: 'patient',
    userId: 'pat-001',
    route: '/patient/medications',
    desc: 'Review active prescriptions. Mark today’s pending dose as "Taken" to observe immediate adherence percentage updates with duplicate prevention.',
  },
  {
    title: '4. Multilingual Clinical AI Assistant',
    role: 'patient',
    userId: 'pat-001',
    route: '/patient/assistant',
    desc: 'Ask about "Missed metformin dose" or "Dietary recommendations". Try switching languages between English, Hindi, and Tamil.',
  },
  {
    title: '5. Patient Safety & Symptom Triage',
    role: 'patient',
    userId: 'pat-001',
    route: '/patient/safety',
    desc: 'Simulate safety triggers (hypoglycemia < 70 mg/dL). Observe clinical disclaimers and emergency caregiver notification simulation.',
  },
  {
    title: '6. Laboratory & Diagnostic Tracker',
    role: 'patient',
    userId: 'pat-001',
    route: '/patient/investigations',
    desc: 'Track longitudinal HbA1c reductions, eGFR renal tests, and lipid panels with reference range alerts and file attachment capability.',
  },
  {
    title: '7. Preventive Screening Checklist',
    role: 'patient',
    userId: 'pat-001',
    route: '/patient/screening',
    desc: 'Manage proactive screenings for diabetic retinopathy, podiatry/foot exams, and microalbuminuria with completion verification.',
  },
  {
    title: '8. Doctor Workspace — Dr. Arun Krishnamurthy',
    role: 'doctor',
    userId: 'doc-001',
    route: '/doctor/dashboard',
    desc: 'Switched to Doctor perspective! Inspect assigned patient rosters, clinical escalations, and drill into Priya Sharma’s longitudinal chart.',
  },
  {
    title: '9. Doctor Patient Overview & Authorizations',
    role: 'doctor',
    userId: 'doc-001',
    route: '/doctor/patient/pat-001',
    desc: 'View unified timeline, configure clinical target thresholds (author & timestamp logged), and draft or authorize prescription revisions.',
  },
  {
    title: '10. Clinical Pharmacist (Pharm D) Workspace',
    role: 'pharmacist',
    userId: 'pharm-001',
    route: '/pharmacist/dashboard',
    desc: 'Switched to Kavitha Rajan (Pharm D). Review medication interaction flags, refill requests, and launch a timed simulated counselling session.',
  },
  {
    title: '11. Interdisciplinary Clinical Messaging',
    role: 'pharmacist',
    userId: 'pharm-001',
    route: '/messages',
    desc: 'Experience direct asynchronous communication between patients, physicians, and clinical pharmacy specialists.',
  },
  {
    title: '12. Care Summary Report & PDF Generation',
    role: 'doctor',
    userId: 'doc-001',
    route: '/care-summary',
    desc: 'Export a professional, print-ready PDF care summary document aggregating vital metrics, medications, and labs for cross-hospital referral.',
  },
];

export default function GuidedDemo() {
  const { guidedDemo, dispatch, data, setUser, currentUser } = useApp();
  const navigate = useNavigate();

  if (!guidedDemo?.active) return null;

  const currentStepIndex = guidedDemo.step || 0;
  const currentStep = DEMO_STEPS[currentStepIndex] || DEMO_STEPS[0];

  const goToStep = (stepIdx) => {
    if (stepIdx < 0 || stepIdx >= DEMO_STEPS.length) return;
    const target = DEMO_STEPS[stepIdx];

    // Auto-switch user if role differs
    if (target.userId && data?.users?.[target.userId]) {
      const targetUser = data.users[target.userId];
      if (currentUser?.id !== targetUser.id) {
        setUser(targetUser);
      }
    }

    dispatch({ type: 'SET_GUIDED_DEMO', payload: { active: true, step: stepIdx } });
    navigate(target.route);
  };

  const handleNext = () => goToStep(currentStepIndex + 1);
  const handlePrev = () => goToStep(currentStepIndex - 1);
  const handleClose = () => dispatch({ type: 'SET_GUIDED_DEMO', payload: { active: false, step: 0 } });

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-slide-in no-print">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-primary/30 p-5 overflow-hidden backdrop-blur-md">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider block">Interactive Guided Tour</span>
              <span className="text-xs text-text-secondary">Step {currentStepIndex + 1} of {DEMO_STEPS.length}</span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title="Exit Tour"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step Body */}
        <div className="py-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-text-primary">{currentStep.title}</h4>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium capitalize bg-gray-100 text-text-secondary">
              {currentStep.role}
            </span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            {currentStep.desc}
          </p>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="btn-outline py-1.5 px-3 text-xs flex items-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={14} />
            <span>Previous</span>
          </button>

          {/* Step dots */}
          <div className="flex items-center gap-1">
            {DEMO_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => goToStep(i)}
                className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                  i === currentStepIndex ? 'w-4 bg-primary' : 'bg-gray-200 hover:bg-gray-300'
                }`}
                title={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {currentStepIndex < DEMO_STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1 cursor-pointer bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle size={14} />
              <span>Finish Tour</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
