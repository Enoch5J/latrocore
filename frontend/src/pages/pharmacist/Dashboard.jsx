import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatCard, LoadingSpinner, Badge, Tabs, Modal, EmptyState, Avatar } from '../../components/ui';
import { ClipboardList, Heart, Pill, Users, AlertTriangle, ArrowRight, Clock, CheckCircle, Play, Timer, MessageSquare } from 'lucide-react';
import { formatDate, formatDateTime } from '../../data/demoDate';
import { updateMedicationReview, updateCounsellingRequest, addNotification, addAuditEntry } from '../../services/dataService';

export default function PharmacistDashboard({ initialTab }) {
  const { currentUser, data, refreshData, addToast } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab || 'reviews');
  const [selectedReview, setSelectedReview] = useState(null);
  const [selectedCounselling, setSelectedCounselling] = useState(null);
  const [sessionModal, setSessionModal] = useState(null);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [sessionNotes, setSessionNotes] = useState('');

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => { setTimeout(() => setLoading(false), 300); }, []);

  const assignedPatients = useMemo(() => {
    const ids = currentUser?.assignedPatients || [];
    return Object.values(data?.users || {}).filter(u => ids.includes(u.id));
  }, [data?.users, currentUser]);

  const reviews = useMemo(() => (data?.medicationReviews || []).filter(r => r.status !== 'resolved'), [data?.medicationReviews]);
  const counsellingRequests = useMemo(() => (data?.counsellingRequests || []).filter(r => r.status !== 'completed' && r.status !== 'cancelled'), [data?.counsellingRequests]);
  const refillRequests = useMemo(() => reviews.filter(r => r.type === 'refill'), [reviews]);
  const allCounselling = useMemo(() => data?.counsellingRequests || [], [data?.counsellingRequests]);

  const handleResolveReview = async (review, resolution) => {
    await updateMedicationReview(review.id, { status: 'resolved', resolution, resolvedAt: new Date().toISOString(), resolvedBy: currentUser.id });
    await addAuditEntry({ actor: currentUser.id, actorRole: 'pharmacist', action: 'review_resolved', patientId: review.patientId, recordId: review.id, details: resolution });
    refreshData();
    setSelectedReview(null);
    addToast({ type: 'success', message: 'Review resolved' });
  };

  const handleEscalate = async (review) => {
    const patient = data?.users?.[review.patientId];
    await updateMedicationReview(review.id, { status: 'escalated', escalatedTo: patient?.assignedDoctor, escalatedAt: new Date().toISOString(), notes: review.notes + ' [Escalated by pharmacist]' });
    await addNotification({ userId: patient?.assignedDoctor, type: 'escalation', title: 'Medication Review Escalation', message: `${currentUser.name} has escalated a ${review.type} concern for ${patient?.name}.`, relatedId: review.id });
    await addAuditEntry({ actor: currentUser.id, actorRole: 'pharmacist', action: 'review_escalated', patientId: review.patientId, recordId: review.id, details: 'Escalated to doctor' });
    refreshData();
    setSelectedReview(null);
    addToast({ type: 'info', message: 'Escalated to doctor' });
  };

  const handleAssignCounselling = async (req) => {
    await updateCounsellingRequest(req.id, { status: 'assigned', assignedTo: currentUser.id });
    await addAuditEntry({ actor: currentUser.id, actorRole: 'pharmacist', action: 'counselling_assigned', patientId: req.patientId, recordId: req.id, details: 'Assigned to self' });
    refreshData();
    addToast({ type: 'success', message: 'Assigned to you' });
  };

  const startSession = (req) => {
    setSessionModal(req);
    setSessionTimer(0);
    setSessionNotes('');
    const interval = setInterval(() => setSessionTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  };

  const completeSession = async () => {
    if (!sessionModal) return;
    await updateCounsellingRequest(sessionModal.id, { status: 'completed', completedAt: new Date().toISOString(), outcome: sessionNotes, sessionDuration: sessionTimer });
    await addNotification({ userId: sessionModal.patientId, type: 'counselling', title: 'Counselling Completed', message: `Your ${sessionModal.topic} counselling session has been completed.`, relatedId: sessionModal.id });
    await addAuditEntry({ actor: currentUser.id, actorRole: 'pharmacist', action: 'counselling_completed', patientId: sessionModal.patientId, recordId: sessionModal.id, details: `Completed ${sessionModal.topic} session (${sessionTimer}s)` });
    refreshData();
    setSessionModal(null);
    addToast({ type: 'success', message: 'Counselling session completed' });
  };

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  const tabs = [
    { id: 'reviews', label: 'Medication Reviews', count: reviews.length },
    { id: 'counselling', label: 'Counselling', count: counsellingRequests.length },
    { id: 'refills', label: 'Refill Requests', count: refillRequests.length },
    { id: 'patients', label: 'My Patients', count: assignedPatients.length },
    { id: 'history', label: 'Completed Sessions' },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">Pharmacist / Pharm D Clinical Station</h1>
        <p className="text-sm font-medium text-slate-700 mt-1">Active clinician session: <span className="font-bold text-slate-950">{currentUser?.name}</span></p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Open Reviews" value={reviews.length} icon={ClipboardList} color={reviews.length > 0 ? 'warning' : 'success'} />
        <StatCard label="Counselling Requests" value={counsellingRequests.length} icon={Heart} color={counsellingRequests.length > 0 ? 'primary' : 'success'} />
        <StatCard label="Refill Requests" value={refillRequests.length} icon={Pill} color="secondary" />
        <StatCard label="Assigned Patients" value={assignedPatients.length} icon={Users} color="primary" />
      </div>

      <div className="bg-sky-50 border border-sky-300 rounded-xl p-3.5 text-xs sm:text-sm font-semibold text-sky-950 flex items-center gap-2">
        <Clock size={16} className="text-sky-700 shrink-0" />
        <span>Target clinical response target: within 2 to 4 hours. High-priority medication flags require urgent review.</span>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'reviews' && (
        <div className="space-y-3">
          {reviews.map(r => {
            const patient = data?.users?.[r.patientId];
            return (
              <div key={r.id} className="card card-body cursor-pointer hover:shadow-md transition-shadow border border-slate-200" onClick={() => setSelectedReview(r)}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${r.priority === 'high' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-950 text-base">{patient?.name}</p>
                        <Badge variant={r.type === 'duplicate_therapy' ? 'danger' : r.type === 'interaction' ? 'warning' : r.type === 'side_effect' ? 'warning' : r.type === 'adherence' ? 'info' : 'gray'}>
                          {r.type.replace('_', ' ')}
                        </Badge>
                        <Badge variant={r.priority === 'high' ? 'danger' : 'gray'}>
                          {r.priority.toUpperCase()} PRIORITY
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 mt-1.5">{r.medicine} — <span className="font-medium text-slate-700">{r.concern}</span></p>
                      <p className="text-xs font-semibold text-slate-600 mt-1">Flagged {formatDateTime(r.flaggedAt)} • Clinical review pending</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="text-xs font-bold text-primary hidden sm:inline">Review Flag</span>
                    <ArrowRight size={18} className="text-slate-800" />
                  </div>
                </div>
              </div>
            );
          })}
          {reviews.length === 0 && <EmptyState icon={ClipboardList} title="No open reviews" message="All medication reviews have been addressed." />}
        </div>
      )}

      {activeTab === 'counselling' && (
        <div className="space-y-3">
          {counsellingRequests.map(req => {
            const patient = data?.users?.[req.patientId];
            const statuses = { requested: 'warning', assigned: 'info', scheduled: 'info', in_progress: 'primary' };
            return (
              <div key={req.id} className="card card-body border border-slate-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                  <div className="flex items-start gap-3.5">
                    <Avatar user={patient} size="md" />
                    <div>
                      <p className="font-bold text-slate-950 text-base">{patient?.name}</p>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">{req.topic} • <span className="font-normal text-slate-600 capitalize">{req.type.replace('_', ' ')}</span></p>
                      {req.notes && <p className="text-xs text-slate-700 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-200">{req.notes}</p>}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant={statuses[req.status] || 'gray'}>{req.status.toUpperCase()}</Badge>
                        <span className="text-xs font-semibold text-slate-600">Requested: {formatDateTime(req.requestedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 justify-end">
                    {req.status === 'requested' && (
                      <button onClick={() => handleAssignCounselling(req)} className="btn-outline btn-sm font-bold w-full sm:w-auto">
                        Assign to Me
                      </button>
                    )}
                    {(req.status === 'assigned' || req.status === 'scheduled') && (
                      <button onClick={() => startSession(req)} className="btn-primary btn-sm font-bold flex items-center justify-center gap-1.5 w-full sm:w-auto">
                        <Play size={14} /> Start Session
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {counsellingRequests.length === 0 && <EmptyState icon={Heart} title="No pending requests" message="All counselling requests have been addressed." />}
        </div>
      )}

      {activeTab === 'refills' && (
        <div className="space-y-3">
          {refillRequests.map(r => {
            const patient = data?.users?.[r.patientId];
            return (
              <div key={r.id} className="card card-body border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center shrink-0">
                    <Pill size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-950 text-base">{patient?.name}</p>
                    <p className="text-sm font-semibold text-slate-800">{r.medicine} — Refill requested</p>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  <button onClick={() => handleResolveReview(r, 'Refill approved and processed')} className="btn-primary btn-sm font-bold">Approve</button>
                  <button onClick={() => handleEscalate(r)} className="btn-outline btn-sm font-bold">Escalate</button>
                </div>
              </div>
            );
          })}
          {refillRequests.length === 0 && <EmptyState icon={Pill} title="No refill requests" message="No pending refill requests." />}
        </div>
      )}

      {activeTab === 'patients' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignedPatients.map(p => (
            <div key={p.id} className="card card-body cursor-pointer hover:shadow-md border border-slate-200 transition-all hover:border-primary/40" onClick={() => navigate(`/doctor/patient/${p.id}`)}>
              <div className="flex items-center gap-3.5">
                <Avatar user={p} size="md" />
                <div>
                  <p className="font-bold text-slate-950 text-base">{p.name}</p>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">{p.age} yrs • {p.diabetesType}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card border border-slate-200">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="font-bold text-slate-950">Patient</th>
                  <th className="font-bold text-slate-950">Topic</th>
                  <th className="font-bold text-slate-950">Completed</th>
                  <th className="font-bold text-slate-950">Duration</th>
                  <th className="font-bold text-slate-950">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {allCounselling.filter(c => c.status === 'completed').map(c => {
                  const patient = data?.users?.[c.patientId];
                  return (
                    <tr key={c.id}>
                      <td className="font-bold text-slate-950">{patient?.name}</td>
                      <td className="font-medium text-slate-900">{c.topic}</td>
                      <td className="text-slate-800 font-medium whitespace-nowrap">{formatDateTime(c.completedAt)}</td>
                      <td className="text-slate-800 font-medium">{c.sessionDuration ? `${Math.round(c.sessionDuration / 60)} min` : '—'}</td>
                      <td className="text-xs text-slate-800 max-w-xs truncate">{c.outcome || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Detail Modal */}
      {selectedReview && (
        <ReviewDetailModal review={selectedReview} patient={data?.users?.[selectedReview.patientId]}
          onClose={() => setSelectedReview(null)} onResolve={handleResolveReview} onEscalate={handleEscalate} />
      )}

      {/* Counselling Session Modal */}
      {sessionModal && (
        <Modal open={!!sessionModal} onClose={() => setSessionModal(null)} title="Clinical Counselling Session" size="md"
          footer={<><button className="btn-outline font-bold" onClick={() => setSessionModal(null)}>Cancel</button><button className="btn-primary font-bold" onClick={completeSession}>Complete Session</button></>}>
          <div className="space-y-4">
            <div className="bg-sky-50 border border-sky-300 rounded-xl p-3 text-xs sm:text-sm font-semibold text-sky-950">
              Documenting interactive clinical guidance and medication counselling.
            </div>
            <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-center px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-xs">
                <p className="text-3xl font-mono font-extrabold text-primary">{Math.floor(sessionTimer / 60)}:{(sessionTimer % 60).toString().padStart(2, '0')}</p>
                <p className="text-xs font-bold text-slate-700">Duration</p>
              </div>
              <div>
                <p className="font-extrabold text-slate-950 text-base">{data?.users?.[sessionModal.patientId]?.name}</p>
                <p className="text-sm font-semibold text-slate-800">{sessionModal.topic}</p>
              </div>
            </div>
            <div>
              <label className="label text-slate-950 font-bold">Session Notes & Clinical Recommendations</label>
              <textarea className="input font-medium text-slate-950" rows={4} value={sessionNotes} onChange={e => setSessionNotes(e.target.value)} placeholder="Document counselling notes, lifestyle advice, or dosage reminders..." />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ReviewDetailModal({ review, patient, onClose, onResolve, onEscalate }) {
  const [resolution, setResolution] = useState('');
  const [notes, setNotes] = useState(review.notes || '');

  return (
    <Modal open={true} onClose={onClose} title="Medication Safety Review" size="md"
      footer={<>
        <button className="btn-outline font-bold" onClick={onClose}>Close</button>
        <button className="btn-outline font-bold text-amber-700 border-amber-300 hover:bg-amber-50" onClick={() => onEscalate(review)}>Escalate to Doctor</button>
        <button className="btn-primary font-bold" onClick={() => onResolve(review, resolution || 'Reviewed and resolved')} disabled={!resolution}>Resolve</button>
      </>}>
      <div className="space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="font-extrabold text-slate-950 text-lg">{patient?.name}</p>
          <p className="text-sm font-bold text-slate-900 mt-0.5">{review.type.replace('_', ' ').toUpperCase()} • <span className="text-primary font-bold">{review.medicine}</span></p>
          <p className="text-sm font-medium text-slate-900 mt-2 bg-white p-3 rounded-lg border border-slate-200">{review.concern}</p>
          <p className="text-xs font-semibold text-amber-700 mt-2">Medication surveillance alert</p>
        </div>
        <div>
          <label className="label text-slate-950 font-bold">Review Notes</label>
          <textarea className="input font-medium text-slate-950" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div>
          <label className="label text-slate-950 font-bold">Resolution & Actions Taken</label>
          <textarea className="input font-medium text-slate-950" rows={2} value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Document reason for resolution or medication change..." />
        </div>
      </div>
    </Modal>
  );
}
