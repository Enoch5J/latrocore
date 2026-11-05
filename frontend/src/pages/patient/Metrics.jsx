import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  Activity, ClipboardCheck, FileText, ClipboardList,
  Droplets, TrendingUp, CheckCircle, AlertTriangle, AlertCircle,
  Clock, ArrowRight, ShieldCheck, ChevronRight
} from 'lucide-react';
import { formatDate, formatTime, isToday } from '../../data/demoDate';

// Tab Components
import GlucoseMonitor from './GlucoseMonitor';
import CareChecklist from './CareChecklist';
import PatientInvestigations from './Investigations';
import PatientScreening from './Screening';

const TABS = [
  { id: 'glucose', label: 'Glucose Monitor', icon: Droplets, shortLabel: 'Glucose' },
  { id: 'checklist', label: 'Care Checklist', icon: ClipboardCheck, shortLabel: 'Checklist' },
  { id: 'investigations', label: 'Investigation', icon: FileText, shortLabel: 'Lab Tests' },
  { id: 'screening', label: 'Screening', icon: ClipboardList, shortLabel: 'Screening' },
];

export default function PatientMetrics({ initialTab }) {
  const { currentUser, data } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const tabQuery = searchParams.get('tab');
  const validTabIds = ['glucose', 'checklist', 'investigations', 'screening'];

  // Resolve active tab from URL query param, initialTab prop, or default to 'glucose'
  const initialActive = (validTabIds.includes(tabQuery) ? tabQuery : null)
    || (validTabIds.includes(initialTab) ? initialTab : null)
    || 'glucose';

  const [activeTab, setActiveTab] = useState(initialActive);

  // Sync state if URL query param or initialTab changes
  useEffect(() => {
    if (tabQuery && validTabIds.includes(tabQuery) && tabQuery !== activeTab) {
      setActiveTab(tabQuery);
    } else if (initialTab && validTabIds.includes(initialTab) && initialTab !== activeTab && !tabQuery) {
      setActiveTab(initialTab);
    }
  }, [tabQuery, initialTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tabId);
    // If switching away from glucose, clear action if present
    if (tabId !== 'glucose') {
      newParams.delete('action');
    }
    setSearchParams(newParams, { replace: true });
  };

  const patientId = currentUser?.id;

  // ── Metrics Data Aggregation ──────────────────────────────────────────
  const glucoseReadings = useMemo(() =>
    (data?.glucoseReadings || []).filter(r => r.patientId === patientId).sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime)),
    [data?.glucoseReadings, patientId]);

  const latestGlucose = glucoseReadings[0];
  const targets = useMemo(() =>
    (data?.clinicalTargets || []).find(t => t.patientId === patientId),
    [data?.clinicalTargets, patientId]);

  const doseEvents = useMemo(() =>
    (data?.doseEvents || []).filter(e => e.patientId === patientId),
    [data?.doseEvents, patientId]);

  const investigations = useMemo(() =>
    (data?.investigations || []).filter(i => i.patientId === patientId).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [data?.investigations, patientId]);

  const latestHbA1c = useMemo(() =>
    investigations.find(i => i.type === 'HbA1c'),
    [investigations]);

  const healthEntries = useMemo(() =>
    (data?.healthEntries || []).filter(e => e.patientId === patientId),
    [data?.healthEntries, patientId]);

  const screenings = useMemo(() =>
    (data?.screenings || []).filter(s => s.patientId === patientId),
    [data?.screenings, patientId]);

  const completedScreenings = screenings.filter(s => s.status === 'completed').length;
  const overdueScreenings = screenings.filter(s => s.status === 'overdue').length;

  // Adherence calculation for checklist count
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

  // Care Checklist completed count (matches 8 ADA checkpoints)
  const checklistCompletedCount = useMemo(() => {
    let count = 0;
    if (adherence && adherence.pct >= 80) count++;
    if (glucoseReadings.some(r => isToday(r.dateTime))) count++;
    if (latestHbA1c) count++;
    if (healthEntries.some(e => e.type === 'blood_pressure' && new Date(e.date) > new Date(Date.now() - 30 * 86400000))) count++;
    if (screenings.some(s => s.type === 'Eye Examination' && s.status === 'completed')) count++;
    if (screenings.some(s => s.type === 'Foot Examination' && s.status === 'completed')) count++;
    if (screenings.some(s => s.type === 'Kidney Assessment' && s.status === 'completed')) count++;
    if (todayActivity >= 30) count++;
    return count;
  }, [adherence, glucoseReadings, latestHbA1c, healthEntries, screenings, todayActivity]);

  const checklistProgressPct = Math.round((checklistCompletedCount / 8) * 100);

  // Tab Badge counts
  const tabCounts = {
    glucose: glucoseReadings.length > 0 ? `${glucoseReadings.length}` : undefined,
    checklist: `${checklistCompletedCount}/8`,
    investigations: investigations.length > 0 ? `${investigations.length}` : undefined,
    screening: screenings.length > 0 ? `${completedScreenings}/${screenings.length}` : undefined,
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl border-2 border-[#E8DCC8] p-5 sm:p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#046A38] bg-[#E8F5EE] px-2.5 py-1 rounded-full border border-[#A8D7BD]">
              Consolidated Clinical Hub
            </span>
            <span className="text-xs text-stone-300">•</span>
            <span className="text-xs font-bold text-stone-600">
              Longitudinal Glycemic Surveillance
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight flex items-center gap-2.5">
            <Activity className="text-[#046A38] shrink-0" size={28} />
            <span>Health Metrics &amp; Surveillance</span>
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1 max-w-2xl leading-relaxed">
            Consolidated tracking for continuous glucose monitoring, ADA care checkpoints, laboratory investigations, and preventive screening surveillance.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <div className="px-3.5 py-2 rounded-xl bg-[#FAF6EF] border border-[#E8DCC8] flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#046A38]" />
            <div className="text-left">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">Surveillance Status</p>
              <p className="text-xs font-black text-slate-900">
                {checklistCompletedCount >= 6 ? 'Optimal Control' : 'Review Recommended'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 Quick-Glance Interactive Summary Cards ────────────────── */}
      {/* Users can click any card to directly drill into details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Metric 1: Glucose Monitor */}
        <div
          onClick={() => handleTabChange('glucose')}
          className={`card p-4 sm:p-5 cursor-pointer transition-all border-2 text-left relative overflow-hidden group ${
            activeTab === 'glucose'
              ? 'bg-[#E8F5EE]/60 border-[#046A38] shadow-md ring-2 ring-[#046A38]/20'
              : 'bg-white border-slate-200 hover:border-[#046A38]/50 hover:bg-[#FAF6EF]/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wide text-teal-800">Glucose Monitor</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${
              activeTab === 'glucose' ? 'bg-[#046A38] text-white' : 'bg-teal-50 text-teal-700 border border-teal-200'
            }`}>
              <Droplets size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            {latestGlucose ? `${latestGlucose.value} mg/dL` : '—'}
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mt-1.5">
            <span className="truncate">
              {latestGlucose ? `${latestGlucose.context?.toUpperCase()} • ${formatTime(latestGlucose.dateTime)}` : 'No logs recorded'}
            </span>
            <span className="text-[11px] text-[#046A38] font-black group-hover:translate-x-0.5 transition-transform flex items-center">
              View <ChevronRight size={12} />
            </span>
          </div>
          {activeTab === 'glucose' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#046A38]" />
          )}
        </div>

        {/* Metric 2: Care Checklist */}
        <div
          onClick={() => handleTabChange('checklist')}
          className={`card p-4 sm:p-5 cursor-pointer transition-all border-2 text-left relative overflow-hidden group ${
            activeTab === 'checklist'
              ? 'bg-[#E8F5EE]/60 border-[#046A38] shadow-md ring-2 ring-[#046A38]/20'
              : 'bg-white border-slate-200 hover:border-[#046A38]/50 hover:bg-[#FAF6EF]/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wide text-emerald-800">Care Checklist</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${
              activeTab === 'checklist' ? 'bg-[#046A38] text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              <ClipboardCheck size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            {checklistCompletedCount} <span className="text-base font-bold text-slate-600">/ 8</span>
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mt-1.5">
            <span className="text-emerald-800 font-extrabold">{checklistProgressPct}% compliant</span>
            <span className="text-[11px] text-[#046A38] font-black group-hover:translate-x-0.5 transition-transform flex items-center">
              View <ChevronRight size={12} />
            </span>
          </div>
          {activeTab === 'checklist' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#046A38]" />
          )}
        </div>

        {/* Metric 3: Lab Investigations */}
        <div
          onClick={() => handleTabChange('investigations')}
          className={`card p-4 sm:p-5 cursor-pointer transition-all border-2 text-left relative overflow-hidden group ${
            activeTab === 'investigations'
              ? 'bg-[#E8F5EE]/60 border-[#046A38] shadow-md ring-2 ring-[#046A38]/20'
              : 'bg-white border-slate-200 hover:border-[#046A38]/50 hover:bg-[#FAF6EF]/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wide text-blue-800">Investigation</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${
              activeTab === 'investigations' ? 'bg-[#046A38] text-white' : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              <FileText size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            {latestHbA1c ? `${latestHbA1c.value}%` : `${investigations.length} Tests`}
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mt-1.5">
            <span className="truncate">
              {latestHbA1c ? `HbA1c • ${formatDate(latestHbA1c.date)}` : `${investigations.length} lab records`}
            </span>
            <span className="text-[11px] text-[#046A38] font-black group-hover:translate-x-0.5 transition-transform flex items-center">
              View <ChevronRight size={12} />
            </span>
          </div>
          {activeTab === 'investigations' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#046A38]" />
          )}
        </div>

        {/* Metric 4: Preventive Screening */}
        <div
          onClick={() => handleTabChange('screening')}
          className={`card p-4 sm:p-5 cursor-pointer transition-all border-2 text-left relative overflow-hidden group ${
            activeTab === 'screening'
              ? 'bg-[#E8F5EE]/60 border-[#046A38] shadow-md ring-2 ring-[#046A38]/20'
              : 'bg-white border-slate-200 hover:border-[#046A38]/50 hover:bg-[#FAF6EF]/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wide text-purple-800">Screening</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${
              activeTab === 'screening' ? 'bg-[#046A38] text-white' : 'bg-purple-50 text-purple-700 border border-purple-200'
            }`}>
              <ClipboardList size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            {completedScreenings} <span className="text-base font-bold text-slate-600">/ {screenings.length}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mt-1.5">
            <span className={overdueScreenings > 0 ? 'text-rose-700 font-extrabold' : 'text-slate-700'}>
              {overdueScreenings > 0 ? `${overdueScreenings} overdue` : 'All exams on track'}
            </span>
            <span className="text-[11px] text-[#046A38] font-black group-hover:translate-x-0.5 transition-transform flex items-center">
              View <ChevronRight size={12} />
            </span>
          </div>
          {activeTab === 'screening' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#046A38]" />
          )}
        </div>
      </div>

      {/* ── Consolidated Parent Tab Bar ────────────────────────────── */}
      <div className="bg-white p-2 rounded-2xl border-2 border-[#E8DCC8] shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {TABS.map(tab => {
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isTabActive
                    ? 'bg-[#046A38] text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-[#FAF6EF]'
                }`}
              >
                <tab.icon size={16} className="shrink-0" />
                <span>{tab.label}</span>
                {tabCounts[tab.id] && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    isTabActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-800 border border-slate-200'
                  }`}>
                    {tabCounts[tab.id]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Active Tab Feature View Container ───────────────────────── */}
      <div className="bg-white rounded-3xl border-2 border-[#E8DCC8] p-4 sm:p-6 shadow-xs min-h-[500px]">
        {activeTab === 'glucose' && (
          <GlucoseMonitor embedded onNavigateTab={handleTabChange} />
        )}
        {activeTab === 'checklist' && (
          <CareChecklist embedded onNavigateTab={handleTabChange} />
        )}
        {activeTab === 'investigations' && (
          <PatientInvestigations embedded onNavigateTab={handleTabChange} />
        )}
        {activeTab === 'screening' && (
          <PatientScreening embedded onNavigateTab={handleTabChange} />
        )}
      </div>
    </div>
  );
}

