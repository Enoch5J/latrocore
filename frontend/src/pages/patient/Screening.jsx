import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { LoadingSpinner, Badge, Modal } from '../../components/ui';
import { ClipboardList, Eye, Calendar, CheckCircle, AlertTriangle, Clock, AlertCircle } from 'lucide-react';
import { formatDate } from '../../data/demoDate';
import { updateScreening, addAuditEntry } from '../../services/dataService';

export default function Screening() {
  const { currentUser, data, refreshData, addToast } = useApp();
  const [showComplete, setShowComplete] = useState(null);
  const patientId = currentUser?.id;

  const screenings = useMemo(() => (data?.screenings || []).filter(s => s.patientId === patientId), [data?.screenings, patientId]);

  const handleComplete = async (screening) => {
    await updateScreening(screening.id, { status: 'completed', completedDate: new Date().toISOString(), lastDone: new Date().toISOString() });
    await addAuditEntry({ actor: currentUser.id, actorRole: currentUser.role, action: 'screening_completed', patientId, recordId: screening.id, details: `Completed ${screening.type}` });
    refreshData(); setShowComplete(null);
    addToast({ type: 'success', message: `${screening.type} marked as completed` });
  };

  const handleReschedule = async (screening, newDate) => {
    await updateScreening(screening.id, { dueDate: new Date(newDate).toISOString(), nextDue: new Date(newDate).toISOString(), status: 'upcoming' });
    refreshData(); addToast({ type: 'info', message: 'Screening rescheduled' });
  };

  const statusIcon = (s) => s === 'completed' ? <CheckCircle size={18} className="text-green-500" /> : s === 'overdue' ? <AlertTriangle size={18} className="text-red-500" /> : s === 'due' ? <AlertCircle size={18} className="text-amber-500" /> : <Clock size={18} className="text-blue-500" />;
  const statusColor = (s) => s === 'completed' ? 'success' : s === 'overdue' ? 'danger' : s === 'due' ? 'warning' : 'info';

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">Preventive Health Screenings</h1>
        <p className="text-sm font-semibold text-slate-700 mt-1">Surveillance for diabetic retinopathy, nephropathy, foot exams, and cardiovascular risk</p>
      </div>

      <div className="space-y-3">
        {screenings.map(s => (
          <div key={s.id} className={`card border border-slate-200 border-l-4 ${s.status === 'overdue' ? 'border-l-rose-600' : s.status === 'completed' ? 'border-l-emerald-600' : s.status === 'due' ? 'border-l-amber-500' : 'border-l-blue-600'}`}>
            <div className="card-body flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="shrink-0 mt-0.5 sm:mt-0">
                  {statusIcon(s.status)}
                </div>
                <div>
                  <p className="font-extrabold text-slate-950 text-base">{s.type}</p>
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 mt-0.5">{s.notes}</p>
                  <p className="text-xs font-bold text-slate-700 mt-1">
                    {s.status === 'completed' ? `Completed: ${formatDate(s.completedDate || s.lastDone)}` : `Target Date: ${formatDate(s.dueDate)}`}
                    {s.lastDone && s.status !== 'completed' && ` • Prior check: ${formatDate(s.lastDone)}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 self-end sm:self-center">
                <Badge variant={statusColor(s.status)}>{s.status.toUpperCase()}</Badge>
                {s.status !== 'completed' && (
                  <div className="flex gap-2">
                    <button onClick={() => setShowComplete(s)} className="btn-primary btn-sm font-bold">Mark Completed</button>
                    <button onClick={() => { const nd = prompt('New due date (YYYY-MM-DD):'); if (nd) handleReschedule(s, nd); }} className="btn-outline btn-sm font-bold text-slate-800 flex items-center gap-1">
                      <Calendar size={14} /> Reschedule
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showComplete && (
        <Modal open={!!showComplete} onClose={() => setShowComplete(null)} title={`Complete ${showComplete.type}`} size="sm"
          footer={<><button className="btn-outline font-bold" onClick={() => setShowComplete(null)}>Cancel</button><button className="btn-primary font-bold" onClick={() => handleComplete(showComplete)}>Confirm Completed</button></>}>
          <p className="text-sm font-medium text-slate-900">
            Confirm completion of your <span className="font-bold text-slate-950">{showComplete.type}</span>. This will document the preventive exam in your longitudinal care record.
          </p>
        </Modal>
      )}
    </div>
  );
}
