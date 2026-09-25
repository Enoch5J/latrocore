import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Avatar } from '../components/ui';
import {
  LayoutDashboard, Activity, Pill, FileText, Salad, CalendarDays, MessageSquare,
  Bell, ChevronLeft, Menu, X, User, LogOut, Shield, Stethoscope, ClipboardList,
  Bot, Heart, Users, Settings, AlertTriangle, BookOpen, ChevronDown, ChevronRight,
  Home, BarChart3, BellRing, Utensils, Video, ClipboardCheck
} from 'lucide-react';

const ROLE_NAV = {
  patient: [
    { to: '/patient/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/patient/medications', icon: Pill, label: 'Medications' },
    { to: '/patient/lifestyle', icon: Salad, label: 'Lifestyle' },
    { to: '/patient/glucose', icon: Activity, label: 'Glucose Monitor' },
    { to: '/patient/dashboard#scheduler', icon: BellRing, label: 'Tablet Scheduler' },
    { to: '/patient/test-reminders', icon: ClipboardList, label: 'Patient Test Reminder' },
    { to: '/patient/checklist', icon: ClipboardCheck, label: 'Care Checklist' },
    { to: '/patient/dashboard#diet-plan', icon: Utensils, label: 'Diabetic Diet Plan' },
    { to: '/patient/dashboard#consulting', icon: Video, label: 'Doctor Consulting' },
    { to: '/patient/investigations', icon: FileText, label: 'Investigations' },
    { to: '/patient/screening', icon: ClipboardList, label: 'Screening' },
    { to: '/patient/safety', icon: AlertTriangle, label: 'Safety Alerts' },
    { to: '/patient/assistant', icon: Bot, label: 'AI Assistant' },
    { to: '/appointments', icon: CalendarDays, label: 'Appointments' },
    { to: '/messages', icon: MessageSquare, label: 'Messages' },
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
  ],
  admin: [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/users', icon: Users, label: 'User Management' },
    { to: '/admin/audit', icon: Shield, label: 'Audit Log' },
    { to: '/admin/config', icon: Settings, label: 'Configuration' },
  ],
};

