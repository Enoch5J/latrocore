import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon, Bell, Shield, KeyRound, Globe,
  CheckCircle2, ArrowRight, User, LogOut, LockKeyhole
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { normalizeRole } from '../../auth/ProtectedRoute';
import { getRoleDisplayLabel } from '../../utils/userProfile';

const PREFS_STORAGE_KEY = 'latrocore_user_preferences';

const DEFAULT_PREFS = {
  clinicalAlerts: true,
  medicationReminders: true,
  digestEmails: false,
  preferredLanguage: 'en',
};

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
  { code: 'hi', label: 'Hindi (हिंदी)' },
  { code: 'ml', label: 'Malayalam (മലയാളം)' },
  { code: 'te', label: 'Telugu (తెలుగు)' },
  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
];

export default function Settings() {
  const { user: authUser, logout } = useAuth();
  const { currentUser, setUser, addToast } = useApp();
  const navigate = useNavigate();

  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem(PREFS_STORAGE_KEY);
      if (saved) return { ...DEFAULT_PREFS, ...JSON.parse(saved) };
    } catch {
      // ignore storage errors
    }
    return DEFAULT_PREFS;
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore storage errors
    }
  }, [prefs]);

  const activeUser = authUser || currentUser || {};
  const normalizedRole = normalizeRole(activeUser.role);
  const roleLabel = getRoleDisplayLabel(activeUser.role);

  const togglePref = (key, label) => {
    setPrefs((prev) => {
      const nextValue = !prev[key];
      addToast?.({
        type: 'success',
        message: `${label} ${nextValue ? 'enabled' : 'disabled'}.`,
      });
      return { ...prev, [key]: nextValue };
    });
  };

  const handleLanguageChange = (e) => {
    const nextLang = e.target.value;
    setPrefs((prev) => ({ ...prev, preferredLanguage: nextLang }));
    addToast?.({ type: 'success', message: 'Preferred assistant language updated.' });
  };

  const handleSignOut = async () => {
    try {
      setUser(null);
      if (logout) await logout();
    } finally {
      navigate('/', { replace: true });
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addToast?.({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }
    if (passwordForm.newPassword.length < 12 || passwordForm.newPassword.length > 128) {
      addToast?.({ type: 'error', message: 'Password must be between 12 and 128 characters.' });
      return;
    }

    setChangingPassword(true);
    try {
      await api.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      addToast?.({ type: 'success', message: 'Password changed. Please sign in again with your new password.' });
      await handleSignOut();
    } catch (error) {
      addToast?.({ type: 'error', message: error.message || 'Unable to change your password.' });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="bg-white rounded-3xl border border-[#E8DCC8] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8F5EE] border border-[#A8D7BD] text-[11px] font-extrabold uppercase tracking-wider text-[#046A38] mb-2">
            <SettingsIcon size={13} />
            <span>Account &amp; Workspace Preferences</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#112228] tracking-tight">Settings</h1>
          <p className="text-xs sm:text-sm font-medium text-slate-600 mt-1">
            Manage notification alerts, assistant language, and session security for {activeUser.name || activeUser.email}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#FAF6EF] hover:bg-[#F9EBD7] text-[#112228] border border-[#E8DCC8] transition-colors cursor-pointer self-start sm:self-auto"
        >
          <User size={15} />
          <span>View My Profile</span>
        </button>
      </div>

      {/* Notification & Language Preferences */}
      <div className="bg-white rounded-3xl border border-[#E8DCC8] p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#E8F5EE] text-[#046A38] flex items-center justify-center">
            <Bell size={18} />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[#112228]">Notification &amp; Care Preferences</h2>
            <p className="text-xs text-slate-600">Control how LATROCORE surfaces alerts and assistant guidance.</p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            {
              key: 'clinicalAlerts',
              title: 'Clinical Safety Alerts',
              desc: 'Highlight abnormal glucose trends, drug interaction flags, and escalation notices.',
            },
            {
              key: 'medicationReminders',
              title: 'Medication & Refill Reminders',
              desc: 'Receive timely schedule cues and upcoming refill prompts.',
            },
            {
              key: 'digestEmails',
              title: 'Weekly Care Summary Digest',
              desc: 'Receive periodic summary updates on account activity and care milestones.',
            },
          ].map((item) => {
            const enabled = !!prefs[item.key];
            return (
              <div
                key={item.key}
                className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#FAF6EF]/70 border border-[#E8DCC8]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#112228]">{item.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{item.desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => togglePref(item.key, item.title)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                    enabled ? 'bg-[#046A38]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                      enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            );
          })}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#FAF6EF]/70 border border-[#E8DCC8]">
            <div className="flex items-start gap-3">
              <Globe size={18} className="text-[#046A38] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-[#112228]">Preferred Assistant Language</p>
                <p className="text-xs text-slate-600 mt-0.5">Default language for multilingual diabetes guidance.</p>
              </div>
            </div>
            <select
              value={prefs.preferredLanguage}
              onChange={handleLanguageChange}
              aria-label="Preferred Assistant Language"
              className="px-3.5 py-2 rounded-xl border border-[#E8DCC8] bg-white text-xs font-bold text-[#112228] focus:outline-none focus:border-[#046A38] cursor-pointer"
            >
              {LANGUAGE_OPTIONS.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Security & Session Card */}
      <div className="bg-white rounded-3xl border border-[#E8DCC8] p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#E8F5EE] text-[#046A38] flex items-center justify-center">
            <Shield size={18} />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[#112228]">Security &amp; Session Governance</h2>
            <p className="text-xs text-slate-600">Current role access: {roleLabel}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#E8F5EE]/60 border border-[#D1EBDD]">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} className="text-[#046A38] shrink-0" />
            <div>
              <p className="text-sm font-bold text-[#112228]">Protected Session Active</p>
              <p className="text-xs text-slate-600">
                Signed in as <span className="font-semibold text-[#112228]">{activeUser.email}</span> with HttpOnly refresh rotation.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4 rounded-2xl border border-[#E8DCC8] bg-[#FAF6EF]/70 p-4">
          <div className="flex items-center gap-2">
            <LockKeyhole size={17} className="text-[#046A38]" />
            <h3 className="text-sm font-bold text-[#112228]">Change Password</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { key: 'currentPassword', label: 'Current password', autoComplete: 'current-password' },
              { key: 'newPassword', label: 'New password', autoComplete: 'new-password' },
              { key: 'confirmPassword', label: 'Confirm new password', autoComplete: 'new-password' },
            ].map((field) => (
              <label key={field.key} className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700">{field.label}</span>
                <input
                  type="password"
                  autoComplete={field.autoComplete}
                  required
                  minLength={field.key === 'currentPassword' ? undefined : 12}
                  maxLength={128}
                  value={passwordForm[field.key]}
                  onChange={(event) => setPasswordForm((form) => ({ ...form, [field.key]: event.target.value }))}
                  className="w-full rounded-xl border border-[#E8DCC8] bg-white px-3.5 py-3 text-sm text-[#112228] focus:outline-none focus:border-[#046A38]"
                />
              </label>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-600">Use a unique passphrase between 12 and 128 characters. You’ll be asked to sign in again.</p>
            <button
              type="submit"
              disabled={changingPassword}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#046A38] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#03542C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <KeyRound size={14} />
              <span>{changingPassword ? 'Changing...' : 'Change Password'}</span>
            </button>
          </div>
        </form>

        {normalizedRole === 'admin' && (
          <button
            type="button"
            onClick={() => navigate('/admin/config')}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#FAF6EF] hover:bg-[#F9EBD7]/60 border border-[#E8DCC8] transition-colors cursor-pointer text-left"
          >
            <div>
              <p className="text-sm font-bold text-[#112228]">Platform System Configuration</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Open Admin runtime security parameters, RBAC policies, and demonstration dataset controls.
              </p>
            </div>
            <ArrowRight size={16} className="text-[#046A38] shrink-0" />
          </button>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
          >
            <LogOut size={15} />
            <span>Log Out of Session</span>
          </button>
        </div>
      </div>
    </div>
  );
}
