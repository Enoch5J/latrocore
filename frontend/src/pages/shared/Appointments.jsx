import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal, LoadingSpinner, Badge, EmptyState } from '../../components/ui';
import { CalendarDays, Plus, Clock, CheckCircle, X, MapPin, AlertCircle } from 'lucide-react';
import { formatDate, formatDateTime, formatTime } from '../../data/demoDate';
import { addAppointment, updateAppointment, addAuditEntry, addNotification } from '../../services/dataService';

export default function Appointments() {
  const { currentUser, data, refreshData, addToast } = useApp();
  const [showBook, setShowBook] = useState(false);
  const [selectedApt, setSelectedApt] = useState(null);

  const appointments = useMemo(() =>
    (data?.appointments || []).filter(a => a.patientId === currentUser?.id || a.doctorId === currentUser?.id || a.pharmacistId === currentUser?.id).sort((a, b) => new Date(a.date) - new Date(b.date)),
    [data?.appointments, currentUser]);

  const upcoming = appointments.filter(a => a.status === 'scheduled');
  const past = appointments.filter(a => a.status === 'completed' || a.status === 'cancelled');

  const handleBook = async (aptData) => {
    // Check conflicts
    const conflict = (data?.appointments || []).find(a => a.status === 'scheduled' && (a.doctorId === aptData.doctorId || a.pharmacistId === aptData.pharmacistId) && a.date === aptData.date);
    if (conflict) { addToast({ type: 'error', message: 'This time slot is already booked.' }); return; }
    await addAppointment(aptData);
    await addAuditEntry({ actor: currentUser.id, actorRole: currentUser.role, action: 'appointment_booked', patientId: aptData.patientId || currentUser.id, details: `Booked ${aptData.type}` });
    refreshData(); setShowBook(false);
    addToast({ type: 'success', message: 'Appointment booked' });
  };

  const handleCancel = async (apt) => {
    await updateAppointment(apt.id, { status: 'cancelled' });
    refreshData();
    addToast({ type: 'info', message: 'Appointment cancelled' });
  };

  const handleComplete = async (apt) => {
    await updateAppointment(apt.id, { status: 'completed' });
    refreshData();
    addToast({ type: 'success', message: 'Appointment marked as completed' });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">Clinical Consultations & Visits</h1>
          <p className="text-sm font-semibold text-slate-700 mt-1">Schedule and coordinate patient-doctor and pharmacist counselling encounters</p>
        </div>
        <button onClick={() => setShowBook(true)} className="btn-primary font-bold flex items-center gap-2 self-start sm:self-auto">
          <Plus size={16} /> Book Appointment
        </button>
      </div>

      <h2 className="font-extrabold text-slate-950 text-lg">Upcoming Appointments ({upcoming.length})</h2>
      <div className="space-y-3">
        {upcoming.map(a => {
          const doc = data?.users?.[a.doctorId]; const pharm = data?.users?.[a.pharmacistId];
          return (
            <div key={a.id} className="card card-body border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl flex items-center justify-center shrink-0">
                  <CalendarDays size={22} />
                </div>
                <div>
                  <p className="font-extrabold text-slate-950 text-base">{a.type}</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">{formatDateTime(a.date)} • {a.duration} mins</p>
                  <p className="text-xs sm:text-sm font-semibold text-slate-700">{doc?.name || pharm?.name} • <span className="font-medium text-slate-600">{a.location}</span></p>
                  {a.notes && <p className="text-xs font-medium text-slate-700 mt-1 bg-slate-50 p-2 rounded border border-slate-200">{a.notes}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2.5 self-end sm:self-center">
                <Badge variant="info">SCHEDULED</Badge>
                {currentUser?.role === 'doctor' && (
                  <button onClick={() => handleComplete(a)} className="btn-outline btn-sm font-bold flex items-center gap-1">
                    <CheckCircle size={14} /> Complete
                  </button>
                )}
                <button onClick={() => handleCancel(a)} className="btn-outline btn-sm font-bold text-rose-700 border-rose-300 hover:bg-rose-50 flex items-center gap-1">
                  <X size={14} /> Cancel
                </button>
              </div>
            </div>
          );
        })}
        {upcoming.length === 0 && <EmptyState icon={CalendarDays} title="No upcoming appointments" message="Book a new appointment to get started." />}
      </div>

      {past.length > 0 && (
        <>
          <h2 className="font-extrabold text-slate-950 text-lg mt-8">Past Consultations</h2>
          <div className="space-y-2">
            {past.map(a => {
              const doc = data?.users?.[a.doctorId];
              return (
                <div key={a.id} className="card card-body border border-slate-200 flex items-center gap-4 bg-slate-50/60">
                  <CalendarDays size={18} className="text-slate-600" />
                  <div className="flex-1">
                    <p className="text-sm font-extrabold text-slate-950">{a.type} — {doc?.name}</p>
                    <p className="text-xs font-bold text-slate-700">{formatDateTime(a.date)}</p>
                  </div>
                  <Badge variant={a.status === 'completed' ? 'success' : 'gray'}>{a.status.toUpperCase()}</Badge>
                </div>
              );
            })}
          </div>
        </>
      )}

      <BookingModal open={showBook} onClose={() => setShowBook(false)} onBook={handleBook} currentUser={currentUser} users={data?.users} availability={data?.availability} />
    </div>
  );
}

function BookingModal({ open, onClose, onBook, currentUser, users, availability }) {
  const [form, setForm] = useState({ type: 'Follow-up', doctorId: '', date: '', location: 'Clinic', notes: '' });
  const doctors = Object.values(users || {}).filter(u => u.role === 'doctor');

  return (
    <Modal open={open} onClose={onClose} title="Book Clinical Appointment" size="md"
      footer={<><button className="btn-outline font-bold" onClick={onClose}>Cancel</button><button className="btn-primary font-bold" onClick={() => onBook({ ...form, patientId: currentUser?.role === 'patient' ? currentUser.id : '', date: new Date(form.date).toISOString(), duration: 30 })}>Book Consultation</button></>}>
      <div className="space-y-4">
        <div>
          <label className="label text-slate-950 font-bold">Appointment Reason</label>
          <select className="input font-medium text-slate-950" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            <option>Follow-up</option>
            <option>Regular Check-up</option>
            <option>Medication Counselling</option>
            <option>Investigation Review</option>
          </select>
        </div>
        <div>
          <label className="label text-slate-950 font-bold">Attending Physician</label>
          <select className="input font-medium text-slate-950" value={form.doctorId} onChange={e => setForm({ ...form, doctorId: e.target.value })}>
            <option value="">Select a physician...</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label text-slate-950 font-bold">Date & Time</label>
          <input type="datetime-local" className="input font-medium text-slate-950" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        </div>
        <div>
          <label className="label text-slate-950 font-bold">Location / Setting</label>
          <input className="input font-medium text-slate-950" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
        </div>
        <div>
          <label className="label text-slate-950 font-bold">Visit Notes</label>
          <textarea className="input font-medium text-slate-950" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Reason for consultation, recent symptoms..." />
        </div>
      </div>
    </Modal>
  );
}
