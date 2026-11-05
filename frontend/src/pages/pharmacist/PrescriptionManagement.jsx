import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Avatar, Badge, LoadingSpinner, SearchBar, Modal } from '../../components/ui';
import {
  ClipboardList, Search, CheckCircle, Clock, AlertTriangle, Pill,
  Package, Check, ArrowRight, ShieldCheck, RefreshCw, Barcode,
  FileText, Calendar, Filter, UserCheck, AlertCircle, Sparkles
} from 'lucide-react';
import { formatDate, formatDateTime } from '../../data/demoDate';

export default function PrescriptionManagement() {
  const { currentUser, data, refreshData, addToast } = useApp();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRx, setSelectedRx] = useState(null);
  const [verificationModal, setVerificationModal] = useState(null);
  const [verifying, setVerifying] = useState(false);

  // Collect prescriptions from data
  const prescriptions = useMemo(() => {
    const list = data?.prescriptions || [];
    if (list.length === 0) {
      return [
        {
          id: 'rx-001',
          patientId: 'pat-001',
          doctorId: 'doc-001',
          status: 'active',
          dispenseStatus: 'verified',
          authorizedAt: new Date(Date.now() - 25 * 86400000).toISOString(),
          createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
          refillsRemaining: 2,
          medicines: [
            { id: 'med-001', name: 'Metformin 500mg', dose: '500mg', route: 'Oral', frequency: 'Twice daily', times: ['08:00', '20:00'], foodInstruction: 'After food', instructions: 'Take with a full glass of water after meals.' },
            { id: 'med-002', name: 'Glimepiride 1mg', dose: '1mg', route: 'Oral', frequency: 'Once daily', times: ['07:30'], foodInstruction: 'Before food', instructions: 'Take 15-30 minutes before breakfast.' },
            { id: 'med-003', name: 'Atorvastatin 10mg', dose: '10mg', route: 'Oral', frequency: 'Once daily', times: ['21:00'], foodInstruction: 'With or without food', instructions: 'Take at bedtime for lipid control.' },
          ],
          notes: 'Continue current regimen. Review glucose logs at next follow-up.',
        },
        {
          id: 'rx-002',
          patientId: 'pat-001',
          doctorId: 'doc-001',
          status: 'active',
          dispenseStatus: 'refill_requested',
          authorizedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
          createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
          refillsRemaining: 1,
          medicines: [
            { id: 'med-004', name: 'Telmisartan 40mg', dose: '40mg', route: 'Oral', frequency: 'Once daily', times: ['08:00'], foodInstruction: 'With or without food', instructions: 'Blood pressure control.' },
          ],
          notes: 'Added for blood pressure management. Target BP < 130/80 mmHg.',
        },
        {
          id: 'rx-003',
          patientId: 'pat-002',
          doctorId: 'doc-001',
          status: 'active',
          dispenseStatus: 'pending_verification',
          authorizedAt: new Date(Date.now() - 20 * 86400000).toISOString(),
          createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
          refillsRemaining: 3,
          medicines: [
            { id: 'med-005', name: 'Metformin 1000mg', dose: '1000mg', route: 'Oral', frequency: 'Twice daily', times: ['08:00', '20:00'], foodInstruction: 'After food', instructions: 'Take with meals.' },
            { id: 'med-006', name: 'Insulin Glargine 16 units', dose: '16 units', route: 'Subcutaneous', frequency: 'Once daily', times: ['22:00'], foodInstruction: 'N/A', instructions: 'Inject subcutaneously at bedtime. Rotate injection sites.', isInsulin: true },
          ],
          notes: 'Added basal insulin due to inadequate glycemic control.',
        },
        {
          id: 'rx-004',
          patientId: 'pat-003',
          doctorId: 'doc-001',
          status: 'active',
          dispenseStatus: 'verified',
          authorizedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
          createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
          refillsRemaining: 2,
          medicines: [
            { id: 'med-007', name: 'Insulin Aspart (NovoRapid)', dose: 'Per sliding scale', route: 'Subcutaneous', frequency: 'Three times daily', times: ['07:30', '12:30', '19:30'], foodInstruction: 'Before food', instructions: 'Inject 10-15 min before meals.', isInsulin: true },
            { id: 'med-008', name: 'Insulin Glargine 22 units', dose: '22 units', route: 'Subcutaneous', frequency: 'Once daily', times: ['22:00'], foodInstruction: 'N/A', instructions: 'Basal insulin at bedtime.', isInsulin: true },
          ],
          notes: 'Type 1 - basal-bolus regimen.',
        },
      ];
    }
    return list;
  }, [data?.prescriptions]);

  const allUsers = data?.users || {};

  // Enrich with patient & clinician objects
  const enrichedRxList = useMemo(() => {
    return prescriptions.map(rx => {
      const patient = allUsers[rx.patientId] || { name: 'Priya Sharma', id: rx.patientId, diabetesType: 'Type 2 Diabetes' };
      const doctor = allUsers[rx.doctorId] || { name: 'Dr. Arun Krishnamurthy' };
      const currentDispenseStatus = rx.dispenseStatus || (rx.status === 'active' ? 'verified' : 'pending_verification');

      return {
        ...rx,
        patient,
        doctor,
        currentDispenseStatus,
      };
    });
  }, [prescriptions, allUsers]);

  const filteredRxList = useMemo(() => {
    return enrichedRxList.filter(rx => {
      const matchesSearch = !searchQuery ||
        rx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rx.patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rx.medicines.some(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'pending' && rx.currentDispenseStatus === 'pending_verification') ||
        (statusFilter === 'refill' && rx.currentDispenseStatus === 'refill_requested') ||
        (statusFilter === 'verified' && rx.currentDispenseStatus === 'verified');

      return matchesSearch && matchesStatus;
    });
  }, [enrichedRxList, searchQuery, statusFilter]);

  const handleVerifyPrescription = (rx) => {
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      setVerificationModal(null);
      addToast({
        type: 'success',
        message: `Prescription ${rx.id.toUpperCase()} verified and authorized for dispensing by ${currentUser?.name || 'Pharmacist'}.`,
      });
      refreshData();
    }, 600);
  };

  const handleApproveRefill = (rx) => {
    addToast({
      type: 'success',
      message: `Refill approved for ${rx.patient.name} (${rx.id.toUpperCase()}). Dispense record logged.`,
    });
  };

  const statusBadgeColor = (status) => {
    switch (status) {
      case 'verified': return 'success';
      case 'refill_requested': return 'warning';
      case 'pending_verification': return 'info';
      default: return 'gray';
    }
  };

  const formatStatus = (status) => {
    switch (status) {
      case 'verified': return 'Verified & Active';
      case 'refill_requested': return 'Refill Requested';
      case 'pending_verification': return 'Pending Pharmacist Review';
      default: return status;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl border-2 border-[#E8DCC8] p-5 sm:p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#046A38] bg-[#E8F5EE] px-2.5 py-1 rounded-full border border-[#A8D7BD]">
              Pharmacotherapy Governance
            </span>
            <span className="text-xs text-stone-300">•</span>
            <span className="text-xs font-bold text-stone-600">
              Prescription Order Verification
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight flex items-center gap-2.5">
            <ClipboardList className="text-[#046A38] shrink-0" size={28} />
            <span>Prescription &amp; Refill Management</span>
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1 max-w-2xl leading-relaxed">
            Review electronic prescriptions, verify dosages and food administration instructions, validate safety parameters, and manage refill requests.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={() => navigate('/pharmacist/inventory')}
            className="btn-outline btn-sm font-bold flex items-center gap-1.5"
          >
            <Package size={15} /> Check Stock Availability
          </button>
        </div>
      </div>

      {/* ── Search & Filter Controls ───────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border-2 border-[#E8DCC8] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by Rx Code (e.g. RX-001), patient, or medicine..."
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#046A38] text-white shadow-xs'
                : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
            }`}
          >
            All Prescriptions ({enrichedRxList.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            Pending Verification ({enrichedRxList.filter(r => r.currentDispenseStatus === 'pending_verification').length})
          </button>
          <button
            onClick={() => setStatusFilter('refill')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              statusFilter === 'refill'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            Refill Requests ({enrichedRxList.filter(r => r.currentDispenseStatus === 'refill_requested').length})
          </button>
        </div>
      </div>

      {/* ── Prescription Orders List ───────────────────────────────── */}
      <div className="space-y-4">
        {filteredRxList.map((rx) => {
          return (
            <div
              key={rx.id}
              className="card bg-white rounded-3xl border-2 border-[#E8DCC8] p-5 sm:p-6 shadow-xs transition-all hover:border-[#046A38]/50"
            >
              {/* Order Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#FAF6EF] border border-[#E8DCC8] flex items-center justify-center font-black text-[#046A38]">
                    <Barcode size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-slate-950 uppercase">{rx.id}</span>
                      <Badge variant={statusBadgeColor(rx.currentDispenseStatus)}>
                        {formatStatus(rx.currentDispenseStatus)}
                      </Badge>
                    </div>
                    <p className="text-xs font-bold text-slate-600 mt-0.5">
                      Patient: <span className="text-slate-950">{rx.patient.name}</span> ({rx.patient.diabetesType}) • Authorized by <span className="text-slate-950">{rx.doctor.name}</span>
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-[11px] font-bold text-slate-500">Order Date</p>
                  <p className="text-xs font-extrabold text-slate-950">{formatDate(rx.createdAt)}</p>
                </div>
              </div>

              {/* Prescribed Medicines Grid */}
              <div className="py-4 space-y-2.5">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Prescribed Line Items &amp; Clinical Regimen ({rx.medicines?.length || 0} Medications)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {rx.medicines.map((med, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <p className="font-black text-xs text-slate-950 flex items-center gap-1.5">
                            <Pill size={14} className="text-[#046A38]" />
                            {med.name}
                          </p>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                            {med.dose}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-600 mt-1">
                          {med.frequency} • {med.route}
                        </p>
                        <p className="text-[10px] font-bold text-[#046A38] mt-1 bg-white p-1 rounded-md border border-slate-200">
                          {med.foodInstruction || 'Take with water'}
                        </p>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500 font-bold">
                        <span>Dispense Pack: 30-Day Supply</span>
                        <span className="text-emerald-800">In Stock</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Stepper & Workflow Actions */}
              <div className="pt-4 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Visual Status Stepper */}
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 flex-wrap">
                  <span className="flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <CheckCircle size={12} /> 1. Doctor Authorized
                  </span>
                  <span className="text-slate-300">→</span>
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md border ${
                    rx.currentDispenseStatus === 'verified'
                      ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                      : 'text-blue-800 bg-blue-50 border-blue-200'
                  }`}>
                    <ShieldCheck size={12} /> 2. Pharmacist Verified
                  </span>
                  <span className="text-slate-300">→</span>
                  <span className="flex items-center gap-1 text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                    <Package size={12} /> 3. Ready / Dispensed
                  </span>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-2 self-end md:self-auto">
                  {rx.currentDispenseStatus === 'pending_verification' && (
                    <button
                      onClick={() => setVerificationModal(rx)}
                      className="btn-primary btn-sm text-xs font-bold flex items-center gap-1.5"
                    >
                      <ShieldCheck size={14} /> Verify &amp; Authorize Dispense
                    </button>
                  )}

                  {rx.currentDispenseStatus === 'refill_requested' && (
                    <button
                      onClick={() => handleApproveRefill(rx)}
                      className="btn-primary btn-sm bg-amber-600 hover:bg-amber-700 text-xs font-bold flex items-center gap-1.5"
                    >
                      <RefreshCw size={14} /> Approve Refill Request
                    </button>
                  )}

                  <button
                    onClick={() => navigate('/pharmacist/interactions')}
                    className="btn-outline btn-sm text-xs font-bold text-slate-800 flex items-center gap-1.5"
                  >
                    Check Interactions
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Verification Modal ─────────────────────────────────────── */}
      {verificationModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full border-2 border-[#E8DCC8] shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-950">Clinical Verification Sign-Off</h3>
                <p className="text-xs font-bold text-slate-600">Prescription {verificationModal.id.toUpperCase()}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF6EF] border border-[#E8DCC8] space-y-2 mb-4 text-xs font-semibold text-slate-800">
              <p>• Patient: <span className="font-bold text-slate-950">{verificationModal.patient.name}</span></p>
              <p>• Line Items: <span className="font-bold text-slate-950">{verificationModal.medicines.map(m => m.name).join(', ')}</span></p>
              <p>• Allergy Screen: <span className="font-bold text-emerald-800">Clear (No contraindications noted)</span></p>
              <p>• Dosage Titration: <span className="font-bold text-emerald-800">Within therapeutic window</span></p>
            </div>

            <p className="text-xs text-slate-600 font-medium mb-6">
              By confirming, you verify under Pharm D protocol that the prescribed dosages, food timing instructions, and quantity conform to clinical standards.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setVerificationModal(null)}
                className="btn-outline btn-sm font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleVerifyPrescription(verificationModal)}
                disabled={verifying}
                className="btn-primary btn-sm font-bold flex items-center gap-1.5"
              >
                {verifying ? <LoadingSpinner size="sm" /> : <Check size={14} />}
                <span>Confirm &amp; Dispense</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

