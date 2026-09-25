import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatCard, LoadingSpinner, Badge, Modal } from '../../components/ui';
import {
  Activity, Pill, FileText, Droplets, CalendarDays, MessageSquare, Bot,
  Heart, TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle,
  ArrowRight, Plus, Salad, ClipboardList, AlertCircle, Bell, BellRing,
  Volume2, VolumeX, Sparkles, Check, Utensils, Flame, Coffee, Sun, Moon,
  ShieldCheck, Eye, Video, Stethoscope, PhoneCall, UserCheck, Shield,
  Maximize2, ClipboardCheck
} from 'lucide-react';
import { formatDate, formatTime, isToday, formatDateTime } from '../../data/demoDate';
import { recordDose, getProgressionData } from '../../services/dataService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';

export default function PatientDashboard() {
  const { currentUser, data, addToast, refreshData } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [chartRange, setChartRange] = useState('7d');
  const [loading, setLoading] = useState(true);

  // Scroll smoothly when user navigates with hash (#scheduler, #test-reminders, #diet-plan, #consulting)
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
    }
  }, [location.hash]);

  // Tablet Alarm & Scheduler State
  const audioCtxRef = useRef(null);
  const alarmIntervalRef = useRef(null);
  const [alarmSoundEnabled, setAlarmSoundEnabled] = useState(true);
  const [ringingAlarm, setRingingAlarm] = useState(null); // { tablet: string, time: string, id?: string }
  const [takenTablets, setTakenTablets] = useState({});

  // Active meal tab in Diet Plan
  const [selectedMeal, setSelectedMeal] = useState('breakfast');

  // Consultation Modal State
  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [consultType, setConsultType] = useState('doctor'); // 'doctor' or 'pharmacist'
  const [consultNote, setConsultNote] = useState('');

  // ── Patient Test Reminder Schedule View State ──
  const [testReminderTab, setTestReminderTab] = useState('schedule'); // 'schedule' or 'tests'
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

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

  const progression = useMemo(() => {
    return getProgressionData(patientId);
  }, [patientId, data]);

  const activeMin = progression?.activityMinutes ?? todayActivity;
  const activityProgress = Math.min(100, Math.round(((activeMin || 0) / 30) * 100));

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

  const handleRequestConsultation = () => {
    setConsultModalOpen(false);
    addToast({
      type: 'success',
      message: `Consultation request for ${consultType === 'doctor' ? 'Diabetologist Review' : 'Pharmacist Counselling'} submitted successfully!`,
    });
    setConsultNote('');
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
      name: 'HbA1c Blood Test',
      target: '< 7.0%',
      lastResult: latestHbA1c ? `${latestHbA1c.value}% on ${formatDate(latestHbA1c.date)}` : '7.2% on 18 Sep 2026',
      dueDate: 'Due in 12 Days',
      status: 'Due Soon',
      variant: 'warning',
      frequency: 'Quarterly ADA',
      icon: Droplets,
    },
    {
      id: 't-eye',
      name: 'Retinal Eye Screening',
      target: 'Retinopathy Check',
      lastResult: 'Normal exam in 2025',
      dueDate: '15 Oct 2026',
      status: 'Scheduled',
      variant: 'info',
      frequency: 'Annual Eye Check',
      icon: Eye,
    },
    {
      id: 't-kidney',
      name: 'Urine ACR & Kidney eGFR',
      target: 'ACR < 30 mg/g',
      lastResult: '22 mg/g (Normal)',
      dueDate: '28 Nov 2026',
      status: 'Upcoming',
      variant: 'primary',
      frequency: 'Bi-Annual Renal',
      icon: Activity,
    },
    {
      id: 't-foot',
      name: 'Foot Neuropathy Exam',
      target: '10g Monofilament',
      lastResult: 'Sensory intact',
      dueDate: '10 Dec 2026',
      status: 'Up to Date',
      variant: 'success',
      frequency: 'Annual Clinical Check',
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

  // ── Patient Welfare Diabetes Test Reminder Schedule (3 Core Tiers) ───
  const SCHEDULE_INTERVAL_CARDS = [
    {
      id: 'every-3-months',
      interval: 'EVERY 3 MONTHS',
      title: 'HbA1c / glycemic review',
      tagBadge: 'bg-sky-100 text-sky-900 border-sky-300',
      headerBg: 'bg-sky-50/70',
      accentBorder: 'hover:border-sky-500',
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
    },
    {
      id: 'every-6-months',
      interval: 'EVERY 6 MONTHS',
      title: 'Health & laboratory checkpoint',
      tagBadge: 'bg-indigo-100 text-indigo-900 border-indigo-300',
      headerBg: 'bg-indigo-50/70',
      accentBorder: 'hover:border-indigo-500',
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
    },
    {
      id: 'at-least-annually',
      interval: 'AT LEAST ANNUALLY',
      title: 'Complication & preventive health review',
      tagBadge: 'bg-teal-100 text-teal-900 border-teal-300',
      headerBg: 'bg-teal-50/70',
      accentBorder: 'hover:border-teal-500',
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
      clinicalAction: 'Retinal & Foot Check',
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
    { label: 'Request Counselling', icon: Heart, color: 'text-rose-600 bg-rose-50', onClick: () => setConsultModalOpen(true) },
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
          label="Activity Progression"
          value={`${activeMin} min`}
          icon={Heart}
          color={activeMin >= 30 ? 'success' : 'secondary'}
          badge={activeMin >= 30 ? 'Goal Met (100%)' : `${activityProgress}%`}
          progress={activityProgress}
          subtitle={activeMin >= 30 ? 'Daily goal reached (≥30m active)' : `Target: 30 min • ${Math.max(0, 30 - activeMin)}m remaining`}
          onClick={() => navigate('/patient/lifestyle')}
        />
      </div>

      {/* ── Quick Links & Actions ── */}
      <div className="card border border-[#D2E2E6] bg-white">
        <div className="card-header bg-[#F3F8F9] rounded-t-2xl border-b border-[#D2E2E6] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-base text-slate-950">Quick Links & Actions</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#367588] border border-[#A0C7D1]">
              Shortcuts
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-500">Fast tracking & clinic actions</span>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {quickActions.map((a, i) => (
              <button
                key={i}
                onClick={a.onClick}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-slate-200 hover:border-[#367588] bg-white hover:bg-[#F3F8F9] hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group text-center"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-xs ${a.color} group-hover:scale-105 transition-transform`}>
                  <a.icon size={22} />
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-950 group-hover:text-[#367588] leading-tight">
                  {a.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4 CORE CARE MANAGEMENT COLUMNS (Placed After Quick Links) ── */}
      {/* 1. Scheduler Column (Ring Alarm to take tablet) */}
      {/* 2. Patient Test Reminder */}
      {/* 3. Diabetic Diet Plan */}
      {/* 4. Clinical Consulting Column (Doctor & Pharm D Consultations) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

        {/* ── COLUMN 1: Tablet Scheduler & Audio Alarm ── */}
        <div id="scheduler" className="card flex flex-col scroll-mt-24 border-2 border-teal-600/30 hover:border-teal-600/50 shadow-sm transition-all">
          <div className="card-header bg-gradient-to-r from-teal-900 to-teal-850 text-white rounded-t-2xl flex items-center justify-between p-3.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-teal-700/80 border border-teal-500/40 flex items-center justify-center shadow-inner shrink-0">
                <Pill size={18} className="text-teal-200" />
              </div>
              <div className="min-w-0">
                <h2 className="font-extrabold text-sm text-white leading-tight truncate">1. Tablet Scheduler</h2>
                <p className="text-[10px] text-teal-200/90 font-medium truncate">Audible Alarm & Schedule</p>
              </div>
            </div>
            
            <button
              onClick={() => setAlarmSoundEnabled(!alarmSoundEnabled)}
              className={`p-1.5 rounded-lg border transition text-xs flex items-center gap-1 cursor-pointer shrink-0 ${
                alarmSoundEnabled
                  ? 'bg-teal-600/90 border-teal-400/60 text-white'
                  : 'bg-teal-950/80 border-teal-800 text-teal-300'
              }`}
              title={alarmSoundEnabled ? 'Alarm Sound: ON' : 'Alarm Sound: OFF'}
            >
              {alarmSoundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span className="text-[10px] font-bold">{alarmSoundEnabled ? 'ON' : 'Muted'}</span>
            </button>
          </div>

          <div className="card-body flex-1 space-y-3 p-3.5 bg-slate-50/50">
            {/* Active Alarm Banner (Flashing when ringing) */}
            {ringingAlarm && (
              <div className="p-3 rounded-xl bg-rose-50 border-2 border-rose-400 text-rose-950 shadow-md animate-bounce-slow flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center animate-pulse shrink-0">
                    <BellRing size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-rose-700">⏰ Dose Alarm Ringing</p>
                    <p className="text-xs font-extrabold text-rose-950 truncate">
                      Take {ringingAlarm.tablet} Now ({ringingAlarm.time})
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5 pt-1">
                  <button
                    onClick={() => handleMarkTabletTaken(ringingAlarm.id, ringingAlarm.tablet)}
                    className="flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check size={12} />
                    <span>Take & Stop</span>
                  </button>
                  <button
                    onClick={stopAlarm}
                    className="py-1 px-2.5 bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-bold rounded-lg cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Dose List with Alarm Action */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                <span>Today's Tablets</span>
                <span className="text-[10px] font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  {tabletScheduleItems.filter(t => t.status === 'taken').length}/{tabletScheduleItems.length} Done
                </span>
              </div>

              {tabletScheduleItems.map((item) => {
                const isTaken = item.status === 'taken';
                const isRinging = ringingAlarm?.tablet === item.medicineName;

                return (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-xl border-2 transition-all ${
                      isRinging
                        ? 'border-rose-400 bg-rose-50/80 shadow-md ring-2 ring-rose-300'
                        : isTaken
                        ? 'border-emerald-300 bg-emerald-50/50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-extrabold text-xs text-slate-950 truncate">
                            {item.medicineName}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1 rounded">
                            {item.dose}
                          </span>
                        </div>
                        <p className="text-[10px] font-semibold text-teal-850 mt-0.5 truncate">
                          {item.timing} • {item.instruction}
                        </p>
                      </div>

                      <span className="text-[11px] font-extrabold text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
                        {item.scheduledTime}
                      </span>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1">
                      <Badge variant={isTaken ? 'success' : isRinging ? 'danger' : 'warning'}>
                        {isTaken ? 'TAKEN' : isRinging ? 'ALARM' : 'DUE'}
                      </Badge>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => triggerTabletAlarm(item.medicineName, item.scheduledTime, item.id)}
                          className="px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                          title="Ring alarm for this tablet"
                        >
                          <Bell size={11} className="text-amber-700" />
                          <span>Alarm</span>
                        </button>

                        {!isTaken && (
                          <button
                            onClick={() => handleMarkTabletTaken(item.id, item.medicineName)}
                            className="px-1.5 py-0.5 bg-teal-800 hover:bg-teal-900 text-white rounded text-[10px] font-bold flex items-center gap-0.5 transition cursor-pointer"
                            title="Mark as taken"
                          >
                            <Check size={11} />
                            <span>Taken</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Test Alarm Sound Trigger */}
            <div className="p-2 rounded-xl bg-teal-50/80 border border-teal-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <BellRing size={14} className="text-teal-700 shrink-0" />
                <span className="text-[11px] font-bold text-teal-950">Test Alarm Chime</span>
              </div>
              <button
                onClick={() => triggerTabletAlarm('Metformin 500mg', 'Test Alarm')}
                className="btn-primary btn-sm text-[10px] py-0.5 px-2 shadow-xs"
              >
                Test Sound
              </button>
            </div>
          </div>

          <div className="card-footer bg-slate-50 p-2.5 rounded-b-2xl border-t border-slate-200 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-600">Syncs with Prescriptions</span>
            <button
              onClick={() => navigate('/patient/medications')}
              className="text-[11px] font-extrabold text-teal-850 hover:text-teal-950 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Manage</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* ── COLUMN 2: Patient Test Reminder ── */}
        <div id="test-reminders" className="card flex flex-col scroll-mt-24 border-2 border-blue-600/30 hover:border-blue-600/50 shadow-sm transition-all">
          <div className="card-header bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white rounded-t-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-700/80 border border-blue-500/40 flex items-center justify-center shadow-inner shrink-0">
                  <ClipboardList size={18} className="text-blue-200" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-extrabold text-sm text-white leading-tight truncate">2. Patient Test Reminder</h2>
                  <p className="text-[10px] text-blue-200/90 font-medium truncate">Patient Welfare Care Schedule</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/patient/test-reminders')}
                className="text-[10px] font-bold bg-blue-800/90 hover:bg-blue-700 text-blue-100 border border-blue-400/40 px-2 py-0.8 rounded-lg flex items-center gap-1 transition cursor-pointer shrink-0"
                title="Open Dedicated Full Page Schedule"
              >
                <span>Separate Page View</span>
                <ArrowRight size={11} />
              </button>
            </div>

            {/* Segmented View Switcher: 3 Schedule Cards vs 5 Lab Checks */}
            <div className="flex items-center bg-blue-950/80 p-0.5 rounded-lg border border-blue-800 text-[11px] font-bold">
              <button
                onClick={() => setTestReminderTab('schedule')}
                className={`flex-1 py-1 rounded-md transition text-center cursor-pointer ${
                  testReminderTab === 'schedule'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-200 hover:text-white'
                }`}
              >
                📅 3 Schedule Tiers
              </button>
              <button
                onClick={() => setTestReminderTab('tests')}
                className={`flex-1 py-1 rounded-md transition text-center cursor-pointer ${
                  testReminderTab === 'tests'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-200 hover:text-white'
                }`}
              >
                🧪 5 Specific Tests
              </button>
            </div>
          </div>

          <div className="card-body flex-1 space-y-2.5 p-3.5 bg-slate-50/50 overflow-y-auto max-h-[480px]">
            {testReminderTab === 'schedule' ? (
              <div className="space-y-3">
                {/* Dedicated Separate Page Callout Banner */}
                <div
                  onClick={() => navigate('/patient/test-reminders')}
                  className="p-2.5 rounded-xl bg-blue-100/70 hover:bg-blue-100 border border-blue-300 flex items-center justify-between text-[11px] font-bold text-blue-950 cursor-pointer transition shadow-xs"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={13} className="text-blue-700 shrink-0" />
                    <span>Open in Full Dedicated Page</span>
                  </span>
                  <ArrowRight size={13} className="text-blue-700 shrink-0" />
                </div>

                {/* 3 Schedule Cards from User Blueprint */}
                {SCHEDULE_INTERVAL_CARDS.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.id}
                      className={`p-3 rounded-2xl border-2 border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs transition space-y-2 ${card.accentBorder}`}
                    >
                      {/* Interval Pill Badge & Status */}
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${card.tagBadge}`}>
                          {card.interval}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${card.statusBadge}`}>
                          {card.status}
                        </span>
                      </div>

                      {/* Card Title */}
                      <div className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${card.iconColor}`}>
                          <Icon size={12} />
                        </div>
                        <h3 className="font-extrabold text-xs text-slate-950 leading-tight">
                          {card.title}
                        </h3>
                      </div>

                      {/* Bullet list */}
                      <ul className="space-y-1 text-[11px] text-slate-700 leading-snug pl-0.5">
                        {card.items.map((bullet, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-blue-600 font-bold shrink-0 mt-0.5">•</span>
                            <span className="font-medium text-slate-700">{bullet}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Clinical Action Footer */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-medium">Target: {card.nextDate}</span>
                        <button
                          onClick={() => navigate('/appointments?type=investigation')}
                          className="font-extrabold text-blue-700 hover:text-blue-950 hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>{card.clinicalAction}</span>
                          <ArrowRight size={10} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Patient Welfare Workflow Strip */}
                <div className="p-2.5 rounded-xl bg-blue-50/90 border border-blue-200 text-blue-950 space-y-1">
                  <div className="flex items-center gap-1 text-[10px] font-extrabold text-blue-900 tracking-tight uppercase">
                    <ShieldCheck size={12} className="text-blue-700 shrink-0" />
                    <span>Patient Welfare Protocol</span>
                  </div>
                  <p className="text-[10px] font-bold text-blue-800 leading-tight">
                    Remind → Record → Complete → Escalate to the care team when due or abnormal
                  </p>
                  <p className="text-[9px] text-blue-600/90 font-medium">
                    Clinical framing: ADA Standards of Care 2026
                  </p>
                </div>
              </div>
            ) : (
              // Individual 5 Lab Checks
              <div className="space-y-2.5">
                {testReminders.map((test) => (
                  <div
                    key={test.id}
                    className="p-2.5 rounded-xl border-2 border-slate-200 bg-white hover:border-blue-300 transition"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <test.icon size={13} className="text-blue-700 shrink-0" />
                          <p className="font-extrabold text-xs text-slate-950 truncate">
                            {test.name}
                          </p>
                        </div>
                        <p className="text-[10px] font-semibold text-slate-600 mt-0.5 truncate">
                          Target: {test.target} • {test.frequency}
                        </p>
                      </div>
                      <Badge variant={test.variant}>
                        {test.status}
                      </Badge>
                    </div>

                    <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="text-slate-600 font-medium truncate">
                        Last: <span className="font-bold text-slate-900">{test.lastResult}</span>
                      </span>
                      <span className="font-extrabold text-blue-900 shrink-0 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                        {test.dueDate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card-footer bg-slate-50 p-2.5 rounded-b-2xl border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={() => navigate('/appointments?type=investigation')}
              className="text-[11px] font-bold text-blue-800 hover:text-blue-950 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Book Test</span>
              <CalendarDays size={12} />
            </button>
            <button
              onClick={() => navigate('/patient/test-reminders')}
              className="text-[11px] font-extrabold text-blue-700 hover:text-blue-950 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Separate Page</span>
              <ArrowRight size={11} />
            </button>
            <button
              onClick={() => navigate('/patient/investigations')}
              className="text-[11px] font-extrabold text-blue-800 hover:text-blue-950 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>History</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* ── COLUMN 3: Diabetic Diet Plan ── */}
        <div id="diet-plan" className="card flex flex-col scroll-mt-24 border-2 border-emerald-600/30 hover:border-emerald-600/50 shadow-sm transition-all">
          <div className="card-header bg-gradient-to-r from-emerald-900 to-teal-950 text-white rounded-t-2xl flex items-center justify-between p-3.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-700/80 border border-emerald-500/40 flex items-center justify-center shadow-inner shrink-0">
                <Salad size={18} className="text-emerald-200" />
              </div>
              <div className="min-w-0">
                <h2 className="font-extrabold text-sm text-white leading-tight truncate">3. Diabetic Diet Plan</h2>
                <p className="text-[10px] text-emerald-200/90 font-medium truncate">Low-GI Nutrition</p>
              </div>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-800 border border-emerald-400/40 px-2 py-0.5 rounded-full text-emerald-100 shrink-0">
              1,600 kcal
            </span>
          </div>

          <div className="card-body flex-1 space-y-2.5 p-3.5 bg-slate-50/50">
            {/* Daily Macro Budget Indicator */}
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 mb-1">
                <span className="flex items-center gap-1 text-slate-900">
                  <Flame size={13} className="text-amber-600" />
                  Macro Budget
                </span>
                <span className="text-emerald-800 font-extrabold">&lt; 130g Carbs</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                <div className="p-1 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-slate-600 block text-[9px]">Carbs</span>
                  <span className="font-black text-emerald-900">32/130g</span>
                </div>
                <div className="p-1 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-slate-600 block text-[9px]">Protein</span>
                  <span className="font-black text-blue-900">18/75g</span>
                </div>
                <div className="p-1 bg-teal-50 rounded-lg border border-teal-200">
                  <span className="text-slate-600 block text-[9px]">Water</span>
                  <span className="font-black text-teal-900">2.2/3.0L</span>
                </div>
              </div>
            </div>

            {/* Meal Selector Tabs (Using safe, exported icons: Coffee, Sun, Sparkles, Moon) */}
            <div className="flex bg-slate-200/70 p-1 rounded-xl gap-1 text-xs font-bold">
              {[
                { id: 'breakfast', label: 'Breakfast', icon: Coffee },
                { id: 'lunch', label: 'Lunch', icon: Sun },
                { id: 'snack', label: 'Snack', icon: Sparkles },
                { id: 'dinner', label: 'Dinner', icon: Moon },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMeal(m.id)}
                  className={`flex-1 py-1 rounded-lg flex items-center justify-center gap-0.5 transition cursor-pointer text-[10px] font-extrabold ${
                    selectedMeal === m.id
                      ? 'bg-white text-emerald-950 shadow-xs'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  <m.icon size={11} />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            {/* Selected Meal Details Card */}
            {dietMeals[selectedMeal] && (
              <div className="p-3 bg-white rounded-xl border-2 border-emerald-300 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <h3 className="font-black text-xs text-slate-950 flex items-center gap-1">
                    <Utensils size={13} className="text-emerald-700" />
                    {dietMeals[selectedMeal].title}
                  </h3>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-950 px-1.5 py-0.2 rounded border border-emerald-300">
                    {dietMeals[selectedMeal].gi}
                  </span>
                </div>

                <ul className="space-y-1 text-[11px] text-slate-800 font-medium">
                  {dietMeals[selectedMeal].items.map((it, idx) => (
                    <li key={idx} className="flex items-start gap-1 leading-snug">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-700">
                  <span>C: {dietMeals[selectedMeal].carbs}</span>
                  <span>P: {dietMeals[selectedMeal].protein}</span>
                  <span className="text-emerald-900 font-extrabold">{dietMeals[selectedMeal].calories}</span>
                </div>

                <p className="text-[10px] font-medium text-emerald-950 bg-emerald-50/80 p-1.5 rounded-lg border border-emerald-200/60 leading-tight">
                  💡 <strong>Tip:</strong> {dietMeals[selectedMeal].tip}
                </p>
              </div>
            )}
          </div>

          <div className="card-footer bg-slate-50 p-2.5 rounded-b-2xl border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={() => navigate('/patient/lifestyle?action=add')}
              className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>+ Log Meal</span>
            </button>
            <button
              onClick={() => navigate('/patient/lifestyle')}
              className="text-[11px] font-extrabold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>Diet Log</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* ── COLUMN 4: Consulting (Clinical Consultation & Doctor Review) ── */}
        <div id="consulting" className="card flex flex-col scroll-mt-24 border-2 border-purple-600/30 hover:border-purple-600/50 shadow-sm transition-all">
          <div className="card-header bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white rounded-t-2xl flex items-center justify-between p-3.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-purple-700/80 border border-purple-500/40 flex items-center justify-center shadow-inner shrink-0">
                <Stethoscope size={18} className="text-purple-200" />
              </div>
              <div className="min-w-0">
                <h2 className="font-extrabold text-sm text-white leading-tight truncate">4. Doctor Consulting</h2>
                <p className="text-[10px] text-purple-200/90 font-medium truncate">Clinical Tele-Consults</p>
              </div>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider bg-purple-800 border border-purple-400/40 px-2 py-0.5 rounded-full text-purple-100 shrink-0">
              Live Care
            </span>
          </div>

          <div className="card-body flex-1 space-y-3 p-3.5 bg-slate-50/50">
            {/* Upcoming Consultation Status Card */}
            <div className="p-3 bg-white rounded-xl border-2 border-purple-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  Next Appointment
                </span>
                <Badge variant="success">CONFIRMED</Badge>
              </div>

              <div className="flex items-start gap-2.5 pt-0.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-800 shrink-0 font-bold">
                  <UserCheck size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-950 truncate">Dr. Sarah Jenkins, MD</p>
                  <p className="text-[10px] font-bold text-purple-900">Chief Endocrinologist</p>
                  <p className="text-[11px] font-extrabold text-slate-800 mt-1 flex items-center gap-1">
                    <Clock size={12} className="text-purple-700" />
                    Tomorrow • 10:30 AM (Tele-Consult)
                  </p>
                </div>
              </div>

              {/* Instant Tele-Consult Join Button */}
              <button
                onClick={() => {
                  addToast({ type: 'info', message: 'Connecting to Dr. Sarah Jenkins Tele-Consult Room...' });
                  navigate('/appointments');
                }}
                className="w-full py-1.5 bg-purple-800 hover:bg-purple-900 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Video size={14} />
                <span>Join Tele-Consult Room</span>
              </button>
            </div>

            {/* Quick Consultation Services */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-extrabold text-slate-700 px-1">Consultation Services</p>

              <button
                onClick={() => {
                  setConsultType('doctor');
                  setConsultModalOpen(true);
                }}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/40 text-left transition flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Stethoscope size={15} className="text-purple-700 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-950 leading-tight">Diabetologist Review</p>
                    <p className="text-[10px] text-slate-600 truncate">HbA1c & prescription optimization</p>
                  </div>
                </div>
                <ArrowRight size={13} className="text-slate-400 group-hover:text-purple-800 transition" />
              </button>

              <button
                onClick={() => {
                  setConsultType('pharmacist');
                  setConsultModalOpen(true);
                }}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/40 text-left transition flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Heart size={15} className="text-rose-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-950 leading-tight">Pharm D Counselling</p>
                    <p className="text-[10px] text-slate-600 truncate">Adherence & medication guidance</p>
                  </div>
                </div>
                <ArrowRight size={13} className="text-slate-400 group-hover:text-purple-800 transition" />
              </button>
            </div>

            <div className="p-2 rounded-xl bg-purple-50/80 border border-purple-200 text-xs text-purple-950 flex items-center gap-1.5">
              <Shield size={14} className="text-purple-700 shrink-0" />
              <p className="font-medium text-[10px] leading-tight">
                All consultations are encrypted and compliant with medical privacy standards.
              </p>
            </div>
          </div>

          <div className="card-footer bg-slate-50 p-2.5 rounded-b-2xl border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={() => navigate('/messages')}
              className="text-[11px] font-bold text-purple-800 hover:text-purple-950 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <MessageSquare size={12} />
              <span>Chat Doctor</span>
            </button>
            <button
              onClick={() => navigate('/appointments')}
              className="text-[11px] font-extrabold text-purple-800 hover:text-purple-950 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>Appointments</span>
              <ArrowRight size={12} />
            </button>
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

      {/* ── Consultation Request Modal ── */}
      <Modal
        open={consultModalOpen}
        onClose={() => setConsultModalOpen(false)}
        title={consultType === 'doctor' ? 'Book Doctor Consultation' : 'Request Pharmacist Counselling'}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-700 font-medium">
            Schedule a session with your assigned {consultType === 'doctor' ? 'Doctor (Diabetologist)' : 'Clinical Pharmacist (Pharm D)'} to review lab results, discuss tablet side effects, or adjust targets.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 block">Consultation Topic / Chief Complaint</label>
            <textarea
              rows={3}
              value={consultNote}
              onChange={(e) => setConsultNote(e.target.value)}
              placeholder="e.g. Discuss fasting glucose spikes, morning dizziness after Metformin, or diet adjustments..."
              className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:border-purple-700 focus:outline-none"
            />
          </div>

          <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 flex items-center gap-2 text-xs text-purple-950 font-medium">
            <CalendarDays size={16} className="text-purple-700 shrink-0" />
            <span>Next available slot: Tomorrow at 10:30 AM via Tele-Consult Video.</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setConsultModalOpen(false)}
              className="btn-ghost btn-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleRequestConsultation}
              className="btn-primary btn-sm bg-purple-800 hover:bg-purple-900 border-none"
            >
              Confirm Consultation
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Full Patient Welfare Diabetes Test Reminder Schedule Modal ── */}
      <Modal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title="Patient Welfare — Diabetes Test Reminder Schedule"
        size="xl"
      >
        <div className="space-y-6 -mt-1">
          {/* Slide Top Accent Bar & Subtitle */}
          <div className="border-t-4 border-blue-800 pt-3 pb-2 -mx-2 px-2 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-700"></span>
                <h3 className="text-base sm:text-lg font-black text-slate-950 tracking-tight">
                  Patient Welfare — Diabetes Test Reminder Schedule
                </h3>
              </div>
              <p className="text-xs text-slate-600 font-semibold mt-0.5 pl-4">
                Automatic reminders for routine monitoring — personalized to the patient's clinician-defined care plan.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold bg-blue-50 text-blue-900 border border-blue-200 px-2.5 py-1 rounded-full">
                Protocol: ADA 2026 Guidelines
              </span>
            </div>
          </div>

          {/* 3 Horizontal Cards Layout Matching User's Image */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SCHEDULE_INTERVAL_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  className="rounded-3xl border-2 border-slate-200/90 bg-white p-5 flex flex-col justify-between shadow-xs hover:border-blue-400 hover:shadow-md transition-all duration-200"
                >
                  <div className="space-y-4">
                    {/* Top Tier Interval Pill */}
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${card.tagBadge}`}>
                        {card.interval}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${card.statusBadge}`}>
                        {card.status}
                      </span>
                    </div>

                    {/* Card Title */}
                    <div className="flex items-start gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${card.iconColor}`}>
                        <Icon size={18} />
                      </div>
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-950 leading-snug">
                        {card.title}
                      </h4>
                    </div>

                    {/* Bullets List */}
                    <ul className="space-y-2.5 pt-1 text-xs text-slate-700 leading-relaxed">
                      {card.items.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-600 font-bold shrink-0 mt-0.5">•</span>
                          <span className="font-medium text-slate-800">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Card Bottom Target & Action */}
                  <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold text-[11px]">Due: {card.nextDate}</span>
                    <button
                      onClick={() => {
                        setScheduleModalOpen(false);
                        navigate('/appointments?type=investigation');
                      }}
                      className="font-extrabold text-blue-700 hover:text-blue-950 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{card.clinicalAction}</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Banner: PATIENT WELFARE • Remind → Record → Complete → Escalate */}
          <div className="rounded-2xl bg-blue-50/90 border border-blue-200/90 py-3.5 px-4 sm:px-6 text-center shadow-xs">
            <p className="text-xs sm:text-sm font-extrabold text-blue-950 tracking-wide">
              PATIENT WELFARE &bull; Remind &rarr; Record &rarr; Complete &rarr; Escalate to the care team when due or abnormal
            </p>
          </div>

          {/* Bottom Footnote & Clinical Disclaimer */}
          <div className="space-y-1.5 pt-1 border-t border-slate-200 text-slate-500 text-[10px] leading-tight flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="font-bold text-slate-600">LATROCORE • Diabetes Care Module</span>
            <span className="text-center sm:text-left text-slate-500 max-w-xl">
              Reminder intervals are not a diagnosis protocol; frequency should be individualized for diabetes type, control, complications, medicines and clinician advice.
            </span>
            <span className="font-bold text-slate-600 text-right sm:text-left shrink-0">
              Clinical framing: ADA Standards of Care 2026
            </span>
          </div>

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setScheduleModalOpen(false);
                navigate('/appointments?type=investigation');
              }}
              className="btn-outline btn-sm text-xs flex items-center gap-1.5"
            >
              <CalendarDays size={14} />
              <span>Schedule Next Investigation</span>
            </button>
            <button
              onClick={() => {
                setScheduleModalOpen(false);
                navigate('/patient/investigations');
              }}
              className="btn-primary btn-sm bg-blue-700 hover:bg-blue-800 text-xs flex items-center gap-1.5"
            >
              <ClipboardList size={14} />
              <span>Open Lab Record</span>
            </button>
            <button
              onClick={() => setScheduleModalOpen(false)}
              className="btn-ghost btn-sm text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Compact Clinical Care Checklist Summary Card ── */}
      <div
        onClick={() => navigate('/patient/checklist')}
        className="card p-5 sm:p-6 border-2 border-teal-600/30 hover:border-teal-600 hover:shadow-lg transition-all duration-300 cursor-pointer bg-gradient-to-br from-white via-white to-teal-50/50 group rounded-2xl relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Left: Icon, Title & Badges */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 group-hover:bg-teal-700 group-hover:text-white transition-all duration-300">
              <ClipboardCheck size={26} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-extrabold text-base sm:text-lg text-slate-950 group-hover:text-teal-900 transition-colors">
                  Clinical Care Checklist
                </h2>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 uppercase tracking-wider">
                  ADA 2026 Protocol
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-600 leading-snug">
                Essential regular checkpoints for optimal glycemic control &amp; microvascular complication prevention
              </p>
            </div>
          </div>

          {/* Right: Progress & Interactive Button */}
          <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            {/* Progress indicators */}
            <div className="text-left sm:text-right min-w-[140px]">
              <div className="flex items-center gap-2 sm:justify-end">
                <span className="text-xs font-bold text-slate-600">
                  {checklistItems.filter(i => i.done).length} of {checklistItems.length} Met
                </span>
                <span className="text-xs font-black text-teal-900 bg-teal-100 px-2 py-0.5 rounded-md border border-teal-200">
                  {checklistProgress}%
                </span>
              </div>
              <div className="w-full sm:w-36 h-2.5 bg-slate-200 rounded-full overflow-hidden mt-1.5 border border-slate-300">
                <div
                  className="h-full bg-teal-700 rounded-full transition-all duration-500"
                  style={{ width: `${checklistProgress}%` }}
                />
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate('/patient/checklist');
              }}
              className="btn-primary btn-sm bg-teal-800 hover:bg-teal-900 text-white flex items-center gap-1.5 shadow-sm group-hover:shadow-md group-hover:translate-x-0.5 transition-all text-xs font-extrabold shrink-0"
            >
              <span>View All 8 Cards</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Mini Status Breakdown Pills */}
        <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500">Active Status:</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
              <CheckCircle size={12} className="text-emerald-700" />
              <span>{checklistItems.filter(i => i.done).length} Completed</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              <AlertCircle size={12} className="text-amber-700" />
              <span>{checklistItems.filter(i => !i.done).length} Action Needed</span>
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-extrabold text-teal-850 group-hover:text-teal-950">
            <span>Inspect 8 detailed cards &amp; clinical actions</span>
            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
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
