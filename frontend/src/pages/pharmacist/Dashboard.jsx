import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatCard, LoadingSpinner, Badge, Tabs, Modal, EmptyState, Avatar } from '../../components/ui';
import {
  ClipboardList, Heart, Pill, Users, AlertTriangle, ArrowRight, Clock, CheckCircle,
  Play, Timer, MessageSquare, Search, Barcode, Package, Check, ShieldCheck, Box,
  RefreshCw, AlertCircle, FileText, ShoppingBag, Layers, Shield, Sparkles, CheckCheck
} from 'lucide-react';
import { formatDate, formatDateTime } from '../../data/demoDate';
import { updateMedicationReview, updateCounsellingRequest, addNotification, addAuditEntry } from '../../services/dataService';

const INITIAL_INVENTORY = {
  'med-001': {
    code: 'MET-500',
    name: 'Metformin HCl 500mg',
    brand: 'Glucophage / Glycomet',
    category: 'Biguanide • Antidiabetic',
    stockCount: 480,
    unitsPerPack: '10 Tablets / Strip',
    totalUnits: 4800,
    batchNo: 'LOT-2026-MF500',
    expiryDate: 'Dec 2027',
    shelf: 'Bay A, Rack 02, Shelf 3',
    reorderLevel: 80,
    status: 'In Stock',
  },
  'med-002': {
    code: 'GLI-001',
    name: 'Glimepiride 1mg',
    brand: 'Amaryl 1mg',
    category: 'Sulfonylurea • Antidiabetic',
    stockCount: 220,
    unitsPerPack: '10 Tablets / Strip',
    totalUnits: 2200,
    batchNo: 'LOT-2026-GM102',
    expiryDate: 'Aug 2027',
    shelf: 'Bay A, Rack 04, Shelf 1',
    reorderLevel: 50,
    status: 'In Stock',
  },
  'med-003': {
    code: 'ATO-010',
    name: 'Atorvastatin 10mg',
    brand: 'Lipitor / Atorva',
    category: 'Statin • Lipid Lowering',
    stockCount: 310,
    unitsPerPack: '10 Tablets / Strip',
    totalUnits: 3100,
    batchNo: 'LOT-2026-AT911',
    expiryDate: 'Oct 2027',
    shelf: 'Bay B, Rack 01, Shelf 2',
    reorderLevel: 60,
    status: 'In Stock',
  },
  'med-004': {
    code: 'TEL-040',
    name: 'Telmisartan 40mg',
    brand: 'Micardis / Telma',
    category: 'ARB • Antihypertensive',
    stockCount: 195,
    unitsPerPack: '10 Tablets / Strip',
    totalUnits: 1950,
    batchNo: 'LOT-2026-TL440',
    expiryDate: 'Mar 2028',
    shelf: 'Bay B, Rack 03, Shelf 4',
    reorderLevel: 40,
    status: 'In Stock',
  },
  'med-005': {
    code: 'MET-1000',
    name: 'Metformin HCl SR 1000mg',
    brand: 'Glycomet SR 1000',
    category: 'Biguanide SR • Antidiabetic',
    stockCount: 340,
    unitsPerPack: '10 Tablets / Strip',
    totalUnits: 3400,
    batchNo: 'LOT-2026-MF100',
    expiryDate: 'Jan 2028',
    shelf: 'Bay A, Rack 02, Shelf 4',
    reorderLevel: 75,
    status: 'In Stock',
  },
  'med-006': {
    code: 'INS-GLA',
    name: 'Insulin Glargine 100 U/mL',
    brand: 'Lantus SoloStar Pen (3mL)',
    category: 'Long-Acting Basal Insulin',
    stockCount: 48,
    unitsPerPack: 'Pre-filled Pens (Cold Chain 2-8°C)',
    totalUnits: 48,
    batchNo: 'LOT-2026-LN993',
    expiryDate: 'Sep 2027',
    shelf: 'Cold Vault Fridge #2 (Row 1)',
    reorderLevel: 15,
    status: 'In Stock (Cold Chain Verified)',
  },
  'med-007': {
    code: 'INS-ASP',
    name: 'Insulin Aspart 100 U/mL',
    brand: 'NovoRapid FlexPen (3mL)',
    category: 'Rapid-Acting Bolus Insulin',
    stockCount: 36,
    unitsPerPack: 'Pre-filled Pens (Cold Chain 2-8°C)',
    totalUnits: 36,
    batchNo: 'LOT-2026-NR118',
    expiryDate: 'Jun 2027',
    shelf: 'Cold Vault Fridge #2 (Row 2)',
    reorderLevel: 12,
    status: 'In Stock (Cold Chain Verified)',
  },
  'med-008': {
    code: 'INS-GLA22',
    name: 'Insulin Glargine 100 U/mL (22U)',
    brand: 'Toujeo SoloStar Pen',
    category: 'Ultra Long-Acting Basal Insulin',
    stockCount: 52,
    unitsPerPack: 'Pre-filled Pens',
    totalUnits: 52,
    batchNo: 'LOT-2026-TJ404',
    expiryDate: 'Nov 2027',
    shelf: 'Cold Vault Fridge #2 (Row 1)',
    reorderLevel: 15,
    status: 'In Stock',
  },
};

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

  // ── Pharmacist Prescription Code & Medicine Stock State ──
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [rxCodeInput, setRxCodeInput] = useState('RX-001');
  const [dispensedMap, setDispensedMap] = useState({});

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

  // ── Lookup & Match Prescription / Medicine Stock ──
  const matchedData = useMemo(() => {
    const raw = rxCodeInput.trim().toLowerCase();
    if (!raw) return null;

    const allPrescriptions = data?.prescriptions || [];

    // 1. Direct prescription ID match (e.g. "rx-001", "RX-001", "rx001", "001")
    const foundRx = allPrescriptions.find(p => {
      const pId = p.id.toLowerCase();
      return pId === raw || pId.replace(/[^a-z0-9]/g, '') === raw.replace(/[^a-z0-9]/g, '') || pId.endsWith(raw);
    });

    if (foundRx) {
      const patient = data?.users?.[foundRx.patientId];
      const doctor = data?.users?.[foundRx.doctorId];
      const medsWithStock = foundRx.medicines.map(m => {
        const stockInfo = inventory[m.id] || Object.values(inventory).find(item =>
          item.code.toLowerCase() === m.id.toLowerCase() ||
          item.name.toLowerCase().includes(m.name.toLowerCase().split(' ')[0])
        ) || {
          code: `RX-${m.name.slice(0, 3).toUpperCase()}`,
          name: m.name,
          brand: 'Standard Dispensing Formulation',
          category: 'Prescription Item',
          stockCount: 150,
          unitsPerPack: '10 Tablets / Strip',
          totalUnits: 1500,
          batchNo: 'LOT-2026-GEN90',
          expiryDate: 'Dec 2027',
          shelf: 'Dispensary Shelf C-02',
          reorderLevel: 30,
          status: 'In Stock',
        };
        return { ...m, stock: stockInfo };
      });
      return {
        type: 'prescription',
        prescription: foundRx,
        patient,
        doctor,
        medicines: medsWithStock,
      };
    }

    // 2. Direct medicine code or medicine name match (e.g. "MET-500", "INS-GLA", "Metformin")
    const foundMedStock = Object.values(inventory).find(item =>
      item.code.toLowerCase() === raw ||
      item.code.toLowerCase().replace(/[^a-z0-9]/g, '') === raw.replace(/[^a-z0-9]/g, '') ||
      item.name.toLowerCase().includes(raw)
    );

    if (foundMedStock) {
      const relatedRxs = allPrescriptions.filter(p =>
        p.medicines.some(m => m.name.toLowerCase().includes(foundMedStock.name.toLowerCase().split(' ')[0]))
      );
      return {
        type: 'medicine',
        stock: foundMedStock,
        relatedPrescriptions: relatedRxs,
      };
    }

    return { type: 'not_found', query: rxCodeInput };
  }, [rxCodeInput, data?.prescriptions, data?.users, inventory]);

  const handleDispensePrescription = (rxId, meds) => {
    setInventory(prev => {
      const updated = { ...prev };
      meds.forEach(m => {
        const medId = m.id;
        if (updated[medId]) {
          const deduct = m.isInsulin ? 1 : 6;
          updated[medId] = {
            ...updated[medId],
            stockCount: Math.max(0, updated[medId].stockCount - deduct),
            totalUnits: Math.max(0, updated[medId].totalUnits - (m.isInsulin ? 1 : 60)),
          };
        }
      });
      return updated;
    });

    setDispensedMap(prev => ({
      ...prev,
      [rxId]: {
        dispensedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dispensedBy: currentUser?.name || 'Pharmacist',
      },
    }));

    addToast({
      type: 'success',
      message: `✅ Prescription ${rxId.toUpperCase()} verified & dispensed! Live medicine stock successfully deducted.`,
    });
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

      {/* ── Prescription Code & Medicine Stock Verification Station Banner ── */}
      <div className="card p-5 sm:p-6 border-2 border-[#367588]/30 bg-gradient-to-r from-white via-[#F3F8F9] to-white shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#367588] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Package size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider bg-[#367588]/10 text-[#367588] px-2 py-0.5 rounded-full border border-[#A0C7D1]">
                  Dispensary Station
                </span>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                  <ShieldCheck size={12} className="text-emerald-700" />
                  Live Stock Sync Active
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight mt-1">
                Prescription Code & Medicine Stock Verification
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
                Inspect authenticated prescription codes (e.g. RX-001) and verify live dispensary stock counts on the dedicated station.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/pharmacist/stock-verification')}
              className="btn-primary py-2.5 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Package size={16} />
              <span>Open Stock Verification Station</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
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
