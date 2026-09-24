import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Modal, ConfirmDialog, LoadingSpinner, Badge, Tabs, Tooltip, EmptyState } from '../../components/ui';
import { Pill, Clock, CheckCircle, AlertTriangle, X, FileText, RefreshCw, Calendar, Info, Syringe, BookOpen } from 'lucide-react';
import { formatDate, formatTime, formatDateTime, isToday, getDemoToday } from '../../data/demoDate';
import { recordDose, addCounsellingRequest, addNotification, addAuditEntry } from '../../services/dataService';

export default function Medications() {
  const { currentUser, data, refreshData, addToast } = useApp();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'schedule');
  const [doseModal, setDoseModal] = useState(null);
  const [refillModal, setRefillModal] = useState(null);
  const [rxDetailModal, setRxDetailModal] = useState(null);

  const patientId = currentUser?.id;

  useEffect(() => { setTimeout(() => setLoading(false), 300); }, []);

  const prescriptions = useMemo(() =>
    (data?.prescriptions || []).filter(p => p.patientId === patientId && p.status === 'active'),
    [data?.prescriptions, patientId]);

  const allDoses = useMemo(() =>
    (data?.doseEvents || []).filter(e => e.patientId === patientId).sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime)),
    [data?.doseEvents, patientId]);

  const todayDoses = useMemo(() => allDoses.filter(e => isToday(e.scheduledTime)), [allDoses]);

  const adherence = useMemo(() => {
    const now = new Date();
    const elapsed = allDoses.filter(e => new Date(e.scheduledTime) <= now && e.status !== 'pending');
    if (elapsed.length === 0) return null;
    const taken = elapsed.filter(e => e.status === 'taken').length;
    return { pct: Math.round((taken / elapsed.length) * 100), taken, total: elapsed.length, missed: elapsed.filter(e => e.status === 'missed').length };
  }, [allDoses]);

  const insulinMeds = useMemo(() => {
    return prescriptions.flatMap(rx => (rx.medicines || []).filter(m => m.isInsulin));
  }, [prescriptions]);

  const handleRecordDose = async (dose, status) => {
    // Prevent duplicate
    if (dose.status !== 'pending') {
      addToast({ type: 'warning', message: 'This dose has already been recorded' });
      return;
    }
    const actualTime = new Date().toISOString();
    await recordDose(dose.id, status, status === 'taken' ? actualTime : null, doseModal?.note || '');
    await addAuditEntry({ actor: currentUser.id, actorRole: 'patient', action: `dose_${status}`, patientId, recordId: dose.id, details: `${dose.medicineName} marked ${status}` });
    refreshData();
    setDoseModal(null);
    addToast({ type: status === 'taken' ? 'success' : 'warning', message: `${dose.medicineName} marked as ${status}` });
  };

  const handleRefillRequest = async (medicine) => {
    await addNotification({ userId: currentUser.assignedPharmacist, type: 'refill', title: 'Refill Request', message: `${currentUser.name} requested refill for ${medicine.name}`, relatedId: medicine.id });
    await addAuditEntry({ actor: currentUser.id, actorRole: 'patient', action: 'refill_requested', patientId, recordId: medicine.id, details: `Requested refill for ${medicine.name}` });
    refreshData();
    setRefillModal(null);
    addToast({ type: 'success', message: 'Refill request sent to your pharmacist' });
  };

  if (loading) return <LoadingSpinner text="Loading medications..." />;

  const tabs = [
    { id: 'schedule', label: "Today's Schedule & Prescriptions", count: todayDoses.length },
    { id: 'adherence', label: 'Adherence History' },
    { id: 'insulin', label: 'Insulin Support', count: insulinMeds.length },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">Prescribed Medications & Schedule</h1>
        <p className="text-sm font-semibold text-slate-700 mt-1">Manage active regimens, record dose compliance, and coordinate refills</p>
      </div>

      {/* Adherence summary */}
      {adherence && (
        <div className="card border border-slate-200">
          <div className="card-body flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-extrabold border ${adherence.pct >= 80 ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-800 border-amber-300'}`}>
                {adherence.pct}%
              </div>
              <div>
                <p className="font-extrabold text-slate-950 text-base">Medication Adherence Score</p>
                <p className="text-xs font-bold text-slate-700 mt-0.5">{adherence.taken} taken, {adherence.missed} missed out of {adherence.total} scheduled doses</p>
              </div>
            </div>
            <Tooltip content="Calculated from elapsed scheduled doses only. Future and pending doses are excluded.">
              <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 cursor-help">
                <Info size={14} className="text-slate-800" />
                <span>Adherence Policy</span>
              </span>
            </Tooltip>
          </div>
        </div>
      )}

      <Tabs tabs={tabs} activeTab={activeTab === 'prescriptions' ? 'schedule' : activeTab} onChange={setActiveTab} />

      {/* Today's Schedule & Prescriptions Side-by-Side */}
      {(activeTab === 'schedule' || activeTab === 'prescriptions') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Side: Today's Scheduled Dose Actions (7 cols) */}
          <div className="lg:col-span-7 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b-2 border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                  <Clock size={18} />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-950 text-base sm:text-lg">Today's Dose Schedule</h2>
                  <p className="text-xs text-slate-600 font-medium">Log your daily medication intake</p>
                </div>
              </div>
              <span className="text-xs font-extrabold text-teal-900 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full">
                {todayDoses.length} Doses Today
              </span>
            </div>

            {todayDoses.length === 0 ? (
              <EmptyState icon={Pill} title="No medications today" message="No medications are scheduled for today." />
            ) : (
              todayDoses.map(dose => (
                <div key={dose.id} className="card border border-slate-200 hover:border-slate-300 transition shadow-sm">
                  <div className="card-body p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                        dose.status === 'taken' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
                        dose.status === 'missed' ? 'bg-rose-50 border-rose-300 text-rose-800' :
                        'bg-amber-50 border-amber-300 text-amber-800'
                      }`}>
                        {dose.status === 'taken' ? <CheckCircle size={22} /> :
                         dose.status === 'missed' ? <X size={22} /> :
                         <Clock size={22} />}
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-950 text-base">{dose.medicineName}</p>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">Scheduled: {formatTime(dose.scheduledTime)}</p>
                        {dose.actualTime && <p className="text-xs font-bold text-emerald-800 mt-0.5">Taken at: {formatTime(dose.actualTime)}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 self-end sm:self-center">
                      <Badge variant={dose.status === 'taken' ? 'success' : dose.status === 'missed' ? 'danger' : 'warning'}>
                        {dose.status.toUpperCase()}
                      </Badge>
                      {dose.status === 'pending' && (
                        <div className="flex gap-1.5">
                          <button onClick={() => setDoseModal({ dose, action: 'taken', note: '' })} className="btn-primary btn-sm font-bold text-xs py-1 px-3">Mark Taken</button>
                          <button onClick={() => setDoseModal({ dose, action: 'missed', note: '' })} className="btn-outline btn-sm font-bold text-rose-700 border-rose-300 hover:bg-rose-50 text-xs py-1 px-2.5">Missed</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Side: Active Prescriptions & Regimen Details (5 cols) */}
          <div className="lg:col-span-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b-2 border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-950 text-base sm:text-lg">Active Prescriptions</h2>
                  <p className="text-xs text-slate-600 font-medium">Doctor authorized instructions</p>
                </div>
              </div>
              {prescriptions[0] && (
                <button
                  onClick={() => setRxDetailModal(prescriptions[0])}
                  className="btn-ghost btn-sm font-bold text-xs text-slate-800 hover:text-slate-950 flex items-center gap-1"
                >
                  <FileText size={13} /> Details
                </button>
              )}
            </div>

            {prescriptions.length === 0 ? (
              <EmptyState icon={FileText} title="No prescriptions" message="No active prescriptions found." />
            ) : (
              prescriptions.map(rx => (
                <div key={rx.id} className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                    <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                      ACTIVE RX
                    </span>
                    <span className="text-[11px] font-bold text-slate-600">
                      Authorized: {formatDate(rx.authorizedAt)}
                    </span>
                  </div>

                  {(rx.medicines || []).map(med => (
                    <div key={med.id} className="card border border-slate-200 bg-white p-3.5 space-y-2 rounded-xl shadow-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center shrink-0">
                            <Pill size={16} />
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-950 text-sm">{med.name}</p>
                            <p className="text-[11px] font-bold text-slate-700">{med.dose} • {med.route} • {med.frequency}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setRefillModal(med)}
                          className="text-[11px] font-bold text-slate-700 hover:text-teal-900 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 px-2.5 py-1 rounded-lg transition flex items-center gap-1 shrink-0"
                          title="Request Refill"
                        >
                          <RefreshCw size={11} /> Refill
                        </button>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1 text-xs">
                        <p className="text-slate-800 font-semibold flex items-center gap-1.5">
                          <span className="text-slate-500 font-medium">Timing:</span>
                          <span>{med.foodInstruction} ({med.times?.join(', ')})</span>
                        </p>
                        {med.instructions && (
                          <p className="text-slate-600 text-[11px] italic bg-white p-1.5 rounded border border-slate-200">
                            "{med.instructions}"
                          </p>
                        )}
                        {med.reviewDate && (
                          <p className="text-amber-800 font-bold text-[10px] pt-0.5">
                            Surveillance Review: {formatDate(med.reviewDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {rx.notes && (
                    <div className="text-[11px] font-medium text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-700">Doctor Note: </span>
                      {rx.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

        </div>
      )}

      {/* Adherence History */}
      {activeTab === 'adherence' && (
        <div className="card border border-slate-200">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="font-bold text-slate-950">Scheduled Time</th>
                  <th className="font-bold text-slate-950">Medicine</th>
                  <th className="font-bold text-slate-950">Status</th>
                  <th className="font-bold text-slate-950">Actual Time Taken</th>
                  <th className="font-bold text-slate-950">Clinical Notes</th>
                </tr>
              </thead>
              <tbody>
                {allDoses.filter(d => d.status !== 'pending').sort((a, b) => new Date(b.scheduledTime) - new Date(a.scheduledTime)).slice(0, 50).map(d => (
                  <tr key={d.id}>
                    <td className="whitespace-nowrap font-bold text-slate-900">{formatDateTime(d.scheduledTime)}</td>
                    <td className="font-extrabold text-slate-950">{d.medicineName}</td>
                    <td><Badge variant={d.status === 'taken' ? 'success' : 'danger'}>{d.status.toUpperCase()}</Badge></td>
                    <td className="font-semibold text-slate-800">{d.actualTime ? formatTime(d.actualTime) : '—'}</td>
                    <td className="text-xs font-medium text-slate-800">{d.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Insulin Support */}
      {activeTab === 'insulin' && (
        <div className="space-y-4">
          {insulinMeds.length === 0 ? (
            <EmptyState icon={Syringe} title="No insulin prescribed" message="You don't have any insulin in your current prescriptions." />
          ) : (
            <>
              {insulinMeds.map(med => (
                <div key={med.id} className="card border border-slate-200">
                  <div className="card-body">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 flex items-center justify-center shrink-0">
                        <Syringe size={20} />
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-950 text-base">{med.name}</p>
                        <p className="text-xs font-bold text-slate-800 mt-0.5">{med.dose} • {med.route} • {med.frequency}</p>
                        <p className="text-xs font-semibold text-slate-700 mt-0.5">Administer at: {(med.times || []).join(', ')}</p>
                        <p className="text-xs font-medium text-slate-700 mt-1">{med.instructions}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="card border border-amber-300 bg-amber-50/40">
                <div className="card-body">
                  <div className="flex gap-3">
                    <BookOpen size={22} className="text-amber-800 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-amber-950 text-base">Insulin Injection Guidance</p>
                      <p className="text-xs font-semibold text-amber-900 mt-0.5">Best practice recommendations for safe insulin administration:</p>
                      <div className="mt-3 space-y-2">
                        {['Injection site rotation across abdomen, thighs, and upper arms is essential to prevent lipodystrophy', 'Store unopened insulin vials/pens refrigerated at 2°C to 8°C; never freeze', 'Never titrate your insulin units without explicit written instructions from your physician', 'Log your injection sites and timing along with post-meal glucose checks'].map((tip, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs font-bold text-amber-950">
                            <Info size={14} className="text-amber-700 shrink-0 mt-0.5" />
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Record Dose Modal */}
      {doseModal && (
        <Modal open={!!doseModal} onClose={() => setDoseModal(null)} title={`Record Dose: ${doseModal.dose.medicineName}`} size="sm"
          footer={<>
            <button className="btn-outline" onClick={() => setDoseModal(null)}>Cancel</button>
            <button className={doseModal.action === 'taken' ? 'btn-primary' : 'btn-danger'} onClick={() => handleRecordDose(doseModal.dose, doseModal.action)}>
              {doseModal.action === 'taken' ? 'Confirm Taken' : 'Confirm Missed'}
            </button>
          </>}>
          <p className="text-sm text-text-secondary mb-3">
            Scheduled at {formatTime(doseModal.dose.scheduledTime)}
          </p>
          <label className="label">Note (optional)</label>
          <textarea value={doseModal.note} onChange={(e) => setDoseModal({ ...doseModal, note: e.target.value })}
            className="input" rows={2} placeholder="Add a note..." />
        </Modal>
      )}

      {/* Refill Modal */}
      {refillModal && (
        <ConfirmDialog open={!!refillModal} onClose={() => setRefillModal(null)} onConfirm={() => handleRefillRequest(refillModal)}
          title="Request Refill" message={`Send a refill request for ${refillModal.name} to your pharmacist?`} confirmText="Send Request" variant="primary" />
      )}

      {/* Prescription Detail Modal */}
      {rxDetailModal && (
        <Modal open={!!rxDetailModal} onClose={() => setRxDetailModal(null)} title="Prescription Details" size="md">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-text-secondary">Prescription ID: {rxDetailModal.id}</p>
              <p className="text-sm text-text-secondary">Status: <Badge variant="success">{rxDetailModal.status}</Badge></p>
              <p className="text-sm text-text-secondary">Authorized: {formatDateTime(rxDetailModal.authorizedAt)}</p>
            </div>
            <h3 className="font-semibold">Medicines</h3>
            {(rxDetailModal.medicines || []).map(med => (
              <div key={med.id} className="border border-border rounded-lg p-3">
                <p className="font-medium">{med.name}</p>
                <p className="text-sm text-text-secondary">{med.dose} • {med.route} • {med.frequency}</p>
                <p className="text-sm text-text-secondary">{med.foodInstruction}</p>
                <p className="text-xs text-text-secondary mt-1">{med.instructions}</p>
              </div>
            ))}
            <h3 className="font-semibold">Version History</h3>
            {(rxDetailModal.versions || []).map((v, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary shrink-0">{v.version}</div>
                <div>
                  <p className="font-medium">{v.action}</p>
                  <p className="text-text-secondary">{v.changes} — {formatDateTime(v.date)}</p>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