export default function AppLayout() {
  const { currentUser, data, setUser, addToast, guidedDemo } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
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

  const activeUser = currentUser || data?.users?.['doc-001'] || (data?.users ? Object.values(data.users)[0] : null);

  useEffect(() => {
    if (!currentUser && activeUser) {
      setUser(activeUser);
    }
  }, [currentUser, activeUser, setUser]);

  if (!activeUser) {
    return <Navigate to="/" replace />;
  }

  const navItems = ROLE_NAV[activeUser.role] || [];
  const notifications = data?.notifications?.filter(n => n.userId === activeUser.id) || [];
  const unreadCount = notifications.filter(n => !n.read).length;
  const roleName = activeUser.role === 'pharmacist' ? 'Pharmacist / Pharm D' : activeUser.role.charAt(0).toUpperCase() + activeUser.role.slice(1);

  const handleRoleSwitch = (userId) => {
    const user = data?.users?.[userId];
    if (user) {
      setUser(user);
      const defaultRoutes = { patient: '/patient/dashboard', doctor: '/doctor/dashboard', pharmacist: '/pharmacist/dashboard', admin: '/admin/dashboard' };
      navigate(defaultRoutes[user.role] || '/');
      setProfileMenuOpen(false);
      setMobileMenuOpen(false);
      addToast({ type: 'info', message: `Switched to ${user.name} (${user.role})` });
    }
  };

  const breadcrumbs = location.pathname.split('/').filter(Boolean).map((seg, i, arr) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
    path: '/' + arr.slice(0, i + 1).join('/'),
  }));

  const SidebarContent = ({ onNavigate, forceExpand = false }) => {
    const showText = forceExpand || sidebarOpen;
    return (
      <nav className="flex-1 py-4 space-y-1.5 px-3 overflow-y-auto">
        {navItems.map(item => {
          const hasHash = item.to.includes('#');
          const isItemActive = hasHash
            ? (location.pathname === '/patient/dashboard' && location.hash === item.to.slice(item.to.indexOf('#')))
            : (!location.hash && location.pathname === item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={
                `flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  isItemActive
                    ? 'bg-[#367588] text-white shadow-xs'
                    : 'text-slate-800 hover:bg-[#F3F8F9] hover:text-[#367588]'
                }`
              }
            >
              <item.icon size={20} className="shrink-0" />
              {showText && <span className="truncate text-sm font-bold">{item.label}</span>}
            </NavLink>
          );
        })}
        {!['patient', 'pharmacist'].includes(activeUser?.role) && (
          <div className="pt-4 mt-4 border-t-2 border-slate-200 space-y-1.5">
            <NavLink
              to="/overview"
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#367588] text-white shadow-xs'
                    : 'text-slate-800 hover:bg-[#F3F8F9] hover:text-[#367588]'
                }`
              }
            >
              <BookOpen size={20} className="shrink-0" />
              {showText && <span className="truncate text-sm font-bold">Project Overview</span>}
            </NavLink>
            <NavLink
              to="/care-summary"
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#367588] text-white shadow-xs'
                    : 'text-slate-800 hover:bg-[#F3F8F9] hover:text-[#367588]'
                }`
              }
            >
              <BarChart3 size={20} className="shrink-0" />
              {showText && <span className="truncate text-sm font-bold">Care Summary</span>}
            </NavLink>
          </div>
        )}
      </nav>
    );
  };

  return (
    <div className="min-h-screen bg-white flex text-slate-900 w-full">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-white border-r-2 border-[#D2E2E6] transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} shrink-0 sticky top-0 h-screen no-print z-30 shadow-xs`}>
        <div className={`flex items-center ${sidebarOpen ? 'px-5' : 'px-3'} h-16 border-b-2 border-[#D2E2E6]`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-[#367588] rounded-xl flex items-center justify-center shadow-xs">
                <Stethoscope size={20} className="text-white" />
              </div>
              <div>
                <span className="font-extrabold text-slate-950 tracking-tight text-base block leading-tight">LATROCORE</span>
                <span className="text-[10px] font-bold text-[#367588] tracking-wider uppercase block">Clinical System</span>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 bg-[#367588] rounded-xl flex items-center justify-center mx-auto shadow-xs">
              <Stethoscope size={20} className="text-white" />
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-slate-950 transition-colors cursor-pointer"
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
          <div className="relative w-80 max-w-[85vw] bg-white flex flex-col shadow-2xl animate-slide-in h-full z-10 border-r-2 border-slate-300">
            <div className="flex items-center justify-between px-5 h-16 border-b-2 border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-[#367588] rounded-xl flex items-center justify-center shadow-xs">
                  <Stethoscope size={20} className="text-white" />
                </div>
                <div>
                  <span className="font-extrabold text-slate-950 tracking-tight text-base block leading-tight">LATROCORE</span>
                  <span className="text-[10px] font-bold text-[#367588] uppercase tracking-wider block">Clinical System</span>
                </div>
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
            <div className="p-4 border-b-2 border-slate-200 bg-slate-50 flex items-center gap-3">
              <Avatar user={activeUser} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-950 text-sm truncate">{activeUser.name}</p>
                <p className="text-xs font-bold text-[#254F5D]">{roleName}</p>
              </div>
            </div>

            {/* Navigation links - forceExpand={true} ensures text labels are always visible in drawer */}
            <SidebarContent onNavigate={() => setMobileMenuOpen(false)} forceExpand={true} />

            {/* Mobile Role Switcher */}
            <div className="p-4 border-t-2 border-slate-200 bg-slate-50/80">
              <p className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider mb-2">Switch Active Role</p>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {Object.values(data?.users || {}).filter(u => ['pat-001', 'doc-001', 'pharm-001', 'admin-001'].includes(u.id)).map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleRoleSwitch(u.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs font-bold border text-left cursor-pointer transition-all ${
                      u.id === activeUser.id ? 'bg-[#367588] text-white border-[#254F5D]' : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Avatar user={u} size="xs" />
                    <span className="truncate">{u.role.toUpperCase()}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setUser(null); navigate('/'); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* Top Header - Sticky Top */}
        <header className="bg-white border-b-2 border-slate-200 h-16 flex items-center px-3 sm:px-6 gap-2 sm:gap-4 sticky top-0 z-30 no-print shadow-xs w-full">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-950 font-bold border border-slate-300 cursor-pointer shadow-xs transition-colors shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu size={18} className="text-slate-950 shrink-0" />
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-950">Menu</span>
          </button>

          {/* Breadcrumbs */}
          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-700 font-bold overflow-x-auto min-w-0">
            <NavLink to="/" className="hover:text-[#367588] text-slate-900 p-1 rounded hover:bg-slate-100 shrink-0"><Home size={16} /></NavLink>
            {breadcrumbs.map((bc, i) => (
              <span key={i} className="flex items-center gap-2 shrink-0">
                <ChevronRight size={14} className="text-slate-400" />
                <span className={i === breadcrumbs.length - 1 ? 'text-slate-950 font-black' : 'hover:text-[#367588] text-slate-800'}>
                  {bc.label}
                </span>
              </span>
            ))}
          </div>

          <div className="flex-1" />

          {/* Notifications Trigger */}
          <div className="relative">
            <button
              onClick={() => { setNotifOpen(!notifOpen); setProfileMenuOpen(false); }}
              className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-800 border border-slate-200 transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell size={20} className="text-slate-900" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-xs rounded-full flex items-center justify-center font-black shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border-2 border-slate-200 z-50 animate-fade-in max-h-96 overflow-y-auto">
                <div className="px-5 py-3.5 border-b border-slate-200 font-bold text-sm text-slate-950 flex items-center justify-between">
                  <span>Notifications</span>
                  <span className="text-xs font-bold text-[#367588] bg-[#E3EFF2] px-2 py-0.5 rounded-full">{notifications.length} total</span>
                </div>
                {notifications.length === 0 ? (
                  <div className="p-6 text-sm font-semibold text-slate-700 text-center">No notifications</div>
                ) : (
                  notifications.slice(0, 8).map(n => (
                    <div
                      key={n.id}
                      className={`px-5 py-3.5 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? 'bg-blue-50/70' : ''}`}
                      onClick={() => setNotifOpen(false)}
                    >
                      <p className="text-sm font-bold text-slate-950">{n.title}</p>
                      <p className="text-xs font-semibold text-slate-800 mt-1 leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
                <div className="p-2.5 border-t border-slate-200 bg-slate-50/80 rounded-b-2xl">
                  <button
                    className="w-full text-sm font-bold text-[#367588] hover:text-[#1D3F4A] hover:underline py-1 cursor-pointer text-center"
                    onClick={() => { navigate('/notifications'); setNotifOpen(false); }}
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile Trigger */}
          <div className="relative">
            <button
              onClick={() => { setProfileMenuOpen(!profileMenuOpen); setNotifOpen(false); }}
              className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              <Avatar user={activeUser} size="sm" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-bold text-slate-950 leading-tight truncate max-w-[130px]">{activeUser.name}</p>
                <p className="text-[11px] font-bold text-[#367588] uppercase tracking-wide">{roleName}</p>
              </div>
              <ChevronDown size={14} className="text-slate-700 hidden sm:block" />
            </button>
            {profileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border-2 border-slate-200 z-50 animate-fade-in">
                <div className="p-4 border-b border-slate-200 bg-slate-50/70 rounded-t-2xl">
                  <div className="flex items-center gap-3">
                    <Avatar user={activeUser} size="md" />
                    <div className="min-w-0">
                      <p className="font-extrabold text-sm text-slate-950 truncate">{activeUser.name}</p>
                      <p className="text-xs font-semibold text-slate-700 truncate">{activeUser.email}</p>
                      <span className="badge-primary mt-1.5">{roleName}</span>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <p className="px-3 py-1.5 text-[11px] font-black text-slate-800 uppercase tracking-wider">Switch Active Role</p>
                  {Object.values(data?.users || {}).filter(u => ['pat-001', 'doc-001', 'pharm-001', 'admin-001'].includes(u.id) && u.id !== activeUser.id).map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleRoleSwitch(u.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                    >
                      <Avatar user={u} size="xs" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-950 text-xs truncate">{u.name}</p>
                        <p className="text-[10px] font-semibold text-slate-700 capitalize">{u.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="p-2 border-t border-slate-200">
                  <button
                    onClick={() => { setUser(null); navigate('/'); setProfileMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors"
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Guided Demo Banner */}
        {guidedDemo.active && (
          <div className="bg-teal-900 text-white px-4 lg:px-6 py-2.5 text-sm font-bold flex items-center gap-2 no-print border-b border-teal-950 shadow-xs">
            <BookOpen size={18} className="text-teal-300" />
            <span className="text-white font-extrabold">Guided Demo Mode</span>
            <span className="text-teal-200 font-semibold">— Step {guidedDemo.step + 1} of 12</span>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* Demo Banner */}
      <div className="demo-banner no-print">
        DEMO ENVIRONMENT • FICTIONAL PATIENT DATA
      </div>
    </div>
  );
}
