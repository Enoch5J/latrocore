import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal, LoadingSpinner, Badge, Tabs, ConfirmDialog } from '../../components/ui';
import {
  Salad, Plus, Edit, Trash2, Clock, Heart, Moon, Scale, Droplets, TrendingUp,
  AlertTriangle, CheckCircle2, XCircle, ArrowUpRight, Zap, RefreshCw, Flame,
  Award, ChevronRight, Pill, ShieldAlert, Sparkles, Activity, Check, X, Info
} from 'lucide-react';
import { formatDate, formatDateTime, formatTime, isToday } from '../../data/demoDate';
import {
  addHealthEntry, updateHealthEntry, deleteHealthEntry,
  getProgressionData, saveProgressionData, calculateProgression
} from '../../services/dataService';

const ENTRY_TYPES = [
  { id: 'meal', label: 'Meal', icon: Salad, color: 'text-green-600 bg-green-50' },
  { id: 'activity', label: 'Activity', icon: Heart, color: 'text-blue-600 bg-blue-50' },
  { id: 'sleep', label: 'Sleep', icon: Moon, color: 'text-purple-600 bg-purple-50' },
  { id: 'weight', label: 'Weight', icon: Scale, color: 'text-amber-600 bg-amber-50' },
  { id: 'blood_pressure', label: 'Blood Pressure', icon: Droplets, color: 'text-red-600 bg-red-50' },
];

