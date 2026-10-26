import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { StatCard, LoadingSpinner, Badge, SearchBar, Modal, ConfirmDialog, Tabs, Avatar } from '../../components/ui';
import { Users, Shield, Settings, RefreshCw, Trash2, Plus, Edit, Eye, AlertOctagon, CheckCircle2, XCircle, Stethoscope, Clock } from 'lucide-react';
import { formatDateTime } from '../../data/demoDate';
import { resetData } from '../../services/dataService';

export default function AdminDashboard({ initialTab }) {
  const { currentUser, data, refreshData, addToast, dispatch } = useApp();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab || 'users');
  const [showReset, setShowReset] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Pending Doctor Approvals State
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectModalDoc, setRejectModalDoc] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const loadPendingDoctors = async () => {
    try {
      const list = await api.getPendingDoctors();
      setPendingDoctors(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Could not load pending doctors:', err.message);
    }
  };

  useEffect(() => {
    loadPendingDoctors();
    setTimeout(() => setLoading(false), 300);
  }, []);

  const handleApproveDoctor = async (profileId, docName) => {
    setApprovingId(profileId);
    try {
      await api.approveDoctor(profileId);
      addToast({
        type: 'success',
        title: 'Doctor Approved',
        message: `${docName} has been verified and granted clinical workstation access.`
      });
      setPendingDoctors((prev) => prev.filter((d) => d.id !== profileId));
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Approval Failed',
        message: err.message || 'Could not approve doctor credentials.'
      });
    } finally {
      setApprovingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalDoc) return;
    setRejecting(true);
    try {
      await api.rejectDoctor(rejectModalDoc.id, rejectionReason || 'Credentials could not be verified.');
      addToast({
        type: 'warning',
        title: 'Credentials Rejected',
        message: `Doctor ${rejectModalDoc.name} credentials marked as rejected.`
      });
      setPendingDoctors((prev) => prev.filter((d) => d.id !== rejectModalDoc.id));
      setRejectModalDoc(null);
      setRejectionReason('');
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Rejection Failed',
        message: err.message || 'Could not reject doctor profile.'
      });
    } finally {
      setRejecting(false);
    }
  };

  const users = useMemo(() => Object.values(data?.users || {}), [data?.users]);
  const auditLog = useMemo(() => (data?.auditLog || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)), [data?.auditLog]);

  const filteredUsers = searchQuery ? users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.role.includes(searchQuery.toLowerCase())) : users;
  const filteredAudit = useMemo(() => auditLog.slice(0, 100), [auditLog]);

  const handleReset = () => {
    dispatch({ type: 'RESET_DATA' });
    addToast({ type: 'success', title: 'Demo Data Reset', message: 'All data has been restored to the original dataset.' });
    setShowReset(false);
  };

  if (loading) return <LoadingSpinner text="Loading admin dashboard..." />;

  const tabs = [
    { id: 'users', label: 'User Directory', count: users.length },
    { id: 'doctor-approvals', label: 'Doctor Approvals', count: pendingDoctors.length },
    { id: 'audit', label: 'Security & Audit Log', count: auditLog.length },
    { id: 'config', label: 'System Configuration' },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">System Administration</h1>
          <p className="text-sm font-semibold text-slate-700 mt-1">Manage platform identity, clinical audit trails, and system parameters</p>
        </div>
        <button onClick={() => setShowReset(true)} className="btn-danger font-bold flex items-center justify-center gap-2 self-start sm:self-auto shadow-xs">
          <RefreshCw size={16} /> Reset Demo Data
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={users.length} icon={Users} />
        <StatCard label="Patients Enrolled" value={users.filter(u => u.role === 'patient').length} icon={Users} color="primary" />
        <StatCard label="Active Clinicians" value={users.filter(u => u.role === 'doctor' || u.role === 'pharmacist').length} icon={Users} color="secondary" />
        <StatCard label="Audit Events Logged" value={auditLog.length} icon={Shield} color="warning" />
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'users' && (
        <div className="card border border-slate-200">
          <div className="card-header flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 p-4">
            <h2 className="font-extrabold text-slate-950 text-base">Active Accounts ({filteredUsers.length})</h2>
            <div className="w-full sm:w-80">
              <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by name or clinical role..." />
            </div>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="font-bold text-slate-950">User</th>
                  <th className="font-bold text-slate-950">Role</th>
                  <th className="font-bold text-slate-950">Email / Handle</th>
                  <th className="font-bold text-slate-950">Clinical Assignments</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar user={u} size="sm" />
                        <div>
                          <p className="font-bold text-slate-950">{u.name}</p>
                          <p className="text-xs font-semibold text-slate-600">ID: {u.id}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge variant={u.role === 'doctor' ? 'info' : u.role === 'pharmacist' ? 'primary' : u.role === 'admin' ? 'gray' : 'success'}>
                        {u.role.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="text-sm font-semibold text-slate-800">{u.email || '—'}</td>
                    <td className="text-xs font-bold text-slate-800">
                      {u.assignedDoctor && <span className="bg-slate-100 px-2 py-1 rounded text-slate-900 border border-slate-200">Physician: Dr. {data?.users?.[u.assignedDoctor]?.name?.split(' ').pop()}</span>}
                      {u.assignedPatients && <span className="bg-blue-50 px-2 py-1 rounded text-blue-900 border border-blue-200">{u.assignedPatients.length} Patients Panel</span>}
                      {!u.assignedDoctor && !u.assignedPatients && <span className="text-slate-500 font-medium">None</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'doctor-approvals' && (
        <div className="card border border-slate-200">
          <div className="card-header flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 p-4">
            <div>
              <h2 className="font-extrabold text-slate-950 text-base">
                Pending Doctor Credential Verifications ({pendingDoctors.length})
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Review and approve medical council licenses before granting access to confidential patient records.
              </p>
            </div>
            <button
              onClick={loadPendingDoctors}
              className="btn-outline btn-sm font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw size={14} /> Refresh List
            </button>
          </div>

          {pendingDoctors.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#046A38] border border-emerald-200 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">No Pending Doctor Approvals</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                All registered clinician accounts have been verified by the medical board administrator.
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="font-bold text-slate-950">Doctor & Account ID</th>
                    <th className="font-bold text-slate-950">License / Reg Number</th>
                    <th className="font-bold text-slate-950">Authority / Council</th>
                    <th className="font-bold text-slate-950">Specialization & Clinic</th>
                    <th className="font-bold text-slate-950">Contact Info</th>
                    <th className="font-bold text-slate-950">Verification Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingDoctors.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-[#0F2D25] text-white flex items-center justify-center font-bold text-xs shrink-0">
                            <Stethoscope size={16} className="text-emerald-400" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-950 text-sm">{doc.name}</p>
                            <span className="font-mono text-xs font-bold text-[#046A38] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {doc.doctorIdDisplay}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                          {doc.licenseNumber}
                        </span>
                      </td>
                      <td className="text-xs font-semibold text-slate-800">{doc.council}</td>
                      <td>
                        <p className="text-xs font-bold text-slate-900">{doc.specialization}</p>
                        {doc.hospitalClinic && (
                          <p className="text-[11px] text-slate-500">{doc.hospitalClinic}</p>
                        )}
                      </td>
                      <td>
                        <p className="text-xs font-medium text-slate-800">{doc.email}</p>
                        <p className="text-[11px] text-slate-500">{doc.phone || '—'}</p>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={approvingId === doc.id}
                            onClick={() => handleApproveDoctor(doc.id, doc.name)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#046A38] hover:bg-[#03542C] transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                          >
                            {approvingId === doc.id ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectModalDoc(doc);
                              setRejectionReason('');
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="card border border-slate-200">
          <div className="card-header border-b border-slate-200 p-4">
            <h2 className="font-extrabold text-slate-950 text-base">Security & Activity Audit Log</h2>
            <p className="text-xs font-medium text-slate-700 mt-0.5">Immutable record of data mutations, clinical approvals, and security events</p>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="font-bold text-slate-950">Timestamp</th>
                  <th className="font-bold text-slate-950">Actor</th>
                  <th className="font-bold text-slate-950">Role</th>
                  <th className="font-bold text-slate-950">Action Event</th>
                  <th className="font-bold text-slate-950">Patient Reference</th>
                  <th className="font-bold text-slate-950">Audit Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredAudit.map(e => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap text-xs font-bold text-slate-800">{formatDateTime(e.timestamp)}</td>
                    <td className="text-sm font-bold text-slate-950">{data?.users?.[e.actor]?.name || e.actor}</td>
                    <td>
                      <Badge variant="gray">{e.actorRole ? e.actorRole.toUpperCase() : 'SYSTEM'}</Badge>
                    </td>
                    <td className="text-sm font-extrabold text-slate-900 capitalize">{e.action.replace(/_/g, ' ')}</td>
                    <td className="text-sm font-semibold text-slate-800">{data?.users?.[e.patientId]?.name || '—'}</td>
                    <td className="text-xs font-semibold text-slate-800 max-w-xs truncate">{e.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card card-body space-y-4 border border-slate-200">
            <div className="flex items-center gap-2">
              <Settings size={20} className="text-slate-900" />
              <h3 className="font-extrabold text-slate-950 text-lg">System Runtime Configuration</h3>
            </div>
            <p className="text-sm font-medium text-slate-700">Client-side persistence and runtime environment variables.</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-slate-950">Data Engine</p>
                  <p className="text-xs font-semibold text-slate-600">Client-side local persistence</p>
                </div>
                <Badge variant="success">localStorage Active</Badge>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-slate-950">Document & File Cache</p>
                  <p className="text-xs font-semibold text-slate-600">High-capacity binary object store</p>
                </div>
                <Badge variant="success">IndexedDB Active</Badge>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-slate-950">Security Simulation Layer</p>
                  <p className="text-xs font-semibold text-slate-600">Multi-role RBAC authorization</p>
                </div>
                <Badge variant="info">Active</Badge>
              </div>
            </div>
          </div>

          <div className="card card-body space-y-4 border border-rose-200 bg-rose-50/30">
            <div className="flex items-center gap-2 text-rose-800">
              <AlertOctagon size={20} />
              <h3 className="font-extrabold text-rose-950 text-lg">Danger Zone: Database Reset</h3>
            </div>
            <p className="text-sm font-medium text-slate-800">
              Re-initializes all tables, simulated patient metrics, medication reviews, and appointments back to the baseline seed data.
            </p>
            <div className="pt-2">
              <button onClick={() => setShowReset(true)} className="btn-danger font-bold flex items-center gap-2">
                <RefreshCw size={16} /> Reset All Platform Data
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={showReset} onClose={() => setShowReset(false)} onConfirm={handleReset}
        title="Reset Demo Data?" message="This will restore all data to the original demonstration dataset. All changes made during this session will be lost. This action cannot be undone." confirmText="Reset Everything" />

      {/* Reject Doctor Credentials Modal */}
      {rejectModalDoc && (
        <Modal
          open={!!rejectModalDoc}
          onClose={() => setRejectModalDoc(null)}
          title={`Reject Credentials: ${rejectModalDoc.name}`}
        >
          <div className="space-y-4 p-2">
            <p className="text-sm text-slate-700">
              Please specify why the medical credentials for <strong>{rejectModalDoc.name}</strong> ({rejectModalDoc.doctorIdDisplay}) could not be approved:
            </p>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. License number not listed on State Medical Council active register."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#046A38]"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejecting || !rejectionReason.trim()}
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-all cursor-pointer"
              >
                {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
