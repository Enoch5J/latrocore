import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { LoadingSpinner, Badge, Modal } from '../../components/ui';
import { AlertTriangle, Shield, Phone, Bell, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { formatDateTime, formatDate } from '../../data/demoDate';
import { addSafetyEvent, updateSafetyEvent, addNotification, addAuditEntry } from '../../services/dataService';

export default function SafetyAlerts() {
  const { currentUser, data, refreshData, addToast } = useApp();
  const [showScenario, setShowScenario] = useState(false);
  const patientId = currentUser?.id;

  const events = useMemo(() => (data?.safetyEvents || []).filter(e => e.patientId === patientId).sort((a, b) => new Date(b.triggerTime) - new Date(a.triggerTime)), [data?.safetyEvents, patientId]);
  const targets = useMemo(() => (data?.clinicalTargets || []).find(t => t.patientId === patientId), [data?.clinicalTargets, patientId]);

  const triggerScenario = async (type) => {
    const val = type === 'low' ? 58 : type === 'high' ? 310 : 45;
    const event = await addSafetyEvent({ patientId, type: `${type}_glucose`, triggerValue: val, unit: 'mg/dL', triggerTime: new Date().toISOString(), acknowledged: false, resolved: false });
    await addNotification({ userId: patientId, type: 'safety', title: `${type === 'low' ? 'Low' : 'High'} Glucose Alert`, message: `A ${type} glucose event (${val} mg/dL) has been detected.`, relatedId: event.id });
    await addNotification({ userId: currentUser.assignedDoctor, type: 'safety', title: 'Patient Safety Alert', message: `${currentUser.name}: ${type} glucose alert (${val} mg/dL)`, relatedId: event.id });
    await addAuditEntry({ actor: 'system', actorRole: 'system', action: 'safety_alert', patientId, recordId: event.id, details: `${type} glucose: ${val} mg/dL` });
    refreshData();
    setShowScenario(false);
    addToast({ type: 'warning', title: 'Safety Alert Triggered', message: 'This is a demo scenario.' });
  };

  const handleAcknowledge = async (event) => {
    await updateSafetyEvent(event.id, { acknowledged: true, acknowledgedAt: new Date().toISOString(), acknowledgedBy: currentUser.id });
    refreshData();
    addToast({ type: 'info', message: 'Alert acknowledged' });
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b-2 border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950">Safety Alerts & Thresholds</h1>
          <p className="text-sm sm:text-base font-semibold text-slate-700 mt-1">Hypo / Hyperglycemia safety monitoring and rapid response simulation</p>
        </div>
        <button onClick={() => setShowScenario(true)} className="btn-outline">
          <Shield size={16} />
          <span>Trigger Demo Scenario</span>
        </button>
      </div>

      <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5">
        <p className="text-sm sm:text-base text-amber-950 font-bold flex items-center gap-2">
          <AlertCircle size={18} className="text-amber-700 shrink-0" />
          Simulation environment. No external emergency service has been contacted.
        </p>
        <p className="text-xs sm:text-sm font-semibold text-amber-900 mt-1.5">
          This workflow illustrates clinician-configured alert rules and immediate caregiver/care team notification protocols.
        </p>
        {targets && (
          <p className="text-xs font-bold text-amber-950 mt-2 bg-amber-100/70 p-2 rounded-lg border border-amber-300">
            Active Clinician Thresholds: Hypoglycemia &lt; {targets.fastingGlucoseMin} mg/dL • Hyperglycemia &gt; {targets.postMealGlucoseMax || 250} mg/dL
          </p>
        )}
      </div>

      <div className="space-y-4">
        {events.map(event => (
          <div key={event.id} className={`card border-2 shadow-xs ${event.type.includes('low') ? 'border-rose-400 bg-rose-50/20' : 'border-amber-400 bg-amber-50/20'}`}>
            <div className="card-body">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${event.type.includes('low') ? 'bg-rose-100 text-rose-700 border border-rose-300' : 'bg-amber-100 text-amber-700 border border-amber-300'}`}>
                  <AlertTriangle size={28} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-black text-lg sm:text-xl text-slate-950">{event.type.includes('low') ? 'Hypoglycemia (Low Glucose) Alert' : 'Hyperglycemia (High Glucose) Alert'}</h3>
                    <Badge variant={event.resolved ? 'success' : event.acknowledged ? 'warning' : 'danger'}>
                      {event.resolved ? 'RESOLVED' : event.acknowledged ? 'ACKNOWLEDGED' : 'ACTIVE ALERT'}
                    </Badge>
                  </div>
                  <p className="text-3xl font-black mt-2 text-rose-700 tracking-tight">{event.triggerValue} {event.unit}</p>
                  <p className="text-xs font-bold text-slate-800 mt-1">{formatDateTime(event.triggerTime)}</p>
                  {event.notes && <p className="text-xs font-semibold text-slate-800 mt-2 bg-slate-100 p-2 rounded-lg border border-slate-200">{event.notes}</p>}
                  {event.resolution && <p className="text-xs font-bold text-emerald-900 mt-2 p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg">Clinical Resolution: {event.resolution}</p>}

                  {event.type.includes('low') && !event.resolved && (
                    <div className="mt-3.5 p-3.5 bg-rose-100/80 border-2 border-rose-300 rounded-xl">
                      <p className="text-sm font-black text-rose-950 flex items-center gap-1.5">
                        <AlertTriangle size={18} className="text-rose-700 shrink-0" />
                        If you are experiencing sweating, dizziness, or confusion, seek urgent medical help immediately.
                      </p>
                      <p className="text-xs font-bold text-rose-900 mt-1">Consume 15g fast-acting carbohydrate (fruit juice/glucose tablets) and retest in 15 minutes.</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2.5 mt-4 pt-3 border-t border-slate-200">
                    {!event.acknowledged && (
                      <button onClick={() => handleAcknowledge(event)} className="btn-primary btn-sm">
                        <CheckCircle size={15} /> Acknowledge Alert
                      </button>
                    )}
                    <button className="btn-outline btn-sm text-blue-800 border-blue-300 hover:bg-blue-50"><Phone size={15} /> Contact Care Team</button>
                    <button className="btn-outline btn-sm text-amber-800 border-amber-300 hover:bg-amber-50"><Bell size={15} /> Notify Designated Caregiver</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {events.length === 0 && <div className="card card-body text-center py-12 text-slate-800 font-bold">No critical safety events recorded. Patient levels are currently stable.</div>}
      </div>

      <Modal open={showScenario} onClose={() => setShowScenario(false)} title="Trigger Demo Safety Scenario" size="sm">
        <p className="text-sm font-semibold text-slate-700 mb-4">Select a demonstration safety scenario. These simulate alerts across patient, doctor, and pharmacist portals.</p>
        <div className="space-y-2.5">
          <button onClick={() => triggerScenario('low')} className="w-full p-3.5 text-left border-2 border-rose-300 rounded-xl hover:bg-rose-50 cursor-pointer transition-colors">
            <p className="font-extrabold text-sm text-rose-900">Simulate Low Glucose (58 mg/dL)</p>
            <p className="text-xs font-semibold text-slate-700 mt-0.5">Triggers acute hypoglycemia safety cascade</p>
          </button>
          <button onClick={() => triggerScenario('high')} className="w-full p-3.5 text-left border-2 border-amber-300 rounded-xl hover:bg-amber-50 cursor-pointer transition-colors">
            <p className="font-extrabold text-sm text-amber-900">Simulate High Glucose (310 mg/dL)</p>
            <p className="text-xs font-semibold text-slate-700 mt-0.5">Triggers severe hyperglycemia escalation protocol</p>
          </button>
        </div>
      </Modal>
    </div>
  );
}
