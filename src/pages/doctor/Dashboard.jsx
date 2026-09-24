import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatCard, LoadingSpinner, Badge, SearchBar, EmptyState, Avatar } from '../../components/ui';
import { Users, AlertTriangle, Pill, CalendarDays, MessageSquare, TrendingUp, Activity, FileText, ArrowRight, Heart } from 'lucide-react';
import { formatDate, formatDateTime } from '../../data/demoDate';

export default function DoctorDashboard() {
  const { currentUser, data } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      <div className="pb-2 border-b-2 border-slate-200">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">Clinician Command Center</h1>
        <p className="text-sm sm:text-base font-semibold text-slate-700 mt-1">Welcome back, {currentUser?.name} — Diabetology & Endocrinology</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard label="Assigned Patients" value={patients.length} icon={Users} color="primary" onClick={() => navigate('/doctor/patients')} />
        <StatCard label="Critical Escalations" value={escalations.length} icon={AlertTriangle} color={escalations.length > 0 ? 'danger' : 'success'} onClick={() => navigate('/doctor/escalations')} />
        <StatCard label="Today's Consultations" value={upcomingApts.filter(a => new Date(a.date).toDateString() === new Date().toDateString()).length} icon={CalendarDays} color="secondary" onClick={() => navigate('/appointments')} />
        <StatCard label="Pending Referrals" value={pendingReferrals.length} icon={Heart} color="warning" onClick={() => navigate('/doctor/referrals')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="card-header flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-extrabold text-base text-slate-950">Patient Cohort Management</h2>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">Live monitoring of adherence, screenings, and glycemic levels</p>
            </div>
            <div className="w-full sm:w-64"><SearchBar value={search} onChange={setSearch} placeholder="Search cohort..." /></div>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Patient</th><th>Type</th><th>Last HbA1c</th><th>Adherence</th><th>Screenings</th><th></th></tr></thead>
              <tbody>
                {filteredPatients.map(p => {
                  const hba1c = (data?.investigations || []).filter(i => i.patientId === p.id && i.type === 'HbA1c').sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                  const doses = (data?.doseEvents || []).filter(e => e.patientId === p.id);
                  const elapsed = doses.filter(e => new Date(e.scheduledTime) <= new Date() && e.status !== 'pending');
                  const adherencePct = elapsed.length > 0 ? Math.round(elapsed.filter(e => e.status === 'taken').length / elapsed.length * 100) : null;
                  const overdueScreenings = (data?.screenings || []).filter(s => s.patientId === p.id && s.status === 'overdue').length;

                  return (
                    <tr key={p.id} className="cursor-pointer" onClick={() => navigate(`/doctor/patient/${p.id}`)}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar user={p} size="sm" />
                          <div>
                            <p className="font-bold text-slate-950 text-sm">{p.name}</p>
                            <p className="text-xs font-bold text-slate-700">{p.age}y, {p.gender}</p>
                          </div>
                        </div>
                      </td>
                      <td><Badge variant="info">{p.diabetesType}</Badge></td>
                      <td>{hba1c ? <span className={parseFloat(hba1c.value) > 7.5 ? 'text-amber-800 font-extrabold' : 'text-emerald-800 font-extrabold'}>{hba1c.value}%</span> : '—'}</td>
                      <td>{adherencePct !== null ? <span className={adherencePct >= 80 ? 'text-emerald-800 font-extrabold' : 'text-amber-800 font-extrabold'}>{adherencePct}%</span> : '—'}</td>
                      <td>{overdueScreenings > 0 ? <Badge variant="danger">{overdueScreenings} overdue</Badge> : <Badge variant="success">Up to date</Badge>}</td>
                      <td><ArrowRight size={16} className="text-slate-700" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <div className="card-header"><h2 className="font-extrabold text-base text-slate-950">Upcoming Consultations</h2></div>
            <div className="card-body space-y-3">
              {upcomingApts.slice(0, 5).map(a => {
                const patient = data?.users?.[a.patientId];
                return (
                  <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-white">
                    <Avatar user={patient} size="xs" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-950 truncate">{patient?.name}</p>
                      <p className="text-xs font-semibold text-slate-700">{formatDateTime(a.date)} • {a.type}</p>
                    </div>
                  </div>
                );
              })}
              {upcomingApts.length === 0 && <p className="text-sm font-semibold text-slate-700 text-center py-4">No upcoming appointments</p>}
            </div>
          </div>

          <div className="card">
            <div className="card-header border-b border-rose-200 bg-rose-50/50 rounded-t-2xl">
              <h2 className="font-extrabold text-base text-rose-950">Active Clinical Escalations</h2>
            </div>
            <div className="card-body space-y-3">
              {escalations.slice(0, 5).map(e => {
                const patient = data?.users?.[e.patientId];
                return (
                  <div key={e.id} className="flex items-start gap-3 p-2 bg-red-50 rounded-lg">
                    <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                    <div><p className="text-sm font-medium">{patient?.name}: {e.type.replace('_', ' ')}</p><p className="text-xs text-text-secondary">{e.concern?.slice(0, 80)}...</p></div>
                  </div>
                );
              })}
              {escalations.length === 0 && <p className="text-sm text-text-secondary text-center py-4">No escalations</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
