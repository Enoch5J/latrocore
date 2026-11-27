import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal, Badge, EmptyState } from '../../components/ui';
import { CalendarDays, Plus, Clock, CheckCircle, X, MapPin, AlertCircle, UserCheck } from 'lucide-react';
import { formatDateTime } from '../../data/demoDate';
import { addAppointment, updateAppointment, addAuditEntry } from '../../services/dataService';

export default function Appointments() {
  const { currentUser, data, refreshData, addToast } = useApp();
  const [showBook, setShowBook] = useState(false);

  const appointments = useMemo(() =>
    (data?.appointments || [])
      .filter(a => a.patientId === currentUser?.id || a.doctorId === currentUser?.id || a.pharmacistId === currentUser?.id)
      .sort((a, b) => new Date(a.date) - new Date(b.date)),
    [data?.appointments, currentUser]
  );

  const upcoming = appointments.filter(a => a.status === 'scheduled');
  const past = appointments.filter(a => a.status === 'completed' || a.status === 'cancelled');

  const handleBook = async (aptData) => {
    const conflict = (data?.appointments || []).find(
      a => a.status === 'scheduled'
        && ((aptData.doctorId && a.doctorId === aptData.doctorId) || (aptData.pharmacistId && a.pharmacistId === aptData.pharmacistId))
        && a.date === aptData.date
    );
    if (conflict) {
      addToast({ type: 'error', message: 'This time slot is already booked. Please choose another time.' });
      return false;
    }

    await addAppointment(aptData);
    if (currentUser?.id) {
      await addAuditEntry({
        actor: currentUser.id,
        actorRole: currentUser.role,
        action: 'appointment_booked',
        patientId: aptData.patientId || currentUser.id,
        details: `Booked ${aptData.type}`,
      });
    }
    refreshData();
    setShowBook(false);
    addToast({ type: 'success', message: 'Appointment booked successfully.' });
    return true;
  };

  const handleCancel = async (apt) => {
    await updateAppointment(apt.id, { status: 'cancelled' });
    refreshData();
    addToast({ type: 'info', message: 'Appointment cancelled.' });
  };

  const handleComplete = async (apt) => {
    await updateAppointment(apt.id, { status: 'completed' });
    refreshData();
    addToast({ type: 'success', message: 'Appointment marked as completed.' });
  };

  const isDoctor = (currentUser?.role || '').toLowerCase() === 'doctor';

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
            Consultations & Visits
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Schedule and manage your clinical appointments
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowBook(true)}
          className="btn-primary font-semibold flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Book Appointment</span>
        </button>
      </div>

      {/* Upcoming */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-base sm:text-lg">
            Upcoming Appointments ({upcoming.length})
          </h2>
        </div>

        <div className="space-y-3">
          {upcoming.map(a => {
            const doc = data?.users?.[a.doctorId];
            const pharm = data?.users?.[a.pharmacistId];
            const providerName = doc?.name || pharm?.name || 'Attending Clinician';

            return (
              <div
                key={a.id}
                className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-11 h-11 bg-emerald-50 border border-emerald-200 text-[#046A38] rounded-xl flex items-center justify-center shrink-0">
                    <CalendarDays size={20} />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-950 text-base">{a.type}</p>
                      <Badge variant="info">Scheduled</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-600">
                      <span className="inline-flex items-center gap-1 text-slate-800 font-semibold">
                        <Clock size={13} className="text-slate-500" />
                        {formatDateTime(a.date)} • {a.duration || 30} mins
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <UserCheck size={13} className="text-slate-500" />
                        {providerName}
                      </span>
                      {a.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={13} className="text-slate-500" />
                          {a.location}
                        </span>
                      )}
                    </div>
                    {a.notes && (
                      <p className="text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 mt-1.5">
                        {a.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {isDoctor && (
                    <button
                      type="button"
                      onClick={() => handleComplete(a)}
                      className="btn-outline btn-sm font-semibold flex items-center gap-1"
                    >
                      <CheckCircle size={14} />
                      <span>Complete</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCancel(a)}
                    className="btn-outline btn-sm font-semibold text-rose-700 border-rose-200 hover:bg-rose-50 flex items-center gap-1"
                  >
                    <X size={14} />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            );
          })}

          {upcoming.length === 0 && (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming appointments"
              message="Book an appointment with your doctor to schedule your next consultation."
            />
          )}
        </div>
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section className="space-y-3 pt-2">
          <h2 className="font-bold text-slate-900 text-base sm:text-lg">
            Past Consultations ({past.length})
          </h2>
          <div className="space-y-2">
            {past.map(a => {
              const doc = data?.users?.[a.doctorId];
              const pharm = data?.users?.[a.pharmacistId];
              return (
                <div
                  key={a.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CalendarDays size={17} className="text-slate-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {a.type} — {doc?.name || pharm?.name || 'Clinician'}
                      </p>
                      <p className="text-xs font-medium text-slate-600">{formatDateTime(a.date)}</p>
                    </div>
                  </div>
                  <Badge variant={a.status === 'completed' ? 'success' : 'gray'}>
                    {a.status === 'completed' ? 'Completed' : 'Cancelled'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <BookingModal
        open={showBook}
        onClose={() => setShowBook(false)}
        onBook={handleBook}
        currentUser={currentUser}
        users={data?.users}
      />
    </div>
  );
}

function BookingModal({ open, onClose, onBook, currentUser, users }) {
  const [form, setForm] = useState({
    type: 'Regular Check-up',
    doctorId: '',
    date: '',
    location: 'Clinic',
    notes: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const doctors = useMemo(
    () => Object.values(users || {}).filter(u => (u.role || '').toLowerCase() === 'doctor'),
    [users]
  );

  useEffect(() => {
    if (open) {
      setError('');
      setSubmitting(false);
      setForm(prev => ({
        ...prev,
        doctorId: prev.doctorId || doctors[0]?.id || '',
      }));
    }
  }, [open, doctors]);

  const handleSubmit = async () => {
    setError('');
    if (!form.doctorId) {
      setError('Please select an attending physician.');
      return;
    }
    if (!form.date) {
      setError('Please choose a date and time for your appointment.');
      return;
    }
    const parsedDate = new Date(form.date);
    if (Number.isNaN(parsedDate.getTime())) {
      setError('Please enter a valid date and time.');
      return;
    }

    setSubmitting(true);
    try {
      const ok = await onBook({
        ...form,
        patientId: (currentUser?.role || '').toLowerCase() === 'patient' ? currentUser.id : '',
        date: parsedDate.toISOString(),
        duration: 30,
      });
      if (ok) {
        setForm({
          type: 'Regular Check-up',
          doctorId: doctors[0]?.id || '',
          date: '',
          location: 'Clinic',
          notes: '',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Book Clinical Appointment"
      size="md"
      footer={
        <>
          <button type="button" className="btn-outline font-semibold" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="btn-primary font-semibold" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Booking...' : 'Book Consultation'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-800">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="label text-slate-900 font-semibold">Appointment Reason</label>
          <select
            className="input font-medium text-slate-900"
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value })}
          >
            <option>Regular Check-up</option>
            <option>Follow-up</option>
            <option>Medication Counselling</option>
            <option>Investigation Review</option>
          </select>
        </div>

        <div>
          <label className="label text-slate-900 font-semibold">Attending Physician</label>
          <select
            className="input font-medium text-slate-900"
            value={form.doctorId}
            onChange={e => {
              setError('');
              setForm({ ...form, doctorId: e.target.value });
            }}
          >
            <option value="">Select a physician...</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}{d.specialty ? ` — ${d.specialty}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label text-slate-900 font-semibold">Date & Time</label>
            <input
              type="datetime-local"
              className="input font-medium text-slate-900"
              value={form.date}
              onChange={e => {
                setError('');
                setForm({ ...form, date: e.target.value });
              }}
            />
          </div>

          <div>
            <label className="label text-slate-900 font-semibold">Location / Setting</label>
            <select
              className="input font-medium text-slate-900"
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
            >
              <option value="Clinic">In-Person (Clinic)</option>
              <option value="Tele-Consult (Video)">Tele-Consult (Video)</option>
              <option value="Hospital Outpatient">Hospital Outpatient</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label text-slate-900 font-semibold">Visit Notes</label>
          <textarea
            className="input font-medium text-slate-900"
            rows={2}
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Reason for consultation, recent symptoms..."
          />
        </div>
      </div>
    </Modal>
  );
}
