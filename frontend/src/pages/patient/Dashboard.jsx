import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatCard, LoadingSpinner, Badge } from '../../components/ui';
import {
  Activity, Pill, FileText, Droplets, CalendarDays, MessageSquare, Bot,
  Heart, TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle,
  ArrowRight, Plus, Salad, ClipboardList, AlertCircle
} from 'lucide-react';
import { formatDate, formatTime, isToday, formatDateTime } from '../../data/demoDate';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';

export default function PatientDashboard() {
  const { currentUser, data, addToast } = useApp();
  const navigate = useNavigate();
  const [chartRange, setChartRange] = useState('7d');
  const [loading, setLoading] = useState(true);

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

  const dueScreenings = screenings.filter(s => s.status === 'due' || s.status === 'overdue');

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

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          label="Latest Glucose"
          value={latestGlucose ? `${latestGlucose.value} ${latestGlucose.unit}` : '—'}
          icon={Droplets}
          color="primary"
          subtitle={latestGlucose ? `${latestGlucose.context.toUpperCase()} • ${formatTime(latestGlucose.dateTime)}` : 'No readings recorded'}
          onClick={() => navigate('/patient/glucose')}
        />
        <StatCard
          label="Latest HbA1c"
          value={latestHbA1c ? `${latestHbA1c.value}%` : '—'}
          icon={Activity}
          color={latestHbA1c && parseFloat(latestHbA1c.value) > 7 ? 'warning' : 'success'}
          subtitle={latestHbA1c ? `Recorded on ${formatDate(latestHbA1c.date)}` : 'Not recorded yet'}
          onClick={() => navigate('/patient/investigations')}
        />
        <StatCard
          label="Medication Adherence"
          value={adherence ? `${adherence.pct}%` : '—'}
          icon={Pill}
          color={adherence && adherence.pct >= 80 ? 'success' : 'warning'}
          subtitle={adherence ? `${adherence.taken}/${adherence.total} doses logged on time` : 'No data recorded'}
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

      {/* Main Grid: Chart & Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Glucose Chart */}
        <div className="lg:col-span-2 card">
          <div className="card-header flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-extrabold text-base text-slate-950">Glucose Trend Profile</h2>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">Continuous clinical self-monitoring points</p>
            </div>
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
          </div>
          <div className="card-body p-3.5 sm:p-6 min-w-0 overflow-hidden">
            {chartData.length > 0 ? (
              <div className="w-full min-w-0 overflow-hidden" style={{ minHeight: 260 }}>
                <ResponsiveContainer width="100%" height={280} minWidth={0}>
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                        <ReferenceLine y={targets.fastingGlucoseMax} stroke="#D97706" strokeDasharray="4 4" strokeWidth={2} />
                        <ReferenceLine y={targets.fastingGlucoseMin} stroke="#D97706" strokeDasharray="4 4" strokeWidth={2} />
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

        {/* Today's Schedule */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-extrabold text-base text-slate-950">Today's Regimen</h2>
            <span className="text-xs font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              {todayDoses.length} doses
            </span>
          </div>
          <div className="card-body space-y-3">
            {todayDoses.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle size={28} className="mx-auto text-emerald-600 mb-2" />
                <p className="text-sm font-bold text-slate-950">All Clear</p>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">No doses scheduled for today</p>
              </div>
            ) : (
              todayDoses.map(dose => (
                <div key={dose.id} className="flex items-center gap-3 p-3.5 rounded-xl border-2 border-slate-200 bg-white hover:border-slate-300 transition-colors">
                  {dose.status === 'taken' ? <CheckCircle size={20} className="text-emerald-700 shrink-0" /> :
                   dose.status === 'missed' ? <AlertTriangle size={20} className="text-rose-700 shrink-0" /> :
                   <Clock size={20} className="text-amber-700 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-950 truncate">{dose.medicineName}</p>
                    <p className="text-xs font-bold text-slate-700">{formatTime(dose.scheduledTime)}</p>
                  </div>
                  <Badge variant={dose.status === 'taken' ? 'success' : dose.status === 'missed' ? 'danger' : 'warning'}>
                    {dose.status.toUpperCase()}
                  </Badge>
                </div>
              ))
            )}
            <button
              onClick={() => navigate('/patient/medications')}
              className="w-full text-xs font-black uppercase tracking-wider text-teal-850 hover:text-teal-950 hover:underline py-2 cursor-pointer flex items-center justify-center gap-1.5 pt-3 border-t border-slate-200"
            >
              <span>Manage Prescriptions</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Upcoming Appointment */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-extrabold text-base text-slate-950">Next Consultation</h2>
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

        {/* Screening Reminders */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-extrabold text-base text-slate-950">Screening Checklist</h2>
          </div>
          <div className="card-body space-y-2.5">
            {dueScreenings.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle size={28} className="mx-auto text-emerald-600 mb-2" />
                <p className="text-sm font-bold text-slate-950">All Screenings Up to Date</p>
                <p className="text-xs font-semibold text-slate-700">Eye, foot, and kidney assessments verified</p>
              </div>
            ) : (
              dueScreenings.slice(0, 3).map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 bg-white">
                  <AlertCircle size={18} className={s.status === 'overdue' ? 'text-rose-600 shrink-0' : 'text-amber-600 shrink-0'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-950 truncate">{s.type}</p>
                    <p className="text-xs font-bold text-slate-700">{s.status === 'overdue' ? 'OVERDUE' : 'DUE'} — {formatDate(s.dueDate)}</p>
                  </div>
                </div>
              ))
            )}
            <button
              onClick={() => navigate('/patient/screening')}
              className="w-full text-xs font-black uppercase tracking-wider text-teal-850 hover:text-teal-950 hover:underline py-2 cursor-pointer flex items-center justify-center gap-1.5 pt-3 border-t border-slate-200"
            >
              <span>View Screening Schedule</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Recent Messages */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-extrabold text-base text-slate-950">Care Team Messages</h2>
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
    </div>
  );
}
