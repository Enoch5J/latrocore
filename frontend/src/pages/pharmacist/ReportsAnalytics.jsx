import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Avatar, Badge, LoadingSpinner } from '../../components/ui';
import {
  BarChart3, TrendingUp, TrendingDown, Download, FileText,
  CheckCircle, AlertTriangle, ShieldCheck, Stethoscope, Heart,
  Users, Activity, Calendar, Printer, Share2
} from 'lucide-react';
import { formatDate } from '../../data/demoDate';

export default function ReportsAnalytics() {
  const { data, addToast } = useApp();
  const navigate = useNavigate();

  const [dateRange, setDateRange] = useState('90d');

  const interventions = [
    {
      id: 'int-01',
      date: 'Nov 04, 2026',
      patientName: 'Priya Sharma',
      type: 'Drug-Drug Interaction Intercepted',
      details: 'Flagged potential Clarithromycin + Atorvastatin interaction (CYP3A4 inhibition rhabdomyolysis risk). Consulted Dr. Arun; substituted with Azithromycin.',
      impact: 'Prevented severe statin-induced myopathy',
      status: 'Doctor Authorized Change',
    },
    {
      id: 'int-02',
      date: 'Oct 28, 2026',
      patientName: 'Rajesh Kumar',
      type: 'Insulin Injection Technique Correction',
      details: 'Patient had been withdrawing needle immediately after depressing plunger. Counselled on standard 10-second subcutaneous hold.',
      impact: 'Eliminated dose backflow; lowered post-prandial glucose by 24 mg/dL',
      status: 'Counselling Completed',
    },
    {
      id: 'int-03',
      date: 'Oct 15, 2026',
      patientName: 'Vikram Malhotra',
      type: 'Allergy Screen & Regimen Protection',
      details: 'Intercepted radiocontrast scan appointment while on Metformin. Enforced 48-hour pre/post scan metformin suspension protocol.',
      impact: 'Eliminated acute contrast-induced lactic acidosis risk',
      status: 'Protocol Implemented',
    },
    {
      id: 'int-04',
      date: 'Oct 02, 2026',
      patientName: 'Ananya Patel',
      type: 'Refill Synchronization & Adherence Optimization',
      details: 'Aligned basal and bolus insulin refill schedules to the 1st of each month to remove pharmacy visit friction.',
      impact: 'Adherence improved from 74% to 92%',
      status: 'Refill Synced',
    },
  ];

  const handleExportReport = () => {
    addToast({
      type: 'success',
      message: '📄 Pharmacotherapy Analytics & Clinical Intervention Report exported as PDF.',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl border-2 border-[#E8DCC8] p-5 sm:p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#046A38] bg-[#E8F5EE] px-2.5 py-1 rounded-full border border-[#A8D7BD]">
              Clinical Intelligence &amp; Governance
            </span>
            <span className="text-xs text-stone-300">•</span>
            <span className="text-xs font-bold text-stone-600">
              Pharm D Clinical Audit Ledger
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="text-[#046A38] shrink-0" size={28} />
            <span>Reports, Clinical Analytics &amp; Interventions</span>
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1 max-w-2xl leading-relaxed">
            Longitudinal population compliance trends, refill synchrony indices, correlation of adherence with HbA1c reductions, and documented pharmacist clinical interventions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={handleExportReport}
            className="btn-primary btn-sm font-bold flex items-center gap-1.5 shadow-xs"
          >
            <Download size={14} /> Export Clinical Summary PDF
          </button>
        </div>
      </div>

      {/* ── Key Impact Metrics ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 bg-white rounded-3xl border-2 border-slate-200 shadow-xs">
          <p className="text-xs font-black uppercase text-slate-600">Adherence Rate (&ge;80% PDC)</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-[#046A38]">82.4%</span>
            <span className="text-xs font-bold text-emerald-800">&uarr; +6.2% QoQ</span>
          </div>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">Population in optimal compliance</p>
        </div>

        <div className="card p-5 bg-white rounded-3xl border-2 border-slate-200 shadow-xs">
          <p className="text-xs font-black uppercase text-slate-600">Mean HbA1c Reduction</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-teal-900">-0.9%</span>
            <span className="text-xs font-bold text-emerald-800">8.1% &rarr; 7.2%</span>
          </div>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">6-month compliant cohort effect</p>
        </div>

        <div className="card p-5 bg-white rounded-3xl border-2 border-slate-200 shadow-xs">
          <p className="text-xs font-black uppercase text-slate-600">Interventions Documented</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-blue-900">38</span>
            <span className="text-xs font-bold text-blue-800">100% Resolved</span>
          </div>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">Drug safety &amp; dose optimizations</p>
        </div>

        <div className="card p-5 bg-white rounded-3xl border-2 border-slate-200 shadow-xs">
          <p className="text-xs font-black uppercase text-slate-600">Pharm D Hours Delivered</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-purple-900">46.5 hrs</span>
            <span className="text-xs font-bold text-purple-800">Direct Patient Care</span>
          </div>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">Insulin &amp; lifestyle consultations</p>
        </div>
      </div>

      {/* ── Correlation Analysis: Adherence vs HbA1c Reduction ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-white rounded-3xl border-2 border-[#E8DCC8] p-5 sm:p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-950">Glycemic Impact: Adherence vs. HbA1c</h3>
            <p className="text-xs font-semibold text-slate-600">Clinical outcome comparison stratified by 30-day compliance level</p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-emerald-950">High Compliance Cohort (&ge; 80% PDC)</span>
                <span className="text-xs font-black text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-300">
                  Mean HbA1c: 6.9%
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-700">
                Patients achieving &ge;80% daily dose adherence demonstrated an average HbA1c drop of 1.1% over 180 days with zero severe hypoglycemia episodes.
              </p>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full" style={{ width: '85%' }} />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-amber-950">Suboptimal Cohort (&lt; 80% PDC)</span>
                <span className="text-xs font-black text-amber-900 bg-white px-2 py-0.5 rounded-md border border-amber-300">
                  Mean HbA1c: 8.3%
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-700">
                Missed doses correlated with persistent glucose excursions (&gt;180 mg/dL post-meal) and higher microalbuminuria detection rates.
              </p>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-600 h-full rounded-full" style={{ width: '48%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Refill Gaps & On-Time Performance */}
        <div className="card bg-white rounded-3xl border-2 border-[#E8DCC8] p-5 sm:p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-950">Prescription Refill Timeliness</h3>
            <p className="text-xs font-semibold text-slate-600">On-time dispensary fulfillment rate over past 90 days</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6EF] border border-[#E8DCC8] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900">On-Time Refills (&plusmn;2 days of runout)</span>
              <span className="font-black text-emerald-800 text-sm">88.5%</span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Minor Gap (3 to 6 days delay)</span>
              <span className="text-amber-800">8.2%</span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Prolonged Gap (&gt; 7 days unmedicated)</span>
              <span className="text-rose-700">3.3%</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-600 pt-2 border-t border-[#E8DCC8]">
              Automated mobile reminders reduce delayed refills by 42% compared to unmanaged baseline.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 text-xs font-semibold flex items-start gap-2.5">
            <ShieldCheck size={18} className="text-blue-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-xs text-blue-900">Quality Improvement Metric:</p>
              Consolidating multi-drug refill dates onto a single monthly calendar day increased continuous adherence compliance by 19% across diabetic cohorts.
            </div>
          </div>
        </div>
      </div>

      {/* ── Pharmacist Clinical Interventions Ledger ────────────────── */}
      <div className="card bg-white rounded-3xl border-2 border-[#E8DCC8] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-950">Documented Pharmacist Interventions Ledger</h3>
            <p className="text-xs font-semibold text-slate-600">Auditable clinical interventions with physician collaboration and patient outcomes</p>
          </div>
          <span className="text-xs font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-800">
            {interventions.length} Recent Cases
          </span>
        </div>

        <div className="space-y-3">
          {interventions.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/50 space-y-2 hover:border-[#046A38]/50 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs text-slate-950">{item.patientName}</span>
                  <span className="text-[10px] font-bold text-slate-500">• {item.date}</span>
                  <Badge variant="info">{item.type}</Badge>
                </div>
                <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 self-start sm:self-auto">
                  ✓ {item.status}
                </span>
              </div>

              <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                {item.details}
              </p>

              <div className="p-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#046A38] flex items-center gap-1.5">
                <CheckCircle size={14} className="text-emerald-700 shrink-0" />
                <span>Clinical Impact: {item.impact}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

