import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Avatar, Badge, LoadingSpinner } from '../../components/ui';
import {
  Activity, AlertTriangle, CheckCircle, Clock, Calendar,
  TrendingDown, TrendingUp, Heart, Pill, Send, ShieldAlert,
  ArrowRight, Users, ChevronRight, BarChart3, AlertCircle
} from 'lucide-react';
import { formatDate, formatTime } from '../../data/demoDate';

export default function MedicationAdherence() {
  const { currentUser, data, addToast } = useApp();
  const navigate = useNavigate();

  const [selectedPatientId, setSelectedPatientId] = useState('pat-001');

  const allPatients = useMemo(() => {
    const users = Object.values(data?.users || {}).filter(u => u.role === 'patient');
    if (users.length === 0) {
      return [
        { id: 'pat-001', name: 'Priya Sharma', diabetesType: 'Type 2 Diabetes', age: 48 },
        { id: 'pat-002', name: 'Rajesh Kumar', diabetesType: 'Type 2 Diabetes (Insulin)', age: 56 },
        { id: 'pat-003', name: 'Ananya Patel', diabetesType: 'Type 1 Diabetes', age: 32 },
        { id: 'pat-004', name: 'Vikram Malhotra', diabetesType: 'Type 2 Diabetes', age: 62 },
      ];
    }
    return users;
  }, [data?.users]);

  // Dose Events analysis
  const doseEvents = useMemo(() => data?.doseEvents || [], [data?.doseEvents]);

  // Calculate cohort adherence metrics
  const cohortMetrics = useMemo(() => {
    const patientStats = allPatients.map(p => {
      const pDoses = doseEvents.filter(d => d.patientId === p.id);
      const taken = pDoses.filter(d => d.status === 'taken').length;
      const missed = pDoses.filter(d => d.status === 'missed' || (new Date(d.scheduledTime) < new Date() && d.status === 'pending')).length;
      const total = pDoses.length || 30;
      const pct = pDoses.length > 0 ? Math.round((taken / total) * 100) : (p.id === 'pat-002' ? 68 : 88);

      return {
        ...p,
        totalDoses: total,
        takenDoses: taken || Math.round(total * (pct / 100)),
        missedDoses: missed || Math.round(total * ((100 - pct) / 100)),
        adherencePct: pct,
        status: pct >= 80 ? 'Optimal (≥80%)' : pct >= 70 ? 'Suboptimal (70-79%)' : 'High Risk (<70%)',
      };
    });

    const highRiskCount = patientStats.filter(p => p.adherencePct < 80).length;
    const avgAdherence = Math.round(patientStats.reduce((s, p) => s + p.adherencePct, 0) / (patientStats.length || 1));

    return {
      patientStats,
      highRiskCount,
      avgAdherence,
    };
  }, [allPatients, doseEvents]);

  const activePatient = cohortMetrics.patientStats.find(p => p.id === selectedPatientId) || cohortMetrics.patientStats[0];

  // Specific dose telemetry for selected patient
  const patientDoses = useMemo(() => {
    return doseEvents.filter(d => d.patientId === selectedPatientId);
  }, [doseEvents, selectedPatientId]);

  // Simulated missed doses with clinical tags if none in DB
  const recentMissedDoses = useMemo(() => {
    const realMissed = patientDoses.filter(d => d.status === 'missed');
    if (realMissed.length > 0) return realMissed;

    return [
      {
        id: 'ms-01',
        medicineName: 'Glimepiride 1mg',
        scheduledTime: new Date(Date.now() - 2 * 86400000).toISOString(),
        mealSlot: 'Morning (Pre-Breakfast)',
        reason: 'Reported mild gastrointestinal queasiness',
        riskNote: 'Risk of post-breakfast hyperglycemia spike',
      },
      {
        id: 'ms-02',
        medicineName: 'Metformin 500mg',
        scheduledTime: new Date(Date.now() - 5 * 86400000).toISOString(),
        mealSlot: 'Evening (Dinner)',
        reason: 'Delayed return from work; pill box not carried',
        riskNote: 'Isolated missed dose; glycemic control maintained',
      },
    ];
  }, [patientDoses]);

  // Refill gaps simulation
  const refillGaps = [
    {
      medicine: 'Metformin HCl 500mg',
      expectedRefill: 'Oct 28, 2026',
      actualRefill: 'Nov 02, 2026',
      gapDays: 5,
      impact: '5 days unmedicated window; elevated fasting glucose observed (+18 mg/dL)',
      status: 'Resolved with Buffer Stock',
    },
    {
      medicine: 'Telmisartan 40mg',
      expectedRefill: 'Nov 01, 2026',
      actualRefill: 'Pending Refill Request',
      gapDays: 4,
      impact: 'Current supply exhausted; risk of rebound hypertension',
      status: 'Active Intervention Needed',
    },
  ];

  const handleSendReminder = (patientName) => {
    addToast({
      type: 'success',
      message: `🔔 Adherence nudge & schedule reminder pushed to ${patientName}'s mobile app.`,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl border-2 border-[#E8DCC8] p-5 sm:p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#046A38] bg-[#E8F5EE] px-2.5 py-1 rounded-full border border-[#A8D7BD]">
              Pharmacotherapy Compliance Engine
            </span>
            <span className="text-xs text-stone-300">•</span>
            <span className="text-xs font-bold text-stone-600">
              Proportion of Days Covered (PDC)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight flex items-center gap-2.5">
            <Activity className="text-[#046A38] shrink-0" size={28} />
            <span>Medication Adherence &amp; Refill Gap Surveillance</span>
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1 max-w-2xl leading-relaxed">
            Monitor real-time dose events, identify non-adherence patterns, detect refill gaps between prescription cycles, and execute Pharm D compliance interventions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={() => navigate('/pharmacist/counselling')}
            className="btn-primary btn-sm font-bold flex items-center gap-1.5"
          >
            <Heart size={14} /> Schedule Pharm D Counselling
          </button>
        </div>
      </div>

      {/* ── Population Adherence KPI Cards ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 bg-white rounded-3xl border-2 border-slate-200 shadow-xs">
          <p className="text-xs font-black uppercase text-slate-600">Cohort Average PDC</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-slate-950">{cohortMetrics.avgAdherence}%</span>
            <span className="text-xs font-bold text-emerald-800">Target &ge; 80%</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full mt-3 overflow-hidden border border-slate-200">
            <div className="bg-[#046A38] h-full rounded-full" style={{ width: `${cohortMetrics.avgAdherence}%` }} />
          </div>
        </div>

        <div className="card p-5 bg-white rounded-3xl border-2 border-amber-300 shadow-xs bg-amber-50/20">
          <p className="text-xs font-black uppercase text-amber-900">Non-Adherent Patients</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-amber-950">{cohortMetrics.highRiskCount}</span>
            <span className="text-xs font-bold text-amber-800">Below 80% Threshold</span>
          </div>
          <p className="text-[11px] font-semibold text-slate-600 mt-2">
            Priority candidates for Pharm D counseling and regimen simplification.
          </p>
        </div>

        <div className="card p-5 bg-white rounded-3xl border-2 border-slate-200 shadow-xs">
          <p className="text-xs font-black uppercase text-slate-600">Active Refill Gaps</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-slate-950">2 Cases</span>
            <span className="text-xs font-bold text-rose-700">Supply Friction</span>
          </div>
          <p className="text-[11px] font-semibold text-slate-600 mt-2">
            Automated notifications dispatched to patient app for refill authorization.
          </p>
        </div>
      </div>

      {/* ── Patient Selector Ribbon ─────────────────────────────────── */}
      <div className="bg-white p-4 rounded-3xl border-2 border-[#E8DCC8] shadow-xs">
        <p className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3">
          Select Patient to Inspect Detailed Adherence Telemetry:
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {cohortMetrics.patientStats.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPatientId(p.id)}
              className={`p-3 rounded-2xl border-2 text-left shrink-0 transition-all cursor-pointer min-w-[200px] ${
                selectedPatientId === p.id
                  ? 'bg-[#E8F5EE] border-[#046A38] ring-1 ring-[#046A38]'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-slate-950">{p.name}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                  p.adherencePct >= 80 ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                }`}>
                  {p.adherencePct}%
                </span>
              </div>
              <p className="text-[10px] font-semibold text-slate-500 mt-1">{p.diabetesType}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Detailed Telemetry for Selected Patient ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Dose-Taking Patterns by Time of Day */}
        <div className="card bg-white rounded-3xl border-2 border-[#E8DCC8] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-950">Medicine-Taking Patterns</h3>
              <p className="text-xs font-semibold text-slate-600">{activePatient?.name} — 30-Day Timing Analysis</p>
            </div>
            <button
              onClick={() => handleSendReminder(activePatient?.name)}
              className="btn-outline btn-sm text-xs font-bold flex items-center gap-1.5"
            >
              <Send size={13} /> Send Nudge
            </button>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-800">Morning Doses (Breakfast / 08:00)</span>
                <span className="text-emerald-800 font-black">94% Compliant</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                <div className="bg-[#046A38] h-full rounded-full" style={{ width: '94%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-800">Afternoon / Mid-Day (13:00)</span>
                <span className="text-amber-800 font-black">72% Compliant (Friction Area)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                <div className="bg-amber-600 h-full rounded-full" style={{ width: '72%' }} />
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Frequent missed doses due to work meetings away from medicine kit.</p>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-800">Bedtime Doses (Statins &amp; Basal Insulin / 21:00-22:00)</span>
                <span className="text-emerald-800 font-black">90% Compliant</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                <div className="bg-[#046A38] h-full rounded-full" style={{ width: '90%' }} />
              </div>
            </div>
          </div>

          {/* Missed Dose History Table */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-black uppercase text-slate-900 mb-2.5 flex items-center gap-1.5">
              <AlertTriangle size={15} className="text-amber-600" /> Recent Documented Missed Doses
            </h4>
            <div className="space-y-2">
              {recentMissedDoses.map((m, i) => (
                <div key={i} className="p-3 rounded-2xl bg-amber-50/50 border border-amber-200 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-amber-950">{m.medicineName}</span>
                    <span className="text-[10px] font-bold text-amber-800">{m.mealSlot}</span>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-700 mt-1">Reason: {m.reason}</p>
                  <p className="text-[10px] font-bold text-[#046A38] mt-0.5">Clinical Note: {m.riskNote}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Refill Gaps Surveillance & Actions */}
        <div className="card bg-white rounded-3xl border-2 border-[#E8DCC8] p-5 sm:p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-950">Refill Gaps &amp; Therapy Continuity</h3>
            <p className="text-xs font-semibold text-slate-600">Prescription cycle tracking &amp; refill compliance</p>
          </div>

          <div className="space-y-3">
            {refillGaps.map((gap, i) => (
              <div key={i} className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-black text-xs sm:text-sm text-slate-950">{gap.medicine}</p>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    gap.gapDays > 0 ? 'bg-rose-100 text-rose-900 border border-rose-300' : 'bg-emerald-100 text-emerald-900'
                  }`}>
                    {gap.gapDays} Days Gap
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 font-semibold">
                  <div>Expected: <span className="text-slate-900 font-bold">{gap.expectedRefill}</span></div>
                  <div>Actual / Status: <span className="text-slate-900 font-bold">{gap.actualRefill}</span></div>
                </div>
                <p className="text-[11px] font-bold text-amber-900 bg-amber-50 p-2 rounded-xl border border-amber-200">
                  {gap.impact}
                </p>
              </div>
            ))}
          </div>

          {/* Intervention Call-out */}
          <div className="p-4 rounded-2xl bg-[#FAF6EF] border border-[#E8DCC8] space-y-2">
            <h4 className="text-xs font-black text-slate-950">Pharm D Clinical Recommendations:</h4>
            <ul className="text-xs font-medium text-slate-700 space-y-1 list-disc list-inside">
              <li>Align Glimepiride and Telmisartan refill cycles to the same monthly date to prevent separate pharmacy visits.</li>
              <li>Provide digital blister pill organizer or sync phone calendar notifications.</li>
              <li>Re-evaluate Metformin GI tolerance; consider switching to Metformin SR (Sustained Release).</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

