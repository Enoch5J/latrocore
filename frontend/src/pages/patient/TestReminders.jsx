import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Badge, Modal } from '../../components/ui';
import {
  ClipboardList, CalendarDays, Droplets, Activity, ShieldCheck, ArrowRight,
  ArrowLeft, CheckCircle, Clock, AlertTriangle, Eye, AlertCircle, FileText,
  Calendar, Check, Stethoscope, Sparkles, Filter, Info, Shield, RefreshCw
} from 'lucide-react';
import { formatDate } from '../../data/demoDate';

export default function TestReminders() {
  const { currentUser, data, addToast, refreshData } = useApp();
  const navigate = useNavigate();
  const patientId = currentUser?.id;

  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'tests'
  const [selectedCard, setSelectedCard] = useState(null);

  const investigations = useMemo(() =>
    (data?.investigations || []).filter(i => i.patientId === patientId).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [data?.investigations, patientId]);

  const screenings = useMemo(() =>
    (data?.screenings || []).filter(s => s.patientId === patientId),
    [data?.screenings, patientId]);

  // The 3 Schedule Tier Cards from User Blueprint
  const scheduleCards = [
    {
      id: 'every-3-months',
      interval: 'EVERY 3 MONTHS',
      title: 'HbA1c / glycemic review',
      tagBadge: 'bg-sky-100 text-sky-900 border-sky-300',
      headerBg: 'bg-sky-50/70',
      borderAccent: 'border-sky-300 hover:border-sky-500',
      icon: Droplets,
      iconColor: 'text-sky-700 bg-sky-100',
      status: 'Due in 12 Days',
      statusBadge: 'bg-amber-100 text-amber-900 border-amber-300',
      nextDate: '07 Oct 2026',
      items: [
        'HbA1c when goals are not met, therapy has changed, or closer monitoring is needed',
        'Fasting / post-meal glucose review as clinically appropriate',
        'Medication adherence & side-effect review',
      ],
      clinicalAction: 'Book HbA1c Lab Test',
      actionRoute: '/appointments?type=investigation',
      frequencyDesc: 'Quarterly review aligns with erythrocyte 90-120 day lifespan',
      testsIncluded: ['HbA1c Glycated Hemoglobin', 'Fasting Blood Glucose', 'Post-Prandial Glucose', 'Hypoglycemia Risk Audit'],
    },
    {
      id: 'every-6-months',
      interval: 'EVERY 6 MONTHS',
      title: 'Health & laboratory checkpoint',
      tagBadge: 'bg-indigo-100 text-indigo-900 border-indigo-300',
      headerBg: 'bg-indigo-50/70',
      borderAccent: 'border-indigo-300 hover:border-indigo-500',
      icon: Activity,
      iconColor: 'text-indigo-700 bg-indigo-100',
      status: 'Scheduled (Nov)',
      statusBadge: 'bg-blue-100 text-blue-900 border-blue-300',
      nextDate: '28 Nov 2026',
      items: [
        'Lipid profile — repeat earlier/more often when clinically indicated or after treatment changes',
        'Liver-function monitoring when indicated by medicines or clinical status',
        'Review BP, weight, lifestyle and treatment plan',
      ],
      clinicalAction: 'View Renal & Lipid History',
      actionRoute: '/patient/investigations',
      frequencyDesc: 'Semi-annual cardiovascular and hepatic tolerance evaluation',
      testsIncluded: ['Lipid Profile (Total, LDL, HDL, Triglycerides)', 'Liver Function Tests (ALT/AST)', 'Blood Pressure & BMI Re-stratification'],
    },
    {
      id: 'at-least-annually',
      interval: 'AT LEAST ANNUALLY',
      title: 'Complication & preventive health review',
      tagBadge: 'bg-teal-100 text-teal-900 border-teal-300',
      headerBg: 'bg-teal-50/70',
      borderAccent: 'border-teal-300 hover:border-teal-500',
      icon: ShieldCheck,
      iconColor: 'text-teal-700 bg-teal-100',
      status: 'Annual Check',
      statusBadge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      nextDate: '15 Dec 2026',
      items: [
        'Dilated eye examination / retinal assessment',
        'Kidney assessment: urine ACR + serum creatinine/eGFR',
        'Comprehensive foot assessment',
        'Dental/oral health and other age/condition-specific preventive checks',
      ],
      clinicalAction: 'Schedule Retinal & Foot Check',
      actionRoute: '/appointments?type=screening',
      frequencyDesc: 'Annual microvascular and end-organ surveillance protocol',
      testsIncluded: ['Dilated Retinal Fundus Exam', 'Spot Urine Albumin-Creatinine Ratio (uACR)', 'Serum Creatinine & eGFR', '10g Monofilament Foot Exam', 'Dental & Periodontal Check'],
    },
  ];

  // Specific Laboratory Tests List
  const specificTests = [
    {
      id: 'hba1c',
      name: 'HbA1c (Glycated Hemoglobin)',
      interval: 'Every 3 Months',
      target: '< 7.0%',
      lastResult: '7.2% (18 Sept 2026)',
      dueDate: '07 Oct 2026',
      status: 'Due Soon',
      variant: 'warning',
      category: 'Glycemic Control',
      icon: Droplets,
    },
    {
      id: 'lipid',
      name: 'Lipid Profile (Cholesterol/Triglycerides)',
      interval: 'Every 6 Months',
      target: 'LDL < 100 mg/dL',
      lastResult: 'LDL 98 mg/dL (15 Jun 2026)',
      dueDate: '28 Nov 2026',
      status: 'Upcoming',
      variant: 'info',
      category: 'Cardiovascular Risk',
      icon: Activity,
    },
    {
      id: 'renal',
      name: 'Serum Creatinine & eGFR',
      interval: 'Every 6-12 Months',
      target: 'eGFR > 60 mL/min',
      lastResult: '0.9 mg/dL (15 Jun 2026)',
      dueDate: '28 Nov 2026',
      status: 'Upcoming',
      variant: 'info',
      category: 'Renal Function',
      icon: Activity,
    },
    {
      id: 'uacr',
      name: 'Urine ACR (Microalbumin)',
      interval: 'At Least Annually',
      target: '< 30 mg/g creatinine',
      lastResult: '18 mg/g (15 Dec 2025)',
      dueDate: '15 Dec 2026',
      status: 'Scheduled',
      variant: 'success',
      category: 'Microvascular (Kidney)',
      icon: ShieldCheck,
    },
    {
      id: 'retinal',
      name: 'Dilated Eye / Retinal Examination',
      interval: 'At Least Annually',
      target: 'No Retinopathy',
      lastResult: 'Clear Retinal Scan (Dec 2025)',
      dueDate: '15 Dec 2026',
      status: 'Scheduled',
      variant: 'success',
      category: 'Microvascular (Eye)',
      icon: Eye,
    },
    {
      id: 'foot',
      name: 'Comprehensive Foot Examination',
      interval: 'At Least Annually',
      target: 'Intact Sensation & Pulses',
      lastResult: 'Monofilament 10/10 (Dec 2025)',
      dueDate: '15 Dec 2026',
      status: 'Scheduled',
      variant: 'success',
      category: 'Neuropathy Surveillance',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <button
            onClick={() => navigate('/patient/dashboard')}
            className="text-xs font-bold text-slate-600 hover:text-slate-950 flex items-center gap-1.5 mb-2 group cursor-pointer transition-colors"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back to Patient Dashboard</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 shadow-inner">
              <ClipboardList size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                  Patient Welfare — Diabetes Test Reminder Schedule
                </h1>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200 uppercase tracking-wider">
                  ADA Standards of Care 2026
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
                Automatic reminders for routine monitoring — personalized to the patient's clinician-defined care plan.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/appointments?type=investigation')}
            className="btn-primary btn-sm bg-blue-700 hover:bg-blue-800 text-white"
          >
            <CalendarDays size={14} />
            <span>Book Lab Test</span>
          </button>
          <button
            onClick={() => navigate('/patient/investigations')}
            className="btn-outline btn-sm text-xs font-bold text-slate-700"
          >
            <FileText size={14} />
            <span>View Investigations</span>
          </button>
        </div>
      </div>

      {/* Top 3 Quick Tiers Overview Pill Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scheduleCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className={`p-4 rounded-2xl border-2 bg-white flex items-center justify-between shadow-xs transition hover:shadow-md ${card.borderAccent}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.iconColor}`}>
                  <Icon size={20} />
                </div>
                <div className="min-w-0">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${card.tagBadge}`}>
                    {card.interval}
                  </span>
                  <p className="text-xs font-extrabold text-slate-950 mt-1 truncate">
                    {card.title}
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${card.statusBadge}`}>
                {card.status}
              </span>
            </div>
          );
        })}
      </div>

      {/* Navigation View Switcher (3 Tier Cards vs. Individual Tests Table) */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'schedule'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-950'
            }`}
          >
            <CalendarDays size={14} />
            <span>3 Interval Schedule Tiers (Slide View)</span>
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'tests'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-950'
            }`}
          >
            <Activity size={14} />
            <span>Specific Diagnostic Tests ({specificTests.length})</span>
          </button>
        </div>

        <span className="text-xs font-semibold text-slate-500">
          Personalized Protocol: Priya Sharma (Type 2 Diabetes)
        </span>
      </div>

      {/* ── TAB 1: 3 Interval Schedule Cards (Exact Slide Design) ── */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {/* Main Container Styled with #367588 Top Accent Border */}
          <div className="card p-6 sm:p-8 bg-white border-2 border-[#D2E2E6] rounded-3xl shadow-sm space-y-6">
            {/* Header Accent Row */}
            <div className="border-t-4 border-[#367588] pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#367588]"></span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">
                    Patient Welfare — Diabetes Test Reminder Schedule
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 font-semibold pl-4.5 mt-0.5">
                  Automatic reminders for routine monitoring — personalized to the patient's clinician-defined care plan.
                </p>
              </div>

              <span className="text-xs font-bold text-[#1D3F4A] bg-[#E3EFF2] border border-[#A0C7D1] px-3 py-1 rounded-full self-start sm:self-center">
                Protocol: ADA Standards of Care 2026
              </span>
            </div>

            {/* 3 Horizontal Rounded Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {scheduleCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.id}
                    className="rounded-3xl border-2 border-slate-200/90 bg-white p-6 flex flex-col justify-between shadow-xs hover:border-blue-500 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="space-y-4">
                      {/* Interval Pill Badge */}
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${card.tagBadge}`}>
                          {card.interval}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${card.statusBadge}`}>
                          {card.status}
                        </span>
                      </div>

                      {/* Card Title */}
                      <div className="space-y-1">
                        <h3 className="font-black text-base sm:text-lg text-slate-950 leading-snug">
                          {card.title}
                        </h3>
                        <p className="text-[11px] font-semibold text-slate-500">
                          {card.frequencyDesc}
                        </p>
                      </div>

                      {/* Bullets List from User Diagram */}
                      <ul className="space-y-3 pt-2 text-xs text-slate-700 leading-relaxed">
                        {card.items.map((bullet, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-blue-700 font-black shrink-0 mt-0.5 text-sm">•</span>
                            <span className="font-semibold text-slate-800">{bullet}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Included Tests Chips */}
                      <div className="pt-3 border-t border-slate-100 space-y-1.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500 block">
                          Covered Diagnostic Panels:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {card.testsIncluded.map((t, idx) => (
                            <span key={idx} className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Action */}
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block font-semibold">Target Due Date</span>
                        <span className="font-extrabold text-slate-900">{card.nextDate}</span>
                      </div>
                      <button
                        onClick={() => navigate(card.actionRoute)}
                        className="btn-primary btn-sm text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                        style={{ backgroundColor: '#367588' }}
                      >
                        <span>{card.clinicalAction}</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Banner: PATIENT WELFARE • Remind → Record → Complete → Escalate */}
            <div className="rounded-2xl bg-[#F3F8F9] border border-[#C7DFE5] py-4 px-6 text-center shadow-xs">
              <p className="text-xs sm:text-sm font-black text-[#1D3F4A] tracking-wider uppercase">
                PATIENT WELFARE &bull; Remind &rarr; Record &rarr; Complete &rarr; Escalate to the care team when due or abnormal
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-[#D2E2E6] text-left">
                <div>
                  <span className="text-[10px] font-extrabold text-[#367588] block">1. REMIND</span>
                  <p className="text-[10px] text-[#24383F] font-medium">Automatic alert triggered 14 days before due window.</p>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-[#367588] block">2. RECORD</span>
                  <p className="text-[10px] text-[#24383F] font-medium">Capture laboratory and diagnostic clinic reports.</p>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-[#367588] block">3. COMPLETE</span>
                  <p className="text-[10px] text-[#24383F] font-medium">Auto-verify results against personalized target baselines.</p>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-[#367588] block">4. ESCALATE</span>
                  <p className="text-[10px] text-[#24383F] font-medium">Diabetologist flagged immediately if values are abnormal.</p>
                </div>
              </div>
            </div>

            {/* Subtext Footnotes from User Diagram */}
            <div className="pt-2 border-t border-slate-200 text-slate-500 text-[10px] leading-normal flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="font-bold text-slate-600">LATROCORE • Diabetes Care Module</span>
              <span className="text-center sm:text-left text-slate-500 max-w-xl">
                Reminder intervals are not a diagnosis protocol; frequency should be individualized for diabetes type, control, complications, medicines and clinician advice.
              </span>
              <span className="font-bold text-slate-600 text-right sm:text-left shrink-0">
                Clinical framing: ADA Standards of Care 2026
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Specific Diagnostic Tests Table & Cards ── */}
      {activeTab === 'tests' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {specificTests.map((test) => {
              const Icon = test.icon;
              return (
                <div
                  key={test.id}
                  className="card p-5 border-2 border-slate-200 hover:border-blue-400 rounded-2xl bg-white shadow-xs hover:shadow-md transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
                        <Icon size={16} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-950 leading-tight">
                          {test.name}
                        </h4>
                        <span className="text-[10px] font-bold text-slate-500">
                          {test.category}
                        </span>
                      </div>
                    </div>
                    <Badge variant={test.variant}>
                      {test.status}
                    </Badge>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Frequency:</span>
                      <span className="font-bold text-slate-900">{test.interval}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Clinical Target:</span>
                      <span className="font-bold text-teal-800">{test.target}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-500 font-medium">Last Measured:</span>
                      <span className="font-bold text-slate-900">{test.lastResult}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Due: {test.dueDate}
                    </span>
                    <button
                      onClick={() => navigate('/appointments?type=investigation')}
                      className="font-extrabold text-blue-700 hover:text-blue-950 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Book Slot</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Clinical Consultation Recommendation Strip */}
      <div className="card p-5 bg-gradient-to-r from-blue-900 via-indigo-950 to-blue-950 text-white rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-800/80 text-blue-200 flex items-center justify-center shrink-0 border border-blue-600/40">
            <Stethoscope size={22} />
          </div>
          <div>
            <h4 className="font-extrabold text-sm sm:text-base text-white">
              Need to Customize Your Reminder Frequency?
            </h4>
            <p className="text-xs text-blue-200/90 font-medium mt-0.5">
              Patients with stable HbA1c may have laboratory intervals extended to every 6 months, whereas recent treatment changes warrant tighter quarterly reviews.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate('/messages')}
            className="btn-primary btn-sm bg-white hover:bg-slate-100 text-blue-950 font-bold border-none text-xs"
          >
            <span>Message Diabetologist</span>
          </button>
        </div>
      </div>
    </div>
  );
}
