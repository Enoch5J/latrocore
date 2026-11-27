import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { Outlet, NavLink, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../auth/AuthContext';
import { normalizeRole } from '../auth/ProtectedRoute';
import { Avatar } from '../components/ui';
import UserProfileDropdown from '../components/common/UserProfileDropdown';
import MedicationAlarmModal from '../components/patient/MedicationAlarmModal';
import { getRoleDisplayLabel, getUserInitial } from '../utils/userProfile';
import { addAuditEntry, recordDose } from '../services/dataService';
import {
  ALARM_SNOOZE_MS,
  createMedicationAlarmPlayer,
  findDueOrOverdueDoses,
} from '../utils/medicationAlarm';
import {
  LayoutDashboard, Activity, Pill, FileText, Salad, CalendarDays, MessageSquare,
  Bell, ChevronLeft, Menu, X, User, LogOut, Shield, Stethoscope, ClipboardList,
  Bot, Heart, Users, Settings, AlertTriangle, ChevronRight,
  Home, BarChart3, ClipboardCheck, Package, ShieldAlert
} from 'lucide-react';

export const ROLE_NAV = {
  patient: [
    { to: '/patient/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/patient/sos', icon: ShieldAlert, label: 'Emergency SOS', isEmergency: true },
    { to: '/patient/medications', icon: Pill, label: 'Medications' },
    { to: '/patient/lifestyle', icon: Salad, label: 'Lifestyle' },
    { to: '/patient/metrics', icon: Activity, label: 'Health Metrics' },
    { to: '/patient/safety', icon: AlertTriangle, label: 'Safety Alerts' },
    { to: '/patient/assistant', icon: Bot, label: 'AI Assistant' },
    { to: '/doctors', icon: Stethoscope, label: 'Doctors' },
    { to: '/appointments', icon: CalendarDays, label: 'Appointments' },
  ],
  doctor: [
    { to: '/doctor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/doctor/patients', icon: Users, label: 'My Patients' },
    { to: '/doctor/prescriptions', icon: Pill, label: 'Prescriptions' },
    { to: '/doctor/escalations', icon: AlertTriangle, label: 'Escalations' },
    { to: '/doctor/referrals', icon: Heart, label: 'Referrals' },
    { to: '/appointments', icon: CalendarDays, label: 'Appointments' },
    { to: '/messages', icon: MessageSquare, label: 'Messages' },
  ],
  pharmacist: [
    { to: '/pharmacist/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/pharmacist/patients', icon: Users, label: 'Patient Management' },
    { to: '/pharmacist/prescriptions', icon: ClipboardList, label: 'Prescription Management' },
    { to: '/pharmacist/adherence', icon: Activity, label: 'Medication Adherence' },
    { to: '/pharmacist/interactions', icon: ShieldAlert, label: 'Drug Interactions' },
    { to: '/pharmacist/counselling', icon: Stethoscope, label: 'Pharm D Counselling' },
    { to: '/pharmacist/inventory', icon: Package, label: 'Medicine Inventory' },
    { to: '/pharmacist/reports', icon: BarChart3, label: 'Reports & Analytics' },
    { to: '/appointments', icon: CalendarDays, label: 'Appointments' },
    { to: '/messages', icon: MessageSquare, label: 'Messages' },
  ],
  admin: [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/users', icon: Users, label: 'User Management' },
    { to: '/admin/audit', icon: Shield, label: 'Audit Log' },
    { to: '/admin/config', icon: Settings, label: 'Configuration' },
  ],
};

ROLE_NAV.care_team = ROLE_NAV.pharmacist;

function getBrowserAlertsEnabled() {
  return typeof window !== 'undefined'
    && 'Notification' in window
    && window.Notification.permission === 'granted';
}

function subscribeToBrowserAlertPermission(onChange) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('latrocore:notification-permission-changed', onChange);
  return () => window.removeEventListener(
    'latrocore:notification-permission-changed',
    onChange
  );
}

