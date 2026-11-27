import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Globe, KeyRound, LogOut } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

const PREFS_STORAGE_KEY = 'latrocore_user_preferences';

const DEFAULT_PREFS = {
  clinicalAlerts: true,
  medicationReminders: true,
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
  const { logout } = useAuth();
  const { setUser, addToast } = useApp();
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
    setPrefs((prev) => ({ ...prev, preferredLanguage: e.target.value }));
    addToast?.({ type: 'success', message: 'Assistant language updated.' });
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
      addToast?.({ type: 'success', message: 'Password updated. Please sign in again.' });
      await handleSignOut();
    } catch (error) {
      addToast?.({ type: 'error', message: error.message || 'Unable to change password.' });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-[#112228]">Settings</h1>
        <p className="text-sm text-slate-600 mt-1">Manage your notifications, language, and password.</p>
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-2xl border border-[#E8DCC8] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <Bell size={18} className="text-[#046A38]" />
          <h2 className="text-base font-bold text-[#112228]">Preferences</h2>
        </div>

        <div className="space-y-3">
          {[
            {
              key: 'clinicalAlerts',
              title: 'Safety Alerts',
              desc: 'Alerts for abnormal glucose readings and drug interactions.',
            },
            {
              key: 'medicationReminders',
              title: 'Medicine & Refill Reminders',
              desc: 'Daily reminders for scheduled doses and upcoming refills.',
            },
          ].map((item) => {
            const enabled = !!prefs[item.key];
            return (
              <div
                key={item.key}
                className="flex items-center justify-between gap-4 p-4 rounded-xl bg-[#FAF6EF]/60 border border-[#E8DCC8]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#112228]">{item.title}</p>
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

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#FAF6EF]/60 border border-[#E8DCC8]">
            <div className="flex items-start gap-2.5">
              <Globe size={17} className="text-[#046A38] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[#112228]">Assistant Language</p>
                <p className="text-xs text-slate-600 mt-0.5">Preferred language for Latro AI.</p>
              </div>
            </div>
            <select
              value={prefs.preferredLanguage}
              onChange={handleLanguageChange}
              aria-label="Assistant Language"
              className="px-3.5 py-2 rounded-xl border border-[#E8DCC8] bg-white text-sm font-medium text-[#112228] focus:outline-none focus:border-[#046A38] cursor-pointer"
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

      {/* Password & Sign Out */}
      <div className="bg-white rounded-2xl border border-[#E8DCC8] p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5">
          <KeyRound size={18} className="text-[#046A38]" />
          <h2 className="text-base font-bold text-[#112228]">Change Password</h2>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { key: 'currentPassword', label: 'Current password', autoComplete: 'current-password' },
              { key: 'newPassword', label: 'New password', autoComplete: 'new-password' },
              { key: 'confirmPassword', label: 'Confirm password', autoComplete: 'new-password' },
            ].map((field) => (
              <label key={field.key} className="space-y-1.5 block">
                <span className="text-xs font-semibold text-slate-700">{field.label}</span>
                <input
                  type="password"
                  autoComplete={field.autoComplete}
                  required
                  minLength={field.key === 'currentPassword' ? undefined : 12}
                  maxLength={128}
                  value={passwordForm[field.key]}
                  onChange={(event) => setPasswordForm((form) => ({ ...form, [field.key]: event.target.value }))}
                  className="w-full rounded-xl border border-[#E8DCC8] bg-white px-3.5 py-2.5 text-sm text-[#112228] focus:outline-none focus:border-[#046A38]"
                />
              </label>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <p className="text-xs text-slate-500">Use 12 to 128 characters.</p>
            <button
              type="submit"
              disabled={changingPassword}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#046A38] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#03542C] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              <span>{changingPassword ? 'Updating...' : 'Update Password'}</span>
            </button>
          </div>
        </form>

        <div className="pt-4 border-t border-[#E8DCC8] flex justify-end">
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
