import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatCard, LoadingSpinner, Badge, Modal } from '../../components/ui';
import {
  Activity, Pill, FileText, Droplets, CalendarDays, Bot,
  Heart, TrendingUp, CheckCircle, ArrowRight, Salad,
  AlertCircle, ClipboardCheck
} from 'lucide-react';
import { formatDate, formatTime, isToday, formatDateTime } from '../../data/demoDate';
import { getProgressionData } from '../../services/dataService';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, ReferenceLine, ComposedChart } from 'recharts';

export default function PatientDashboard() {
  const { currentUser, data, addToast } = useApp();
  const navigate = useNavigate();
  const [chartRange, setChartRange] = useState('7d');
  const [loading, setLoading] = useState(true);

  // Consultation Modal State
  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [consultType, setConsultType] = useState('doctor'); // 'doctor' or 'pharmacist'
  const [consultNote, setConsultNote] = useState('');

  useEffect(() => { setTimeout(() => setLoading(false), 300); }, []);

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

  const handleRequestConsultation = () => {
    setConsultModalOpen(false);
    addToast({
      type: 'success',
      message: `Consultation request for ${consultType === 'doctor' ? 'Diabetologist Review' : 'Pharmacist Counselling'} submitted successfully!`,
    });
    setConsultNote('');
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
            Welcome back, {currentUser?.name ? currentUser.name.split(' ')[0] : 'Patient'}
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
          value={latestGlucose ? `${latestGlucose.value} mg/dL` : '—'}
          icon={Droplets}
          color="primary"
          subtitle={latestGlucose ? `${latestGlucose.context?.toUpperCase()} • ${formatTime(latestGlucose.dateTime)}` : 'No readings logged yet'}
          onClick={() => navigate('/patient/glucose')}
        />
        <StatCard
          label="Latest HbA1c"
          value={latestHbA1c ? `${latestHbA1c.value}%` : '—'}
          icon={TrendingUp}
          color="warning"
          subtitle={latestHbA1c ? `Recorded on ${formatDate(latestHbA1c.date)}` : 'No test records'}
          onClick={() => navigate('/patient/investigations')}
        />
        <StatCard
          label="Medication Adherence"
          value={adherence ? `${adherence.pct}%` : '—'}
          icon={Pill}
          color={adherence && adherence.pct >= 80 ? 'success' : 'secondary'}
          subtitle={adherence ? `${adherence.taken}/${adherence.total} doses taken on time` : 'No prescriptions active'}
          onClick={() => navigate('/patient/medications')}
        />
        <StatCard
          label="Activity Progression"
          value={activeMin > 0 ? `${activeMin} min` : '—'}
          icon={Heart}
          color={activeMin >= 30 ? 'success' : 'secondary'}
          badge={activeMin >= 30 ? 'Goal Met (100%)' : activeMin > 0 ? `${activityProgress}%` : null}
          progress={activityProgress}
          subtitle={activeMin >= 30 ? 'Daily goal reached (≥30m active)' : activeMin > 0 ? `Target: 30 min • ${Math.max(0, 30 - activeMin)}m remaining` : 'No activity logged today'}
          onClick={() => navigate('/patient/lifestyle')}
        />
      </div>

      {/* ── Quick Links & Actions ── */}
      <div className="card border border-[#E8DCC8] bg-white">
        <div className="card-header bg-[#FAF6EF] rounded-t-2xl border-b border-[#E8DCC8] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-base text-slate-950">Quick Links & Actions</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#046A38] border border-[#A8D7BD]">
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
                className="flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-slate-200 hover:border-[#046A38] bg-white hover:bg-[#E8F5EE] hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group text-center"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-xs ${a.color} group-hover:scale-105 transition-transform`}>
                  <a.icon size={22} />
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-950 group-hover:text-[#046A38] leading-tight">
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