export default function AppLayout() {
  const { currentUser, data, setUser, refreshData, addToast } = useApp();
  const { user: authUser, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const browserAlertsEnabled = useSyncExternalStore(
    subscribeToBrowserAlertPermission,
    getBrowserAlertsEnabled,
    () => false
  );
  const notifiedDoseIds = useRef(new Set());
  const alarmPlayerRef = useRef(null);
  const [dueAlarmDoses, setDueAlarmDoses] = useState([]);
  const [snoozedUntil, setSnoozedUntil] = useState({});
  const [dismissedDoseIds, setDismissedDoseIds] = useState(() => new Set());
  const [alarmMuted, setAlarmMuted] = useState(false);
  const [alarmSubmitting, setAlarmSubmitting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const mappedAuthRole = normalizeRole(authUser?.role);

  useEffect(() => {
    if (!authUser) return;
    const expectedName = authUser.name || authUser.email;
    if (
      !currentUser ||
      currentUser.id !== authUser.id ||
      normalizeRole(currentUser.role) !== mappedAuthRole ||
      currentUser.email !== authUser.email ||
      currentUser.name !== expectedName ||
      currentUser.status !== authUser.status
    ) {
      setUser({
        ...authUser,
        id: authUser.id,
        name: expectedName,
        email: authUser.email,
        role: mappedAuthRole,
      });
    }
  }, [currentUser, authUser, mappedAuthRole, setUser]);

  // Authenticated session user is always authoritative for role & navigation layout
  const rawUser = authUser
    ? {
        ...(currentUser?.id === authUser.id ? currentUser : {}),
        ...authUser,
        name: authUser.name || authUser.email,
        role: mappedAuthRole,
      }
    : currentUser;
  const normalizedRawRole = normalizeRole(rawUser?.role);
  const activeUser = rawUser ? {
    ...rawUser,
    id: rawUser.id,
    name: rawUser.name || rawUser.email,
    email: rawUser.email,
    role: normalizedRawRole,
    avatar: rawUser.avatar || (
      normalizedRawRole === 'doctor'
        ? 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
    ),
  } : null;

  const effectiveRole = (activeUser?.role === 'care_team' || activeUser?.role === 'pharmacist')
    ? 'pharmacist'
    : activeUser?.role;
  const navItems = ROLE_NAV[effectiveRole] || ROLE_NAV[activeUser?.role] || [];
  const notifications = data?.notifications?.filter(n => n.userId === activeUser?.id) || [];
  const unreadCount = notifications.filter(n => !n.read).length;
  const isPharmacist = activeUser?.role === 'pharmacist' || activeUser?.role === 'care_team';
  const roleName = isPharmacist ? 'Pharmacist / Pharm D' : getRoleDisplayLabel(activeUser?.role);
  const switchableUsers = Object.values(data?.users || {}).filter(
    u => ['pat-001', 'doc-001', 'pharm-001', 'admin-001'].includes(u.id)
  );

  useEffect(() => {
    if (
      typeof window === 'undefined'
      || !('Notification' in window)
      || !browserAlertsEnabled
      || !activeUser?.id
    ) return undefined;

    const timers = [];
    const now = new Date();
    const today = now.toDateString();
    const pendingDoses = (data?.doseEvents || []).filter((dose) =>
      dose.patientId === activeUser.id
        && dose.status === 'pending'
        && new Date(dose.scheduledTime).toDateString() === today
    );

    pendingDoses.forEach((dose) => {
      if (notifiedDoseIds.current.has(dose.id)) return;
      const delayUntilDose = new Date(dose.scheduledTime).getTime() - now.getTime();
      const sendReminder = () => {
        if (
          notifiedDoseIds.current.has(dose.id)
          || window.Notification.permission !== 'granted'
        ) return;
        notifiedDoseIds.current.add(dose.id);
        new window.Notification('Medication reminder', {
          body: 'A scheduled dose is due. Open LATROCORE to view your medicine schedule.',
          tag: `dose-${dose.id}`,
        });
      };

      if (delayUntilDose > 0) {
        timers.push(window.setTimeout(sendReminder, delayUntilDose));
      } else if (delayUntilDose >= -15 * 60 * 1000) {
        sendReminder();
      }
    });

    return () => timers.forEach(window.clearTimeout);
  }, [activeUser?.id, browserAlertsEnabled, data?.doseEvents]);

  // In-app due / overdue medicine alarm pop-up + audio chime for patients
  useEffect(() => {
    if (activeUser?.role !== 'patient' || !activeUser?.id) {
      return undefined;
    }

    const evaluateDoses = () => {
      const now = new Date();
      const due = findDueOrOverdueDoses(
        data?.doseEvents,
        activeUser.id,
        now,
        snoozedUntil,
        dismissedDoseIds
      );
      setDueAlarmDoses(due);
      return now;
    };

    const now = evaluateDoses();
    const todayStr = now.toDateString();
    const nowMs = now.getTime();

    // Schedule exact wakeup for the earliest upcoming pending dose or snooze expiry today
    let nextWakeMs = null;
    (data?.doseEvents || []).forEach((dose) => {
      if (dose.patientId !== activeUser.id || dose.status !== 'pending') return;
      if (dismissedDoseIds.has(dose.id)) return;
      const sched = new Date(dose.scheduledTime);
      if (sched.toDateString() !== todayStr) return;
      const wakeAt = Math.max(sched.getTime(), snoozedUntil[dose.id] || 0);
      if (wakeAt > nowMs && (nextWakeMs === null || wakeAt < nextWakeMs)) {
        nextWakeMs = wakeAt;
      }
    });

    const exactTimer = nextWakeMs !== null
      ? window.setTimeout(evaluateDoses, Math.max(500, nextWakeMs - nowMs + 250))
      : null;
    const pollId = window.setInterval(evaluateDoses, 15000);

    return () => {
      if (exactTimer !== null) window.clearTimeout(exactTimer);
      window.clearInterval(pollId);
    };
  }, [activeUser?.id, activeUser?.role, data?.doseEvents, snoozedUntil, dismissedDoseIds]);

  useEffect(() => {
    if (!alarmPlayerRef.current) {
      alarmPlayerRef.current = createMedicationAlarmPlayer();
    }
    const shouldRing = activeUser?.role === 'patient' && dueAlarmDoses.length > 0 && !alarmMuted;
    if (shouldRing) {
      alarmPlayerRef.current.start();
    } else {
      alarmPlayerRef.current.stop();
    }
    return () => {
      alarmPlayerRef.current?.stop();
    };
  }, [activeUser?.role, dueAlarmDoses.length, alarmMuted]);

  const visibleAlarmDoses = activeUser?.role === 'patient' ? dueAlarmDoses : [];
  const activeAlarmDose = visibleAlarmDoses[0] || null;

  const handleAlarmMarkTaken = async () => {
    if (!activeAlarmDose || !activeUser?.id || alarmSubmitting) return;
    setAlarmSubmitting(true);
    try {
      await recordDose(activeAlarmDose.id, 'taken', new Date().toISOString(), '');
      await addAuditEntry({
        actor: activeUser.id,
        actorRole: 'patient',
        action: 'dose_taken',
        patientId: activeUser.id,
        recordId: activeAlarmDose.id,
        details: `${activeAlarmDose.medicineName || 'Medicine'} marked taken from reminder alarm`,
      });
      refreshData();
      addToast({
        type: 'success',
        message: `${activeAlarmDose.medicineName || 'Medicine'} marked as taken`,
      });
    } finally {
      setAlarmSubmitting(false);
    }
  };

  const handleAlarmSnooze = () => {
    if (!activeAlarmDose) return;
    const doseId = activeAlarmDose.id;
    setSnoozedUntil((prev) => ({ ...prev, [doseId]: Date.now() + ALARM_SNOOZE_MS }));
    setDueAlarmDoses((prev) => prev.filter((d) => d.id !== doseId));
    addToast({
      type: 'info',
      message: `${activeAlarmDose.medicineName || 'Medicine'} snoozed for 10 minutes`,
    });
  };

  const handleAlarmDismiss = () => {
    if (!activeAlarmDose) return;
    const doseId = activeAlarmDose.id;
    setDismissedDoseIds((prev) => {
      const next = new Set(prev);
      next.add(doseId);
      return next;
    });
    setDueAlarmDoses((prev) => prev.filter((d) => d.id !== doseId));
  };

  if (!activeUser) {
    return <Navigate to="/login" replace />;
  }

  const handleRoleSwitch = (userId) => {
    const user = data?.users?.[userId];
    if (user) {
      setUser(user);
      const defaultRoutes = {
        patient: '/patient/dashboard',
        doctor: '/doctor/dashboard',
        pharmacist: '/pharmacist/dashboard',
        care_team: '/pharmacist/dashboard',
        admin: '/admin/dashboard',
      };
      navigate(defaultRoutes[user.role] || '/');
      setMobileMenuOpen(false);
      addToast({ type: 'info', message: `Switched to ${user.name} (${user.role})` });
    }
  };

  const handleSignOut = async () => {
    try {
      setUser(null);
      if (logout) {
        await logout();
      }
    } catch (err) {
      console.warn('Sign out completed with notice:', err);
    } finally {
      setMobileMenuOpen(false);
      navigate('/', { replace: true });
    }
  };

  const breadcrumbs = location.pathname.split('/').filter(Boolean).map((seg, i, arr) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
    path: '/' + arr.slice(0, i + 1).join('/'),
  }));

  const SidebarContent = ({ onNavigate, forceExpand = false, showAccountLinks = true }) => {
    const showText = forceExpand || sidebarOpen;
    return (
      <nav className="flex-1 py-4 space-y-1.5 px-3 overflow-y-auto">
        {navItems.map(item => {
          const hasHash = item.to.includes('#');
          const isItemActive = hasHash
            ? (location.pathname === '/patient/dashboard' && location.hash === item.to.slice(item.to.indexOf('#')))
            : (!location.hash && (
                location.pathname === item.to ||
                (item.to === '/pharmacist/dashboard' && location.pathname === '/pharmacist') ||
                (item.to === '/patient/metrics' && [
                  '/patient/metrics',
                  '/patient/glucose',
                  '/patient/checklist',
                  '/patient/care-checklist',
                  '/patient/investigations',
                  '/patient/screening'
                ].includes(location.pathname))
              ));

          const isEmergency = item.isEmergency;
          const activeClass = isEmergency
            ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400'
            : 'bg-[#046A38] text-white shadow-xs';
          const inactiveClass = isEmergency
            ? 'text-rose-700 hover:bg-rose-50 hover:text-rose-900 border border-rose-200/60 font-extrabold bg-rose-50/30'
            : 'text-slate-800 hover:bg-[#E8F5EE] hover:text-[#046A38]';

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                isItemActive ? activeClass : inactiveClass
              }`}
            >
              <item.icon size={20} className={`shrink-0 ${isEmergency && !isItemActive ? 'text-rose-600 animate-pulse' : ''}`} />
              {showText && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate text-sm font-bold">{item.label}</span>
                  {isEmergency && (
                    <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md tracking-wider ${
                      isItemActive ? 'bg-white text-rose-700' : 'bg-rose-600 text-white animate-pulse'
                    }`}>
                      24/7
                    </span>
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
        {showAccountLinks && (
          <>
            <div className="my-3 border-t border-[#E8DCC8]" />
            {[
              { to: '/profile', icon: User, label: 'Profile' },
              { to: '/settings', icon: Settings, label: 'Settings' },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  title={!showText ? item.label : undefined}
                  className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    isActive ? 'bg-[#046A38] text-white shadow-xs' : 'text-slate-800 hover:bg-[#E8F5EE] hover:text-[#046A38]'
                  }`}
                >
                  <Icon size={20} className="shrink-0" />
                  {showText && <span className="truncate text-sm font-bold">{item.label}</span>}
                </NavLink>
              );
            })}
          </>
        )}
      </nav>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF6EF] flex text-slate-900 w-full">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-white border-r-2 border-[#E8DCC8] transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} shrink-0 sticky top-0 h-screen no-print z-30 shadow-xs`}>
        <div className={`flex items-center ${sidebarOpen ? 'px-4' : 'px-2'} h-18 border-b-2 border-[#E8DCC8]`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <img
                src="/logo-emblem.png"
                alt="LATROCORE"
                className="h-10 w-10 object-contain rounded-xl border border-[#A8D7BD] bg-[#FAF6EF] p-1 shadow-xs"
              />
              <span className="font-black text-slate-950 tracking-tight text-lg leading-tight">LATROCORE</span>
            </div>
          ) : (
            <img
              src="/logo-emblem.png"
              alt="LATROCORE"
              className="h-10 w-10 object-contain rounded-xl border border-[#A8D7BD] bg-[#FAF6EF] p-1 mx-auto shadow-xs"
            />
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto p-1.5 rounded-lg hover:bg-[#FAF6EF] text-slate-700 hover:text-slate-950 transition-colors cursor-pointer"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft size={16} className={`transition-transform duration-200 ${!sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs animate-fade-in" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-80 max-w-[85vw] bg-white flex flex-col shadow-2xl animate-slide-in h-full z-10 border-r-2 border-[#E8DCC8]">
            <div className="flex items-center justify-between px-5 h-18 border-b-2 border-[#E8DCC8]">
              <div className="flex items-center gap-3">
                <img
                  src="/logo-emblem.png"
                  alt="LATROCORE"
                  className="h-10 w-10 object-contain rounded-xl border border-[#A8D7BD] bg-[#FAF6EF] p-1 shadow-xs"
                />
                <span className="font-black text-slate-950 tracking-tight text-lg leading-tight">LATROCORE</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-800 cursor-pointer"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mobile User Card */}
            <div className="p-4 border-b-2 border-[#E8DCC8] bg-[#FAF6EF] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#046A38] text-white font-bold text-sm flex items-center justify-center shrink-0">
                {getUserInitial(activeUser)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-950 text-sm truncate">{activeUser.name}</p>
                <p className="text-xs font-bold text-[#046A38]">{roleName}</p>
              </div>
            </div>

            {/* Navigation links - forceExpand={true} ensures text labels are always visible in drawer */}
            <SidebarContent onNavigate={() => setMobileMenuOpen(false)} forceExpand={true} showAccountLinks={false} />

            {/* Mobile Account Actions */}
            <div className="p-4 border-t-2 border-[#E8DCC8] bg-[#FAF6EF]/80 space-y-2">
              {switchableUsers.length > 0 && (
                <>
                  <p className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider mb-2">Switch Active Role</p>
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {switchableUsers.map(u => (
                      <button
                        key={u.id}
                        onClick={() => handleRoleSwitch(u.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg text-xs font-bold border text-left cursor-pointer transition-all ${
                          u.id === activeUser.id ? 'bg-[#046A38] text-white border-[#03542C]' : 'bg-white text-slate-900 border-[#E8DCC8] hover:bg-[#E8F5EE]'
                        }`}
                      >
                        <Avatar user={u} size="xs" />
                        <span className="truncate">{u.role.toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); navigate('/profile'); }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-[#112228] bg-white border border-[#E8DCC8] rounded-lg hover:bg-[#E8F5EE] cursor-pointer"
                >
                  <User size={14} />
                  <span>My Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); navigate('/settings'); }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-[#112228] bg-white border border-[#E8DCC8] rounded-lg hover:bg-[#E8F5EE] cursor-pointer"
                >
                  <Settings size={14} />
                  <span>Settings</span>
                </button>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 cursor-pointer"
              >
                <LogOut size={14} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* Top Header - Sticky Top */}
        <header className="bg-[#FAF6EF]/95 backdrop-blur-xs border-b-2 border-[#E8DCC8] h-18 flex items-center px-3 sm:px-6 gap-2 sm:gap-4 sticky top-0 z-30 no-print shadow-xs w-full">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#FAF6EF] hover:bg-[#F9EBD7] text-slate-950 font-bold border border-[#E8DCC8] cursor-pointer shadow-xs transition-colors shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu size={18} className="text-slate-950 shrink-0" />
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-950">Menu</span>
          </button>

          {/* Breadcrumbs */}
          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-700 font-bold overflow-x-auto min-w-0">
            <NavLink to="/" className="hover:text-[#046A38] text-slate-900 p-1 rounded hover:bg-[#FAF6EF] shrink-0"><Home size={16} /></NavLink>
            {breadcrumbs.map((bc, i) => (
              <span key={i} className="flex items-center gap-2 shrink-0">
                <ChevronRight size={14} className="text-slate-400" />
                <span className={i === breadcrumbs.length - 1 ? 'text-slate-950 font-black' : 'hover:text-[#046A38] text-slate-800'}>
                  {bc.label}
                </span>
              </span>
            ))}
          </div>

          <div className="flex-1" />

          {/* Notifications Trigger */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-xl hover:bg-[#FAF6EF] text-slate-800 border border-[#E8DCC8] transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell size={20} className="text-slate-900" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#E34222] text-white text-xs rounded-full flex items-center justify-center font-black shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border-2 border-[#E8DCC8] z-50 animate-fade-in max-h-96 overflow-y-auto">
                <div className="px-5 py-3.5 border-b border-[#E8DCC8] font-bold text-sm text-slate-950 flex items-center justify-between">
                  <span>Notifications</span>
                  <span className="text-xs font-bold text-[#046A38] bg-[#E8F5EE] px-2 py-0.5 rounded-full">{notifications.length} total</span>
                </div>
                {notifications.length === 0 ? (
                  <div className="p-6 text-sm font-semibold text-slate-700 text-center">No notifications</div>
                ) : (
                  notifications.slice(0, 8).map(n => (
                    <div
                      key={n.id}
                      className={`px-5 py-3.5 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? 'bg-[#E8F5EE]/60' : ''}`}
                      onClick={() => setNotifOpen(false)}
                    >
                      <p className="text-sm font-bold text-slate-950">{n.title}</p>
                      <p className="text-xs font-semibold text-slate-800 mt-1 leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
                <div className="p-2.5 border-t border-[#E8DCC8] bg-[#FAF6EF]/80 rounded-b-2xl">
                  <button
                    className="w-full text-sm font-bold text-[#046A38] hover:text-[#03542C] hover:underline py-1 cursor-pointer text-center"
                    onClick={() => { navigate('/notifications'); setNotifOpen(false); }}
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile Trigger & Dropdown */}
          <UserProfileDropdown
            user={activeUser}
            compactMobile={true}
            onMenuOpen={() => setNotifOpen(false)}
            onLogout={handleSignOut}
          />
        </header>

        {/* Page Content */}
        <main className={`flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0 overflow-x-hidden ${
          location.pathname.startsWith('/patient') ? 'patient-portal-content' : ''
        }`}>
          <Outlet />
        </main>
      </div>

      {activeAlarmDose && (
        <MedicationAlarmModal
          dose={activeAlarmDose}
          pendingCount={visibleAlarmDoses.length}
          isMuted={alarmMuted}
          isSubmitting={alarmSubmitting}
          onMarkTaken={handleAlarmMarkTaken}
          onSnooze={handleAlarmSnooze}
          onToggleMute={() => setAlarmMuted((prev) => !prev)}
          onDismiss={handleAlarmDismiss}
        />
      )}
    </div>
  );
}
