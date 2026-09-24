import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatCard, LoadingSpinner, Badge, SearchBar, EmptyState, Avatar, Modal } from '../../components/ui';
import {
  Users, AlertTriangle, Pill, CalendarDays, MessageSquare, TrendingUp,
  Activity, FileText, ArrowRight, Heart, History, Clock, CheckCircle,
  XCircle, Search, Filter, ShieldCheck, Stethoscope, ChevronRight, Eye
} from 'lucide-react';
import { formatDate, formatDateTime } from '../../data/demoDate';

export default function DoctorDashboard() {
  const { currentUser, data } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Prescription Logs Filter & Search State
  const [rxSearch, setRxSearch] = useState('');
  const [rxFilter, setRxFilter] = useState('all'); // 'all', 'past', 'active'
  const [selectedRxLog, setSelectedRxLog] = useState(null);

  useEffect(() => { setTimeout(() => setLoading(false), 300); }, []);

  const patients = useMemo(() => {
    const assigned = currentUser?.assignedPatients || [];
    return Object.values(data?.users || {}).filter(u => u.role === 'patient' && assigned.includes(u.id));
  }, [data?.users, currentUser]);

  const filteredPatients = useMemo(() =>
    search ? patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) : patients,
    [patients, search]);

  const escalations = useMemo(() =>
    (data?.medicationReviews || []).filter(r => r.status === 'escalated' || (r.status === 'open' && r.priority === 'high')),
    [data?.medicationReviews]);

  const pendingReferrals = useMemo(() =>
    (data?.counsellingRequests || []).filter(r => r.type === 'doctor_referral' && r.status !== 'completed'),
    [data?.counsellingRequests]);

  const upcomingApts = useMemo(() =>
    (data?.appointments || []).filter(a => a.doctorId === currentUser?.id && a.status === 'scheduled').sort((a, b) => new Date(a.date) - new Date(b.date)),
    [data?.appointments, currentUser]);

  // ── All Prescriptions with Patient History Metadata ─────────────────────
  const prescriptionLogs = useMemo(() => {
    const assignedIds = currentUser?.assignedPatients || ['pat-001', 'pat-002', 'pat-003'];
    const rxList = (data?.prescriptions || []).filter(rx => assignedIds.includes(rx.patientId));

    return rxList.map(rx => {
      const patient = data?.users?.[rx.patientId];
      const isPast = rx.status === 'discontinued' || rx.status === 'superseded' || rx.status === 'expired';
      return {
        ...rx,
        patientName: patient?.name || 'Patient',
        patientAge: patient?.age,
        patientGender: patient?.gender,
        patientDiabetes: patient?.diabetesType || 'Type 2',
        patientObj: patient,
        isPast,
      };
    }).sort((a, b) => new Date(b.authorizedAt || b.createdAt) - new Date(a.authorizedAt || a.createdAt));
  }, [data?.prescriptions, data?.users, currentUser]);

  const filteredRxLogs = useMemo(() => {
    return prescriptionLogs.filter(rx => {
      const matchSearch =
        rx.patientName.toLowerCase().includes(rxSearch.toLowerCase()) ||
        rx.id.toLowerCase().includes(rxSearch.toLowerCase()) ||
        (rx.medicines || []).some(m => m.name.toLowerCase().includes(rxSearch.toLowerCase())) ||
        (rx.notes || '').toLowerCase().includes(rxSearch.toLowerCase());

      if (!matchSearch) return false;
      if (rxFilter === 'past') return rx.isPast;
      if (rxFilter === 'active') return rx.status === 'active';
      return true;
    });
  }, [prescriptionLogs, rxSearch, rxFilter]);

  const pastRxCount = useMemo(() => prescriptionLogs.filter(rx => rx.isPast).length, [prescriptionLogs]);
  const activeRxCount = useMemo(() => prescriptionLogs.filter(rx => rx.status === 'active').length, [prescriptionLogs]);

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Clinician Header */}
      <div className="pb-2 border-b-2 border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">Clinician Command Center</h1>
          <p className="text-sm sm:text-base font-semibold text-slate-700 mt-1">Welcome back, {currentUser?.name} — Diabetology & Endocrinology</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/appointments')}
            className="btn-outline btn-sm font-bold"
          >
            <CalendarDays size={15} />
            <span>Consultation Schedule</span>
          </button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard label="Assigned Patients" value={patients.length} icon={Users} color="primary" onClick={() => navigate('/doctor/patients')} />
        <StatCard label="Critical Escalations" value={escalations.length} icon={AlertTriangle} color={escalations.length > 0 ? 'danger' : 'success'} onClick={() => navigate('/doctor/escalations')} />
        <StatCard label="Prescription History Logs" value={prescriptionLogs.length} icon={History} color="warning" subtitle={`${pastRxCount} past/discontinued • ${activeRxCount} active`} />
        <StatCard label="Pending Referrals" value={pendingReferrals.length} icon={Heart} color="secondary" onClick={() => navigate('/doctor/referrals')} />
      </div>

      {/* ── Main Doctor Portal Workspace ── */}
      {/* 3 Balanced Columns: Patient Cohort | Prescription Logs (History) | Consultations & Escalations */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── COLUMN 1: Patient Cohort Management ── */}
        <div className="card flex flex-col">
          <div className="card-header flex items-center justify-between flex-wrap gap-2 p-4 border-b border-slate-200">
            <div>
              <h2 className="font-extrabold text-base text-slate-950">Patient Cohort</h2>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">Live monitoring of assigned diabetic cohort</p>
            </div>
            <div className="w-full sm:w-44">
              <SearchBar value={search} onChange={setSearch} placeholder="Search patient..." />
            </div>
          </div>
          
          <div className="card-body p-0 flex-1 overflow-y-auto max-h-[560px]">
            <div className="divide-y divide-slate-100">
              {filteredPatients.map(p => {
                const hba1c = (data?.investigations || []).filter(i => i.patientId === p.id && i.type === 'HbA1c').sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                const doses = (data?.doseEvents || []).filter(e => e.patientId === p.id);
                const elapsed = doses.filter(e => new Date(e.scheduledTime) <= new Date() && e.status !== 'pending');
                const adherencePct = elapsed.length > 0 ? Math.round(elapsed.filter(e => e.status === 'taken').length / elapsed.length * 100) : null;
                const overdueScreenings = (data?.screenings || []).filter(s => s.patientId === p.id && s.status === 'overdue').length;

                return (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/doctor/patient/${p.id}`)}
                    className="p-3.5 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar user={p} size="sm" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-950 text-sm truncate group-hover:text-teal-900 transition">{p.name}</p>
                        <p className="text-xs font-semibold text-slate-600">
                          {p.age}y, {p.gender} • <span className="font-bold text-teal-800">{p.diabetesType}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs font-black text-slate-900">
                          HbA1c: {hba1c ? <span className={parseFloat(hba1c.value) > 7.5 ? 'text-amber-800' : 'text-emerald-800'}>{hba1c.value}%</span> : '—'}
                        </span>
                        {overdueScreenings > 0 ? (
                          <Badge variant="danger">{overdueScreenings} Overdue</Badge>
                        ) : (
                          <Badge variant="success">OK</Badge>
                        )}
                      </div>
                      <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                        Adherence: {adherencePct !== null ? `${adherencePct}%` : 'No data'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card-footer bg-slate-50 p-3 rounded-b-2xl border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">{filteredPatients.length} Patients Active</span>
            <button
              onClick={() => navigate('/doctor/patients')}
              className="text-xs font-extrabold text-teal-850 hover:text-teal-950 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Cohort</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* ── COLUMN 2: Prescription Logs (Past Prescription Patient History Data) ── */}
        <div className="card flex flex-col border-2 border-amber-600/30 hover:border-amber-600/50 shadow-sm transition-all">
          <div className="card-header bg-gradient-to-r from-amber-900 via-amber-850 to-amber-950 text-white rounded-t-2xl p-4">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-700/80 border border-amber-500/40 flex items-center justify-center shadow-inner shrink-0">
                  <History size={19} className="text-amber-200" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-extrabold text-base text-white leading-tight truncate">Prescription Logs</h2>
                  <p className="text-[11px] text-amber-200/90 font-medium truncate">Past Patient Regimens & History Data</p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-800 border border-amber-400/40 px-2 py-0.5 rounded-full text-amber-100 shrink-0">
                {filteredRxLogs.length} Records
              </span>
            </div>

            {/* Filter Tabs & Search */}
            <div className="space-y-2 pt-1 border-t border-amber-800/80">
              <div className="flex bg-amber-950/80 p-0.5 rounded-lg text-xs font-bold gap-0.5">
                {[
                  { id: 'all', label: `All (${prescriptionLogs.length})` },
                  { id: 'past', label: `Past / History (${pastRxCount})` },
                  { id: 'active', label: `Active (${activeRxCount})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setRxFilter(tab.id)}
                    className={`flex-1 py-1 rounded text-[11px] font-bold transition cursor-pointer text-center ${
                      rxFilter === tab.id
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-amber-300 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={rxSearch}
                  onChange={(e) => setRxSearch(e.target.value)}
                  placeholder="Filter by patient, medicine or note..."
                  className="w-full bg-amber-950/60 border border-amber-700/70 text-white placeholder:text-amber-300/60 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          <div className="card-body p-3 flex-1 space-y-2.5 overflow-y-auto max-h-[500px] bg-slate-50/60">
            {filteredRxLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-600 text-xs font-semibold">
                No prescription logs match your filter
              </div>
            ) : (
              filteredRxLogs.map(rx => (
                <div
                  key={rx.id}
                  onClick={() => setSelectedRxLog(rx)}
                  className={`p-3 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${
                    rx.isPast
                      ? 'bg-white border-amber-200/90 hover:border-amber-400'
                      : 'bg-white border-slate-200 hover:border-teal-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar user={rx.patientObj} size="xs" />
                      <div className="min-w-0">
                        <p className="font-extrabold text-xs sm:text-sm text-slate-950 truncate">
                          {rx.patientName}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-600">
                          ID: <span className="font-mono font-bold text-slate-800">{rx.id.toUpperCase()}</span> • {formatDate(rx.authorizedAt || rx.createdAt)}
                        </p>
                      </div>
                    </div>

                    <Badge variant={rx.status === 'active' ? 'success' : rx.status === 'discontinued' ? 'danger' : 'warning'}>
                      {rx.status.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Medicines in this prescription */}
                  <div className="mt-2 space-y-1">
                    {(rx.medicines || []).map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Pill size={12} className={rx.isPast ? 'text-amber-700' : 'text-teal-700'} />
                          <span className="font-bold text-slate-900 truncate">{m.name}</span>
                          <span className="text-[10px] font-semibold text-slate-600">({m.dose})</span>
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-700 shrink-0">
                          {m.frequency}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Historical Reason / Clinical Note */}
                  {rx.notes && (
                    <div className="mt-2 p-1.5 bg-amber-50/70 border border-amber-200/70 rounded-lg text-[11px] text-amber-950 font-medium">
                      <p className="line-clamp-2">
                        <strong>History Note:</strong> {rx.notes}
                      </p>
                    </div>
                  )}

                  {/* Audit Version Tag */}
                  <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-600">
                    <span className="flex items-center gap-1">
                      <Clock size={11} className="text-slate-500" />
                      Version {rx.versions?.length || 1} • {rx.versions?.[rx.versions.length - 1]?.action || 'Logged'}
                    </span>
                    <span className="font-bold text-teal-850 hover:underline flex items-center gap-0.5">
                      <span>View Audit</span>
                      <ChevronRight size={11} />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="card-footer bg-slate-50 p-3 rounded-b-2xl border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600">Tamper-evident audit trail</span>
            <button
              onClick={() => navigate('/doctor/prescriptions')}
              className="text-xs font-extrabold text-amber-900 hover:text-amber-950 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Full Prescription Console</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* ── COLUMN 3: Upcoming Consultations & Clinical Escalations ── */}
        <div className="space-y-6">
          {/* Upcoming Consultations */}
          <div className="card">
            <div className="card-header flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="font-extrabold text-base text-slate-950 flex items-center gap-2">
                <CalendarDays size={18} className="text-blue-700" />
                <span>Upcoming Consultations</span>
              </h2>
              <span className="text-xs font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                {upcomingApts.length} Scheduled
              </span>
            </div>
            <div className="card-body p-3 space-y-2.5 max-h-[250px] overflow-y-auto">
              {upcomingApts.map(a => {
                const patient = data?.users?.[a.patientId];
                return (
                  <div key={a.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar user={patient} size="xs" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-950 truncate">{patient?.name}</p>
                        <p className="text-[10px] font-semibold text-slate-600">{formatDateTime(a.date)} • {a.type}</p>
                      </div>
                    </div>
                    <Badge variant="info">
                      {a.status.toUpperCase()}
                    </Badge>
                  </div>
                );
              })}
              {upcomingApts.length === 0 && (
                <p className="text-xs font-semibold text-slate-600 text-center py-4">No upcoming appointments scheduled</p>
              )}
            </div>
          </div>

          {/* Active Clinical Escalations */}
          <div className="card border-2 border-rose-300">
            <div className="card-header border-b border-rose-200 bg-rose-50/60 rounded-t-2xl p-4 flex items-center justify-between">
              <h2 className="font-extrabold text-base text-rose-950 flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-600" />
                <span>Clinical Escalations</span>
              </h2>
              <Badge variant="danger">{escalations.length} Active</Badge>
            </div>
            <div className="card-body p-3 space-y-2.5 max-h-[250px] overflow-y-auto">
              {escalations.map(e => {
                const patient = data?.users?.[e.patientId];
                return (
                  <div key={e.id} className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-extrabold text-rose-950 truncate">{patient?.name}</p>
                      <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-100 px-1.5 rounded">
                        {e.priority || 'HIGH'}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-800">{e.type.replace('_', ' ').toUpperCase()}: {e.medicine}</p>
                    <p className="text-[10px] font-medium text-slate-600 line-clamp-2">{e.concern || e.notes}</p>
                  </div>
                );
              })}
              {escalations.length === 0 && (
                <p className="text-xs font-semibold text-emerald-800 text-center py-4 flex items-center justify-center gap-1">
                  <CheckCircle size={14} className="text-emerald-600" />
                  No clinical escalations pending
                </p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── Prescription Log Detailed History Modal ── */}
      {selectedRxLog && (
        <Modal
          open={!!selectedRxLog}
          onClose={() => setSelectedRxLog(null)}
          title={`Prescription Audit Log: ${selectedRxLog.id.toUpperCase()}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Patient & Prescription Status Header */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar user={selectedRxLog.patientObj} size="md" />
                <div>
                  <h3 className="font-extrabold text-base text-slate-950">{selectedRxLog.patientName}</h3>
                  <p className="text-xs font-semibold text-slate-600">
                    {selectedRxLog.patientAge} years, {selectedRxLog.patientGender} • {selectedRxLog.patientDiabetes}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <Badge variant={selectedRxLog.status === 'active' ? 'success' : selectedRxLog.status === 'discontinued' ? 'danger' : 'warning'}>
                  {selectedRxLog.status.toUpperCase()}
                </Badge>
                <p className="text-[11px] font-semibold text-slate-500 mt-1">
                  Authorized: {formatDate(selectedRxLog.authorizedAt || selectedRxLog.createdAt)}
                </p>
              </div>
            </div>

            {/* Prescribed Medications */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Prescribed Pharmaceuticals</h4>
              <div className="space-y-2">
                {(selectedRxLog.medicines || []).map((med, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 flex items-start justify-between gap-3 shadow-xs">
                    <div className="space-y-0.5">
                      <p className="font-extrabold text-sm text-slate-950">{med.name} <span className="text-xs text-teal-800">({med.dose})</span></p>
                      <p className="text-xs font-semibold text-slate-600">Route: {med.route} • Frequency: {med.frequency}</p>
                      <p className="text-xs font-medium text-slate-700 italic">Instructions: {med.instructions || med.foodInstruction}</p>
                    </div>
                    <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-md">
                      {med.times?.join(', ') || 'Scheduled'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinical Indications & Discontinuation Reason */}
            {selectedRxLog.notes && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1">
                <p className="font-extrabold uppercase tracking-wider text-amber-900">Clinical History & Decision Notes</p>
                <p className="leading-relaxed font-medium">{selectedRxLog.notes}</p>
              </div>
            )}

            {/* Complete Immutable Version Audit Trail */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-teal-700" />
                Immutable Version Audit Trail
              </h4>
              <div className="space-y-2">
                {(selectedRxLog.versions || []).map((v, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <span className="w-6 h-6 rounded-full bg-teal-800 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      v{v.version}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-950">{v.action}</span>
                        <span className="text-[10px] font-semibold text-slate-500">{formatDateTime(v.date)}</span>
                      </div>
                      <p className="text-slate-700 mt-0.5">{v.changes}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setSelectedRxLog(null)}
                className="btn-outline btn-sm font-bold"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