export default function Lifestyle() {
  const { currentUser, data, refreshData, addToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeline');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('meal');
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const patientId = currentUser?.id || 'pat-001';

  // Dynamic Progression State
  const [progression, setProgression] = useState(() => getProgressionData(patientId));

  const loadProgression = useCallback(() => {
    const p = getProgressionData(patientId);
    setProgression(p);
  }, [patientId]);

  useEffect(() => {
    loadProgression();
    setTimeout(() => setLoading(false), 200);
  }, [loadProgression]);

  const entries = useMemo(() =>
    (data?.healthEntries || []).filter(e => e.patientId === patientId).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [data?.healthEntries, patientId]);

  const todayEntries = useMemo(() => entries.filter(e => isToday(e.date)), [entries]);

  const glucoseReadings = useMemo(() =>
    (data?.glucoseReadings || []).filter(r => r.patientId === patientId && isToday(r.dateTime)),
    [data?.glucoseReadings, patientId]);

  const todayDoses = useMemo(() =>
    (data?.doseEvents || []).filter(d => d.patientId === patientId && isToday(d.scheduledTime)),
    [data?.doseEvents, patientId]);

  // Weekly summaries
  const weeklySummary = useMemo(() => {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekEntries = entries.filter(e => new Date(e.date) >= weekAgo);
    const activities = weekEntries.filter(e => e.type === 'activity');
    const meals = weekEntries.filter(e => e.type === 'meal');
    const sleeps = weekEntries.filter(e => e.type === 'sleep');
    return {
      totalActivity: activities.reduce((s, a) => s + (a.duration || 0), 0),
      avgSleep: sleeps.length > 0 ? (sleeps.reduce((s, a) => s + (a.duration || 0), 0) / sleeps.length).toFixed(1) : 0,
      mealCount: meals.length,
      activityDays: new Set(activities.map(a => new Date(a.date).toDateString())).size,
    };
  }, [entries]);

  // Handle Meal Toggle (Taken / Not Taken / Pending)
  const handleToggleMeal = (mealId, newStatus) => {
    const updatedMeals = (progression.meals || []).map(m => {
      if (m.id === mealId) {
        return { ...m, taken: newStatus };
      }
      return m;
    });

    saveProgressionData(patientId, { meals: updatedMeals });
    const fresh = getProgressionData(patientId);
    setProgression(fresh);
    refreshData();

    if (newStatus === false) {
      addToast({
        type: 'warning',
        message: `⚠️ Food marked NOT TAKEN: Progression level reduced to ${fresh.score}%! (Hypoglycemia risk)`,
      });
    } else if (newStatus === true) {
      addToast({
        type: 'success',
        message: `✓ Food marked TAKEN: Progression level increased to ${fresh.score}%!`,
      });
    } else {
      addToast({ type: 'info', message: 'Meal status set to Pending' });
    }
  };

  // Handle Tablet Toggle (Taken / Not Taken / Pending)
  const handleToggleTablet = (tabletId, newStatus) => {
    const updatedTablets = (progression.tablets || []).map(t => {
      if (t.id === tabletId) {
        return { ...t, taken: newStatus };
      }
      return t;
    });

    saveProgressionData(patientId, { tablets: updatedTablets });
    const fresh = getProgressionData(patientId);
    setProgression(fresh);
    refreshData();

    if (newStatus === false) {
      addToast({
        type: 'danger',
        message: `⚠️ Tablet marked NOT TAKEN: Progression level reduced to ${fresh.score}%! (Glycemic spike risk)`,
      });
    } else if (newStatus === true) {
      addToast({
        type: 'success',
        message: `✓ Tablet marked TAKEN: Progression level increased to ${fresh.score}%!`,
      });
    } else {
      addToast({ type: 'info', message: 'Tablet dose set to Pending' });
    }
  };

  // Handle Activity Update
  const handleSetActivityMinutes = async (minutes) => {
    saveProgressionData(patientId, { activityMinutes: minutes });
    const fresh = getProgressionData(patientId);
    setProgression(fresh);

    // Also record an activity entry in healthEntries for today
    if (minutes > 0) {
      await addHealthEntry({
        patientId,
        type: 'activity',
        activityType: 'Brisk Walk & Exercise',
        duration: minutes,
        date: new Date().toISOString(),
        notes: `Progression logged: ${minutes} min active session`,
      });
    }
    refreshData();

    addToast({
      type: 'success',
      message: `🏃 Activity Progression updated: ${minutes}/30 min (${fresh.stats.activityPct}% goal achieved)!`,
    });
  };

  // Handle Glucose Toggle
  const handleToggleGlucose = () => {
    const newChecked = !progression.glucoseChecked;
    saveProgressionData(patientId, { glucoseChecked: newChecked });
    const fresh = getProgressionData(patientId);
    setProgression(fresh);
    refreshData();
    addToast({
      type: newChecked ? 'success' : 'warning',
      message: newChecked
        ? `🩸 Fasting glucose check added: Progression increased to ${fresh.score}%!`
        : `Fasting glucose unlogged: Progression dropped to ${fresh.score}%`,
    });
  };

  // Quick Action: Mark All Taken (Restore 100%)
  const handleMarkAllTaken = () => {
    const allMealsTaken = (progression.meals || []).map(m => ({ ...m, taken: true }));
    const allTabletsTaken = (progression.tablets || []).map(t => ({ ...t, taken: true }));
    saveProgressionData(patientId, {
      meals: allMealsTaken,
      tablets: allTabletsTaken,
      activityMinutes: 30,
      glucoseChecked: true,
    });
    const fresh = getProgressionData(patientId);
    setProgression(fresh);
    refreshData();
    addToast({
      type: 'success',
      message: `🎉 All items marked Taken! Daily Progression reached ${fresh.score}% (Level 4: Master Control)!`,
    });
  };

  // Preset Scenario Testing
  const handleSimulateScenario = (scenario) => {
    if (scenario === 'food-missed') {
      const updatedMeals = (progression.meals || []).map((m, idx) => ({ ...m, taken: idx === 2 ? false : true }));
      saveProgressionData(patientId, { meals: updatedMeals });
    } else if (scenario === 'tablet-missed') {
      const updatedTablets = (progression.tablets || []).map((t, idx) => ({ ...t, taken: idx === 2 ? false : true }));
      saveProgressionData(patientId, { tablets: updatedTablets });
    } else if (scenario === 'both-missed') {
      const updatedMeals = (progression.meals || []).map(m => ({ ...m, taken: false }));
      const updatedTablets = (progression.tablets || []).map(t => ({ ...t, taken: false }));
      saveProgressionData(patientId, {
        meals: updatedMeals,
        tablets: updatedTablets,
        activityMinutes: 0,
        glucoseChecked: false,
      });
    }
    const fresh = getProgressionData(patientId);
    setProgression(fresh);
    refreshData();
    addToast({
      type: 'warning',
      message: `Simulated: ${scenario.replace('-', ' ').toUpperCase()}! Progression updated to ${fresh.score}%.`,
    });
  };

  const handleSave = async (formData) => {
    if (editing) {
      await updateHealthEntry(editing.id, formData);
      addToast({ type: 'success', message: 'Entry updated' });
    } else {
      await addHealthEntry({ ...formData, patientId });
      addToast({ type: 'success', message: 'Entry added' });
    }
    refreshData(); setShowForm(false); setEditing(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteHealthEntry(deleteTarget.id);
    refreshData();
    addToast({ type: 'success', message: 'Entry deleted' });
  };

  if (loading) return <LoadingSpinner />;

  const tabs = [
    { id: 'timeline', label: "Today's Progression & Timeline" },
    { id: 'meals', label: 'Meals', count: entries.filter(e => e.type === 'meal').length },
    { id: 'activity', label: 'Activity', count: entries.filter(e => e.type === 'activity').length },
    { id: 'sleep', label: 'Sleep' },
    { id: 'vitals', label: 'Weight & BP' },
    { id: 'weekly', label: 'Weekly Summary' },
  ];

  const score = progression?.score ?? 75;
  const level = progression?.level ?? 3;
  const levelName = progression?.levelName ?? 'Target Control';
  const colorClass = progression?.colorClass ?? 'teal';
  const deductions = progression?.deductions ?? [];
  const bonuses = progression?.bonuses ?? [];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-300">
              Live Health Progression Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight mt-1">
            Lifestyle, Nutrition & Daily Progression
          </h1>
          <p className="text-sm font-semibold text-slate-700 mt-1">
            Real-time tracking of food intake, tablet adherence, physical movement, and glycemic control
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ENTRY_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => { setFormType(t.id); setEditing(null); setShowForm(true); }}
              className="btn-outline btn-sm font-bold text-slate-900 border-slate-300 hover:bg-slate-100 flex items-center gap-1.5 shadow-xs"
            >
              <t.icon size={15} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── HERO: Dynamic Daily Health Progression Command Suite ── */}
      <div className="card border-2 border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-950 text-white p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: Overall Progression Gauge */}
            <div className="flex items-center gap-4 sm:gap-6 min-w-0">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 flex items-center justify-center">
                {/* SVG Circular Progress Meter */}
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50" cy="50" r="42"
                    className="stroke-slate-800"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="50" cy="50" r="42"
                    className={`transition-all duration-700 ${
                      score >= 85 ? 'stroke-emerald-400' :
                      score >= 65 ? 'stroke-teal-400' :
                      score >= 40 ? 'stroke-amber-400' : 'stroke-rose-500'
                    }`}
                    strokeWidth="10"
                    strokeDasharray={264}
                    strokeDashoffset={264 - (264 * score) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl sm:text-3xl font-black text-white leading-none">{score}%</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Progression</span>
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    score >= 85 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                    score >= 65 ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' :
                    score >= 40 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                    'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}>
                    Level {level}: {levelName}
                  </span>
                  {deductions.some(d => d.severity === 'high' || d.severity === 'critical') && (
                    <span className="flex items-center gap-1 text-[11px] font-extrabold bg-rose-900/80 text-rose-200 border border-rose-500/60 px-2 py-0.5 rounded-full animate-pulse">
                      <ShieldAlert size={12} />
                      Level Reduced Due to Missed Dose/Food
                    </span>
                  )}
                </div>

                <h2 className="text-lg sm:text-xl font-extrabold text-white mt-1.5 leading-tight">
                  Daily Health & Adherence Progression
                </h2>
                <p className="text-xs sm:text-sm font-medium text-slate-300 mt-1 max-w-xl">
                  {score >= 85
                    ? 'Excellent progress! Your meal schedule, tablet timings, and activity are fully synchronized for optimal glycemic control.'
                    : score >= 65
                    ? 'Solid progression today. Maintain your scheduled evening meals and medications to reach master level.'
                    : 'Caution: Progression level has dropped. Skipped meals or missed tablets significantly jeopardize blood glucose stability.'}
                </p>

                {/* Micro stats banner */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3 text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Salad size={14} className="text-emerald-400" />
                    Food: {progression?.stats?.mealsTaken}/{progression?.stats?.mealsTotal} Taken
                    {progression?.stats?.mealsMissed > 0 && (
                      <span className="text-rose-400 font-black">({progression.stats.mealsMissed} Skipped)</span>
                    )}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="flex items-center gap-1.5">
                    <Pill size={14} className="text-teal-400" />
                    Tablets: {progression?.stats?.tabletsTaken}/{progression?.stats?.tabletsTotal} Taken
                    {progression?.stats?.tabletsMissed > 0 && (
                      <span className="text-rose-400 font-black">({progression.stats.tabletsMissed} Missed)</span>
                    )}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="flex items-center gap-1.5">
                    <Heart size={14} className="text-blue-400" />
                    Activity: {progression?.stats?.activityMinutes}/30 min ({progression?.stats?.activityPct}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quick Action Controls & Simulator */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800 pt-4 lg:pt-0 lg:pl-6">
              <button
                onClick={handleMarkAllTaken}
                className="btn-primary text-xs font-black py-2.5 px-4 shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles size={15} />
                <span>Mark All Taken (100% Master)</span>
              </button>

              <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                <RefreshCw size={12} className="text-teal-400" />
                <span>Test Progression Drop Scenarios:</span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleSimulateScenario('food-missed')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-amber-300 rounded border border-amber-600/30 cursor-pointer"
                  title="Simulate dinner not taken (-12% deduction)"
                >
                  Skip Food (-12%)
                </button>
                <button
                  onClick={() => handleSimulateScenario('tablet-missed')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-rose-300 rounded border border-rose-600/30 cursor-pointer"
                  title="Simulate evening tablet not taken (-15% deduction)"
                >
                  Miss Tablet (-15%)
                </button>
                <button
                  onClick={() => handleSimulateScenario('both-missed')}
                  className="px-2 py-1 bg-slate-800 hover:bg-rose-950 text-[10px] font-bold text-rose-400 rounded border border-rose-600/50 cursor-pointer"
                  title="Simulate severe non-adherence (<40% level)"
                >
                  Both Missed (&lt;40%)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Active Deductions Alert Banner (When Food or Tablet is NOT TAKEN) ── */}
        {deductions.filter(d => d.type === 'meal' || d.type === 'tablet').length > 0 && (
          <div className="bg-rose-50 border-t-2 border-b-2 border-rose-300 p-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-rose-950">
                    Progression Level Reduced: Unscheduled Missed Items Detected
                  </h3>
                  <div className="mt-1 space-y-1">
                    {deductions
                      .filter(d => d.type === 'meal' || d.type === 'tablet')
                      .map((d, idx) => (
                        <p key={idx} className="text-xs font-semibold text-rose-800">
                          <span className="font-black text-rose-900">• {d.item} ({d.penalty}):</span> {d.detail} — <em>{d.reason}</em>
                        </p>
                      ))}
                  </div>
                </div>
              </div>
              <button
                onClick={handleMarkAllTaken}
                className="btn-outline btn-sm border-rose-300 bg-white hover:bg-rose-100 text-rose-900 font-extrabold shrink-0 cursor-pointer"
              >
                <span>Restore & Mark Taken</span>
                <CheckCircle2 size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── 3 Progression Pillar Columns (Food, Tablet, Activity) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-white">
          {/* Pillar 1: Food Intake Progression */}
          <div className="p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
                    <Salad size={17} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-950">Food & Meals Progression</h3>
                    <p className="text-[11px] font-semibold text-slate-600">30% Total Progression</p>
                  </div>
                </div>
                <Badge variant={progression?.stats?.mealsMissed > 0 ? 'danger' : 'success'}>
                  {progression?.stats?.mealsTaken}/{progression?.stats?.mealsTotal} Taken
                </Badge>
              </div>

              {/* Meal item toggles */}
              <div className="space-y-2 mt-2">
                {(progression.meals || []).map(m => (
                  <div
                    key={m.id}
                    className={`p-2.5 rounded-xl border transition-all ${
                      m.taken === true
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : m.taken === false
                        ? 'bg-rose-50 border-rose-300 shadow-xs'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-slate-950 truncate">
                          {m.type}: <span className="font-semibold text-slate-700">{m.label}</span>
                        </p>
                        <p className="text-[10px] font-medium text-slate-500">
                          {m.time} • {m.calories} kcal
                        </p>
                      </div>

                      {/* Interactive Taken / Not Taken buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleToggleMeal(m.id, true)}
                          className={`p-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                            m.taken === true
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                          title="Mark Food Taken (+10% progression)"
                        >
                          <Check size={13} />
                          <span className="hidden sm:inline">Taken</span>
                        </button>
                        <button
                          onClick={() => handleToggleMeal(m.id, false)}
                          className={`p-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                            m.taken === false
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-white hover:bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                          title="Mark Food NOT Taken (Reduces progression level!)"
                        >
                          <X size={13} />
                          <span className="hidden sm:inline">Not Taken</span>
                        </button>
                      </div>
                    </div>

                    {m.taken === false && (
                      <p className="text-[10px] font-bold text-rose-700 mt-1.5 flex items-center gap-1">
                        <AlertTriangle size={11} />
                        Progression reduced by -12% (Missing food causes hypoglycemia)
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
              <span>Rule: Skipping meals penalizes level</span>
              <button
                onClick={() => { setFormType('meal'); setEditing(null); setShowForm(true); }}
                className="font-bold text-teal-800 hover:underline cursor-pointer"
              >
                + Log Custom Meal
              </button>
            </div>
          </div>

          {/* Pillar 2: Tablet / Medication Progression */}
          <div className="p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold">
                    <Pill size={17} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-950">Prescription Tablet Progression</h3>
                    <p className="text-[11px] font-semibold text-slate-600">40% Total Progression</p>
                  </div>
                </div>
                <Badge variant={progression?.stats?.tabletsMissed > 0 ? 'danger' : 'primary'}>
                  {progression?.stats?.tabletsTaken}/{progression?.stats?.tabletsTotal} Taken
                </Badge>
              </div>

              {/* Tablet item toggles */}
              <div className="space-y-2 mt-2">
                {(progression.tablets || []).map(t => (
                  <div
                    key={t.id}
                    className={`p-2.5 rounded-xl border transition-all ${
                      t.taken === true
                        ? 'bg-teal-50/60 border-teal-200'
                        : t.taken === false
                        ? 'bg-rose-50 border-rose-300 shadow-xs'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-slate-950 truncate">
                          {t.slot}: <span className="font-bold text-teal-900">{t.name}</span>
                        </p>
                        <p className="text-[10px] font-medium text-slate-500">
                          {t.time} • Dose: {t.dose}
                        </p>
                      </div>

                      {/* Interactive Taken / Not Taken buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleToggleTablet(t.id, true)}
                          className={`p-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                            t.taken === true
                              ? 'bg-teal-800 text-white shadow-xs'
                              : 'bg-white hover:bg-teal-100 text-teal-850 border border-teal-300'
                          }`}
                          title="Mark Tablet Taken (+15% progression)"
                        >
                          <Check size={13} />
                          <span className="hidden sm:inline">Taken</span>
                        </button>
                        <button
                          onClick={() => handleToggleTablet(t.id, false)}
                          className={`p-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                            t.taken === false
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-white hover:bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                          title="Mark Tablet NOT Taken (Reduces progression level!)"
                        >
                          <X size={13} />
                          <span className="hidden sm:inline">Not Taken</span>
                        </button>
                      </div>
                    </div>

                    {t.taken === false && (
                      <p className="text-[10px] font-bold text-rose-700 mt-1.5 flex items-center gap-1">
                        <AlertTriangle size={11} />
                        Progression reduced by -15% (Missing tablets triggers glucose spikes)
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
              <span>Take with meals as prescribed</span>
              <span className="font-semibold text-slate-800">Critical Factor</span>
            </div>
          </div>

          {/* Pillar 3: Physical Activity Progression (Directly resolving 2nd screenshot!) */}
          <div className="p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
                    <Heart size={17} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-950">Activity Progression</h3>
                    <p className="text-[11px] font-semibold text-slate-600">20% Total Progression</p>
                  </div>
                </div>
                <Badge variant={progression?.stats?.activityMinutes >= 30 ? 'success' : 'secondary'}>
                  {progression?.stats?.activityMinutes >= 30 ? 'Goal Met (100%)' : `${progression?.stats?.activityPct}%`}
                </Badge>
              </div>

              {/* Activity Display & Gauge */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-2xl font-black text-slate-950">
                    {progression?.stats?.activityMinutes || 0} <span className="text-xs font-bold text-slate-600">min</span>
                  </span>
                  <span className="text-xs font-extrabold text-blue-800">
                    Target: 30 min active
                  </span>
                </div>

                {/* Animated Horizontal Progress Bar */}
                <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      progression?.stats?.activityMinutes >= 30
                        ? 'bg-gradient-to-r from-blue-600 to-emerald-500'
                        : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(100, progression?.stats?.activityPct || 0)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-500 mt-1">
                  <span>0m (Sedentary)</span>
                  <span>15m (Moderate)</span>
                  <span>30m (Target Met)</span>
                </div>

                {/* Quick Add Minutes Buttons */}
                <div className="grid grid-cols-4 gap-1.5 mt-3">
                  <button
                    onClick={() => handleSetActivityMinutes((progression.activityMinutes || 0) + 10)}
                    className="py-1 px-1.5 bg-white hover:bg-blue-50 border border-slate-300 rounded-lg text-center text-xs font-extrabold text-slate-900 cursor-pointer hover:border-blue-400 transition"
                  >
                    +10m
                  </button>
                  <button
                    onClick={() => handleSetActivityMinutes((progression.activityMinutes || 0) + 15)}
                    className="py-1 px-1.5 bg-white hover:bg-blue-50 border border-slate-300 rounded-lg text-center text-xs font-extrabold text-slate-900 cursor-pointer hover:border-blue-400 transition"
                  >
                    +15m
                  </button>
                  <button
                    onClick={() => handleSetActivityMinutes(30)}
                    className="py-1 px-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-lg text-center text-xs font-black text-blue-900 cursor-pointer transition"
                  >
                    30m (Max)
                  </button>
                  <button
                    onClick={() => handleSetActivityMinutes(0)}
                    className="py-1 px-1.5 bg-white hover:bg-rose-50 border border-slate-200 rounded-lg text-center text-[10px] font-bold text-rose-700 cursor-pointer transition"
                  >
                    Reset 0m
                  </button>
                </div>
              </div>

              {/* Glucose Tracking Micro Bar */}
              <div className="mt-2.5 p-2.5 rounded-xl border border-teal-200 bg-teal-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets size={14} className="text-teal-700" />
                  <span className="text-xs font-bold text-slate-900">Fasting Glucose Checked</span>
                </div>
                <button
                  onClick={handleToggleGlucose}
                  className={`px-2 py-0.5 rounded text-[11px] font-black cursor-pointer transition ${
                    progression.glucoseChecked
                      ? 'bg-teal-800 text-white'
                      : 'bg-white text-teal-800 border border-teal-300'
                  }`}
                >
                  {progression.glucoseChecked ? '✓ 118 mg/dL (+10%)' : 'Click to Log'}
                </button>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 text-[11px] text-slate-600 flex justify-between items-center">
              <span>Enhances muscle insulin uptake</span>
              <span className="font-bold text-blue-800">+20% points</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* ── TAB 1: Today's Progression & Chronological Health Timeline ── */}
      {activeTab === 'timeline' && (
        <div className="card border border-slate-200 shadow-sm">
          <div className="card-header p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-extrabold text-slate-950 text-base">
                Today's Chronological Health Timeline & Progression Events
              </h3>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">
                Full chronological schedule of nutrition, medication titration, physical movement, and vitals
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                Score: <span className="text-teal-850 font-black">{score}%</span> (Level {level})
              </span>
            </div>
          </div>

          <div className="card-body p-4 sm:p-6 space-y-3">
            {/* Timeline Item 1: Fasting Glucose */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white border border-teal-200 hover:border-teal-400 transition shadow-xs">
              <div className="text-xs font-extrabold text-slate-700 w-16 shrink-0">07:30 AM</div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border text-teal-800 bg-teal-50 border-teal-200">
                <Droplets size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold text-slate-950">Fasting Blood Glucose Check</p>
                <p className="text-xs font-semibold text-slate-600">Self-monitoring: 118 mg/dL (Target: 80 - 130 mg/dL)</p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <Badge variant={progression.glucoseChecked ? 'success' : 'secondary'}>
                  {progression.glucoseChecked ? '✓ Completed (+10%)' : 'Pending'}
                </Badge>
              </div>
            </div>

            {/* Timeline Item 2: Morning Tablet */}
            <div className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition shadow-xs ${
              progression.tablets?.[0]?.taken === true
                ? 'bg-white border-teal-200'
                : progression.tablets?.[0]?.taken === false
                ? 'bg-rose-50/80 border-rose-300'
                : 'bg-white border-slate-200'
            }`}>
              <div className="text-xs font-extrabold text-slate-700 w-16 shrink-0">08:00 AM</div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border text-teal-800 bg-teal-50 border-teal-200">
                <Pill size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-extrabold text-slate-950">Prescription Dose: Metformin 500mg</p>
                  {progression.tablets?.[0]?.taken === false && (
                    <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                      Progression Reduced (-15%)
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-600">Take with breakfast • Oral • Once daily</p>
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                <button
                  onClick={() => handleToggleTablet(progression.tablets?.[0]?.id, true)}
                  className={`btn-sm text-xs font-bold ${progression.tablets?.[0]?.taken === true ? 'btn-primary' : 'btn-outline'}`}
                >
                  <Check size={13} />
                  <span>Taken</span>
                </button>
                <button
                  onClick={() => handleToggleTablet(progression.tablets?.[0]?.id, false)}
                  className={`btn-sm text-xs font-bold ${progression.tablets?.[0]?.taken === false ? 'bg-rose-600 text-white' : 'btn-outline text-rose-700 border-rose-200'}`}
                >
                  <X size={13} />
                  <span>Not Taken</span>
                </button>
              </div>
            </div>

            {/* Timeline Item 3: Breakfast */}
            <div className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition shadow-xs ${
              progression.meals?.[0]?.taken === true
                ? 'bg-white border-emerald-200'
                : progression.meals?.[0]?.taken === false
                ? 'bg-rose-50/80 border-rose-300'
                : 'bg-white border-slate-200'
            }`}>
              <div className="text-xs font-extrabold text-slate-700 w-16 shrink-0">08:30 AM</div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border text-emerald-800 bg-emerald-50 border-emerald-200">
                <Salad size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-extrabold text-slate-950">Diabetic Breakfast (Low Glycemic Index)</p>
                  {progression.meals?.[0]?.taken === false && (
                    <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                      Progression Reduced (-12%)
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-600">Oats with chia seeds, 2 boiled egg whites, green tea (340 kcal)</p>
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                <button
                  onClick={() => handleToggleMeal(progression.meals?.[0]?.id, true)}
                  className={`btn-sm text-xs font-bold ${progression.meals?.[0]?.taken === true ? 'btn-primary' : 'btn-outline'}`}
                >
                  <Check size={13} />
                  <span>Taken</span>
                </button>
                <button
                  onClick={() => handleToggleMeal(progression.meals?.[0]?.id, false)}
                  className={`btn-sm text-xs font-bold ${progression.meals?.[0]?.taken === false ? 'bg-rose-600 text-white' : 'btn-outline text-rose-700 border-rose-200'}`}
                >
                  <X size={13} />
                  <span>Not Taken</span>
                </button>
              </div>
            </div>

            {/* Timeline Item 4: Lunch */}
            <div className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition shadow-xs ${
              progression.meals?.[1]?.taken === true
                ? 'bg-white border-emerald-200'
                : progression.meals?.[1]?.taken === false
                ? 'bg-rose-50/80 border-rose-300'
                : 'bg-white border-slate-200'
            }`}>
              <div className="text-xs font-extrabold text-slate-700 w-16 shrink-0">01:15 PM</div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border text-emerald-800 bg-emerald-50 border-emerald-200">
                <Salad size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-extrabold text-slate-950">Diabetic Balanced Lunch</p>
                  {progression.meals?.[1]?.taken === false && (
                    <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                      Progression Reduced (-12%)
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-600">Brown rice, yellow dal, steamed palak greens, fresh cucumber salad (480 kcal)</p>
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                <button
                  onClick={() => handleToggleMeal(progression.meals?.[1]?.id, true)}
                  className={`btn-sm text-xs font-bold ${progression.meals?.[1]?.taken === true ? 'btn-primary' : 'btn-outline'}`}
                >
                  <Check size={13} />
                  <span>Taken</span>
                </button>
                <button
                  onClick={() => handleToggleMeal(progression.meals?.[1]?.id, false)}
                  className={`btn-sm text-xs font-bold ${progression.meals?.[1]?.taken === false ? 'bg-rose-600 text-white' : 'btn-outline text-rose-700 border-rose-200'}`}
                >
                  <X size={13} />
                  <span>Not Taken</span>
                </button>
              </div>
            </div>

            {/* Timeline Item 5: Physical Activity */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white border border-blue-200 hover:border-blue-400 transition shadow-xs">
              <div className="text-xs font-extrabold text-slate-700 w-16 shrink-0">05:30 PM</div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border text-blue-800 bg-blue-50 border-blue-200">
                <Heart size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold text-slate-950">Daily Physical Activity Walk</p>
                <p className="text-xs font-semibold text-slate-600">
                  Logged: <strong className="text-blue-900">{progression.activityMinutes || 0} / 30 min</strong> active
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                <button
                  onClick={() => handleSetActivityMinutes(30)}
                  className="btn-outline btn-sm font-black text-blue-900 border-blue-300 hover:bg-blue-50 cursor-pointer"
                >
                  <span>Complete 30m</span>
                </button>
              </div>
            </div>

            {/* Timeline Item 6: Evening Tablet */}
            <div className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition shadow-xs ${
              progression.tablets?.[2]?.taken === true
                ? 'bg-white border-teal-200'
                : progression.tablets?.[2]?.taken === false
                ? 'bg-rose-50/80 border-rose-300'
                : 'bg-white border-slate-200'
            }`}>
              <div className="text-xs font-extrabold text-slate-700 w-16 shrink-0">08:00 PM</div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border text-teal-800 bg-teal-50 border-teal-200">
                <Pill size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-extrabold text-slate-950">Prescription Dose: Glimepiride 1mg</p>
                  {progression.tablets?.[2]?.taken === false && (
                    <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                      Progression Reduced (-15%)
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-600">Take 30 mins before dinner • Stimulates nocturnal insulin release</p>
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                <button
                  onClick={() => handleToggleTablet(progression.tablets?.[2]?.id, true)}
                  className={`btn-sm text-xs font-bold ${progression.tablets?.[2]?.taken === true ? 'btn-primary' : 'btn-outline'}`}
                >
                  <Check size={13} />
                  <span>Taken</span>
                </button>
                <button
                  onClick={() => handleToggleTablet(progression.tablets?.[2]?.id, false)}
                  className={`btn-sm text-xs font-bold ${progression.tablets?.[2]?.taken === false ? 'bg-rose-600 text-white' : 'btn-outline text-rose-700 border-rose-200'}`}
                >
                  <X size={13} />
                  <span>Not Taken</span>
                </button>
              </div>
            </div>

            {/* Timeline Item 7: Dinner */}
            <div className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition shadow-xs ${
              progression.meals?.[2]?.taken === true
                ? 'bg-white border-emerald-200'
                : progression.meals?.[2]?.taken === false
                ? 'bg-rose-50/80 border-rose-300'
                : 'bg-white border-slate-200'
            }`}>
              <div className="text-xs font-extrabold text-slate-700 w-16 shrink-0">08:30 PM</div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border text-emerald-800 bg-emerald-50 border-emerald-200">
                <Salad size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-extrabold text-slate-950">High Fiber Light Dinner</p>
                  {progression.meals?.[2]?.taken === false && (
                    <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                      Progression Reduced (-12%)
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-600">Grilled paneer salad, 1 multigrain roti, steamed broccoli (420 kcal)</p>
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                <button
                  onClick={() => handleToggleMeal(progression.meals?.[2]?.id, true)}
                  className={`btn-sm text-xs font-bold ${progression.meals?.[2]?.taken === true ? 'btn-primary' : 'btn-outline'}`}
                >
                  <Check size={13} />
                  <span>Taken</span>
                </button>
                <button
                  onClick={() => handleToggleMeal(progression.meals?.[2]?.id, false)}
                  className={`btn-sm text-xs font-bold ${progression.meals?.[2]?.taken === false ? 'bg-rose-600 text-white' : 'btn-outline text-rose-700 border-rose-200'}`}
                >
                  <X size={13} />
                  <span>Not Taken</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'meals' && (
        <EntryTable
          entries={entries.filter(e => e.type === 'meal')}
          columns={['Date & Time', 'Meal Type', 'Food Items Consumed', 'Est. Calories', 'Dietary Notes']}
          renderRow={e => [formatDateTime(e.date), e.mealType, e.items, e.calories ? `${e.calories} kcal` : '—', e.notes || '—']}
          onEdit={e => { setFormType('meal'); setEditing(e); setShowForm(true); }}
          onDelete={setDeleteTarget}
        />
      )}

      {activeTab === 'activity' && (
        <EntryTable
          entries={entries.filter(e => e.type === 'activity')}
          columns={['Date & Time', 'Exercise Type', 'Duration', 'Session Notes']}
          renderRow={e => [formatDateTime(e.date), e.activityType, `${e.duration} min`, e.notes || '—']}
          onEdit={e => { setFormType('activity'); setEditing(e); setShowForm(true); }}
          onDelete={setDeleteTarget}
        />
      )}

      {activeTab === 'sleep' && (
        <EntryTable
          entries={entries.filter(e => e.type === 'sleep')}
          columns={['Date', 'Sleep Duration', 'Sleep Quality Notes']}
          renderRow={e => [formatDate(e.date), `${e.duration?.toFixed(1)} hrs`, e.notes || '—']}
          onEdit={e => { setFormType('sleep'); setEditing(e); setShowForm(true); }}
          onDelete={setDeleteTarget}
        />
      )}

      {activeTab === 'vitals' && (
        <EntryTable
          entries={entries.filter(e => e.type === 'blood_pressure' || e.type === 'weight')}
          columns={['Date', 'Vital Metric', 'Recorded Value', 'Measurement Notes']}
          renderRow={e => [formatDate(e.date), e.type === 'blood_pressure' ? 'Blood Pressure' : 'Body Weight', e.type === 'blood_pressure' ? `${e.systolic}/${e.diastolic} mmHg` : `${e.value?.toFixed(1)} ${e.unit}`, e.notes || '—']}
          onEdit={e => { setFormType(e.type); setEditing(e); setShowForm(true); }}
          onDelete={setDeleteTarget}
        />
      )}

      {activeTab === 'weekly' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card card-body text-center border border-slate-200">
            <p className="text-3xl font-black text-teal-850">{weeklySummary.totalActivity}</p>
            <p className="text-xs font-bold text-slate-700 mt-1 uppercase tracking-wide">Minutes Active</p>
          </div>
          <div className="card card-body text-center border border-slate-200">
            <p className="text-3xl font-black text-purple-700">{weeklySummary.avgSleep}</p>
            <p className="text-xs font-bold text-slate-700 mt-1 uppercase tracking-wide">Avg Sleep (hrs/night)</p>
          </div>
          <div className="card card-body text-center border border-slate-200">
            <p className="text-3xl font-black text-emerald-700">{weeklySummary.mealCount}</p>
            <p className="text-xs font-bold text-slate-700 mt-1 uppercase tracking-wide">Meals Documented</p>
          </div>
          <div className="card card-body text-center border border-slate-200">
            <p className="text-3xl font-black text-blue-700">{weeklySummary.activityDays}/7</p>
            <p className="text-xs font-bold text-slate-700 mt-1 uppercase tracking-wide">Active Days / Week</p>
          </div>
          <div className="col-span-full card card-body border border-slate-200 bg-slate-50">
            <p className="text-xs font-semibold text-slate-700">
              Clinical note: This summary correlates lifestyle and physical activity habits. Discuss trends with your diabetes educator or physician during regular consultations.
            </p>
          </div>
        </div>
      )}

      <HealthEntryForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSave={handleSave}
        type={formType}
        entry={editing}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Entry?"
        message="This entry will be permanently deleted from your health records."
        confirmText="Delete"
      />
    </div>
  );
}

function EntryTable({ entries, columns, renderRow, onEdit, onDelete }) {
  return (
    <div className="card border border-slate-200 shadow-xs">
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(c => <th key={c} className="font-bold text-slate-950">{c}</th>)}
              <th className="font-bold text-slate-950">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="text-center py-8 text-slate-600 font-semibold text-xs">
                  No records logged in this category
                </td>
              </tr>
            ) : (
              entries.slice(0, 50).map(e => {
                const cells = renderRow(e);
                return (
                  <tr key={e.id}>
                    {cells.map((c, i) => (
                      <td key={i} className={`text-sm ${i === 0 ? 'font-bold text-slate-950 whitespace-nowrap' : 'font-medium text-slate-900'}`}>{c}</td>
                    ))}
                    <td>
                      <div className="flex gap-1.5">
                        <button onClick={() => onEdit(e)} className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer text-slate-800" title="Edit"><Edit size={14} /></button>
                        <button onClick={() => onDelete(e)} className="p-1.5 hover:bg-rose-50 rounded-lg cursor-pointer text-rose-700" title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HealthEntryForm({ open, onClose, onSave, type, entry }) {
  const [form, setForm] = useState({});
  useEffect(() => {
    if (open) {
      if (entry) setForm({ ...entry }); else {
        const base = { date: new Date().toISOString().slice(0, 16), notes: '' };
        if (type === 'meal') Object.assign(base, { mealType: 'Breakfast', items: '', calories: '' });
        else if (type === 'activity') Object.assign(base, { activityType: 'Walking', duration: 30 });
        else if (type === 'sleep') Object.assign(base, { duration: 7 });
        else if (type === 'weight') Object.assign(base, { value: '', unit: 'kg' });
        else if (type === 'blood_pressure') Object.assign(base, { systolic: '', diastolic: '' });
        setForm(base);
      }
    }
  }, [open, type, entry]);

  const handleSubmit = () => onSave({ ...form, type, date: new Date(form.date).toISOString() });

  return (
    <Modal open={open} onClose={onClose} title={`${entry ? 'Edit' : 'Add'} ${type.replace('_', ' ')}`} size="sm"
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={handleSubmit}>Save</button></>}>
      <div className="space-y-3">
        <div><label className="label">Date & Time</label><input type="datetime-local" className="input" value={form.date?.slice(0, 16) || ''} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
        {type === 'meal' && (<><div><label className="label">Meal</label><select className="input" value={form.mealType || ''} onChange={e => setForm({ ...form, mealType: e.target.value })}><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option></select></div><div><label className="label">Items</label><input className="input" value={form.items || ''} onChange={e => setForm({ ...form, items: e.target.value })} /></div><div><label className="label">Calories (est.)</label><input type="number" className="input" value={form.calories || ''} onChange={e => setForm({ ...form, calories: +e.target.value })} /></div></>)}
        {type === 'activity' && (<><div><label className="label">Activity Type</label><select className="input" value={form.activityType || ''} onChange={e => setForm({ ...form, activityType: e.target.value })}><option>Walking</option><option>Yoga</option><option>Cycling</option><option>Swimming</option><option>Light exercises</option><option>Running</option></select></div><div><label className="label">Duration (min)</label><input type="number" className="input" value={form.duration || ''} onChange={e => setForm({ ...form, duration: +e.target.value })} /></div></>)}
        {type === 'sleep' && <div><label className="label">Duration (hours)</label><input type="number" step="0.5" className="input" value={form.duration || ''} onChange={e => setForm({ ...form, duration: +e.target.value })} /></div>}
        {type === 'weight' && <div><label className="label">Weight (kg)</label><input type="number" step="0.1" className="input" value={form.value || ''} onChange={e => setForm({ ...form, value: +e.target.value })} /></div>}
        {type === 'blood_pressure' && (<div className="grid grid-cols-2 gap-3"><div><label className="label">Systolic</label><input type="number" className="input" value={form.systolic || ''} onChange={e => setForm({ ...form, systolic: +e.target.value })} /></div><div><label className="label">Diastolic</label><input type="number" className="input" value={form.diastolic || ''} onChange={e => setForm({ ...form, diastolic: +e.target.value })} /></div></div>)}
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
    </Modal>
  );
}
