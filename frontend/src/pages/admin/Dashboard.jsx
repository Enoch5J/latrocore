import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../services/api';
import { StatCard, LoadingSpinner, Badge, SearchBar, Modal, ConfirmDialog, Tabs, Avatar } from '../../components/ui';
import {
  Users,
  Shield,
  Settings,
  RefreshCw,
  Trash2,
  Plus,
  Edit,
  Eye,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Stethoscope,
  Clock,
  Pill,
  UserCheck,
  UserX,
  FileText,
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Copy,
  Check,
  Download,
  AlertCircle
} from 'lucide-react';
import { formatDateTime } from '../../data/demoDate';

export default function AdminDashboard({ initialTab }) {
  const { currentUser, data, refreshData, addToast, dispatch } = useApp();
  const { user: authUser, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab || 'approvals');
  const [showReset, setShowReset] = useState(false);

  // Approvals State
  const [approvalSubTab, setApprovalSubTab] = useState('all'); // 'all', 'doctors', 'pharmacists', 'patients'
  const [approvalSearchQuery, setApprovalSearchQuery] = useState('');
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [pendingPharmacists, setPendingPharmacists] = useState([]);
  const [pendingPatients, setPendingPatients] = useState([]);
  const [approvalsSummary, setApprovalsSummary] = useState(null);

  // User Directory State
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Action / Modal States
  const [processingId, setProcessingId] = useState(null);
  const [rejectModalTarget, setRejectModalTarget] = useState(null); // { id, name, role, displayId, type }
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [previewPrescription, setPreviewPrescription] = useState(null); // { url, name, patientName }
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const loadAllData = async () => {
    try {
      const [summaryRes, docsRes, pharmsRes, patsRes, usersRes] = await Promise.allSettled([
        api.getApprovalsSummary(),
        api.getPendingDoctors(),
        api.getPendingPharmacists(),
        api.getPendingPatients(),
        api.getAllUsers()
      ]);

      if (summaryRes.status === 'fulfilled' && summaryRes.value) {
        setApprovalsSummary(summaryRes.value);
      }
      if (docsRes.status === 'fulfilled' && Array.isArray(docsRes.value)) {
        setPendingDoctors(docsRes.value);
      }
      if (pharmsRes.status === 'fulfilled' && Array.isArray(pharmsRes.value)) {
        setPendingPharmacists(pharmsRes.value);
      }
      if (patsRes.status === 'fulfilled' && Array.isArray(patsRes.value)) {
        setPendingPatients(patsRes.value);
      }
      if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value)) {
        setDirectoryUsers(usersRes.value);
      }
    } catch (err) {
      console.warn('Admin data load warning:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadAllData();
    }
  }, [authLoading]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Approval Handlers ────────────────────────────────────────────────
  const handleApprove = async (item, roleType) => {
    const itemId = item.id;
    setProcessingId(itemId);
    try {
      if (roleType === 'doctor') {
        await api.approveDoctor(itemId);
        setPendingDoctors((prev) => prev.filter((d) => d.id !== itemId));
      } else if (roleType === 'pharmacist') {
        await api.approvePharmacist(itemId);
        setPendingPharmacists((prev) => prev.filter((p) => p.id !== itemId));
      } else if (roleType === 'patient') {
        await api.approvePatient(itemId);
        setPendingPatients((prev) => prev.filter((p) => p.id !== itemId));
      }

      addToast({
        type: 'success',
        title: 'Account Approved',
        message: `${item.name} (${item.doctorIdDisplay || item.pharmacistIdDisplay || item.patientIdDisplay || roleType.toUpperCase()}) approved and granted workstation access.`
      });

      // Refresh directory and summary in background
      loadAllData();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Approval Failed',
        message: err.message || 'Could not approve account.'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenRejectModal = (item, roleType) => {
    setRejectModalTarget({
      id: item.id,
      name: item.name,
      role: roleType,
      displayId: item.doctorIdDisplay || item.pharmacistIdDisplay || item.patientIdDisplay || ''
    });
    setRejectionReason('');
  };

  const handleConfirmReject = async () => {
    if (!rejectModalTarget) return;
    setRejecting(true);
    const { id, name, role } = rejectModalTarget;
    const reason = rejectionReason.trim() || 'Credentials could not be verified.';

    try {
      if (role === 'doctor') {
        await api.rejectDoctor(id, reason);
        setPendingDoctors((prev) => prev.filter((d) => d.id !== id));
      } else if (role === 'pharmacist') {
        await api.rejectPharmacist(id, reason);
        setPendingPharmacists((prev) => prev.filter((p) => p.id !== id));
      } else if (role === 'patient') {
        await api.rejectPatient(id, reason);
        setPendingPatients((prev) => prev.filter((p) => p.id !== id));
      }

      addToast({
        type: 'warning',
        title: 'Application Rejected',
        message: `${name}'s registration has been declined.`
      });

      setRejectModalTarget(null);
      setRejectionReason('');
      loadAllData();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Rejection Failed',
        message: err.message || 'Could not reject account.'
      });
    } finally {
      setRejecting(false);
    }
  };

  const handleBatchApprove = async () => {
    const docIds = pendingDoctors.map((d) => d.id);
    const pharmIds = pendingPharmacists.map((p) => p.id);
    const patIds = pendingPatients.map((p) => p.id);

    const total = docIds.length + pharmIds.length + patIds.length;
    if (total === 0) return;

    setProcessingId('batch');
    try {
      await api.batchApprove({
        doctorProfileIds: docIds,
        pharmacistProfileIds: pharmIds,
        patientIds: patIds
      });

      addToast({
        type: 'success',
        title: 'Batch Approval Complete',
        message: `Successfully approved all ${total} pending account registrations.`
      });

      setPendingDoctors([]);
      setPendingPharmacists([]);
      setPendingPatients([]);
      loadAllData();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Batch Approval Failed',
        message: err.message || 'Could not batch approve accounts.'
      });
    } finally {
      setProcessingId(null);
    }
  };

  // ── Combined Pending List with Filtering ─────────────────────────────
  const combinedPending = useMemo(() => {
    const list = [];
    pendingDoctors.forEach((d) => list.push({ ...d, roleType: 'doctor' }));
    pendingPharmacists.forEach((p) => list.push({ ...p, roleType: 'pharmacist' }));
    pendingPatients.forEach((pt) => list.push({ ...pt, roleType: 'patient' }));

    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [pendingDoctors, pendingPharmacists, pendingPatients]);

  const filteredPending = useMemo(() => {
    return combinedPending.filter((item) => {
      // Sub-tab filter
      if (approvalSubTab === 'doctors' && item.roleType !== 'doctor') return false;
      if (approvalSubTab === 'pharmacists' && item.roleType !== 'pharmacist') return false;
      if (approvalSubTab === 'patients' && item.roleType !== 'patient') return false;

      // Search query
      if (approvalSearchQuery.trim()) {
        const q = approvalSearchQuery.toLowerCase();
        const displayId = (item.doctorIdDisplay || item.pharmacistIdDisplay || item.patientIdDisplay || '').toLowerCase();
        const license = (item.licenseNumber || '').toLowerCase();
        const council = (item.council || '').toLowerCase();
        const spec = (item.specialization || '').toLowerCase();
        const conditions = Array.isArray(item.conditions) ? item.conditions.join(' ').toLowerCase() : '';

        return (
          item.name.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q) ||
          displayId.includes(q) ||
          license.includes(q) ||
          council.includes(q) ||
          spec.includes(q) ||
          conditions.includes(q)
        );
      }
      return true;
    });
  }, [combinedPending, approvalSubTab, approvalSearchQuery]);

  // ── User Directory Filtering ─────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    return directoryUsers.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;

      if (userSearchQuery.trim()) {
        const q = userSearchQuery.toLowerCase();
        const display = (u.displayId || '').toLowerCase();
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || display.includes(q);
      }
      return true;
    });
  }, [directoryUsers, roleFilter, statusFilter, userSearchQuery]);

  const auditLog = useMemo(() => (data?.auditLog || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)), [data?.auditLog]);
  const filteredAudit = useMemo(() => auditLog.slice(0, 100), [auditLog]);

  const handleReset = () => {
    dispatch({ type: 'RESET_DATA' });
    addToast({ type: 'success', title: 'Demo Data Reset', message: 'All demo data restored to original seed dataset.' });
    setShowReset(false);
  };

  if (loading) return <LoadingSpinner text="Loading system administration dashboard..." />;

  const totalPendingCount = combinedPending.length;

  const tabs = [
    {
      id: 'approvals',
      label: 'Clinical Approvals',
      count: totalPendingCount > 0 ? totalPendingCount : undefined
    },
    { id: 'users', label: 'User Directory', count: directoryUsers.length },
    { id: 'audit', label: 'Security & Audit Log', count: auditLog.length },
    { id: 'config', label: 'System Configuration' },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans selection:bg-[#046A38] selection:text-white">
      {/* ── Top Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl border border-[#E8DCC8] p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#046A38] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Medical Governance & Platform Administration
            </span>
            <span className="text-xs text-stone-400">•</span>
            <span className="text-xs font-semibold text-stone-500">
              Role-Based Access Control (RBAC) Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#112228] tracking-tight">
            System Administration
          </h1>
          <p className="text-xs sm:text-sm font-medium text-stone-600 mt-1">
            Review and approve clinician and patient accounts, govern credentials, and monitor clinical audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            type="button"
            onClick={loadAllData}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} />
            <span>Refresh All Data</span>
          </button>

          <button
            type="button"
            onClick={() => setShowReset(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      {/* ── Top KPI Stat Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Approvals Card (Highlighted) */}
        <div
          onClick={() => setActiveTab('approvals')}
          className={`card p-5 cursor-pointer transition-all border-l-4 ${
            totalPendingCount > 0
              ? 'border-l-amber-500 bg-amber-50/40 hover:bg-amber-50 hover:shadow-md'
              : 'border-l-[#046A38] hover:shadow-md'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-black uppercase tracking-wider text-stone-600">Pending Approvals</p>
                {totalPendingCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                )}
              </div>
              <p className="text-3xl font-black text-stone-900 mt-1">{totalPendingCount}</p>
              <p className="text-[11px] font-semibold text-stone-500 mt-1">
                {pendingDoctors.length} Doctors • {pendingPharmacists.length} Pharmacists • {pendingPatients.length} Patients
              </p>
            </div>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              totalPendingCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-[#046A38]'
            }`}>
              <Clock size={20} />
            </div>
          </div>
        </div>

        {/* Registered Patients Card */}
        <StatCard
          label="Registered Patients"
          value={approvalsSummary?.activePatients ?? directoryUsers.filter((u) => u.role === 'patient').length}
          subtitle={`${pendingPatients.length} pending review`}
          icon={Users}
          color="primary"
          onClick={() => {
            setActiveTab('users');
            setRoleFilter('patient');
          }}
        />

        {/* Licensed Clinicians Card */}
        <StatCard
          label="Active Clinicians"
          value={(approvalsSummary?.activeDoctors ?? 0) + (approvalsSummary?.activePharmacists ?? 0) || directoryUsers.filter((u) => u.role === 'doctor' || u.role === 'pharmacist').length}
          subtitle={`${pendingDoctors.length + pendingPharmacists.length} pending verification`}
          icon={Stethoscope}
          color="secondary"
          onClick={() => {
            setActiveTab('users');
            setRoleFilter('doctor');
          }}
        />

        {/* Audit Events Logged */}
        <StatCard
          label="Audit Events Logged"
          value={auditLog.length}
          subtitle="100% cryptographic ledger"
          icon={Shield}
          color="warning"
          onClick={() => setActiveTab('audit')}
        />
      </div>

      {/* ── Main Tab Navigation ────────────────────────────────────── */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: CLINICAL APPROVALS HUB ───────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          {/* Controls Bar: Sub-Tabs, Search, and Batch Approve */}
          <div className="bg-white rounded-3xl border border-[#E8DCC8] p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Sub-Tabs: Filter by Role */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setApprovalSubTab('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    approvalSubTab === 'all'
                      ? 'bg-[#046A38] text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  All Pending ({combinedPending.length})
                </button>

                <button
                  type="button"
                  onClick={() => setApprovalSubTab('doctors')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    approvalSubTab === 'doctors'
                      ? 'bg-[#046A38] text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  <Stethoscope size={13} />
                  <span>Doctors ({pendingDoctors.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setApprovalSubTab('pharmacists')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    approvalSubTab === 'pharmacists'
                      ? 'bg-[#046A38] text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  <Pill size={13} />
                  <span>Pharmacists ({pendingPharmacists.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setApprovalSubTab('patients')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    approvalSubTab === 'patients'
                      ? 'bg-[#046A38] text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  <Users size={13} />
                  <span>Patients ({pendingPatients.length})</span>
                </button>
              </div>

              {/* Batch Actions */}
              {totalPendingCount > 1 && (
                <button
                  type="button"
                  disabled={processingId === 'batch'}
                  onClick={handleBatchApprove}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-white bg-[#046A38] hover:bg-[#03542C] transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0 self-start md:self-auto"
                >
                  <UserCheck size={14} />
                  <span>{processingId === 'batch' ? 'Approving...' : `Approve All Pending (${totalPendingCount})`}</span>
                </button>
              )}
            </div>

            {/* Search Input for Approvals */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                type="text"
                value={approvalSearchQuery}
                onChange={(e) => setApprovalSearchQuery(e.target.value)}
                placeholder="Search pending queue by name, email, account ID, license number, or conditions..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8DCC8] bg-stone-50/50 text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#046A38] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Pending Approval List */}
          {filteredPending.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#E8DCC8] p-12 text-center shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-[#046A38] border-2 border-emerald-200 flex items-center justify-center mx-auto mb-4 shadow-xs">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-base font-extrabold text-[#112228]">
                {approvalSearchQuery ? 'No Matches Found' : 'All Clear — No Pending Approvals'}
              </h3>
              <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto leading-relaxed">
                {approvalSearchQuery
                  ? 'No pending registrations matched your search criteria. Try a different term or clear the filter.'
                  : 'All registered Patient, Doctor, and Pharmacist accounts have been reviewed and verified by the Medical Board Administration.'}
              </p>
              {approvalSearchQuery && (
                <button
                  type="button"
                  onClick={() => setApprovalSearchQuery('')}
                  className="mt-4 px-4 py-1.5 rounded-xl text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-all cursor-pointer"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPending.map((item) => {
                const isDoc = item.roleType === 'doctor';
                const isPharm = item.roleType === 'pharmacist';
                const isPat = item.roleType === 'patient';
                const displayId = item.doctorIdDisplay || item.pharmacistIdDisplay || item.patientIdDisplay || item.id;
                const isProcessing = processingId === item.id;

                return (
                  <div
                    key={`${item.roleType}-${item.id}`}
                    className="bg-white rounded-2xl border border-[#E8DCC8] p-5 shadow-xs hover:border-[#046A38]/40 transition-all"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: User Identity & Role Badge */}
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 font-bold text-sm shadow-xs ${
                          isDoc ? 'bg-indigo-700' : isPharm ? 'bg-teal-700' : 'bg-[#046A38]'
                        }`}>
                          {isDoc ? <Stethoscope size={20} /> : isPharm ? <Pill size={20} /> : <Users size={20} />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-stone-900 text-sm">
                              {item.name}
                            </span>

                            {/* Role Pill */}
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              isDoc
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : isPharm
                                ? 'bg-teal-50 text-teal-800 border-teal-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}>
                              {isDoc ? 'Doctor' : isPharm ? 'Pharmacist' : 'Patient'}
                            </span>

                            {/* Monospace Display ID with Copy */}
                            <button
                              type="button"
                              onClick={() => copyToClipboard(displayId, item.id)}
                              className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[#046A38] bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors cursor-pointer"
                              title="Click to copy account ID"
                            >
                              <span>{displayId}</span>
                              {copiedId === item.id ? <Check size={11} /> : <Copy size={11} />}
                            </button>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-stone-500 mt-1 flex-wrap font-medium">
                            <span>{item.email}</span>
                            {item.phone && <span>• {item.phone}</span>}
                            <span>• Submitted {formatDateTime(item.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleApprove(item, item.roleType)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#046A38] hover:bg-[#03542C] transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 size={14} />
                          <span>{isProcessing ? 'Approving...' : 'Approve Access'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleOpenRejectModal(item, item.roleType)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <XCircle size={14} />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>

                    {/* Bottom: Clinical Credential / Detail Strip */}
                    <div className="mt-3.5 pt-3.5 border-t border-stone-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {isDoc && (
                        <>
                          <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                            <span className="text-[10px] uppercase font-bold text-stone-500 block">Registration / License</span>
                            <span className="font-mono font-bold text-stone-800">{item.licenseNumber}</span>
                          </div>
                          <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                            <span className="text-[10px] uppercase font-bold text-stone-500 block">Medical Council</span>
                            <span className="font-bold text-stone-800">{item.council}</span>
                          </div>
                          <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                            <span className="text-[10px] uppercase font-bold text-stone-500 block">Specialty & Clinic</span>
                            <span className="font-bold text-stone-800">{item.specialization} {item.hospitalClinic ? `(${item.hospitalClinic})` : ''}</span>
                          </div>
                        </>
                      )}

                      {isPharm && (
                        <>
                          <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                            <span className="text-[10px] uppercase font-bold text-stone-500 block">Pharmacy License</span>
                            <span className="font-mono font-bold text-stone-800">{item.licenseNumber}</span>
                          </div>
                          <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                            <span className="text-[10px] uppercase font-bold text-stone-500 block">Pharmacy Council</span>
                            <span className="font-bold text-stone-800">{item.council}</span>
                          </div>
                          <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                            <span className="text-[10px] uppercase font-bold text-stone-500 block">Practice & Facility</span>
                            <span className="font-bold text-stone-800">{item.specialization} {item.pharmacyName ? `(${item.pharmacyName})` : ''}</span>
                          </div>
                        </>
                      )}

                      {isPat && (
                        <>
                          <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                            <span className="text-[10px] uppercase font-bold text-stone-500 block">Physical Metrics</span>
                            <span className="font-bold text-stone-800">
                              Age: {item.age || '—'} • {item.height ? `${item.height} cm` : '—'} • {item.weight ? `${item.weight} kg` : '—'}
                            </span>
                          </div>
                          <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                            <span className="text-[10px] uppercase font-bold text-stone-500 block">Reported Conditions</span>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {Array.isArray(item.conditions) && item.conditions.length > 0 ? (
                                item.conditions.map((c, i) => (
                                  <span key={i} className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-semibold text-[10px]">
                                    {c}
                                  </span>
                                ))
                              ) : (
                                <span className="text-stone-500">None declared</span>
                              )}
                            </div>
                          </div>
                          <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-stone-500 block">Uploaded Prescription</span>
                              <span className="text-stone-700 font-medium truncate block max-w-[150px]">
                                {item.prescriptionFileName || 'No file uploaded'}
                              </span>
                            </div>
                            {item.prescriptionFileUrl && (
                              <button
                                type="button"
                                onClick={() => setPreviewPrescription({
                                  url: item.prescriptionFileUrl,
                                  name: item.prescriptionFileName,
                                  patientName: item.name
                                })}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-[#046A38] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer shrink-0"
                              >
                                <Eye size={12} />
                                <span>Inspect</span>
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: USER DIRECTORY ───────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-[#E8DCC8] shadow-xs overflow-hidden">
          {/* Header Controls */}
          <div className="p-5 border-b border-[#E8DCC8] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-stone-900">
                Platform Account Directory ({filteredUsers.length})
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Centralized registry of all patient, clinician, and administration identities.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="w-full sm:w-64">
                <SearchBar
                  value={userSearchQuery}
                  onChange={setUserSearchQuery}
                  placeholder="Search user by name, email, ID..."
                />
              </div>

              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#046A38]"
              >
                <option value="all">All Roles</option>
                <option value="doctor">Doctors</option>
                <option value="pharmacist">Pharmacists</option>
                <option value="patient">Patients</option>
                <option value="admin">Administrators</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#046A38]"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended / Rejected</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="font-bold text-stone-900">User & Display ID</th>
                  <th className="font-bold text-stone-900">Role</th>
                  <th className="font-bold text-stone-900">Email & Contact</th>
                  <th className="font-bold text-stone-900">Governance Status</th>
                  <th className="font-bold text-stone-900">Registered Date</th>
                  <th className="font-bold text-stone-900 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-stone-500 text-xs font-medium">
                      No accounts found matching your selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isPending = u.status === 'pending' || u.approvalStatus === 'pending';
                    const isSuspended = u.status === 'suspended' || u.approvalStatus === 'rejected';

                    return (
                      <tr key={u.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <Avatar user={u} size="sm" />
                            <div>
                              <p className="font-bold text-stone-900 text-xs sm:text-sm">{u.name}</p>
                              {u.displayId ? (
                                <span className="font-mono text-[10px] font-bold text-[#046A38] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  {u.displayId}
                                </span>
                              ) : (
                                <span className="text-[10px] text-stone-400 font-mono">ID: {u.id.slice(0, 8)}...</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            u.role === 'doctor'
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              : u.role === 'pharmacist' || u.role === 'care_team'
                              ? 'bg-teal-50 text-teal-800 border-teal-200'
                              : u.role === 'admin'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <p className="text-xs font-medium text-stone-800">{u.email}</p>
                          {u.phone && <p className="text-[11px] text-stone-400">{u.phone}</p>}
                        </td>
                        <td>
                          {isPending ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Pending Approval
                            </span>
                          ) : isSuspended ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-800 border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              Suspended
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Active
                            </span>
                          )}
                        </td>
                        <td className="text-xs text-stone-600 whitespace-nowrap">
                          {formatDateTime(u.createdAt)}
                        </td>
                        <td className="text-right">
                          {isPending ? (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('approvals');
                                setApprovalSearchQuery(u.name);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
                            >
                              Review
                            </button>
                          ) : (
                            <span className="text-[11px] text-stone-400 font-medium">Verified</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: AUDIT TRAIL ──────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-[#E8DCC8] shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#E8DCC8]">
            <h2 className="text-base font-extrabold text-stone-900">
              Security & Clinical Activity Audit Trail
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Cryptographically signed ledger of all approvals, prescriptions, telemetry updates, and administrative events.
            </p>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="font-bold text-stone-900">Timestamp</th>
                  <th className="font-bold text-stone-900">Actor</th>
                  <th className="font-bold text-stone-900">Role</th>
                  <th className="font-bold text-stone-900">Action Event</th>
                  <th className="font-bold text-stone-900">Patient Ref</th>
                  <th className="font-bold text-stone-900">Audit Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredAudit.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap text-xs font-mono font-medium text-stone-700">
                      {formatDateTime(e.timestamp)}
                    </td>
                    <td className="text-xs font-bold text-stone-900">
                      {data?.users?.[e.actor]?.name || e.actor}
                    </td>
                    <td>
                      <Badge variant="gray">{e.actorRole ? e.actorRole.toUpperCase() : 'SYSTEM'}</Badge>
                    </td>
                    <td className="text-xs font-extrabold text-stone-900 capitalize">
                      {e.action.replace(/_/g, ' ')}
                    </td>
                    <td className="text-xs font-medium text-stone-800">
                      {data?.users?.[e.patientId]?.name || '—'}
                    </td>
                    <td className="text-xs text-stone-600 max-w-xs truncate">
                      {e.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: CONFIGURATION ────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-[#E8DCC8] p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Settings size={20} className="text-[#046A38]" />
              <h3 className="font-extrabold text-stone-900 text-lg">System Runtime Configuration</h3>
            </div>
            <p className="text-xs sm:text-sm text-stone-600">
              Active security governance, cryptography layers, and backend database parameters.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
                <div>
                  <p className="text-sm font-bold text-stone-900">Credential Verification Policy</p>
                  <p className="text-xs text-stone-500">Requires explicit Medical Board approval</p>
                </div>
                <Badge variant="success">Enforced</Badge>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
                <div>
                  <p className="text-sm font-bold text-stone-900">Password Hashing Algorithm</p>
                  <p className="text-xs text-stone-500">Argon2id with cryptographic salt</p>
                </div>
                <Badge variant="info">Active</Badge>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
                <div>
                  <p className="text-sm font-bold text-stone-900">Token Rotation & Silent Refresh</p>
                  <p className="text-xs text-stone-500">HttpOnly __Host cookies + Web Locks sync</p>
                </div>
                <Badge variant="success">Secured</Badge>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
                <div>
                  <p className="text-sm font-bold text-stone-900">Database Engine</p>
                  <p className="text-xs text-stone-500">SQLite / PostgreSQL ACID transactional store</p>
                </div>
                <Badge variant="success">Online</Badge>
              </div>
            </div>
          </div>

          <div className="bg-rose-50/40 rounded-3xl border border-rose-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-rose-800">
              <AlertOctagon size={20} />
              <h3 className="font-extrabold text-rose-950 text-lg">Demonstration Environment Controls</h3>
            </div>
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
              Restore the mock clinical trial database, patient panel records, and demo user accounts back to their baseline seed state.
            </p>
            <div className="pt-3">
              <button
                type="button"
                onClick={() => setShowReset(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-xs cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Reset All Demonstration Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rejection Reason Modal ─────────────────────────────────── */}
      {rejectModalTarget && (
        <Modal
          open={!!rejectModalTarget}
          onClose={() => setRejectModalTarget(null)}
          title={`Decline Registration: ${rejectModalTarget.name}`}
        >
          <div className="space-y-4 p-1">
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
              Please specify the reason why <strong>{rejectModalTarget.name}</strong> ({rejectModalTarget.displayId || rejectModalTarget.role}) could not be approved. This rationale will be displayed to the applicant on their status portal:
            </p>

            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. License number not found on the State Medical Council active register."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#046A38] bg-white"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejecting || !rejectionReason.trim()}
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
              >
                {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Prescription Viewer Modal ──────────────────────────────── */}
      {previewPrescription && (
        <Modal
          open={!!previewPrescription}
          onClose={() => setPreviewPrescription(null)}
          title={`Prescription Document: ${previewPrescription.patientName}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-stone-500 bg-stone-50 p-3 rounded-xl border border-stone-200">
              <span className="font-medium truncate max-w-sm">File: {previewPrescription.name}</span>
              <a
                href={previewPrescription.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-bold text-[#046A38] hover:underline"
              >
                <Download size={13} />
                <span>Open in New Tab</span>
              </a>
            </div>

            <div className="border border-stone-200 rounded-2xl overflow-hidden bg-stone-100 min-h-[350px] flex items-center justify-center p-2">
              {previewPrescription.url.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewPrescription.url}
                  title="Prescription PDF"
                  className="w-full h-[500px] rounded-xl border-0"
                />
              ) : (
                <img
                  src={previewPrescription.url}
                  alt="Uploaded Prescription"
                  className="max-h-[500px] w-auto object-contain rounded-xl shadow-xs"
                />
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewPrescription(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Reset Demo Confirmation ────────────────────────────────── */}
      <ConfirmDialog
        open={showReset}
        onClose={() => setShowReset(false)}
        onConfirm={handleReset}
        title="Reset Demo Dataset?"
        message="This will restore all tables, simulated patient metrics, clinician reviews, and appointments back to the baseline seed data. All temporary changes will be restored."
        confirmText="Reset Everything"
      />
    </div>
  );
}
