import { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal, LoadingSpinner, Badge, Tabs, EmptyState } from '../../components/ui';
import { FileText, Plus, Upload, Download, Eye, Trash2, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { formatDate, formatDateTime } from '../../data/demoDate';
import { addInvestigation, updateInvestigation, addAuditEntry } from '../../services/dataService';
import { saveFile, getFile, createFileUrl, validateFile } from '../../services/fileService';
import { genId } from '../../data/seedData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts';

const TYPES = ['HbA1c', 'Fasting Glucose (Lab)', 'Post-meal Glucose (Lab)', 'Lipid Profile', 'Creatinine/eGFR', 'Urine Albumin/ACR'];

export default function Investigations() {
  const { currentUser, data, refreshData, addToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [activeTab, setActiveTab] = useState('timeline');
  const [filterType, setFilterType] = useState('');
  const fileRef = useRef(null);

  const patientId = currentUser?.id;

  useEffect(() => { setTimeout(() => setLoading(false), 300); }, []);

  const investigations = useMemo(() =>
    (data?.investigations || []).filter(i => i.patientId === patientId).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [data?.investigations, patientId]);

  const filtered = filterType ? investigations.filter(i => i.type === filterType) : investigations;

  const chartData = useMemo(() => {
    const hba1c = investigations.filter(i => i.type === 'HbA1c').sort((a, b) => new Date(a.date) - new Date(b.date));
    return hba1c.map(i => ({ date: formatDate(i.date, { month: 'short', year: '2-digit' }), value: parseFloat(i.value) }));
  }, [investigations]);

  const handleSave = async (formData) => {
    if (editing) {
      await updateInvestigation(editing.id, formData);
      addToast({ type: 'success', message: 'Investigation updated' });
    } else {
      const inv = await addInvestigation({ ...formData, patientId });
      if (formData.file) {
        const valid = validateFile(formData.file);
        if (valid.valid) {
          await saveFile(`inv-file-${inv.id}`, formData.file, { investigationId: inv.id });
        } else {
          addToast({ type: 'warning', message: valid.error });
        }
      }
      addToast({ type: 'success', message: 'Investigation added' });
      await addAuditEntry({ actor: currentUser.id, actorRole: currentUser.role, action: 'investigation_added', patientId, recordId: inv.id, details: `Added ${formData.type}: ${formData.value}` });
    }
    refreshData();
    setShowForm(false);
    setEditing(null);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">Diagnostic Lab Investigations</h1>
          <p className="text-sm font-semibold text-slate-700 mt-1">Track HbA1c trajectory, lipid panels, renal function, and pathology reports</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary font-bold flex items-center gap-2 self-start sm:self-auto">
          <Plus size={16} /> Add Lab Result
        </button>
      </div>

      {/* HbA1c Trend */}
      {chartData.length > 1 && (
        <div className="card border border-slate-200">
          <div className="card-header border-b border-slate-200 p-4">
            <h3 className="font-extrabold text-slate-950 text-base">Longitudinal HbA1c Glycemic Trajectory</h3>
          </div>
          <div className="card-body p-3.5 sm:p-6 min-w-0 overflow-hidden">
            <div className="w-full min-w-0 overflow-hidden" style={{ minHeight: 200 }}>
              <ResponsiveContainer width="100%" height={220} minWidth={0}>
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#090D16', fontWeight: 600 }} />
                  <YAxis domain={[5, 12]} tick={{ fontSize: 11, fill: '#090D16', fontWeight: 600 }} />
                  <Line type="monotone" dataKey="value" stroke="#0F766E" strokeWidth={2.5} dot={{ r: 4, fill: '#0F766E' }} />
                  <ReTooltip contentStyle={{ borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 12, fontWeight: 600, color: '#090D16' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterType('')} className={`px-3.5 py-1.5 text-xs font-bold rounded-full cursor-pointer transition-colors ${!filterType ? 'bg-primary text-white shadow-xs' : 'bg-slate-100 text-slate-900 border border-slate-200 hover:bg-slate-200'}`}>
          All Tests ({investigations.length})
        </button>
        {TYPES.map(t => (
          <button key={t} onClick={() => setFilterType(t)} className={`px-3.5 py-1.5 text-xs font-bold rounded-full cursor-pointer transition-colors ${filterType === t ? 'bg-primary text-white shadow-xs' : 'bg-slate-100 text-slate-900 border border-slate-200 hover:bg-slate-200'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card border border-slate-200">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th className="font-bold text-slate-950">Collection Date</th>
                <th className="font-bold text-slate-950">Investigation</th>
                <th className="font-bold text-slate-950">Result Value</th>
                <th className="font-bold text-slate-950">Laboratory</th>
                <th className="font-bold text-slate-950">Reviewing Clinician</th>
                <th className="font-bold text-slate-950">Clinical Notes</th>
                <th className="font-bold text-slate-950">View</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id}>
                  <td className="whitespace-nowrap font-bold text-slate-900">{formatDate(inv.date)}</td>
                  <td className="font-extrabold text-slate-950">{inv.type}</td>
                  <td className="font-extrabold text-base text-teal-800">{inv.value} <span className="text-xs font-semibold text-slate-700">{inv.unit}</span></td>
                  <td className="font-semibold text-slate-800">{inv.labName || '—'}</td>
                  <td className="text-xs font-bold text-slate-800">{data?.users?.[inv.reviewedBy]?.name || '—'}</td>
                  <td className="text-xs font-medium text-slate-800 max-w-xs truncate">{inv.notes || '—'}</td>
                  <td>
                    <button onClick={() => { setEditing(inv); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer text-slate-800">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <InvestigationFormModal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} onSave={handleSave} investigation={editing} />
    </div>
  );
}

function InvestigationFormModal({ open, onClose, onSave, investigation }) {
  const [form, setForm] = useState({});
  useEffect(() => {
    if (open) setForm(investigation || { type: 'HbA1c', value: '', unit: '%', date: new Date().toISOString().split('T')[0], labName: '', notes: '', file: null });
  }, [open, investigation]);

  const unitMap = { 'HbA1c': '%', 'Fasting Glucose (Lab)': 'mg/dL', 'Post-meal Glucose (Lab)': 'mg/dL', 'Lipid Profile': 'mg/dL', 'Creatinine/eGFR': 'mg/dL', 'Urine Albumin/ACR': 'mg/g' };

  return (
    <Modal open={open} onClose={onClose} title={investigation ? 'Edit Lab Investigation' : 'Add Lab Investigation'} size="md"
      footer={<><button className="btn-outline font-bold" onClick={onClose}>Cancel</button><button className="btn-primary font-bold" onClick={() => onSave({ ...form, date: new Date(form.date).toISOString() })}>Save Result</button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label text-slate-950 font-bold">Investigation Type</label>
            <select className="input font-medium text-slate-950" value={form.type || ''} onChange={e => setForm({ ...form, type: e.target.value, unit: unitMap[e.target.value] || '' })}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-slate-950 font-bold">Sample Date</label>
            <input type="date" className="input font-medium text-slate-950" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="label text-slate-950 font-bold">Result Value</label>
            <input className="input font-medium text-slate-950" value={form.value || ''} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="e.g., 7.2" />
          </div>
          <div>
            <label className="label text-slate-950 font-bold">Clinical Unit</label>
            <input className="input font-medium text-slate-950" value={form.unit || ''} onChange={e => setForm({ ...form, unit: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label text-slate-950 font-bold">Testing Laboratory</label>
          <input className="input font-medium text-slate-950" value={form.labName || ''} onChange={e => setForm({ ...form, labName: e.target.value })} placeholder="e.g., Quest Diagnostics, Apollo Labs" />
        </div>
        <div>
          <label className="label text-slate-950 font-bold">Clinical Notes</label>
          <textarea className="input font-medium text-slate-950" rows={2} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Physician annotations, fasting status, or fasting hours..." />
        </div>
        <div>
          <label className="label text-slate-950 font-bold">Attach Lab PDF Report</label>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => setForm({ ...form, file: e.target.files?.[0] })} className="input text-slate-950 font-medium" />
        </div>
      </div>
    </Modal>
  );
}
