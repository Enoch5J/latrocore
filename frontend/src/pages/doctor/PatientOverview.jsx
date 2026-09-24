import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { LoadingSpinner, Badge, Tabs, Modal, StatCard, Avatar } from '../../components/ui';
import { Activity, Pill, FileText, AlertTriangle, CheckCircle, Clock, ArrowLeft, Settings, Plus, Calendar, Heart, Send, XCircle } from 'lucide-react';
import { formatDate, formatDateTime, formatTime } from '../../data/demoDate';
import { addPrescription, authorizePrescription, updatePrescription, setClinicalTargets, addNotification, addAuditEntry, addCounsellingRequest } from '../../services/dataService';
import { genId } from '../../data/seedData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function PatientOverview({ initialTab }) {
  const { id: paramPatientId } = useParams();
  const { currentUser, data, refreshData, addToast } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const [showRxForm, setShowRxForm] = useState(false);
  const [showTargetForm, setShowTargetForm] = useState(false);
  const [showReferralForm, setShowReferralForm] = useState(false);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => { setTimeout(() => setLoading(false), 300); }, []);

  const patientId = paramPatientId || currentUser?.assignedPatients?.[0] || 'pat-001';
  const patient = data?.users?.[patientId];
  const readings = useMemo(() => (data?.glucoseReadings || []).filter(r => r.patientId === patientId).sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime)), [data, patientId]);
  const prescriptions = useMemo(() => (data?.prescriptions || []).filter(p => p.patientId === patientId), [data, patientId]);
  const investigations = useMemo(() => (data?.investigations || []).filter(i => i.patientId === patientId).sort((a, b) => new Date(b.date) - new Date(a.date)), [data, patientId]);
  const doses = useMemo(() => (data?.doseEvents || []).filter(e => e.patientId === patientId), [data, patientId]);
  const screenings = useMemo(() => (data?.screenings || []).filter(s => s.patientId === patientId), [data, patientId]);
  const reviews = useMemo(() => (data?.medicationReviews || []).filter(r => r.patientId === patientId), [data, patientId]);
  const targets = useMemo(() => (data?.clinicalTargets || []).find(t => t.patientId === patientId), [data, patientId]);
  const safetyEvents = useMemo(() => (data?.safetyEvents || []).filter(e => e.patientId === patientId), [data, patientId]);

  const adherence = useMemo(() => {
    const now = new Date();
    const elapsed = doses.filter(e => new Date(e.scheduledTime) <= now && e.status !== 'pending');
    if (!elapsed.length) return null;
    return Math.round(elapsed.filter(e => e.status === 'taken').length / elapsed.length * 100);
  }, [doses]);

  const chartData = useMemo(() =>
    [...readings].reverse().slice(-60).map(r => ({ date: formatDate(r.dateTime, { month: 'short', day: 'numeric' }), value: r.value })),
    [readings]);

  const handleAuthorizePrescription = async (rxId) => {
    await authorizePrescription(rxId, currentUser.id);
    await addNotification({ userId: patientId, type: 'prescription', title: 'Prescription Authorized', message: `${currentUser.name} has authorized your prescription.`, relatedId: rxId });
    await addAuditEntry({ actor: currentUser.id, actorRole: 'doctor', action: 'prescription_authorized', patientId, recordId: rxId, details: 'Prescription authorized' });
    refreshData();
    addToast({ type: 'success', message: 'Prescription authorized' });
  };

  const handleCreatePrescription = async (rxData) => {
    const rx = await addPrescription({ ...rxData, patientId, doctorId: currentUser.id });
    await addAuditEntry({ actor: currentUser.id, actorRole: 'doctor', action: 'prescription_created', patientId, recordId: rx.id, details: 'New prescription created' });
    refreshData();
    setShowRxForm(false);
    addToast({ type: 'success', message: 'Prescription created as draft. Authorize when ready.' });
  };

  const handleSaveTargets = async (targetData) => {
    await setClinicalTargets({ ...targetData, patientId, setBy: currentUser.id, setAt: new Date().toISOString() });
    await addAuditEntry({ actor: currentUser.id, actorRole: 'doctor', action: 'targets_updated', patientId, details: 'Clinical targets updated' });
    refreshData();
    setShowTargetForm(false);
    addToast({ type: 'success', message: 'Clinical targets updated' });
  };

  const handleReferral = async (refData) => {
    await addCounsellingRequest({ ...refData, patientId, requestedBy: currentUser.id, type: 'doctor_referral' });
    await addNotification({ userId: refData.assignedTo || patient?.assignedPharmacist, type: 'counselling', title: 'Doctor Referral', message: `${currentUser.name} has referred ${patient?.name} for ${refData.topic} counselling.`, relatedId: '' });
    await addNotification({ userId: patientId, type: 'counselling', title: 'Care Team Referral', message: `${currentUser.name} has referred you for ${refData.topic} counselling.`, relatedId: '' });
    await addAuditEntry({ actor: currentUser.id, actorRole: 'doctor', action: 'referral_created', patientId, details: `Referred for ${refData.topic}` });
    refreshData();
    setShowReferralForm(false);
    addToast({ type: 'success', message: 'Referral submitted' });
  };

  if (loading) return <LoadingSpinner />;
  if (!patient) return <div className="text-center py-12">Patient not found</div>;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'glucose', label: 'Glucose', count: readings.length },
    { id: 'prescriptions', label: 'Prescriptions', count: prescriptions.length },
    { id: 'investigations', label: 'Investigations', count: investigations.length },
    { id: 'screenings', label: 'Screenings', count: screenings.length },
    { id: 'timeline', label: 'Timeline' },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 bg-white rounded-2xl border-2 border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <button onClick={() => navigate(-1)} className="btn-outline btn-sm"><ArrowLeft size={16} /></button>
          <Avatar user={patient} size="lg" />
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">{patient.name}</h1>
            <p className="text-xs sm:text-sm font-bold text-slate-700 mt-0.5">{patient.age}y • {patient.gender} • <span className="text-teal-900">{patient.diabetesType}</span> • Diagnosed {patient.diagnosedYear}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowRxForm(true)} className="btn-primary btn-sm"><Plus size={16} /> New Prescription</button>
          <button onClick={() => setShowTargetForm(true)} className="btn-outline btn-sm"><Settings size={16} /> Targets</button>
          <button onClick={() => setShowReferralForm(true)} className="btn-outline btn-sm text-purple-800 border-purple-300 hover:bg-purple-50"><Heart size={16} /> Refer to Pharm D</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Latest HbA1c" value={investigations.find(i => i.type === 'HbA1c')?.value ? `${investigations.find(i => i.type === 'HbA1c').value}%` : '—'} icon={Activity} />
        <StatCard label="Adherence" value={adherence !== null ? `${adherence}%` : '—'} icon={Pill} color={adherence && adherence >= 80 ? 'success' : 'warning'} />
        <StatCard label="Latest Glucose" value={readings[0]?.value ? `${readings[0].value} mg/dL` : '—'} icon={Activity} color="primary" />
        <StatCard label="Safety Events" value={safetyEvents.length} icon={AlertTriangle} color={safetyEvents.length > 0 ? 'danger' : 'success'} />
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card"><div className="card-header"><h3 className="font-semibold">Glucose Trend (Last 30 Days)</h3></div><div className="card-body p-3.5 sm:p-6 min-w-0 overflow-hidden">
            {chartData.length > 0 ? (
              <div className="w-full min-w-0 overflow-hidden" style={{ minHeight: 240 }}>
                <ResponsiveContainer width="100%" height={250} minWidth={0}>
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B' }} />
                    <YAxis domain={[60, 300]} tick={{ fontSize: 10, fill: '#64748B' }} />
                    {targets && <><ReferenceLine y={targets.fastingGlucoseMax} stroke="#F59E0B" strokeDasharray="5 5" /><ReferenceLine y={targets.fastingGlucoseMin} stroke="#F59E0B" strokeDasharray="5 5" /></>}
                    <Line type="monotone" dataKey="value" stroke="#0F766E" strokeWidth={2} dot={{ r: 2 }} />
                    <ReTooltip />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-center text-text-secondary py-8">No data</p>}
          </div></div>
          <div className="card"><div className="card-header"><h3 className="font-semibold">Recent Investigations</h3></div><div className="card-body space-y-2">
            {investigations.slice(0, 5).map(inv => (
              <div key={inv.id} className="flex justify-between items-center p-2 border-b border-border last:border-0">
                <div><p className="text-sm font-medium">{inv.type}</p><p className="text-xs text-text-secondary">{formatDate(inv.date)}</p></div>
                <span className="font-semibold text-sm">{inv.value} {inv.unit}</span>
              </div>
            ))}
          </div></div>
          <div className="card"><div className="card-header"><h3 className="font-semibold">Active Prescriptions</h3></div><div className="card-body space-y-2">
            {prescriptions.filter(p => p.status === 'active').map(rx => (
              <div key={rx.id} className="p-3 bg-gray-50 rounded-lg">
                {(rx.medicines || []).map(m => <p key={m.id} className="text-sm">{m.name} — {m.dose} {m.frequency}</p>)}
              </div>
            ))}
          </div></div>
          <div className="card"><div className="card-header"><h3 className="font-semibold">Medication Reviews</h3></div><div className="card-body space-y-2">
            {reviews.filter(r => r.status !== 'resolved').map(r => (
              <div key={r.id} className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
                <AlertTriangle size={14} className="text-amber-600 mt-0.5" />
                <div><p className="text-sm font-medium">{r.type.replace('_', ' ')} — {r.medicine}</p><p className="text-xs text-text-secondary">{r.concern?.slice(0, 80)}</p></div>
              </div>
            ))}
            {reviews.filter(r => r.status !== 'resolved').length === 0 && <p className="text-sm text-text-secondary text-center py-4">No active reviews</p>}
          </div></div>
        </div>
      )}

      {activeTab === 'prescriptions' && (
        <div className="space-y-6">
          {/* Active Prescriptions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-950">Active Authorized Prescriptions</h3>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {prescriptions.filter(p => p.status === 'active').length} Active
              </span>
            </div>

            {prescriptions.filter(p => p.status === 'active' || p.status === 'draft').map(rx => (
              <div key={rx.id} className="card border-2 border-slate-200">
                <div className="card-header flex items-center justify-between p-3.5 bg-slate-50/70">
                  <div className="flex items-center gap-2">
                    <Badge variant={rx.status === 'active' ? 'success' : rx.status === 'draft' ? 'warning' : 'gray'}>
                      {rx.status.toUpperCase()}
                    </Badge>
                    <span className="text-xs font-mono font-bold text-slate-700">{rx.id.toUpperCase()}</span>
                    <span className="text-xs text-slate-500">• Authorized {formatDate(rx.authorizedAt || rx.createdAt)}</span>
                  </div>
                  {rx.status === 'draft' && (
                    <button onClick={() => handleAuthorizePrescription(rx.id)} className="btn-primary btn-sm">Authorize Regimen</button>
                  )}
                </div>
                <div className="card-body p-4 space-y-2">
                  {(rx.medicines || []).map(m => (
                    <div key={m.id} className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-start gap-2.5">
                        <Pill size={16} className="text-teal-700 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-slate-950">{m.name} <span className="text-xs text-teal-800">({m.dose})</span></p>
                          <p className="text-xs text-slate-600">{m.route} • {m.frequency} • {m.foodInstruction}</p>
                          {m.instructions && <p className="text-xs text-slate-700 italic mt-0.5">{m.instructions}</p>}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-800 bg-white px-2 py-1 rounded-md border border-slate-200 shrink-0">
                        {m.times?.join(', ') || 'Scheduled'}
                      </span>
                    </div>
                  ))}
                  {rx.notes && (
                    <p className="text-xs font-medium text-slate-700 p-2 rounded-lg bg-teal-50/60 border border-teal-200">
                      <strong>Clinician Note:</strong> {rx.notes}
                    </p>
                  )}
                </div>
                {rx.versions && (
                  <div className="card-footer p-2.5 px-4 bg-slate-50 text-xs text-slate-600 flex items-center justify-between border-t border-slate-200">
                    <span>{rx.versions.length} version(s) • Last: {rx.versions[rx.versions.length - 1]?.action} on {formatDate(rx.versions[rx.versions.length - 1]?.date)}</span>
                    <span className="font-semibold text-slate-700">Digital Audit Verified</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Past Prescription Logs & History Data */}
          <div className="space-y-3 pt-4 border-t-2 border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-950 flex items-center gap-2">
                  <History size={18} className="text-amber-700" />
                  <span>Prescription Logs (Past & Historical Regimens)</span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">Discontinued medications, titration history, and prior clinical decisions</p>
              </div>
              <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                {prescriptions.filter(p => p.status === 'discontinued' || p.status === 'superseded').length} Historical
              </span>
            </div>

            {prescriptions.filter(p => p.status === 'discontinued' || p.status === 'superseded').length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-600 bg-slate-50 rounded-xl border border-slate-200">
                No past discontinued prescriptions on file for this patient.
              </div>
            ) : (
              prescriptions.filter(p => p.status === 'discontinued' || p.status === 'superseded').map(rx => (
                <div key={rx.id} className="card border-2 border-amber-200/90 bg-white">
                  <div className="card-header flex items-center justify-between p-3.5 bg-amber-50/60">
                    <div className="flex items-center gap-2">
                      <Badge variant={rx.status === 'discontinued' ? 'danger' : 'warning'}>
                        {rx.status.toUpperCase()}
                      </Badge>
                      <span className="text-xs font-mono font-bold text-slate-700">{rx.id.toUpperCase()}</span>
                      <span className="text-xs text-slate-500">• Created {formatDate(rx.createdAt)}</span>
                    </div>
                    <span className="text-xs font-bold text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded">
                      Historical Record
                    </span>
                  </div>
                  <div className="card-body p-4 space-y-2">
                    {(rx.medicines || []).map(m => (
                      <div key={m.id} className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex items-start gap-2.5">
                          <Pill size={16} className="text-amber-700 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-slate-900 line-through opacity-80">{m.name} ({m.dose})</p>
                            <p className="text-xs text-slate-600">{m.route} • {m.frequency} • {m.foodInstruction}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {rx.notes && (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-950 font-medium">
                        <strong>Reason for Change / Discontinuation:</strong> {rx.notes}
                      </div>
                    )}
                  </div>
                  {rx.versions && (
                    <div className="card-footer p-2.5 px-4 bg-slate-50 text-xs text-slate-600 border-t border-slate-200">
                      <p className="font-semibold text-slate-800 mb-1">Version History:</p>
                      <div className="space-y-1">
                        {rx.versions.map((v, i) => (
                          <p key={i} className="text-[11px] text-slate-600">
                            • <strong>v{v.version} ({v.action})</strong>: {v.changes} — <span className="text-slate-500">{formatDateTime(v.date)}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'glucose' && (
        <div className="card"><div className="table-container"><table className="data-table">
          <thead><tr><th>Date</th><th>Value</th><th>Context</th><th>Medicine</th><th>Notes</th></tr></thead>
          <tbody>{readings.slice(0, 50).map(r => (
            <tr key={r.id}><td>{formatDateTime(r.dateTime)}</td><td className="font-semibold">{r.value} {r.unit}</td><td><Badge variant="info">{r.context}</Badge></td><td>{r.medicineTaken ? <CheckCircle size={15} className="text-emerald-600 inline" /> : <XCircle size={15} className="text-rose-600 inline" />}</td><td className="text-xs">{r.notes || '—'}</td></tr>
          ))}</tbody>
        </table></div></div>
      )}

      {activeTab === 'investigations' && (
        <div className="card"><div className="table-container"><table className="data-table">
          <thead><tr><th>Date</th><th>Test</th><th>Value</th><th>Lab</th><th>Notes</th></tr></thead>
          <tbody>{investigations.map(inv => (
            <tr key={inv.id}><td>{formatDate(inv.date)}</td><td className="font-medium">{inv.type}</td><td className="font-semibold">{inv.value} {inv.unit}</td><td>{inv.labName || '—'}</td><td className="text-xs">{inv.notes || '—'}</td></tr>
          ))}</tbody>
        </table></div></div>
      )}

      {activeTab === 'screenings' && (
        <div className="space-y-3">{screenings.map(s => (
          <div key={s.id} className="card card-body flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.status === 'completed' ? 'bg-green-50' : s.status === 'overdue' ? 'bg-red-50' : 'bg-amber-50'}`}>
              {s.status === 'completed' ? <CheckCircle size={18} className="text-green-500" /> : s.status === 'overdue' ? <AlertTriangle size={18} className="text-red-500" /> : <Clock size={18} className="text-amber-500" />}
            </div>
            <div className="flex-1"><p className="font-medium">{s.type}</p><p className="text-xs text-text-secondary">{s.status} — Due: {formatDate(s.dueDate)}</p></div>
            <Badge variant={s.status === 'completed' ? 'success' : s.status === 'overdue' ? 'danger' : 'warning'}>{s.status}</Badge>
          </div>
        ))}</div>
      )}

      {activeTab === 'timeline' && (
        <div className="card card-body space-y-4">
          {[...safetyEvents.map(e => ({ type: 'safety', date: e.triggerTime, text: `${e.type.replace('_', ' ')} alert: ${e.triggerValue} ${e.unit}`, resolved: e.resolved })),
            ...prescriptions.flatMap(rx => (rx.versions || []).map(v => ({ type: 'prescription', date: v.date, text: `Prescription ${v.action}: ${v.changes}` }))),
            ...(data?.counsellingRequests || []).filter(c => c.patientId === patientId).map(c => ({ type: 'counselling', date: c.requestedAt, text: `Counselling ${c.status}: ${c.topic}` })),
          ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20).map((event, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${event.type === 'safety' ? 'bg-red-500' : event.type === 'prescription' ? 'bg-blue-500' : 'bg-purple-500'}`} />
              <div><p className="text-sm">{event.text}</p><p className="text-xs text-text-secondary">{formatDateTime(event.date)}</p></div>
            </div>
          ))}
        </div>
      )}

      {/* New Prescription Modal */}
      <PrescriptionFormModal open={showRxForm} onClose={() => setShowRxForm(false)} onSave={handleCreatePrescription} />
      <TargetFormModal open={showTargetForm} onClose={() => setShowTargetForm(false)} targets={targets} onSave={handleSaveTargets} />
      <ReferralFormModal open={showReferralForm} onClose={() => setShowReferralForm(false)} patient={patient} pharmacists={Object.values(data?.users || {}).filter(u => u.role === 'pharmacist')} onSave={handleReferral} />
    </div>
  );
}

function PrescriptionFormModal({ open, onClose, onSave }) {
  const [medicines, setMedicines] = useState([{ id: genId('med'), name: '', dose: '', route: 'Oral', frequency: 'Once daily', times: ['08:00'], foodInstruction: 'After food', instructions: '', startDate: new Date().toISOString().split('T')[0], reviewDate: '' }]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  const handleAdd = () => setMedicines([...medicines, { id: genId('med'), name: '', dose: '', route: 'Oral', frequency: 'Once daily', times: ['08:00'], foodInstruction: 'After food', instructions: '', startDate: new Date().toISOString().split('T')[0], reviewDate: '' }]);
  const handleChange = (idx, field, val) => { const m = [...medicines]; m[idx] = { ...m[idx], [field]: val }; setMedicines(m); };
  const handleRemove = (idx) => setMedicines(medicines.filter((_, i) => i !== idx));

  const validate = () => {
    const e = {};
    medicines.forEach((m, i) => { if (!m.name) e[`name-${i}`] = 'Required'; if (!m.dose) e[`dose-${i}`] = 'Required'; });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => { if (!validate()) return; onSave({ medicines: medicines.map(m => ({ ...m, startDate: new Date(m.startDate).toISOString(), reviewDate: m.reviewDate ? new Date(m.reviewDate).toISOString() : undefined })), notes, createdAt: new Date().toISOString() }); };

  return (
    <Modal open={open} onClose={onClose} title="Create Prescription" size="lg"
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={handleSubmit}>Create Draft</button></>}>
      <div className="space-y-4">
        {medicines.map((m, i) => (
          <div key={m.id} className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center"><span className="text-sm font-semibold">Medicine {i + 1}</span>{medicines.length > 1 && <button onClick={() => handleRemove(i)} className="text-xs text-red-500 cursor-pointer">Remove</button>}</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Name *</label><input className={`input ${errors[`name-${i}`] ? 'input-error' : ''}`} value={m.name} onChange={e => handleChange(i, 'name', e.target.value)} placeholder="e.g., Metformin 500mg" /></div>
              <div><label className="label">Dose *</label><input className={`input ${errors[`dose-${i}`] ? 'input-error' : ''}`} value={m.dose} onChange={e => handleChange(i, 'dose', e.target.value)} placeholder="e.g., 500mg" /></div>
              <div><label className="label">Route</label><select className="input" value={m.route} onChange={e => handleChange(i, 'route', e.target.value)}><option>Oral</option><option>Subcutaneous</option><option>Topical</option><option>Inhalation</option></select></div>
              <div><label className="label">Frequency</label><select className="input" value={m.frequency} onChange={e => handleChange(i, 'frequency', e.target.value)}><option>Once daily</option><option>Twice daily</option><option>Three times daily</option><option>Four times daily</option><option>As needed</option></select></div>
              <div><label className="label">Times</label><input className="input" value={m.times?.join(', ')} onChange={e => handleChange(i, 'times', e.target.value.split(',').map(t => t.trim()))} placeholder="08:00, 20:00" /></div>
              <div><label className="label">Food Instruction</label><select className="input" value={m.foodInstruction} onChange={e => handleChange(i, 'foodInstruction', e.target.value)}><option>Before food</option><option>After food</option><option>With food</option><option>With or without food</option></select></div>
              <div><label className="label">Start Date</label><input type="date" className="input" value={m.startDate} onChange={e => handleChange(i, 'startDate', e.target.value)} /></div>
              <div><label className="label">Review Date</label><input type="date" className="input" value={m.reviewDate} onChange={e => handleChange(i, 'reviewDate', e.target.value)} /></div>
            </div>
            <div><label className="label">Instructions</label><textarea className="input" rows={2} value={m.instructions} onChange={e => handleChange(i, 'instructions', e.target.value)} placeholder="Prescriber instructions..." /></div>
          </div>
        ))}
        <button onClick={handleAdd} className="btn-outline w-full"><Plus size={14} /> Add Medicine</button>
        <div><label className="label">Prescription Notes</label><textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Overall notes..." /></div>
      </div>
    </Modal>
  );
}

function TargetFormModal({ open, onClose, targets, onSave }) {
  const [form, setForm] = useState({ fastingGlucoseMin: 80, fastingGlucoseMax: 130, postMealGlucoseMax: 180, hba1cTarget: 7.0, bpSystolicMax: 130, bpDiastolicMax: 80, notes: '' });
  useEffect(() => { if (targets) setForm({ ...form, ...targets }); }, [targets, open]);

  return (
    <Modal open={open} onClose={onClose} title="Clinical Targets (Demo)" size="md"
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => onSave(form)}>Save Targets</button></>}>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">Fasting Glucose Min (mg/dL)</label><input type="number" className="input" value={form.fastingGlucoseMin} onChange={e => setForm({ ...form, fastingGlucoseMin: +e.target.value })} /></div>
        <div><label className="label">Fasting Glucose Max (mg/dL)</label><input type="number" className="input" value={form.fastingGlucoseMax} onChange={e => setForm({ ...form, fastingGlucoseMax: +e.target.value })} /></div>
        <div><label className="label">Post-meal Max (mg/dL)</label><input type="number" className="input" value={form.postMealGlucoseMax} onChange={e => setForm({ ...form, postMealGlucoseMax: +e.target.value })} /></div>
        <div><label className="label">HbA1c Target (%)</label><input type="number" step="0.1" className="input" value={form.hba1cTarget} onChange={e => setForm({ ...form, hba1cTarget: +e.target.value })} /></div>
        <div><label className="label">BP Systolic Max</label><input type="number" className="input" value={form.bpSystolicMax} onChange={e => setForm({ ...form, bpSystolicMax: +e.target.value })} /></div>
        <div><label className="label">BP Diastolic Max</label><input type="number" className="input" value={form.bpDiastolicMax} onChange={e => setForm({ ...form, bpDiastolicMax: +e.target.value })} /></div>
      </div>
      <div className="mt-4"><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
    </Modal>
  );
}

function ReferralFormModal({ open, onClose, patient, pharmacists, onSave }) {
  const [form, setForm] = useState({ topic: 'Medication Use', priority: 'normal', assignedTo: '', notes: '', preferredTime: '' });
  return (
    <Modal open={open} onClose={onClose} title={`Refer ${patient?.name} to Pharm D`} size="md"
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => onSave(form)}>Submit Referral</button></>}>
      <div className="space-y-4">
        <div><label className="label">Counselling Topic</label><select className="input" value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })}><option>Medication Use</option><option>Adherence</option><option>Lifestyle</option><option>Disease Understanding</option></select></div>
        <div><label className="label">Priority</label><select className="input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
        <div><label className="label">Assign to</label><select className="input" value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}><option value="">Auto-assign</option>{pharmacists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div><label className="label">Preferred Contact Time</label><input type="text" className="input" value={form.preferredTime} onChange={e => setForm({ ...form, preferredTime: e.target.value })} placeholder="e.g., Morning 10-11 AM" /></div>
        <div><label className="label">Notes</label><textarea className="input" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
    </Modal>
  );
}
