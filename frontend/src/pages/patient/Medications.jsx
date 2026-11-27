import { useState, useEffect, useMemo } from 'react';

import { useSearchParams, useNavigate } from 'react-router-dom';

import { useApp } from '../../context/AppContext';

import { Modal, ConfirmDialog, LoadingSpinner, Badge, Tabs, Tooltip, EmptyState } from '../../components/ui';

import { Pill, Clock, CheckCircle, AlertTriangle, X, FileText, RefreshCw, Calendar, Info, Syringe, BookOpen, Sparkles, Salad, UploadCloud, ShieldCheck, Pencil, Plus, Save, Bell, BellRing } from 'lucide-react';

import PrescriptionUploadModal from '../../components/patient/PrescriptionUploadModal';

import { formatDate, formatTime, formatDateTime, isToday, getDemoToday } from '../../data/demoDate';

import { recordDose, addCounsellingRequest, addNotification, addAuditEntry, updatePatientMedicationReminderTimes } from '../../services/dataService';

function toInputTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return '';
  let hour = Number(match[1]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  if (hour < 0 || hour > 23 || Number(match[2]) > 59) return '';
  return `${String(hour).padStart(2, '0')}:${match[2]}`;
}

function displayReminderTime(value) {
  const time = toInputTime(value);
  if (!time) return value;
  return new Date(`1970-01-01T${time}:00`).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}



