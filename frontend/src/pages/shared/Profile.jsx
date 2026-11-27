import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Phone, ShieldCheck, BadgeCheck, LayoutGrid,
  Settings as SettingsIcon, Bell, ArrowRight, KeyRound, Pencil, X, Save
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { getDefaultDashboardRoute, normalizeRole } from '../../auth/ProtectedRoute';
import { getUserInitial, getRoleDisplayLabel } from '../../utils/userProfile';

export default function Profile() {
  const { user: authUser, setAuthUser } = useAuth();
  const { currentUser, setUser, addToast } = useApp();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });

  useEffect(() => {
    let active = true;
    const fetchProfile = async () => {
      try {
        const me = await api.getMe();
        if (active && me) {
          setProfileData(me);
          setForm({ name: me.name || '', phone: me.phone || '' });
        }
      } catch (error) {
        if (active) {
          addToast?.({ type: 'error', message: error.message || 'Unable to load your profile.' });
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchProfile();
    return () => {
      active = false;
    };
  }, [addToast]);

  const activeUser = profileData || authUser || currentUser || {};
  const displayName = activeUser.name || activeUser.email || 'User';
  const email = activeUser.email || 'Not specified';
  const phone = activeUser.phone || 'Not provided';
  const roleLabel = getRoleDisplayLabel(activeUser.role);
  const normalizedRole = normalizeRole(activeUser.role);
  const initial = getUserInitial(activeUser);
  const displayId = activeUser.displayId || activeUser.id || 'N/A';
  const statusLabel = activeUser.status === 'pending' || activeUser.approvalStatus === 'pending'
    ? 'Pending Verification'
    : 'Active & Verified';

  const detailItems = [
    { label: 'Full Name', value: displayName, icon: User },
    { label: 'Email Address', value: email, icon: Mail },
    { label: 'Phone Number', value: phone, icon: Phone },
    { label: 'Account ID', value: displayId, icon: BadgeCheck },
    { label: 'Assigned Role', value: roleLabel, icon: ShieldCheck },
    { label: 'Account Status', value: statusLabel, icon: KeyRound },
  ];

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    if (name.length < 2) {
      addToast?.({ type: 'error', message: 'Please enter a name with at least 2 characters.' });
      return;
    }

    setSaving(true);
    try {
      const updated = await api.updateMe({ name, phone: form.phone.trim() || null });
      setProfileData(updated);
      setForm({ name: updated.name || '', phone: updated.phone || '' });
      setAuthUser?.({ ...authUser, ...updated });
      setUser?.({ ...currentUser, ...updated });
      setEditing(false);
      addToast?.({ type: 'success', message: 'Your profile has been updated.' });
    } catch (error) {
      addToast?.({ type: 'error', message: error.message || 'Unable to update your profile.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-[#E8DCC8] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#046A38] text-white font-black text-2xl flex items-center justify-center shrink-0 shadow-sm select-none">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-[#112228] tracking-tight truncate">
                  {displayName}
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#E8F5EE] border border-[#A8D7BD] text-[11px] font-extrabold uppercase tracking-wider text-[#046A38]">
                  {roleLabel.toUpperCase()}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-600 mt-1 truncate">{email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate(getDefaultDashboardRoute(activeUser))}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#046A38] hover:bg-[#03542C] text-white shadow-xs transition-colors cursor-pointer"
            >
              <LayoutGrid size={15} />
              <span>Dashboard</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#FAF6EF] hover:bg-[#F9EBD7] text-[#112228] border border-[#E8DCC8] transition-colors cursor-pointer"
            >
              <SettingsIcon size={15} />
              <span>Settings</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setForm({ name: displayName, phone: phone === 'Not provided' ? '' : phone });
                setEditing((current) => !current);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-[#E8F5EE] text-[#046A38] border border-[#A8D7BD] transition-colors cursor-pointer"
            >
              {editing ? <X size={15} /> : <Pencil size={15} />}
              <span>{editing ? 'Cancel' : 'Edit Profile'}</span>
            </button>
          </div>
        </div>
      </div>

      {editing && (
        <form
          onSubmit={handleSaveProfile}
          className="bg-white rounded-3xl border border-[#E8DCC8] p-6 sm:p-8 shadow-xs space-y-4"
        >
          <div>
            <h2 className="text-lg font-extrabold text-[#112228]">Edit Personal Details</h2>
            <p className="text-xs text-slate-600 mt-0.5">Update the name and mobile number on your account.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700">Full name</span>
              <input
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
                value={form.name}
                onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
                className="w-full rounded-xl border border-[#E8DCC8] bg-white px-3.5 py-3 text-sm text-[#112228] focus:outline-none focus:border-[#046A38]"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700">Mobile number</span>
              <input
                autoComplete="tel"
                type="tel"
                maxLength={20}
                value={form.phone}
                onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))}
                placeholder="+91 9876543210"
                className="w-full rounded-xl border border-[#E8DCC8] bg-white px-3.5 py-3 text-sm text-[#112228] focus:outline-none focus:border-[#046A38]"
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#046A38] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#03542C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={15} />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Account Information Grid */}
      <div className="bg-white rounded-3xl border border-[#E8DCC8] p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-extrabold text-[#112228]">Account Identity &amp; Role Details</h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Verified clinical portal identity and access credentials for your LATROCORE account.
            </p>
          </div>
          {loading && (
            <span className="text-xs font-semibold text-[#046A38] bg-[#E8F5EE] px-3 py-1 rounded-full">
              Syncing...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {detailItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#FAF6EF]/70 border border-[#E8DCC8]"
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-[#E8DCC8] flex items-center justify-center text-[#046A38] shrink-0 shadow-2xs">
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {item.label}
                  </p>
                  <p className="text-sm font-bold text-[#112228] mt-0.5 break-all">
                    {item.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Portal Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className="flex items-center justify-between p-5 rounded-2xl bg-white border border-[#E8DCC8] hover:border-[#A8D7BD] hover:shadow-sm transition-all text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#E8F5EE] text-[#046A38] flex items-center justify-center shrink-0">
              <Bell size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#112228]">Notifications &amp; Alerts</p>
              <p className="text-xs text-slate-600 mt-0.5">Review clinical messages and system updates</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-400 group-hover:text-[#046A38] transition-colors shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => navigate(normalizedRole === 'admin' ? '/admin/config' : '/settings')}
          className="flex items-center justify-between p-5 rounded-2xl bg-white border border-[#E8DCC8] hover:border-[#A8D7BD] hover:shadow-sm transition-all text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#E8F5EE] text-[#046A38] flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#112228]">
                {normalizedRole === 'admin' ? 'System Governance Config' : 'Security & Preferences'}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                {normalizedRole === 'admin'
                  ? 'Manage RBAC policies and runtime security settings'
                  : 'Update alert preferences and password security'}
              </p>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-400 group-hover:text-[#046A38] transition-colors shrink-0" />
        </button>
      </div>
    </div>
  );
}
