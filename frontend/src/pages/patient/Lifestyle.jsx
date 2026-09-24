import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal, LoadingSpinner, Badge, Tabs, ConfirmDialog, EmptyState } from '../../components/ui';
import { Salad, Plus, Edit, Trash2, Clock, Heart, Moon, Scale, Droplets, TrendingUp } from 'lucide-react';
import { formatDate, formatDateTime, formatTime, isToday } from '../../data/demoDate';
import { addHealthEntry, updateHealthEntry, deleteHealthEntry, addAuditEntry } from '../../services/dataService';

const ENTRY_TYPES = [
  { id: 'meal', label: 'Meal', icon: Salad, color: 'text-green-600 bg-green-50' },
  { id: 'activity', label: 'Activity', icon: Heart, color: 'text-blue-600 bg-blue-50' },
  { id: 'sleep', label: 'Sleep', icon: Moon, color: 'text-purple-600 bg-purple-50' },
  { id: 'weight', label: 'Weight', icon: Scale, color: 'text-amber-600 bg-amber-50' },
  { id: 'blood_pressure', label: 'Blood Pressure', icon: Droplets, color: 'text-red-600 bg-red-50' },
];

export default function Lifestyle() {
  const { currentUser, data, refreshData, addToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeline');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('meal');
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const patientId = currentUser?.id;
  useEffect(() => { setTimeout(() => setLoading(false), 300); }, []);

  const entries = useMemo(() =>
    (data?.healthEntries || []).filter(e => e.patientId === patientId).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [data?.healthEntries, patientId]);

  const todayEntries = useMemo(() => entries.filter(e => isToday(e.date)), [entries]);

  const glucoseReadings = useMemo(() =>
    (data?.glucoseReadings || []).filter(r => r.patientId === patientId && isToday(r.dateTime)),
    [data?.glucoseReadings, patientId]);

  const todayDoses = useMemo(() =>
    (data?.doseEvents || []).filter(d => d.patientId === patientId && isToday(d.scheduledTime)),
    [data?.doseEvents, patientId]);

  // Weekly summaries
  const weeklySummary = useMemo(() => {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekEntries = entries.filter(e => new Date(e.date) >= weekAgo);
    const activities = weekEntries.filter(e => e.type === 'activity');
    const meals = weekEntries.filter(e => e.type === 'meal');
    const sleeps = weekEntries.filter(e => e.type === 'sleep');
    return {
      totalActivity: activities.reduce((s, a) => s + (a.duration || 0), 0),
      avgSleep: sleeps.length > 0 ? (sleeps.reduce((s, a) => s + (a.duration || 0), 0) / sleeps.length).toFixed(1) : 0,
      mealCount: meals.length,
      activityDays: new Set(activities.map(a => new Date(a.date).toDateString())).size,
    };
  }, [entries]);

  const handleSave = async (formData) => {
    if (editing) {
      await updateHealthEntry(editing.id, formData);
      addToast({ type: 'success', message: 'Entry updated' });
    } else {
      await addHealthEntry({ ...formData, patientId });
      addToast({ type: 'success', message: 'Entry added' });
    }
    refreshData(); setShowForm(false); setEditing(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteHealthEntry(deleteTarget.id);
    refreshData();
    addToast({ type: 'success', message: 'Entry deleted' });
  };

  if (loading) return <LoadingSpinner />;

  const tabs = [
    { id: 'timeline', label: "Today's Timeline" },
    { id: 'meals', label: 'Meals', count: entries.filter(e => e.type === 'meal').length },
    { id: 'activity', label: 'Activity', count: entries.filter(e => e.type === 'activity').length },
    { id: 'sleep', label: 'Sleep' },
    { id: 'vitals', label: 'Weight & BP' },
    { id: 'weekly', label: 'Weekly Summary' },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">Lifestyle, Nutrition & Vitals</h1>
          <p className="text-sm font-semibold text-slate-700 mt-1">Holistic tracking of dietary habits, physical activity, sleep cycles, and daily vitals</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ENTRY_TYPES.map(t => (
            <button key={t.id} onClick={() => { setFormType(t.id); setEditing(null); setShowForm(true); }}
              className="btn-outline btn-sm font-bold text-slate-900 border-slate-300 hover:bg-slate-100 flex items-center gap-1.5 shadow-xs">
              <t.icon size={15} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'timeline' && (
        <div className="card card-body border border-slate-200">
          <h3 className="font-extrabold text-slate-950 text-base mb-4">Today's Chronological Health Timeline</h3>
          <div className="space-y-3">
            {[...todayEntries, ...glucoseReadings.map(r => ({ ...r, type: 'glucose', date: r.dateTime })), ...todayDoses.map(d => ({ ...d, type: 'dose', date: d.scheduledTime }))].sort((a, b) => new Date(a.date) - new Date(b.date)).map((item, i) => {
              const typeInfo = ENTRY_TYPES.find(t => t.id === item.type) || { label: item.type === 'glucose' ? 'Glucose' : 'Medication', color: item.type === 'glucose' ? 'text-teal-800 bg-teal-50 border-teal-200' : 'text-blue-800 bg-blue-50 border-blue-200' };
              return (
                <div key={i} className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-bold text-slate-700 w-16 shrink-0">{formatTime(item.date)}</div>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${typeInfo.color}`}>
                    {typeInfo.icon ? <typeInfo.icon size={16} /> : <Clock size={16} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-extrabold text-slate-950">
                      {item.type === 'glucose' ? `Blood Glucose: ${item.value} ${item.unit}` : item.type === 'dose' ? `Prescription ${item.medicineName}: marked ${item.status}` : item.type === 'meal' ? `Meal (${item.mealType}): ${item.items}` : item.type === 'activity' ? `Physical Activity (${item.activityType}): ${item.duration} min` : item.type === 'sleep' ? `Restful Sleep: ${item.duration?.toFixed(1)} hrs` : item.type === 'blood_pressure' ? `Blood Pressure: ${item.systolic}/${item.diastolic} mmHg` : `Body Weight: ${item.value?.toFixed(1)} ${item.unit}`}
                    </p>
                  </div>
                </div>
              );
            })}
            {todayEntries.length === 0 && glucoseReadings.length === 0 && <p className="text-center text-slate-600 font-semibold py-8">No entries recorded for today</p>}
          </div>
        </div>
      )}

      {activeTab === 'meals' && <EntryTable entries={entries.filter(e => e.type === 'meal')} columns={['Date & Time', 'Meal Type', 'Food Items Consumed', 'Est. Calories', 'Dietary Notes']} renderRow={e => [formatDateTime(e.date), e.mealType, e.items, e.calories || '—', e.notes || '—']} onEdit={e => { setFormType('meal'); setEditing(e); setShowForm(true); }} onDelete={setDeleteTarget} />}
      {activeTab === 'activity' && <EntryTable entries={entries.filter(e => e.type === 'activity')} columns={['Date & Time', 'Exercise Type', 'Duration', 'Session Notes']} renderRow={e => [formatDateTime(e.date), e.activityType, `${e.duration} min`, e.notes || '—']} onEdit={e => { setFormType('activity'); setEditing(e); setShowForm(true); }} onDelete={setDeleteTarget} />}
      {activeTab === 'sleep' && <EntryTable entries={entries.filter(e => e.type === 'sleep')} columns={['Date', 'Sleep Duration', 'Sleep Quality Notes']} renderRow={e => [formatDate(e.date), `${e.duration?.toFixed(1)} hrs`, e.notes || '—']} onEdit={e => { setFormType('sleep'); setEditing(e); setShowForm(true); }} onDelete={setDeleteTarget} />}
      {activeTab === 'vitals' && <EntryTable entries={entries.filter(e => e.type === 'blood_pressure' || e.type === 'weight')} columns={['Date', 'Vital Metric', 'Recorded Value', 'Measurement Notes']} renderRow={e => [formatDate(e.date), e.type === 'blood_pressure' ? 'Blood Pressure' : 'Body Weight', e.type === 'blood_pressure' ? `${e.systolic}/${e.diastolic} mmHg` : `${e.value?.toFixed(1)} ${e.unit}`, e.notes || '—']} onEdit={e => { setFormType(e.type); setEditing(e); setShowForm(true); }} onDelete={setDeleteTarget} />}

      {activeTab === 'weekly' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card card-body text-center border border-slate-200"><p className="text-3xl font-black text-primary">{weeklySummary.totalActivity}</p><p className="text-xs font-bold text-slate-700 mt-1 uppercase tracking-wide">Minutes Active</p></div>
          <div className="card card-body text-center border border-slate-200"><p className="text-3xl font-black text-purple-700">{weeklySummary.avgSleep}</p><p className="text-xs font-bold text-slate-700 mt-1 uppercase tracking-wide">Avg Sleep (hrs/night)</p></div>
          <div className="card card-body text-center border border-slate-200"><p className="text-3xl font-black text-emerald-700">{weeklySummary.mealCount}</p><p className="text-xs font-bold text-slate-700 mt-1 uppercase tracking-wide">Meals Documented</p></div>
          <div className="card card-body text-center border border-slate-200"><p className="text-3xl font-black text-blue-700">{weeklySummary.activityDays}/7</p><p className="text-xs font-bold text-slate-700 mt-1 uppercase tracking-wide">Active Days / Week</p></div>
          <div className="col-span-full card card-body border border-slate-200 bg-slate-50">
            <p className="text-xs font-semibold text-slate-700">Clinical note: This summary correlates lifestyle and physical activity habits. Discuss trends with your diabetes educator or physician during regular consultations.</p>
          </div>
        </div>
      )}

      <HealthEntryForm open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} onSave={handleSave} type={formType} entry={editing} />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Entry?" message="This entry will be permanently deleted." confirmText="Delete" />
    </div>
  );
}

function EntryTable({ entries, columns, renderRow, onEdit, onDelete }) {
  return (
    <div className="card border border-slate-200">
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(c => <th key={c} className="font-bold text-slate-950">{c}</th>)}
              <th className="font-bold text-slate-950">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.slice(0, 50).map(e => {
              const cells = renderRow(e);
              return (
                <tr key={e.id}>
                  {cells.map((c, i) => (
                    <td key={i} className={`text-sm ${i === 0 ? 'font-bold text-slate-950 whitespace-nowrap' : 'font-medium text-slate-900'}`}>{c}</td>
                  ))}
                  <td>
                    <div className="flex gap-1.5">
                      <button onClick={() => onEdit(e)} className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer text-slate-800"><Edit size={14} /></button>
                      <button onClick={() => onDelete(e)} className="p-1.5 hover:bg-rose-50 rounded-lg cursor-pointer text-rose-700"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HealthEntryForm({ open, onClose, onSave, type, entry }) {
  const [form, setForm] = useState({});
  useEffect(() => {
    if (open) {
      if (entry) setForm({ ...entry }); else {
        const base = { date: new Date().toISOString().slice(0, 16), notes: '' };
        if (type === 'meal') Object.assign(base, { mealType: 'Breakfast', items: '', calories: '' });
        else if (type === 'activity') Object.assign(base, { activityType: 'Walking', duration: 30 });
        else if (type === 'sleep') Object.assign(base, { duration: 7 });
        else if (type === 'weight') Object.assign(base, { value: '', unit: 'kg' });
        else if (type === 'blood_pressure') Object.assign(base, { systolic: '', diastolic: '' });
        setForm(base);
      }
    }
  }, [open, type, entry]);

  const handleSubmit = () => onSave({ ...form, type, date: new Date(form.date).toISOString() });

  return (
    <Modal open={open} onClose={onClose} title={`${entry ? 'Edit' : 'Add'} ${type.replace('_', ' ')}`} size="sm"
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={handleSubmit}>Save</button></>}>
      <div className="space-y-3">
        <div><label className="label">Date & Time</label><input type="datetime-local" className="input" value={form.date?.slice(0, 16) || ''} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
        {type === 'meal' && (<><div><label className="label">Meal</label><select className="input" value={form.mealType || ''} onChange={e => setForm({ ...form, mealType: e.target.value })}><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option></select></div><div><label className="label">Items</label><input className="input" value={form.items || ''} onChange={e => setForm({ ...form, items: e.target.value })} /></div><div><label className="label">Calories (est.)</label><input type="number" className="input" value={form.calories || ''} onChange={e => setForm({ ...form, calories: +e.target.value })} /></div></>)}
        {type === 'activity' && (<><div><label className="label">Activity Type</label><select className="input" value={form.activityType || ''} onChange={e => setForm({ ...form, activityType: e.target.value })}><option>Walking</option><option>Yoga</option><option>Cycling</option><option>Swimming</option><option>Light exercises</option><option>Running</option></select></div><div><label className="label">Duration (min)</label><input type="number" className="input" value={form.duration || ''} onChange={e => setForm({ ...form, duration: +e.target.value })} /></div></>)}
        {type === 'sleep' && <div><label className="label">Duration (hours)</label><input type="number" step="0.5" className="input" value={form.duration || ''} onChange={e => setForm({ ...form, duration: +e.target.value })} /></div>}
        {type === 'weight' && <div><label className="label">Weight (kg)</label><input type="number" step="0.1" className="input" value={form.value || ''} onChange={e => setForm({ ...form, value: +e.target.value })} /></div>}
        {type === 'blood_pressure' && (<div className="grid grid-cols-2 gap-3"><div><label className="label">Systolic</label><input type="number" className="input" value={form.systolic || ''} onChange={e => setForm({ ...form, systolic: +e.target.value })} /></div><div><label className="label">Diastolic</label><input type="number" className="input" value={form.diastolic || ''} onChange={e => setForm({ ...form, diastolic: +e.target.value })} /></div></div>)}
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
    </Modal>
  );
}