export default function Medications() {

  const { currentUser, data, refreshData, addToast } = useApp();

  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'schedule');

  const [doseModal, setDoseModal] = useState(null);

  const [refillModal, setRefillModal] = useState(null);

  const [rxDetailModal, setRxDetailModal] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [reminderEditor, setReminderEditor] = useState(null);
  const [reminderTimes, setReminderTimes] = useState([]);
  const [savingReminderTimes, setSavingReminderTimes] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? window.Notification.permission
      : 'unsupported'
  );



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

  const openReminderEditor = (prescription, medicine) => {
    const savedTimes = medicine.reminderTimes || medicine.times || medicine.scheduleTimes || [];
    setReminderTimes(savedTimes.map(toInputTime).filter(Boolean));
    setReminderEditor({ prescriptionId: prescription.id, medicine });
  };

  const handleSaveReminderTimes = async () => {
    if (!reminderEditor || !patientId) return;
    const cleanedTimes = [...new Set(reminderTimes.filter(Boolean))].sort();
    setSavingReminderTimes(true);
    try {
      await updatePatientMedicationReminderTimes(
        patientId,
        reminderEditor.prescriptionId,
        reminderEditor.medicine.id,
        cleanedTimes
      );
      refreshData();
      setReminderEditor(null);
      addToast({
        type: 'success',
        message: `Reminder times updated for ${reminderEditor.medicine.name}. Your prescription instructions were not changed.`,
      });
    } catch (error) {
      addToast({ type: 'error', message: error.message || 'Unable to update reminder times.' });
    } finally {
      setSavingReminderTimes(false);
    }
  };

  const handleEnableBrowserReminders = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }
    try {
      const permission = await window.Notification.requestPermission();
      setNotificationPermission(permission);
      window.dispatchEvent(new Event('latrocore:notification-permission-changed'));
      addToast({
        type: permission === 'granted' ? 'success' : 'warning',
        message: permission === 'granted'
          ? 'Browser medication alerts are enabled while LATROCORE is open.'
          : 'Allow notifications in your browser settings to receive medication alerts.',
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: error.message || 'The browser could not enable medication notifications.',
      });
    }
  };



  if (loading) return <LoadingSpinner text="Loading medications..." />;



  const tabs = [

    { id: 'schedule', label: "Today's Schedule & Prescriptions", count: todayDoses.length },

    { id: 'adherence', label: 'Adherence History' },

    { id: 'insulin', label: 'Insulin Support', count: insulinMeds.length },

  ];



  return (

    <div className="space-y-6 animate-fade-in pb-8">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">Prescribed Medications & Schedule</h1>

          <p className="text-sm font-semibold text-slate-700 mt-1">Manage active regimens, record dose compliance, and coordinate refills</p>

        </div>

        <div className="flex flex-wrap items-center gap-2">
          {notificationPermission !== 'unsupported' && (
            <button
              type="button"
              onClick={handleEnableBrowserReminders}
              disabled={notificationPermission === 'granted' || notificationPermission === 'denied'}
              className="inline-flex items-center gap-2 rounded-xl border border-[#A8D7BD] bg-white px-3.5 py-2.5 text-xs font-bold text-[#03542C] transition-colors hover:bg-[#E8F5EE] disabled:cursor-default disabled:opacity-70"
              title={notificationPermission === 'denied' ? 'Allow notifications in your browser site settings' : undefined}
            >
              {notificationPermission === 'granted' ? <BellRing size={15} /> : <Bell size={15} />}
              <span>
                {notificationPermission === 'granted'
                  ? 'Alerts enabled'
                  : notificationPermission === 'denied'
                    ? 'Alerts blocked in browser'
                    : 'Enable browser alerts'}
              </span>
            </button>
          )}
          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm text-white bg-[#0B3B2C] hover:bg-[#124d3b] shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Sparkles size={16} className="text-emerald-300" />
            <span>Upload Prescription (Gemini AI)</span>
          </button>
        </div>

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
                <div
                  key={dose.id}
                  className={`card transition shadow-sm rounded-2xl ${
                    dose.status === 'taken'
                      ? 'border-2 border-emerald-400 bg-emerald-50/40'
                      : dose.status === 'missed'
                      ? 'border-2 border-rose-400 bg-rose-50/40'
                      : 'border-2 border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="card-body p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border-2 shadow-xs ${
                          dose.status === 'taken'
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : dose.status === 'missed'
                            ? 'bg-rose-600 border-rose-500 text-white'
                            : 'bg-amber-50 border-amber-300 text-amber-800'
                        }`}
                      >
                        {dose.status === 'taken' ? (
                          <CheckCircle size={24} className="stroke-[2.5]" />
                        ) : dose.status === 'missed' ? (
                          <X size={24} className="stroke-[2.5]" />
                        ) : (
                          <Clock size={22} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-slate-950 text-base">{dose.medicineName}</p>
                          {dose.status === 'taken' && (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                              Verified Taken
                            </span>
                          )}
                          {dose.status === 'missed' && (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300">
                              Not Taken (Missed)
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">Scheduled: {formatTime(dose.scheduledTime)}</p>
                        {dose.actualTime && (
                          <p className="text-xs font-extrabold text-emerald-800 mt-0.5 flex items-center gap-1">
                            <CheckCircle size={12} className="text-emerald-700" />
                            Taken at: {formatTime(dose.actualTime)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-center">
                      {/* Bold Distinct Status Badges and Clear Action Buttons */}
                      {dose.status === 'taken' && (
                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 text-white border-2 border-emerald-500 shadow-md">
                          <CheckCircle size={15} /> TAKEN
                        </span>
                      )}
                      {dose.status === 'missed' && (
                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-rose-600 text-white border-2 border-rose-500 shadow-md">
                          <X size={15} /> NOT TAKEN
                        </span>
                      )}
                      {dose.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                            <Clock size={13} /> PENDING
                          </span>
                          <button
                            onClick={() => setDoseModal({ dose, action: 'taken', note: '' })}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 shadow-md border-2 border-emerald-500 cursor-pointer transition-all active:scale-95"
                          >
                            <CheckCircle size={14} /> Mark Taken
                          </button>
                          <button
                            onClick={() => setDoseModal({ dose, action: 'missed', note: '' })}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-rose-600 text-white hover:bg-rose-700 shadow-md border-2 border-rose-500 cursor-pointer transition-all active:scale-95"
                          >
                            <X size={14} /> Not Taken
                          </button>
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

                          <span>{med.foodInstruction} ({(med.reminderTimes || med.times || med.scheduleTimes || []).map(displayReminderTime).join(', ') || 'No times set'})</span>

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
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2">
                          <p className="text-xs font-semibold text-slate-700">
                            Your reminder: {(med.reminderTimes || med.times || med.scheduleTimes || []).map(displayReminderTime).join(', ') || 'Not set'}
                          </p>
                          <button
                            type="button"
                            onClick={() => openReminderEditor(rx, med)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#A8D7BD] bg-white px-2.5 py-1.5 text-xs font-bold text-[#03542C] transition-colors hover:bg-[#E8F5EE]"
                          >
                            <Pencil size={13} />
                            Edit reminder times
                          </button>
                        </div>

                      </div>

                    </div>

                  ))}



                  {rx.notes && (

                    <div className="text-[11px] font-medium text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">

                      <span className="font-bold text-slate-700">Doctor Note: </span>

                      {rx.notes}

                    </div>

                  )}



                  {rx.dietPlan && (

                    <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 space-y-2">

                      <div className="flex items-center justify-between">

                        <span className="text-xs font-black text-[#0B3B2C] flex items-center gap-1.5">

                          <Salad size={14} className="text-emerald-700" />

                          Synchronized Diet Plan (from Prescription)

                        </span>

                        {rx.dietPlan.hydration_target_liters && (

                          <span className="text-[10px] font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200">

                            {rx.dietPlan.hydration_target_liters}L Water

                          </span>

                        )}

                      </div>

                      {rx.dietPlan.summary && (

                        <p className="text-[11px] font-medium text-emerald-950">

                          {rx.dietPlan.summary}

                        </p>

                      )}

                      <div className="grid grid-cols-2 gap-1.5 pt-1">

                        {(rx.dietPlan.meals || []).map((m, idx) => (

                          <div key={idx} className="bg-white p-2 rounded-lg border border-emerald-100 text-[10px]">

                            <span className="font-extrabold text-stone-900 block">{m.type} ({m.recommended_time})</span>

                            <span className="text-stone-600 line-clamp-1">{m.suggested_foods}</span>

                          </div>

                        ))}

                      </div>

                    </div>

                  )}



                  {rx.dailySchedule && (

                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs space-y-1">

                      <span className="font-bold text-stone-800 block text-[11px]">24-Hour Schedule Timeline:</span>

                      {rx.dailySchedule.morning && <p className="text-[11px] text-stone-600">🌅 {rx.dailySchedule.morning}</p>}

                      {rx.dailySchedule.bedtime && <p className="text-[11px] text-stone-600">🌙 {rx.dailySchedule.bedtime}</p>}

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

                        <p className="text-xs font-semibold text-slate-700 mt-0.5">Your reminder: {(med.reminderTimes || med.times || med.scheduleTimes || []).map(displayReminderTime).join(', ') || 'Not set'}</p>

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



      {/* Medication Reminder Time Editor */}
      {reminderEditor && (
        <Modal
          open={!!reminderEditor}
          onClose={() => setReminderEditor(null)}
          title={`Reminder times: ${reminderEditor.medicine.name}`}
          size="sm"
          footer={(
            <>
              <button type="button" className="btn-outline" onClick={() => setReminderEditor(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveReminderTimes}
                disabled={savingReminderTimes}
              >
                <Save size={15} />
                {savingReminderTimes ? 'Saving...' : 'Save reminder times'}
              </button>
            </>
          )}
        >
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-700">
              Choose when you want this portal to schedule your daily reminders. Browser alerts require permission and LATROCORE to stay open. This changes your reminder schedule only—not the prescribed dose, frequency, or clinician instructions.
            </p>
            {reminderTimes.map((time, index) => (
              <div key={`${index}-${time}`} className="flex items-center gap-3">
                <label className="flex-1 space-y-1.5">
                  <span className="text-xs font-bold text-slate-800">Reminder {index + 1}</span>
                  <input
                    type="time"
                    value={time}
                    onChange={(event) => setReminderTimes((values) =>
                      values.map((value, valueIndex) => valueIndex === index ? event.target.value : value)
                    )}
                    className="input w-full text-slate-950"
                  />
                </label>
                <button
                  type="button"
                  aria-label={`Remove reminder ${index + 1}`}
                  onClick={() => setReminderTimes((values) => values.filter((_, valueIndex) => valueIndex !== index))}
                  className="mt-5 rounded-lg border border-rose-200 p-2 text-rose-700 transition-colors hover:bg-rose-50"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={reminderTimes.length >= 8}
              onClick={() => setReminderTimes((values) => [...values, '08:00'])}
              className="inline-flex items-center gap-2 rounded-lg border border-[#A8D7BD] px-3 py-2 text-sm font-bold text-[#03542C] transition-colors hover:bg-[#E8F5EE] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} />
              Add a time
            </button>
            {reminderTimes.length === 0 && (
              <p className="text-xs font-medium text-slate-700">
                No times selected. Saving turns off reminders for this medicine.
              </p>
            )}
          </div>
        </Modal>
      )}

      {/* Record Dose Modal */}

      {doseModal && (

        <Modal open={!!doseModal} onClose={() => setDoseModal(null)} title={`Record Dose: ${doseModal.dose.medicineName}`} size="sm"

          footer={<>

            <button className="btn-outline" onClick={() => setDoseModal(null)}>Cancel</button>

            <button className={doseModal.action === 'taken' ? 'btn-primary' : 'btn-danger'} onClick={() => handleRecordDose(doseModal.dose, doseModal.action)}>

              {doseModal.action === 'taken' ? 'Confirm Taken' : 'Confirm Not Taken'}

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



      {/* Gemini AI Prescription Upload Modal */}

      <PrescriptionUploadModal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} onPrescriptionApplied={() => refreshData()} />



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
