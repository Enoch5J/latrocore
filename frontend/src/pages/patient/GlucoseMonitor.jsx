import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Modal, ConfirmDialog, LoadingSpinner, EmptyState, Badge, SearchBar, Tabs, Select, Tooltip } from '../../components/ui';
import { Activity, Plus, Download, Upload, Table, BarChart3, Trash2, Edit, Filter, Search, FileDown, FileUp, AlertCircle, CheckCircle, X, Zap } from 'lucide-react';
import { formatDate, formatTime, formatDateTime, toISODate, isToday } from '../../data/demoDate';
import { addGlucoseReading, updateGlucoseReading, deleteGlucoseReading, addAuditEntry } from '../../services/dataService';
import { genId } from '../../data/seedData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, ReferenceLine, ScatterChart, Scatter, ComposedChart } from 'recharts';

const CONTEXTS = ['fasting', 'pre-meal', 'post-meal', 'random'];
const MEALS = ['', 'Breakfast', 'Lunch', 'Dinner', 'Snack'];
const SYMPTOMS = ['None', 'Slight dizziness', 'Fatigue', 'Blurred vision', 'Sweating', 'Shakiness', 'Nausea', 'Headache'];

export default function GlucoseMonitor() {
  const { currentUser, data, refreshData, addToast } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('chart');
  const [showForm, setShowForm] = useState(false);
  const [editingReading, setEditingReading] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [dateFilter, setDateFilter] = useState('30d');
  const [contextFilter, setContextFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const patientId = currentUser?.id;
  const targets = useMemo(() => (data?.clinicalTargets || []).find(t => t.patientId === patientId), [data?.clinicalTargets, patientId]);

  useEffect(() => {
    setTimeout(() => setLoading(false), 300);
    if (searchParams.get('action') === 'add') setShowForm(true);
  }, [searchParams]);

  const allReadings = useMemo(() =>
    (data?.glucoseReadings || []).filter(r => r.patientId === patientId).sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime)),
    [data?.glucoseReadings, patientId]);

  const filteredReadings = useMemo(() => {
    let filtered = [...allReadings];
    const days = dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : dateFilter === '90d' ? 90 : 365;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    filtered = filtered.filter(r => new Date(r.dateTime) >= cutoff);
    if (contextFilter) filtered = filtered.filter(r => r.context === contextFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r => (r.notes || '').toLowerCase().includes(q) || (r.symptoms || '').toLowerCase().includes(q) || (r.mealContext || '').toLowerCase().includes(q));
    }
    return filtered;
  }, [allReadings, dateFilter, contextFilter, searchQuery]);

  const chartData = useMemo(() =>
    [...filteredReadings].reverse().map(r => ({
      date: formatDate(r.dateTime, { month: 'short', day: 'numeric' }),
      time: formatTime(r.dateTime),
      value: r.value,
      context: r.context,
    })),
    [filteredReadings]);

  const handleSave = async (formData) => {
    try {
      if (editingReading) {
        await updateGlucoseReading(editingReading.id, formData);
        addToast({ type: 'success', message: 'Glucose reading updated' });
        await addAuditEntry({ actor: currentUser.id, actorRole: 'patient', action: 'glucose_reading_updated', patientId, recordId: editingReading.id, details: `Updated glucose reading: ${formData.value} ${formData.unit}` });
      } else {
        const newReading = await addGlucoseReading({ ...formData, patientId });
        addToast({ type: 'success', message: 'Glucose reading logged' });
        await addAuditEntry({ actor: currentUser.id, actorRole: 'patient', action: 'glucose_reading_added', patientId, recordId: newReading.id, details: `Added ${formData.context} glucose: ${formData.value} ${formData.unit}` });
      }
      refreshData();
      setShowForm(false);
      setEditingReading(null);
    } catch (e) {
      addToast({ type: 'error', message: 'Failed to save reading' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteGlucoseReading(deleteTarget.id);
      addToast({ type: 'success', message: 'Reading deleted' });
      await addAuditEntry({ actor: currentUser.id, actorRole: 'patient', action: 'glucose_reading_deleted', patientId, recordId: deleteTarget.id, details: 'Deleted glucose reading' });
      refreshData();
    } catch (e) {
      addToast({ type: 'error', message: 'Failed to delete' });
    }
  };

  const handleCsvExport = () => {
    const headers = ['Date', 'Time', 'Value (mg/dL)', 'Context', 'Meal', 'Medicine Taken', 'Activity', 'Symptoms', 'Notes'];
    const rows = filteredReadings.map(r => [
      formatDate(r.dateTime), formatTime(r.dateTime), r.value, r.context,
      r.mealContext || '', r.medicineTaken ? 'Yes' : 'No', r.activity || '', r.symptoms || '', r.notes || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `glucose_readings_${toISODate(new Date())}.csv`; a.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', message: 'CSV exported' });
  };

  const handleLoadSampleCGM = async () => {
    const sampleData = [];
    for (let i = 0; i < 48; i++) {
      const d = new Date();
      d.setMinutes(d.getMinutes() - (i * 30));
      sampleData.push({
        patientId, value: Math.round(100 + Math.sin(i * 0.3) * 30 + (Math.random() - 0.5) * 20),
        unit: 'mg/dL', dateTime: d.toISOString(), context: 'random',
        mealContext: '', medicineTaken: true, activity: '', symptoms: 'None',
        notes: 'Simulated CGM data — not from an actual device',
      });
    }
    for (const reading of sampleData) {
      await addGlucoseReading(reading);
    }
    refreshData();
    addToast({ type: 'info', title: 'Sample CGM Data Loaded', message: 'This is simulated data, not from an actual CGM device.' });
  };

  if (loading) return <LoadingSpinner text="Loading glucose data..." />;

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 max-w-full">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">Continuous & Self Glucose Monitor</h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1">{filteredReadings.length} total readings recorded in panel</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button onClick={() => { setEditingReading(null); setShowForm(true); }} className="btn-primary text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2.5 font-bold"><Plus size={15} /> Log Reading</button>
          <button onClick={handleCsvExport} className="btn-outline text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2.5 font-bold"><FileDown size={15} /> Export CSV</button>
          <button onClick={() => setShowImport(true)} className="btn-outline text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2.5 font-bold"><FileUp size={15} /> Import CSV</button>
          <button onClick={handleLoadSampleCGM} className="btn-ghost text-xs px-2 py-1.5 font-bold text-slate-800 hover:text-slate-950"><Zap size={13} /> Load Sample CGM</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card border border-slate-200 max-w-full">
        <div className="card-body p-3.5 sm:p-5 flex flex-col md:flex-row flex-wrap items-stretch md:items-center gap-2.5 sm:gap-3">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Select value={dateFilter} onChange={setDateFilter} options={[
              { value: '7d', label: 'Last 7 days' }, { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' }, { value: '365d', label: 'Last year' },
            ]} />
            <Select value={contextFilter} onChange={setContextFilter} placeholder="All contexts" options={CONTEXTS.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))} />
          </div>
          <div className="flex-1 min-w-0 w-full md:w-auto"><SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search notes, symptoms, meals..." /></div>
          <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 md:pt-0">
            <span className="text-xs font-bold text-slate-700 md:hidden">View mode:</span>
            <div className="flex gap-1 border border-slate-300 rounded-lg overflow-hidden bg-white shrink-0">
              <button onClick={() => setView('chart')} aria-label="Chart view" className={`px-3 py-2 text-sm cursor-pointer font-bold ${view === 'chart' ? 'bg-primary text-white' : 'text-slate-900 hover:bg-slate-100'}`}><BarChart3 size={16} /></button>
              <button onClick={() => setView('table')} aria-label="Table view" className={`px-3 py-2 text-sm cursor-pointer font-bold ${view === 'table' ? 'bg-primary text-white' : 'text-slate-900 hover:bg-slate-100'}`}><Table size={16} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Chart or Table */}
      {view === 'chart' ? (
        <div className="card border border-slate-200 max-w-full">
          <div className="card-body p-3 sm:p-6 min-w-0 overflow-hidden">
            {chartData.length > 0 ? (
              <div className="w-full min-w-0 overflow-hidden" style={{ minHeight: 280 }}>
                <ResponsiveContainer width="100%" height={320} minWidth={0}>
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#090D16', fontWeight: 600 }} />
                    <YAxis domain={[40, 350]} tick={{ fontSize: 10, fill: '#090D16', fontWeight: 600 }} />
                    <ReTooltip contentStyle={{ borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 12, fontWeight: 600, color: '#090D16' }}
                      formatter={(val) => [`${val} mg/dL`, 'Blood Glucose']} />
                    {targets && (
                      <>
                        <ReferenceLine y={targets.fastingGlucoseMax} stroke="#D97706" strokeWidth={1.5} strokeDasharray="5 5" />
                        <ReferenceLine y={targets.fastingGlucoseMin} stroke="#D97706" strokeWidth={1.5} strokeDasharray="5 5" />
                      </>
                    )}
                    <Line type="monotone" dataKey="value" stroke="#0F766E" strokeWidth={2.5} dot={{ r: 2.5, fill: '#0F766E' }} activeDot={{ r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={Activity} title="No readings" message="No glucose readings match your filters." />
            )}
            {targets ? (
              <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-200 text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-600 inline-block border-b border-dashed border-amber-800" /> Target Min: {targets.fastingGlucoseMin} mg/dL</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-600 inline-block border-b border-dashed border-amber-800" /> Target Max: {targets.fastingGlucoseMax} mg/dL</span>
              </div>
            ) : (
              <p className="text-xs font-bold text-amber-800 mt-2 flex items-center gap-1.5"><AlertCircle size={14} /> Clinical target range not configured by doctor</p>
            )}
          </div>
        </div>
      ) : (
        <div className="card border border-slate-200">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="font-bold text-slate-950">Date & Time</th>
                  <th className="font-bold text-slate-950">Value</th>
                  <th className="font-bold text-slate-950">Context</th>
                  <th className="font-bold text-slate-950">Meal</th>
                  <th className="font-bold text-slate-950">Medicine</th>
                  <th className="font-bold text-slate-950">Symptoms</th>
                  <th className="font-bold text-slate-950">Notes</th>
                  <th className="font-bold text-slate-950">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReadings.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-slate-700 font-semibold">No readings found</td></tr>
                ) : (
                  filteredReadings.map(r => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap font-bold text-slate-900">{formatDateTime(r.dateTime)}</td>
                      <td>
                        <span className={`font-extrabold text-base ${r.value < 70 ? 'text-red-700' : r.value > 250 ? 'text-red-700' : r.value > 180 ? 'text-amber-800' : 'text-emerald-800'}`}>
                          {r.value} <span className="text-xs font-semibold text-slate-700">{r.unit}</span>
                        </span>
                      </td>
                      <td><Badge variant={r.context === 'fasting' ? 'info' : r.context === 'post-meal' ? 'warning' : 'gray'}>{r.context.toUpperCase()}</Badge></td>
                      <td className="font-semibold text-slate-800">{r.mealContext || '—'}</td>
                      <td>{r.medicineTaken ? <CheckCircle size={16} className="text-emerald-700" /> : <X size={16} className="text-rose-700" />}</td>
                      <td className="text-xs font-semibold text-slate-800">{r.symptoms || '—'}</td>
                      <td className="text-xs font-medium text-slate-800 max-w-[150px] truncate">{r.notes || '—'}</td>
                      <td>
                        <div className="flex gap-1.5">
                          <button onClick={() => { setEditingReading(r); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer text-slate-800"><Edit size={15} /></button>
                          <button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer text-rose-700"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      <GlucoseFormModal open={showForm} onClose={() => { setShowForm(false); setEditingReading(null); }} onSave={handleSave} reading={editingReading} />

      {/* CSV Import Modal */}
      <CsvImportModal open={showImport} onClose={() => setShowImport(false)} patientId={patientId} onImport={() => { refreshData(); setShowImport(false); addToast({ type: 'success', message: 'Readings imported' }); }} />

      {/* Delete confirm */}
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Reading" message={`Delete glucose reading of ${deleteTarget?.value} ${deleteTarget?.unit} from ${formatDateTime(deleteTarget?.dateTime)}?`} confirmText="Delete" />
    </div>
  );
}

// ── Glucose Form Modal ──────────────────────────────────────────────────
function GlucoseFormModal({ open, onClose, onSave, reading }) {
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(reading ? { ...reading, dateTime: reading.dateTime?.slice(0, 16) } : {
        value: '', unit: 'mg/dL', dateTime: new Date().toISOString().slice(0, 16),
        context: 'fasting', mealContext: '', medicineTaken: true, activity: '', symptoms: 'None', notes: '',
      });
      setErrors({});
    }
  }, [open, reading]);

  const validate = () => {
    const e = {};
    if (!form.value || isNaN(form.value) || form.value < 20 || form.value > 600) e.value = 'Enter a value between 20-600';
    if (!form.dateTime) e.dateTime = 'Required';
    if (!form.context) e.context = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({ ...form, value: Number(form.value), dateTime: new Date(form.dateTime).toISOString() });
  };

  return (
    <Modal open={open} onClose={onClose} title={reading ? 'Edit Glucose Reading' : 'Log Glucose Reading'} size="md"
      footer={<>
        <button className="btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSubmit}>{reading ? 'Update' : 'Save'}</button>
      </>}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Glucose Value *</label>
            <input type="number" value={form.value || ''} onChange={(e) => setForm({ ...form, value: e.target.value })}
              className={`input ${errors.value ? 'input-error' : ''}`} placeholder="e.g., 120" />
            {errors.value && <p className="text-xs text-danger mt-1">{errors.value}</p>}
          </div>
          <div>
            <label className="label">Unit</label>
            <Select value={form.unit || 'mg/dL'} onChange={(v) => setForm({ ...form, unit: v })}
              options={[{ value: 'mg/dL', label: 'mg/dL' }, { value: 'mmol/L', label: 'mmol/L' }]} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Date & Time *</label>
            <input type="datetime-local" value={form.dateTime || ''} onChange={(e) => setForm({ ...form, dateTime: e.target.value })}
              className={`input ${errors.dateTime ? 'input-error' : ''}`} />
          </div>
          <div>
            <label className="label">Context *</label>
            <Select value={form.context || ''} onChange={(v) => setForm({ ...form, context: v })}
              options={CONTEXTS.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1).replace('-', ' ') }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Meal Context</label>
            <Select value={form.mealContext || ''} onChange={(v) => setForm({ ...form, mealContext: v })} placeholder="Select meal"
              options={MEALS.filter(Boolean).map(m => ({ value: m, label: m }))} />
          </div>
          <div>
            <label className="label">Medicine Taken</label>
            <Select value={form.medicineTaken ? 'yes' : 'no'} onChange={(v) => setForm({ ...form, medicineTaken: v === 'yes' })}
              options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No — Missed' }]} />
          </div>
        </div>
        <div>
          <label className="label">Activity</label>
          <input type="text" value={form.activity || ''} onChange={(e) => setForm({ ...form, activity: e.target.value })}
            className="input" placeholder="e.g., 30 min walk" />
        </div>
        <div>
          <label className="label">Symptoms</label>
          <Select value={form.symptoms || 'None'} onChange={(v) => setForm({ ...form, symptoms: v })}
            options={SYMPTOMS.map(s => ({ value: s, label: s }))} />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="input" rows={2} placeholder="Any additional notes..." />
        </div>
      </form>
    </Modal>
  );
}

// ── CSV Import Modal ────────────────────────────────────────────────────
function CsvImportModal({ open, onClose, patientId, onImport }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) { setErrors(['File must have a header row and at least one data row']); return; }
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
        const required = ['value', 'date'];
        const missing = required.filter(r => !headers.some(h => h.includes(r)));
        if (missing.length > 0) { setErrors([`Missing required columns: ${missing.join(', ')}`]); return; }
        const rows = [];
        const rowErrors = [];
        for (let i = 1; i < Math.min(lines.length, 101); i++) {
          const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
          const val = parseFloat(cols[headers.findIndex(h => h.includes('value'))]);
          if (isNaN(val) || val < 20 || val > 600) { rowErrors.push(`Row ${i}: Invalid value`); continue; }
          rows.push({
            value: val, unit: 'mg/dL',
            dateTime: cols[headers.findIndex(h => h.includes('date'))] || new Date().toISOString(),
            context: cols[headers.findIndex(h => h.includes('context'))] || 'random',
          });
        }
        setPreview(rows);
        setErrors(rowErrors);
      } catch (err) {
        setErrors(['Failed to parse CSV file']);
      }
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!preview || preview.length === 0) return;
    setImporting(true);
    for (const row of preview) {
      await addGlucoseReading({ ...row, patientId, mealContext: '', medicineTaken: true, activity: '', symptoms: 'None', notes: 'Imported from CSV' });
    }
    setImporting(false);
    onImport();
  };

  const downloadSample = () => {
    const csv = '"Date","Time","Value","Unit","Context"\n"2024-01-01","08:00","110","mg/dL","fasting"\n"2024-01-01","12:30","145","mg/dL","pre-meal"\n"2024-01-01","14:30","175","mg/dL","post-meal"';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'glucose_sample.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal open={open} onClose={onClose} title="Import CSV" size="lg"
      footer={<>
        <button className="btn-ghost text-xs" onClick={downloadSample}><Download size={14} /> Download Sample</button>
        <div className="flex-1" />
        <button className="btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleImport} disabled={!preview || preview.length === 0 || importing}>
          {importing ? 'Importing...' : `Import ${preview?.length || 0} readings`}
        </button>
      </>}>
      <div className="space-y-4">
        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="btn-outline"><Upload size={16} /> Choose CSV File</button>
          {file && <p className="text-sm text-text-secondary mt-2">{file.name}</p>}
        </div>
        <p className="text-xs text-text-secondary">Required columns: Value, Date. Optional: Time, Unit, Context</p>
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            {errors.map((e, i) => <p key={i} className="text-sm text-red-700">{e}</p>)}
          </div>
        )}
        {preview && preview.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Preview ({preview.length} rows)</p>
            <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
              <table className="data-table">
                <thead><tr><th>Value</th><th>Date</th><th>Context</th></tr></thead>
                <tbody>
                  {preview.slice(0, 10).map((r, i) => (
                    <tr key={i}><td>{r.value} {r.unit}</td><td>{r.dateTime}</td><td>{r.context}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
