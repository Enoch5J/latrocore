import { useState, useEffect } from 'react';
import { User, Mail, Phone, ShieldCheck, BadgeCheck, Pencil, X, Save } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { getUserInitial, getRoleDisplayLabel } from '../../utils/userProfile';

export default function Profile() {
  const { user: authUser, setAuthUser } = useAuth();
  const { currentUser, setUser, addToast } = useApp();
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
  const initial = getUserInitial(activeUser);
  const displayId = activeUser.displayId || activeUser.id || 'N/A';

  const detailItems = [
    { label: 'Full Name', value: displayName, icon: User },
    { label: 'Email Address', value: email, icon: Mail },
    { label: 'Phone Number', value: phone, icon: Phone },
    { label: 'Role', value: roleLabel, icon: ShieldCheck },
    { label: 'Account ID', value: displayId, icon: BadgeCheck },
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
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#E8DCC8] p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-[#046A38] text-white font-bold text-xl flex items-center justify-center shrink-0 select-none">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[#112228] truncate">
                {displayName}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#E8F5EE] border border-[#A8D7BD] text-[11px] font-bold uppercase tracking-wider text-[#046A38]">
                {roleLabel}
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-0.5 truncate">{email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setForm({ name: displayName, phone: phone === 'Not provided' ? '' : phone });
            setEditing((current) => !current);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#FAF6EF] hover:bg-[#E8F5EE] text-[#046A38] border border-[#A8D7BD] transition-colors cursor-pointer self-start sm:self-auto"
        >
          {editing ? <X size={14} /> : <Pencil size={14} />}
          <span>{editing ? 'Cancel' : 'Edit Profile'}</span>
        </button>
      </div>

      {/* Edit Form */}
      {editing && (
        <form
          onSubmit={handleSaveProfile}
          className="bg-white rounded-2xl border border-[#E8DCC8] p-6 shadow-xs space-y-4"
        >
          <h2 className="text-base font-bold text-[#112228]">Edit Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1.5 block">
              <span className="text-xs font-semibold text-slate-700">Full name</span>
              <input
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
                value={form.name}
                onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
                className="w-full rounded-xl border border-[#E8DCC8] bg-white px-3.5 py-2.5 text-sm text-[#112228] focus:outline-none focus:border-[#046A38]"
              />
            </label>
            <label className="space-y-1.5 block">
              <span className="text-xs font-semibold text-slate-700">Phone number</span>
              <input
                autoComplete="tel"
                type="tel"
                maxLength={20}
                value={form.phone}
                onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))}
                placeholder="+91 9876543210"
                className="w-full rounded-xl border border-[#E8DCC8] bg-white px-3.5 py-2.5 text-sm text-[#112228] focus:outline-none focus:border-[#046A38]"
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#046A38] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#03542C] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              <Save size={14} />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Account Details */}
      <div className="bg-white rounded-2xl border border-[#E8DCC8] p-6 shadow-xs">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-base font-bold text-[#112228]">Account Details</h2>
          {loading && (
            <span className="text-xs font-medium text-[#046A38]">Loading...</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {detailItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-3.5 p-3.5 rounded-xl bg-[#FAF6EF]/60 border border-[#E8DCC8]"
              >
                <div className="w-9 h-9 rounded-lg bg-white border border-[#E8DCC8] flex items-center justify-center text-[#046A38] shrink-0">
                  <Icon size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {item.label}
                  </p>
                  <p className="text-sm font-semibold text-[#112228] mt-0.5 break-all">
                    {item.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
