import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { LoadingSpinner, Badge } from '../../components/ui';
import {
  ClipboardCheck, CheckCircle, AlertCircle, Clock, ArrowRight, ArrowLeft,
  Pill, Droplets, TrendingUp, Activity, Eye, ShieldCheck, Heart,
  CalendarDays, ExternalLink, Sparkles, Filter, Check, Stethoscope, AlertTriangle
} from 'lucide-react';
import { formatDate, isToday } from '../../data/demoDate';

export default function CareChecklist({ embedded = false, onNavigateTab }) {
  const { currentUser, data, addToast } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all'); // 'all' | 'completed' | 'pending'
  const patientId = currentUser?.id;

  const doseEvents = useMemo(() =>
    (data?.doseEvents || []).filter(e => e.patientId === patientId),
    [data?.doseEvents, patientId]);

  const glucoseReadings = useMemo(() =>
    (data?.glucoseReadings || []).filter(r => r.patientId === patientId).sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime)),
    [data?.glucoseReadings, patientId]);

  const investigations = useMemo(() =>
    (data?.investigations || []).filter(i => i.patientId === patientId).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [data?.investigations, patientId]);

  const healthEntries = useMemo(() =>
    (data?.healthEntries || []).filter(e => e.patientId === patientId),
    [data?.healthEntries, patientId]);

  const screenings = useMemo(() =>
    (data?.screenings || []).filter(s => s.patientId === patientId),
    [data?.screenings, patientId]);

  // Calculations
  const latestGlucose = glucoseReadings[0];
  const latestHbA1c = investigations.find(i => i.type === 'HbA1c');
  const latestBP = healthEntries.find(e => e.type === 'blood_pressure');

  const adherence = useMemo(() => {
    const now = new Date();
    const elapsed = doseEvents.filter(e => new Date(e.scheduledTime) <= now && e.status !== 'pending');
    if (elapsed.length === 0) return null;
    const taken = elapsed.filter(e => e.status === 'taken').length;
    return { pct: Math.round((taken / elapsed.length) * 100), taken, total: elapsed.length };
  }, [doseEvents]);

  const todayActivity = useMemo(() => {
    const today = healthEntries.filter(e => e.type === 'activity' && isToday(e.date));
    return today.reduce((sum, e) => sum + (e.duration || 0), 0);
  }, [healthEntries]);

  // 8 Specific Clinical Checkpoints
  const checklistData = useMemo(() => {
    return [
      {
        id: 'medication-adherence',
        title: 'Medication adherence ≥80%',
        frequency: 'Daily',
        done: adherence ? adherence.pct >= 80 : false,
        currentValue: adherence ? `${adherence.pct}% (${adherence.taken}/${adherence.total} doses)` : 'No active prescriptions',
        icon: Pill,
        iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        actionLabel: 'View Medications',
        actionRoute: '/patient/medications',
        target: '≥ 80% on-time',
      },
      {
        id: 'glucose-logging',
        title: 'Glucose logged today',
        frequency: 'Daily',
        done: glucoseReadings.some(r => isToday(r.dateTime)),
        currentValue: glucoseReadings.some(r => isToday(r.dateTime))
          ? `${latestGlucose?.value} mg/dL (${latestGlucose?.context || 'logged'})`
          : 'Pending today',
        icon: Droplets,
        iconBg: 'bg-teal-50 text-teal-700 border-teal-200',
        actionLabel: 'Log Glucose',
        actionRoute: '/patient/metrics?tab=glucose&action=add',
        target: '80–130 mg/dL fasting',
      },
      {
        id: 'hba1c-quarterly',
        title: 'HbA1c recorded this quarter',
        category: 'Laboratory Review',
        frequency: 'Every 3 months',
        done: !!latestHbA1c,
        currentValue: latestHbA1c?.value != null && latestHbA1c.value !== ''
          ? `${latestHbA1c.value}% (${latestHbA1c.status || 'Good Control'})`
          : latestHbA1c
            ? (latestHbA1c.status || 'Recorded')
            : 'No test records',
        actionLabel: 'View Lab Results',
        actionRoute: '/patient/metrics?tab=investigations',
        target: '< 7.0%',
        icon: TrendingUp,
        iconBg: 'bg-blue-50 text-blue-700 border-blue-200',
      },
      {
        id: 'bp-monthly',
        title: 'Blood pressure this month',
        frequency: 'Monthly',
        done: healthEntries.some(e => e.type === 'blood_pressure' && new Date(e.date) > new Date(Date.now() - 30 * 86400000)),
        currentValue: latestBP?.value ? `${latestBP.value} mmHg` : 'No reading recorded',
        icon: Activity,
        iconBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        actionLabel: 'Log Blood Pressure',
        actionRoute: '/patient/lifestyle?action=add',
        target: '< 130/80 mmHg',
      },
      {
        id: 'eye-screening',
        title: 'Eye screening current',
        frequency: 'Annual',
        done: screenings.some(s => s.type === 'Eye Examination' && s.status === 'completed'),
        currentValue: screenings.some(s => s.type === 'Eye Examination' && s.status === 'completed')
          ? 'Completed'
          : 'Due for annual exam',
        icon: Eye,
        iconBg: 'bg-amber-50 text-amber-700 border-amber-200',
        actionLabel: 'Book Eye Exam',
        actionRoute: '/appointments?type=screening',
        target: 'Dilated retinal exam',
      },
      {
        id: 'foot-exam',
        title: 'Foot examination current',
        frequency: 'Annual',
        done: screenings.some(s => s.type === 'Foot Examination' && s.status === 'completed'),
        currentValue: screenings.some(s => s.type === 'Foot Examination' && s.status === 'completed')
          ? 'Completed'
          : 'Annual check due',
        icon: ShieldCheck,
        iconBg: 'bg-rose-50 text-rose-700 border-rose-200',
        actionLabel: 'Schedule Foot Check',
        actionRoute: '/appointments?type=screening',
        target: 'Comprehensive foot exam',
      },
      {
        id: 'kidney-monitoring',
        title: 'Kidney monitoring current',
        frequency: 'Annual',
        done: screenings.some(s => s.type === 'Kidney Assessment' && s.status === 'completed'),
        currentValue: screenings.some(s => s.type === 'Kidney Assessment' && s.status === 'completed')
          ? 'Normal (uACR & eGFR)'
          : 'Annual check due',
        icon: ClipboardCheck,
        iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        actionLabel: 'Review Renal Panel',
        actionRoute: '/patient/metrics?tab=investigations',
        target: 'uACR < 30 • eGFR > 60',
      },
      {
        id: 'physical-activity',
        title: '30+ min activity today',
        frequency: 'Weekly (≥150 min)',
        done: todayActivity >= 30,
        currentValue: todayActivity >= 30
          ? `${todayActivity} min today`
          : `${todayActivity} min today`,
        icon: Heart,
        iconBg: 'bg-orange-50 text-orange-700 border-orange-200',
        actionLabel: 'Log Activity',
        actionRoute: '/patient/lifestyle?action=add',
        target: '≥ 30 min/day',
      },
    ];
  }, [adherence, glucoseReadings, latestGlucose, latestHbA1c, latestBP, healthEntries, screenings, todayActivity]);

  const completedCount = checklistData.filter(i => i.done).length;
  const totalCount = checklistData.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  const filteredItems = useMemo(() => {
    if (filter === 'completed') return checklistData.filter(i => i.done);
    if (filter === 'pending') return checklistData.filter(i => !i.done);
    return checklistData;
  }, [checklistData, filter]);

  return (
    <div className={`space-y-5 animate-fade-in ${embedded ? 'pb-2' : 'pb-12'}`}>
      {/* Header + Compact Progress */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          {!embedded && (
            <button
              onClick={() => navigate('/patient/dashboard')}
              className="text-xs font-bold text-slate-600 hover:text-slate-950 flex items-center gap-1.5 mb-2 group cursor-pointer transition-colors"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
              <span>Back to Dashboard</span>
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0">
              <ClipboardCheck size={19} />
            </div>
            <div>
              {embedded ? (
                <h2 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">
                  Care Checklist
                </h2>
              ) : (
                <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                  Care Checklist
                </h1>
              )}
              <p className="text-xs font-medium text-slate-500">
                {completedCount} of {totalCount} checkpoints completed
              </p>
            </div>
          </div>
        </div>

        {/* Compact Progress Pill + Filter Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#046A38] rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs font-black text-slate-900">{progressPct}%</span>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-white text-slate-950 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-emerald-800'
              }`}
            >
              Done ({completedCount})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'pending'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-amber-800'
              }`}
            >
              Due ({totalCount - completedCount})
            </button>
          </div>
        </div>
      </div>

      {/* 8 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`rounded-2xl border p-4 flex flex-col justify-between transition-all duration-200 bg-white ${
                item.done
                  ? 'border-emerald-200 hover:border-emerald-400'
                  : 'border-slate-200 hover:border-amber-400'
              }`}
            >
              <div className="space-y-3">
                {/* Top Row: Icon + Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${item.iconBg}`}>
                    <Icon size={16} />
                  </div>
                  {item.done ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle size={12} className="shrink-0" />
                      <span>Completed</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      <AlertCircle size={12} className="shrink-0" />
                      <span>Action Needed</span>
                    </span>
                  )}
                </div>

                {/* Title & Cadence */}
                <div>
                  <h3 className="font-bold text-sm text-slate-950 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                    {item.frequency}
                  </p>
                </div>

                {/* Status Box */}
                <div className={`px-3 py-2.5 rounded-xl border ${item.done ? 'bg-emerald-50/60 border-emerald-200/80' : 'bg-slate-50 border-slate-200/80'}`}>
                  <p className={`text-xs font-bold ${item.done ? 'text-emerald-950' : 'text-slate-900'}`}>
                    {item.currentValue}
                  </p>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                    Target: {item.target}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  if (onNavigateTab) {
                    if (item.actionRoute.includes('tab=glucose') || item.actionRoute.includes('/glucose')) {
                      onNavigateTab('glucose');
                      return;
                    }
                    if (item.actionRoute.includes('tab=investigations') || item.actionRoute.includes('/investigations')) {
                      onNavigateTab('investigations');
                      return;
                    }
                    if (item.actionRoute.includes('tab=screening') || (item.actionRoute.includes('/screening') && !item.actionRoute.includes('appointments'))) {
                      onNavigateTab('screening');
                      return;
                    }
                  }
                  navigate(item.actionRoute);
                }}
                className={`mt-4 w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  item.done
                    ? 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                <span>{item.actionLabel}</span>
                <ArrowRight size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
