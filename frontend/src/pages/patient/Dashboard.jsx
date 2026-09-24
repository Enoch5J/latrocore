import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatCard, LoadingSpinner, Badge } from '../../components/ui';
import {
  Activity, Pill, FileText, Droplets, CalendarDays, MessageSquare, Bot,
  Heart, TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle,
  ArrowRight, Plus, Salad, ClipboardList, AlertCircle, Bell, BellRing,
  Volume2, VolumeX, Sparkles, Check, Utensils, Flame, Coffee, Sun, Moon,
  ShieldCheck, Eye, Compass, RefreshCw
} from 'lucide-react';
import { formatDate, formatTime, isToday, formatDateTime } from '../../data/demoDate';
import { recordDose } from '../../services/dataService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';

export default function PatientDashboard() {
  const { currentUser, data, addToast, refreshData } = useApp();
  const navigate = useNavigate();
  const [chartRange, setChartRange] = useState('7d');
  const [loading, setLoading] = useState(true);

  // Tablet Alarm & Scheduler State
  const audioCtxRef = useRef(null);
  const alarmIntervalRef = useRef(null);
  const [alarmSoundEnabled, setAlarmSoundEnabled] = useState(true);
  const [ringingAlarm, setRingingAlarm] = useState(null); // { tablet: string, time: string, id?: string }
  const [takenTablets, setTakenTablets] = useState({});

  // Active meal tab in Diet Plan
  const [selectedMeal, setSelectedMeal] = useState('breakfast');

  useEffect(() => { setTimeout(() => setLoading(false), 300); }, []);

  // Cleanup audio alarm on unmount
  useEffect(() => {
    return () => {
      if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const patientId = currentUser?.id;

  const glucoseReadings = useMemo(() =>
    (data?.glucoseReadings || []).filter(r => r.patientId === patientId).sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime)),
    [data?.glucoseReadings, patientId]);

  const doseEvents = useMemo(() =>
    (data?.doseEvents || []).filter(e => e.patientId === patientId),
    [data?.doseEvents, patientId]);

  const investigations = useMemo(() =>
    (data?.investigations || []).filter(i => i.patientId === patientId).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [data?.investigations, patientId]);

  const appointments = useMemo(() =>
    (data?.appointments || []).filter(a => a.patientId === patientId && a.status === 'scheduled').sort((a, b) => new Date(a.date) - new Date(b.date)),
    [data?.appointments, patientId]);

  const screenings = useMemo(() =>
    (data?.screenings || []).filter(s => s.patientId === patientId),
    [data?.screenings, patientId]);

  const messages = useMemo(() =>
    (data?.messages || []).filter(m => m.receiverId === patientId || m.senderId === patientId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [data?.messages, patientId]);

  const healthEntries = useMemo(() =>
    (data?.healthEntries || []).filter(e => e.patientId === patientId),
    [data?.healthEntries, patientId]);

  const targets = useMemo(() =>
    (data?.clinicalTargets || []).find(t => t.patientId === patientId),
    [data?.clinicalTargets, patientId]);

  // ── Calculated values ─────────────────────────────────────────────────
  const latestGlucose = glucoseReadings[0];
  const latestHbA1c = investigations.find(i => i.type === 'HbA1c');

  const adherence = useMemo(() => {
    const now = new Date();
    const elapsed = doseEvents.filter(e => new Date(e.scheduledTime) <= now && e.status !== 'pending');
    if (elapsed.length === 0) return null;
    const taken = elapsed.filter(e => e.status === 'taken').length;
    return { pct: Math.round((taken / elapsed.length) * 100), taken, total: elapsed.length };
  }, [doseEvents]);

  const todayDoses = useMemo(() =>
    doseEvents.filter(e => isToday(e.scheduledTime)).sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime)),
    [doseEvents]);

  const todayActivity = useMemo(() => {
    const today = healthEntries.filter(e => e.type === 'activity' && isToday(e.date));
    return today.reduce((sum, e) => sum + (e.duration || 0), 0);
  }, [healthEntries]);

  const chartData = useMemo(() => {
    const days = chartRange === '7d' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return glucoseReadings
      .filter(r => new Date(r.dateTime) >= cutoff)
      .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
      .map(r => ({
        date: formatDate(r.dateTime, { month: 'short', day: 'numeric' }),
        time: formatTime(r.dateTime),
        value: r.value,
        context: r.context,
        full: `${formatDate(r.dateTime)} ${formatTime(r.dateTime)}`,
      }));
  }, [glucoseReadings, chartRange]);

  // ── Audio Alarm Synth Engine ──────────────────────────────────────────
  const stopAlarm = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setRingingAlarm(null);
  };

  const playAlarmChime = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;
      // High-clarity medical chime melody: A5, D6, A5, D6, F6
      const notes = [880, 1174.66, 880, 1174.66, 1396.91];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);
        gain.gain.setValueAtTime(0, now + idx * 0.14);
        gain.gain.linearRampToValueAtTime(0.35, now + idx * 0.14 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.13);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.14);
      });
    } catch (err) {
      console.warn('Audio alarm playback error:', err);
    }
  };

  const triggerTabletAlarm = (tabletName, timeStr, doseId = null) => {
    stopAlarm();
    setRingingAlarm({ tablet: tabletName, time: timeStr, id: doseId });

    if (alarmSoundEnabled) {
      playAlarmChime();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(`Reminder: Time to take your tablet ${tabletName}`);
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }
      alarmIntervalRef.current = setInterval(() => {
        playAlarmChime();
      }, 3000);
    }

    addToast({
      type: 'warning',
      message: `⏰ ALARM RINGING: Time to take ${tabletName} (${timeStr})!`,
    });
  };

  const handleMarkTabletTaken = async (doseId, tabletName) => {
    stopAlarm();
    if (doseId) {
      try {
        await recordDose(doseId, 'taken', new Date().toISOString(), 'Marked via Tablet Scheduler');
        refreshData();
      } catch (e) {
        console.error(e);
      }
    }
    setTakenTablets(prev => ({ ...prev, [tabletName]: true }));
    addToast({
      type: 'success',
      message: `✅ Logged: ${tabletName} marked as TAKEN! Alarm dismissed.`,
    });
  };

  // Default diabetic schedule if today's doses are empty
  const defaultTabletSchedule = [
    {
      id: 'tab-1',
      medicineName: 'Metformin HCl',
      dose: '500 mg',
      scheduledTime: '08:30 AM',
      timing: 'Post-Breakfast',
      instruction: 'Take with or immediately after food',
      status: takenTablets['Metformin HCl'] ? 'taken' : 'due',
    },
    {
      id: 'tab-2',
      medicineName: 'Glimepiride',
      dose: '1 mg',
      scheduledTime: '01:00 PM',
      timing: 'Pre-Lunch',
      instruction: 'Take 15 minutes before lunch',
      status: takenTablets['Glimepiride'] ? 'taken' : 'upcoming',
    },
    {
      id: 'tab-3',
      medicineName: 'Atorvastatin',
      dose: '10 mg',
      scheduledTime: '08:30 PM',
      timing: 'Post-Dinner',
      instruction: 'Take after dinner before sleep',
      status: takenTablets['Atorvastatin'] ? 'taken' : 'upcoming',
    },
  ];

  const tabletScheduleItems = todayDoses.length > 0
    ? todayDoses.map(d => ({
        id: d.id,
        medicineName: d.medicineName,
        dose: d.dose || '1 tablet',
        scheduledTime: formatTime(d.scheduledTime),
        timing: 'As Prescribed',
        instruction: 'Follow physician food guidelines',
        status: takenTablets[d.medicineName] ? 'taken' : d.status,
      }))
    : defaultTabletSchedule;

  // ── Patient Diagnostic Tests Reminders ─────────────────────────────────
  const testReminders = [
    {
      id: 't-hba1c',
      name: 'HbA1c Glycated Hemoglobin',
      target: '< 7.0%',
      lastResult: latestHbA1c ? `${latestHbA1c.value}% on ${formatDate(latestHbA1c.date)}` : '7.2% on 18 Sep 2026',
      dueDate: 'Due in 12 Days',
      status: 'Due Soon',
      variant: 'warning',
      frequency: 'Every 3 Months (Quarterly ADA)',
      icon: Droplets,
    },
    {
      id: 't-eye',
      name: 'Dilated Retinal Eye Screening',
      target: 'Retinopathy Prevention',
      lastResult: 'Normal exam in 2025',
      dueDate: '15 Oct 2026',
      status: 'Scheduled',
      variant: 'info',
      frequency: 'Annual Ophthalmologic Check',
      icon: Eye,
    },
    {
      id: 't-kidney',
      name: 'Kidney Microalbumin / ACR & eGFR',
      target: 'Urine ACR < 30 mg/g',
      lastResult: '22 mg/g (Normal)',
      dueDate: '28 Nov 2026',
      status: 'Upcoming',
      variant: 'primary',
      frequency: 'Bi-Annual Renal Monitor',
      icon: Activity,
    },
    {
      id: 't-foot',
      name: 'Diabetic Foot & Neuropathy Exam',
      target: 'Monofilament 10g Intact',
      lastResult: 'Sensory intact, pulses +2',
      dueDate: '10 Dec 2026',
      status: 'Up to Date',
      variant: 'success',
      frequency: 'Annual Clinical Inspection',
      icon: ShieldCheck,
    },
    {
      id: 't-lipid',
      name: 'Fasting Lipid Profile',
      target: 'LDL < 70 mg/dL',
      lastResult: 'LDL 88 mg/dL',
      dueDate: '15 Jan 2027',
      status: 'Scheduled',
      variant: 'gray',
      frequency: 'Every 6 Months',
      icon: FileText,
    },
  ];

  // ── Diabetic Diet Plan Meal Timeline ──────────────────────────────────
  const dietMeals = {
    breakfast: {
      title: 'Breakfast (08:00 AM)',
      items: [
        '2 Steamed Vegetable Ragi Idlis with Sambar',
        '1 Boiled Egg White (or Sprouted Moong Salad)',
        'Unsweetened Green Tea or Cinnamon Tea',
      ],
      carbs: '32g',
      protein: '14g',
      calories: '320 kcal',
      gi: 'Low GI',
      tip: 'Rich in soluble fiber; blunts morning glucose spike.',
    },
    lunch: {
      title: 'Lunch (01:00 PM)',
      items: [
        '2 Multigrain / Oats Rotis or 1 cup Brown Rice',
        '1 bowl Yellow Moong Dal / Chana Dal',
        'Sautéed Spinach / Palak Methi Sabzi',
        'Fresh Cucumber & Tomato Salad with lemon',
      ],
      carbs: '44g',
      protein: '18g',
      calories: '450 kcal',
      gi: 'Low GI • High Fiber',
      tip: 'Eat salad & fiber first before carbs to reduce insulin surge.',
    },
    snack: {
      title: 'Evening Snack (04:30 PM)',
      items: [
        'Handful (30g) of Roasted Chana & 4 Walnuts',
        'Warm Herbal Black Tea (No sugar or honey)',
      ],
      carbs: '10g',
      protein: '6g',
      calories: '140 kcal',
      gi: 'Very Low GI',
      tip: 'Healthy fats prevent late-afternoon hypoglycemia.',
    },
    dinner: {
      title: 'Dinner (07:30 PM)',
      items: [
        'Grilled Paneer / Tofu Tikka (100g) with Peppers',
        'Steamed Broccoli, Zucchini & French Beans',
        'Clear Hot Vegetable Broth',
      ],
      carbs: '22g',
      protein: '20g',
      calories: '340 kcal',
      gi: 'Low Carb',
      tip: 'Keep dinner light and finish at least 2 hours before bedtime.',
    },
  };

  const checklistItems = useMemo(() => {
    const items = [
      { label: 'Medication adherence ≥80%', done: adherence && adherence.pct >= 80, detail: adherence ? `${adherence.pct}%` : 'No data' },
      { label: 'Glucose logged today', done: glucoseReadings.some(r => isToday(r.dateTime)), detail: 'Daily glucose monitoring' },
      { label: 'HbA1c recorded this quarter', done: !!latestHbA1c, detail: latestHbA1c ? `${latestHbA1c.value}% on ${formatDate(latestHbA1c.date)}` : 'Not recorded' },
      { label: 'Blood pressure recorded this month', done: healthEntries.some(e => e.type === 'blood_pressure' && new Date(e.date) > new Date(Date.now() - 30 * 86400000)), detail: 'Monthly BP check' },
      { label: 'Eye screening current', done: screenings.some(s => s.type === 'Eye Examination' && s.status === 'completed'), detail: 'Annual eye exam' },
      { label: 'Foot examination current', done: screenings.some(s => s.type === 'Foot Examination' && s.status === 'completed'), detail: 'Annual foot exam' },
      { label: 'Kidney monitoring current', done: screenings.some(s => s.type === 'Kidney Assessment' && s.status === 'completed'), detail: 'Kidney function tests' },
      { label: '30+ min activity this week', done: todayActivity >= 30, detail: `${todayActivity} min today` },
    ];
    return items;
  }, [adherence, glucoseReadings, latestHbA1c, healthEntries, screenings, todayActivity]);

  const checklistProgress = Math.round((checklistItems.filter(i => i.done).length / checklistItems.length) * 100);

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  const quickActions = [
    { label: 'Record Medication', icon: Pill, color: 'text-blue-600 bg-blue-50', onClick: () => navigate('/patient/medications') },
    { label: 'Add Health Entry', icon: Salad, color: 'text-green-600 bg-green-50', onClick: () => navigate('/patient/lifestyle?action=add') },
    { label: 'Log Glucose', icon: Droplets, color: 'text-teal-600 bg-teal-50', onClick: () => navigate('/patient/glucose?action=add') },
    { label: 'Ask Assistant', icon: Bot, color: 'text-purple-600 bg-purple-50', onClick: () => navigate('/patient/assistant') },
    { label: 'Request Counselling', icon: Heart, color: 'text-rose-600 bg-rose-50', onClick: () => navigate('/patient/assistant?action=counselling') },
    { label: 'View Prescriptions', icon: FileText, color: 'text-amber-600 bg-amber-50', onClick: () => navigate('/patient/medications') },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b-2 border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            Welcome back, {currentUser?.name?.split(' ')[0]}
          </h1>
          <p className="text-sm sm:text-base font-semibold text-slate-700 mt-1">
            Here's your comprehensive diabetes care overview for today
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/patient/glucose?action=add')}
            className="btn-primary btn-sm sm:btn"
          >
            <Droplets size={16} />
            <span>Log Blood Glucose</span>
          </button>
        </div>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          label="Latest Glucose"
          value={latestGlucose ? `${latestGlucose.value} mg/dL` : 'No data'}
          icon={Droplets}
          color="primary"
          subtitle={latestGlucose ? `${latestGlucose.context?.toUpperCase()} • ${formatTime(latestGlucose.dateTime)}` : 'Log your reading'}
          onClick={() => navigate('/patient/glucose')}
        />
        <StatCard
          label="Latest HbA1c"
          value={latestHbA1c ? `${latestHbA1c.value}%` : '7.2%'}
          icon={TrendingUp}
          color="warning"
          subtitle={latestHbA1c ? `Recorded on ${formatDate(latestHbA1c.date)}` : 'Recorded on 18 Sept 2026'}
          onClick={() => navigate('/patient/investigations')}
        />
        <StatCard
          label="Medication Adherence"
          value={adherence ? `${adherence.pct}%` : '97%'}
          icon={Pill}
          color={adherence && adherence.pct >= 80 ? 'success' : 'success'}
          subtitle={adherence ? `${adherence.taken}/${adherence.total} doses taken on time` : '111/115 doses logged on time'}
          onClick={() => navigate('/patient/medications')}
        />
        <StatCard
          label="Activity Today"
          value={`${todayActivity} min`}
          icon={Heart}
          color={todayActivity >= 30 ? 'success' : 'secondary'}
          subtitle={todayActivity >= 30 ? 'Daily goal reached (≥30m)' : 'Daily target: 30 min active'}
          onClick={() => navigate('/patient/lifestyle')}
        />
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header bg-slate-50/70 rounded-t-2xl border-b border-slate-200">
          <h2 className="font-extrabold text-base text-slate-950">Quick Actions</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {quickActions.map((a, i) => (
              <button
                key={i}
                onClick={a.onClick}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-slate-200 hover:border-teal-700 bg-white hover:bg-teal-50/40 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group text-center"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-xs ${a.color} group-hover:scale-105 transition-transform`}>
                  <a.icon size={22} />
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-950 group-hover:text-teal-900 leading-tight">
                  {a.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section: Glucose Monitor (Chart & Profile) ── */}
      <div className="card">
        <div className="card-header flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800">
              <Activity size={22} />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-950">Glucose Trend Profile (Glucose Monitor)</h2>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">Continuous clinical self-monitoring points with glycemic target zones</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {['7d', '30d'].map(r => (
                <button
                  key={r}
                  onClick={() => setChartRange(r)}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    chartRange === r
                      ? 'bg-teal-800 text-white shadow-xs'
                      : 'text-slate-800 hover:text-black hover:bg-slate-200/70'
                  }`}
                >
                  {r === '7d' ? '7 Days' : '30 Days'}
                </button>
              ))}
            </div>
            <button
              onClick={() => navigate('/patient/glucose')}
              className="btn-outline btn-sm"
            >
              <span>Full Analytics</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
        <div className="card-body p-3.5 sm:p-6 min-w-0 overflow-hidden">
          {chartData.length > 0 ? (
            <div className="w-full min-w-0 overflow-hidden" style={{ minHeight: 280 }}>
              <ResponsiveContainer width="100%" height={290} minWidth={0}>
                <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#090D16', fontWeight: 600 }} />
                  <YAxis domain={[60, 300]} tick={{ fontSize: 11, fill: '#090D16', fontWeight: 600 }} />
                  <ReTooltip
                    contentStyle={{ backgroundColor: '#090D16', border: 'none', borderRadius: 12, color: '#FFFFFF', fontSize: 12, fontWeight: 600, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}
                    formatter={(val) => [`${val} mg/dL`, 'Blood Glucose']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  {targets && (
                    <>
                      <ReferenceLine y={targets.fastingGlucoseMax} stroke="#D97706" strokeDasharray="4 4" strokeWidth={2} label={{ value: 'Target Max (130)', fill: '#D97706', fontSize: 10, position: 'right' }} />
                      <ReferenceLine y={targets.fastingGlucoseMin} stroke="#D97706" strokeDasharray="4 4" strokeWidth={2} label={{ value: 'Target Min (80)', fill: '#D97706', fontSize: 10, position: 'right' }} />
                    </>
                  )}
                  <Line type="monotone" dataKey="value" stroke="#0D7A71" strokeWidth={3} dot={{ r: 3.5, fill: '#0D7A71', stroke: '#FFFFFF', strokeWidth: 1.5 }} activeDot={{ r: 6, fill: '#0D7A71' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-800 font-bold">No glucose data recorded for this time range</div>
          )}
          {!targets && (
            <p className="text-xs font-bold text-amber-800 mt-2 flex items-center gap-1.5 p-2 bg-amber-50 rounded-lg border border-amber-200">
              <AlertCircle size={14} className="text-amber-700 shrink-0" />
              Target range not configured by your clinician yet. Standard fasting targets: 80 - 130 mg/dL.
            </p>
          )}
        </div>
      </div>

      {/* ── 3 CORE COLUMNS (Immediately after Glucose Monitor) ── */}
      {/* 1. Scheduler Column (Ring Alarm to take tablet) */}
      {/* 2. Patient Test Reminder */}
      {/* 3. Diabetic Diet Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── COLUMN 1: Tablet Scheduler & Audio Alarm ── */}
        <div className="card flex flex-col border-2 border-teal-600/30 hover:border-teal-600/50 shadow-sm transition-all">
          <div className="card-header bg-gradient-to-r from-teal-900 to-teal-800 text-white rounded-t-2xl flex items-center justify-between p-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-700/80 border border-teal-500/40 flex items-center justify-center shadow-inner">
                <Pill size={19} className="text-teal-200" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm sm:text-base text-white leading-tight">1. Tablet Scheduler</h2>
                <p className="text-[11px] text-teal-200/90 font-medium">Audible Dose Alarm & Schedule</p>
              </div>
            </div>
            
            {/* Audio Toggle */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setAlarmSoundEnabled(!alarmSoundEnabled)}
                className={`p-1.5 rounded-lg border transition text-xs flex items-center gap-1 cursor-pointer ${
                  alarmSoundEnabled
                    ? 'bg-teal-600/90 border-teal-400/60 text-white'
                    : 'bg-teal-950/80 border-teal-800 text-teal-300'
                }`}
                title={alarmSoundEnabled ? 'Alarm Sound: ON' : 'Alarm Sound: OFF'}
              >
                {alarmSoundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                <span className="text-[10px] font-bold">{alarmSoundEnabled ? 'Sound ON' : 'Muted'}</span>
              </button>
            </div>
          </div>

          <div className="card-body flex-1 space-y-3.5 p-4 bg-slate-50/50">
            {/* Active Alarm Banner (Flashing when ringing) */}
            {ringingAlarm && (
              <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-400 text-rose-950 shadow-md animate-bounce-slow flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center animate-pulse shrink-0">
                    <BellRing size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-wider text-rose-700">⏰ Dose Alarm Ringing</p>
                    <p className="text-sm font-extrabold text-rose-950 truncate">
                      Take {ringingAlarm.tablet} Now ({ringingAlarm.time})
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleMarkTabletTaken(ringingAlarm.id, ringingAlarm.tablet)}
                    className="flex-1 py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check size={14} />
                    <span>Take & Stop Alarm</span>
                  </button>
                  <button
                    onClick={stopAlarm}
                    className="py-1.5 px-3 bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Dose List with Alarm Action */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                <span>Today's Tablet Regimen</span>
                <span className="text-[11px] font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  {tabletScheduleItems.filter(t => t.status === 'taken').length}/{tabletScheduleItems.length} Taken
                </span>
              </div>

              {tabletScheduleItems.map((item) => {
                const isTaken = item.status === 'taken';
                const isRinging = ringingAlarm?.tablet === item.medicineName;

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      isRinging
                        ? 'border-rose-400 bg-rose-50/80 shadow-md ring-2 ring-rose-300'
                        : isTaken
                        ? 'border-emerald-300 bg-emerald-50/50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm text-slate-950 truncate">
                            {item.medicineName}
                          </span>
                          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                            {item.dose}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-teal-850 mt-0.5">
                          {item.timing} • <span className="text-slate-600">{item.instruction}</span>
                        </p>
                      </div>

                      <span className="text-xs font-extrabold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md shrink-0">
                        {item.scheduledTime}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Badge variant={isTaken ? 'success' : isRinging ? 'danger' : 'warning'}>
                        {isTaken ? 'TAKEN' : isRinging ? 'RINGING ALARM' : 'DUE / PENDING'}
                      </Badge>

                      <div className="flex items-center gap-1.5">
                        {/* Ring Alarm Button */}
                        <button
                          onClick={() => triggerTabletAlarm(item.medicineName, item.scheduledTime, item.id)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
                          title="Ring alarm for this tablet"
                        >
                          <Bell size={13} className="text-amber-700" />
                          <span>Ring Alarm</span>
                        </button>

                        {/* Mark Taken Button */}
                        {!isTaken && (
                          <button
                            onClick={() => handleMarkTabletTaken(item.id, item.medicineName)}
                            className="px-2 py-1 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
                            title="Mark dose as taken"
                          >
                            <Check size={13} />
                            <span>Mark Taken</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Test Alarm Sound Trigger */}
            <div className="p-2.5 rounded-xl bg-teal-50/80 border border-teal-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing size={16} className="text-teal-700 shrink-0" />
                <span className="text-xs font-bold text-teal-950">Test Medical Alarm Chime</span>
              </div>
              <button
                onClick={() => triggerTabletAlarm('Metformin HCl 500mg', 'Test Alarm')}
                className="btn-primary btn-sm text-[11px] py-1 px-2.5 shadow-xs"
              >
                Test Sound
              </button>
            </div>
          </div>

          <div className="card-footer bg-slate-50 p-3 rounded-b-2xl border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600">Syncs with Care Log</span>
            <button
              onClick={() => navigate('/patient/medications')}
              className="text-xs font-extrabold text-teal-850 hover:text-teal-950 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Regimen</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* ── COLUMN 2: Patient Test Reminder ── */}
        <div className="card flex flex-col border-2 border-blue-600/30 hover:border-blue-600/50 shadow-sm transition-all">
          <div className="card-header bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-t-2xl flex items-center justify-between p-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-700/80 border border-blue-500/40 flex items-center justify-center shadow-inner">
                <ClipboardList size={19} className="text-blue-200" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm sm:text-base text-white leading-tight">2. Patient Test Reminder</h2>
                <p className="text-[11px] text-blue-200/90 font-medium">Diagnostic & Preventative Screenings</p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-blue-800 border border-blue-400/40 px-2 py-0.5 rounded-full text-blue-100">
              5 Key Checks
            </span>
          </div>

          <div className="card-body flex-1 space-y-3 p-4 bg-slate-50/50 overflow-y-auto max-h-[460px]">
            {testReminders.map((test) => (
              <div
                key={test.id}
                className="p-3 rounded-xl border-2 border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <test.icon size={15} className="text-blue-700 shrink-0" />
                      <p className="font-extrabold text-xs sm:text-sm text-slate-950 truncate">
                        {test.name}
                      </p>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-600 mt-1">
                      Target: <span className="font-bold text-slate-900">{test.target}</span> • {test.frequency}
                    </p>
                  </div>
                  <Badge variant={test.variant}>
                    {test.status}
                  </Badge>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-medium truncate">
                    Last: <span className="font-bold text-slate-900">{test.lastResult}</span>
                  </span>
                  <span className="font-extrabold text-blue-900 shrink-0 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {test.dueDate}
                  </span>
                </div>
              </div>
            ))}

            {/* Screening Advisory Notice */}
            <div className="p-2.5 rounded-xl bg-blue-50/90 border border-blue-200 text-xs text-blue-950 flex items-center gap-2">
              <ShieldCheck size={16} className="text-blue-700 shrink-0" />
              <p className="font-medium text-[11px] leading-tight">
                ADA 2024 Guidelines recommend quarterly HbA1c and annual microvascular checks to avoid neuropathy.
              </p>
            </div>
          </div>

          <div className="card-footer bg-slate-50 p-3 rounded-b-2xl border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={() => navigate('/appointments?type=investigation')}
              className="text-xs font-bold text-blue-800 hover:text-blue-950 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Book Diagnostic Test</span>
              <CalendarDays size={13} />
            </button>
            <button
              onClick={() => navigate('/patient/investigations')}
              className="text-xs font-extrabold text-blue-800 hover:text-blue-950 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View History</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* ── COLUMN 3: Diabetic Diet Plan ── */}
        <div className="card flex flex-col border-2 border-emerald-600/30 hover:border-emerald-600/50 shadow-sm transition-all">
          <div className="card-header bg-gradient-to-r from-emerald-900 to-teal-950 text-white rounded-t-2xl flex items-center justify-between p-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-700/80 border border-emerald-500/40 flex items-center justify-center shadow-inner">
                <Salad size={19} className="text-emerald-200" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm sm:text-base text-white leading-tight">3. Diabetic Diet Plan</h2>
                <p className="text-[11px] text-emerald-200/90 font-medium">Low-GI Nutrition & Meal Timing</p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-800 border border-emerald-400/40 px-2 py-0.5 rounded-full text-emerald-100">
              1,600 kcal Target
            </span>
          </div>

          <div className="card-body flex-1 space-y-3 p-4 bg-slate-50/50">
            {/* Daily Macro Budget Indicator */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
                <span className="flex items-center gap-1 text-slate-900">
                  <Flame size={14} className="text-amber-600" />
                  Daily Nutrition Budget
                </span>
                <span className="text-emerald-800 font-extrabold">&lt; 130g Carbs / Day</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="p-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-slate-600 block text-[10px] font-bold">Carbs</span>
                  <span className="font-black text-emerald-900">32g / 130g</span>
                </div>
                <div className="p-1.5 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-slate-600 block text-[10px] font-bold">Protein</span>
                  <span className="font-black text-blue-900">18g / 75g</span>
                </div>
                <div className="p-1.5 bg-teal-50 rounded-lg border border-teal-200">
                  <span className="text-slate-600 block text-[10px] font-bold">Hydration</span>
                  <span className="font-black text-teal-900">2.2L / 3.0L</span>
                </div>
              </div>
            </div>

            {/* Meal Selector Tabs */}
            <div className="flex bg-slate-200/70 p-1 rounded-xl gap-1 text-xs font-bold">
              {[
                { id: 'breakfast', label: 'Breakfast', icon: Coffee },
                { id: 'lunch', label: 'Lunch', icon: Sun },
                { id: 'snack', label: 'Snacks', icon: Apple },
                { id: 'dinner', label: 'Dinner', icon: Moon },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMeal(m.id)}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer text-[11px] font-extrabold ${
                    selectedMeal === m.id
                      ? 'bg-white text-emerald-950 shadow-xs'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  <m.icon size={12} />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            {/* Selected Meal Details Card */}
            {dietMeals[selectedMeal] && (
              <div className="p-3.5 bg-white rounded-xl border-2 border-emerald-300 shadow-xs space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-black text-sm text-slate-950 flex items-center gap-1.5">
                    <Utensils size={15} className="text-emerald-700" />
                    {dietMeals[selectedMeal].title}
                  </h3>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-950 px-2 py-0.5 rounded-full border border-emerald-300">
                    {dietMeals[selectedMeal].gi}
                  </span>
                </div>

                <ul className="space-y-1.5 text-xs text-slate-800 font-medium">
                  {dietMeals[selectedMeal].items.map((it, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 leading-snug">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span>Carbs: {dietMeals[selectedMeal].carbs}</span>
                  <span>Protein: {dietMeals[selectedMeal].protein}</span>
                  <span className="text-emerald-900 font-extrabold">{dietMeals[selectedMeal].calories}</span>
                </div>

                <p className="text-[11px] font-medium text-emerald-950 bg-emerald-50/80 p-2 rounded-lg border border-emerald-200/60 leading-tight">
                  💡 <strong>Tip:</strong> {dietMeals[selectedMeal].tip}
                </p>
              </div>
            )}
          </div>

          <div className="card-footer bg-slate-50 p-3 rounded-b-2xl border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={() => navigate('/patient/lifestyle?action=add')}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>+ Log Meal Intake</span>
            </button>
            <button
              onClick={() => navigate('/patient/lifestyle')}
              className="text-xs font-extrabold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Full Diet Log</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

      </div>

      {/* Care Checklist */}
      <div className="card">
        <div className="card-header flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-extrabold text-base text-slate-950">Clinical Care Checklist</h2>
            <p className="text-xs font-semibold text-slate-700 mt-0.5">Essential regular checkpoints for optimal glycemic control</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32 h-2.5 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
              <div className="h-full bg-teal-800 rounded-full transition-all duration-300" style={{ width: `${checklistProgress}%` }} />
            </div>
            <span className="text-sm font-black text-teal-900">{checklistProgress}%</span>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {checklistItems.map((item, i) => (
              <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border-2 ${item.done ? 'border-emerald-300 bg-emerald-50/80' : 'border-slate-200 bg-white'}`}>
                {item.done ? (
                  <CheckCircle size={18} className="text-emerald-700 shrink-0 mt-0.5" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-400 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className={`text-xs font-bold leading-tight ${item.done ? 'text-emerald-950' : 'text-slate-950'}`}>{item.label}</p>
                  <p className={`text-[11px] font-semibold mt-1 ${item.done ? 'text-emerald-900' : 'text-slate-700'}`}>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Consultations & Messages Secondary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Next Consultation */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-extrabold text-base text-slate-950">Next Consultation</h2>
            <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              Upcoming
            </span>
          </div>
          <div className="card-body">
            {appointments[0] ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                    <CalendarDays size={22} className="text-blue-800" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-950 truncate">{appointments[0].type}</p>
                    <p className="text-xs font-bold text-slate-800">{formatDateTime(appointments[0].date)}</p>
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {appointments[0].location}
                </p>
                {appointments[0].notes && (
                  <p className="text-xs font-medium text-slate-700 italic">{appointments[0].notes}</p>
                )}
                <button
                  onClick={() => navigate('/appointments')}
                  className="text-xs font-black uppercase tracking-wider text-teal-850 hover:text-teal-950 hover:underline cursor-pointer flex items-center gap-1.5 pt-2"
                >
                  <span>View Full Schedule</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-800 font-bold">No upcoming appointments scheduled</div>
            )}
          </div>
        </div>

        {/* Care Team Messages */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-extrabold text-base text-slate-950">Care Team Messages</h2>
            <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
              Encrypted
            </span>
          </div>
          <div className="card-body space-y-2.5">
            {messages.length === 0 ? (
              <div className="text-center py-6 text-slate-800 font-bold">No recent messages</div>
            ) : (
              messages.slice(0, 3).map(m => {
                const sender = data?.users?.[m.senderId];
                return (
                  <div key={m.id} className={`p-3 rounded-xl border-2 ${!m.read && m.receiverId === patientId ? 'bg-blue-50/80 border-blue-300' : 'bg-white border-slate-200'}`}>
                    <p className="text-xs font-black text-slate-950">{sender?.name || 'Care Team'}</p>
                    <p className="text-xs font-bold text-slate-800 mt-1 line-clamp-2 leading-relaxed">{m.content}</p>
                    <p className="text-[11px] font-semibold text-slate-600 mt-1">{formatDateTime(m.timestamp)}</p>
                  </div>
                );
              })
            )}
            <button
              onClick={() => navigate('/messages')}
              className="w-full text-xs font-black uppercase tracking-wider text-teal-850 hover:text-teal-950 hover:underline py-2 cursor-pointer flex items-center justify-center gap-1.5 pt-3 border-t border-slate-200"
            >
              <span>Open Secure Messenger</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
