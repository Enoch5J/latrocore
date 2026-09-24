import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { StatCard, LoadingSpinner, Badge, SearchBar, Modal, ConfirmDialog, Tabs, Avatar } from '../../components/ui';
import { Users, Shield, Settings, RefreshCw, Trash2, Plus, Edit, Eye, AlertOctagon } from 'lucide-react';
import { formatDateTime } from '../../data/demoDate';
import { resetData } from '../../services/dataService';

export default function AdminDashboard({ initialTab }) {
  const { currentUser, data, refreshData, addToast, dispatch } = useApp();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab || 'users');
  const [showReset, setShowReset] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => { setTimeout(() => setLoading(false), 300); }, []);

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
    </div>
  );
}
