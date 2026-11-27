import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Compass,
  LayoutGrid,
  Lock,
  LogOut,
  Mail,
  Menu,
  Settings,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../auth/AuthContext';
import { usePrefersReducedMotion } from '../../hooks/useScrollMotion';
import { getDefaultDashboardRoute } from '../../auth/ProtectedRoute';
import { getRoleDisplayLabel, getUserInitial } from '../../utils/userProfile';
import UserProfileDropdown from '../common/UserProfileDropdown';
import latrocoreLogo from '../../assets/Latrocore Medical Monogram Logo.png';

const SECTION_NAV_ITEMS = [
  { label: 'Latro AI', targetId: 'ai-companion-explore', icon: Sparkles },
  { label: 'Our Solutions', targetId: 'care-continuum', icon: Compass },
];

export default function PublicHeader({
  isHome = false,
  onAnchorClick,
}) {
  const { data, setUser, addToast } = useApp();
  const { isAuthenticated, user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const prefersReducedMotion = usePrefersReducedMotion();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const syncAppUserFromAuth = () => {
    if (!authUser || !data?.users) return;
    const matched = Object.values(data.users).find(
      (u) => u.id === authUser.id || (authUser.email && u.email?.toLowerCase() === authUser.email?.toLowerCase())
    );
    if (matched) {
      setUser(matched);
    } else {
      setUser({
        id: authUser.id,
        name: authUser.name || authUser.email,
        email: authUser.email,
        role: authUser.role,
      });
    }
  };

  const handleDashboardClick = () => {
    if (!authUser) {
      navigate('/login');
      return;
    }
    syncAppUserFromAuth();
    navigate(getDefaultDashboardRoute(authUser));
  };

  const handleHeaderLogout = async () => {
    setUser(null);
    if (logout) await logout();
    addToast?.({ type: 'info', message: 'Signed out successfully' });
  };

  const handleSectionAnchor = (event, targetId) => {
    setMobileMenuOpen(false);
    if (typeof onAnchorClick === 'function') {
      onAnchorClick(event, targetId);
      return;
    }
    const target = document.getElementById(targetId);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
    if (window.location.hash !== `#${targetId}`) {
      window.history.replaceState(null, '', `#${targetId}`);
    }
  };

  const brandContent = (
    <>
      <img
        src={latrocoreLogo}
        alt="LATROCORE Emblem"
        width={104}
        height={104}
        className="h-12 w-12 min-[400px]:h-18 min-[400px]:w-18 sm:h-22 sm:w-22 lg:h-26 lg:w-26 -translate-y-0.5 sm:-translate-y-1 object-contain mix-blend-multiply drop-shadow-xs group-hover:scale-105 transition-transform shrink-0"
      />
      <div className="flex flex-col justify-center">
        <span className="font-serif font-black text-[#046A38] tracking-tight text-[17px] min-[400px]:text-[22px] sm:text-[26px] lg:text-[34px] leading-none">
          LATROCORE
        </span>
        <span className="hidden sm:block text-[9.5px] lg:text-[11px] font-black uppercase tracking-[0.17em] lg:tracking-[0.19em] text-[#093322]/75 mt-1.5">
          Precision Diabetes &amp; Diagnostics
        </span>
      </div>
    </>
  );

  const desktopLinkClass =
    'text-base font-semibold text-[#093322] no-underline transition-colors hover:text-[#046A38] whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#046A38]';

  const mobileLinkClass =
    'flex items-center gap-2.5 px-3 py-3 rounded-xl text-base font-semibold text-[#112228] hover:bg-[#FAF6EF] no-underline';

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FAF6EF]/95 backdrop-blur-md border-b border-[#E8DCC8] shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-24 sm:h-28 lg:h-32 flex items-center justify-between gap-1.5 sm:gap-4 lg:gap-6">
        {/* Brand Logo & Name */}
        {isHome ? (
          <a
            href="#top"
            className="flex items-center gap-1.5 sm:gap-3 lg:gap-4 cursor-pointer group shrink-0 no-underline"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
            }}
            aria-label="LATROCORE Home — scroll to top"
          >
            {brandContent}
          </a>
        ) : (
          <NavLink
            to="/"
            className="flex items-center gap-1.5 sm:gap-3 lg:gap-4 cursor-pointer group shrink-0 no-underline"
            aria-label="LATROCORE Home"
          >
            {brandContent}
          </NavLink>
        )}

        <nav aria-label="Main navigation" className="hidden lg:flex items-center justify-end gap-7 shrink-0">
          {SECTION_NAV_ITEMS.map((item) =>
            isHome ? (
              <a
                key={item.targetId}
                href={`#${item.targetId}`}
                onClick={(e) => handleSectionAnchor(e, item.targetId)}
                className={desktopLinkClass}
              >
                {item.label}
              </a>
            ) : (
              <NavLink
                key={item.targetId}
                to={`/#${item.targetId}`}
                className={desktopLinkClass}
              >
                {item.label}
              </NavLink>
            )
          )}
          <NavLink to="/contact" className={desktopLinkClass}>
            Contact
          </NavLink>
          {isAuthenticated && authUser ? (
            <UserProfileDropdown
              user={authUser}
              onDashboard={handleDashboardClick}
              onProfile={() => {
                syncAppUserFromAuth();
                navigate('/profile');
              }}
              onSettings={() => {
                syncAppUserFromAuth();
                navigate('/settings');
              }}
              onLogout={handleHeaderLogout}
            />
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login')}
              id="header-login-btn"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black text-white bg-[#046A38] hover:bg-[#03542C] shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Lock size={15} className="text-[#F9EBD7]" />
              <span>Log In</span>
              <ArrowRight size={14} />
            </button>
          )}
        </nav>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden flex items-center justify-center p-3 rounded-xl bg-[#FAF6EF] text-slate-800 border border-[#E8DCC8] cursor-pointer"
          aria-label="Toggle navigation"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

      </div>

      {/* ── MOBILE MENU SLIDE-DOWN ──────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-[#E8DCC8] px-4 py-4 space-y-3 animate-fade-in shadow-xl">
          <div>
            {isAuthenticated && authUser ? (
              <div className="rounded-2xl border border-[#E8DCC8] bg-white p-2.5 space-y-1.5 shadow-xs">
                <div className="rounded-xl bg-[#E8F5EE]/75 border border-[#D1EBDD] p-3 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#046A38] text-white font-bold text-sm flex items-center justify-center shrink-0">
                    {getUserInitial(authUser)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#112228] truncate">
                      {authUser.name || authUser.email}
                    </p>
                    {authUser.email && (
                      <p className="text-xs font-medium text-slate-600 truncate">
                        {authUser.email}
                      </p>
                    )}
                    <span className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full bg-white border border-[#A8D7BD] text-[10px] font-extrabold uppercase tracking-wider text-[#046A38]">
                      {getRoleDisplayLabel(authUser.role).toUpperCase()}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); handleDashboardClick(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#112228] hover:bg-[#FAF6EF] cursor-pointer text-left"
                >
                  <LayoutGrid size={15} className="text-slate-700" />
                  <span>Dashboard</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); syncAppUserFromAuth(); navigate('/profile'); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#112228] hover:bg-[#FAF6EF] cursor-pointer text-left"
                >
                  <User size={15} className="text-slate-700" />
                  <span>My Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); syncAppUserFromAuth(); navigate('/settings'); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#112228] hover:bg-[#FAF6EF] cursor-pointer text-left"
                >
                  <Settings size={15} className="text-slate-700" />
                  <span>Settings</span>
                </button>
                <div className="border-t border-[#E8DCC8]/75 pt-1">
                  <button
                    type="button"
                    onClick={async () => { setMobileMenuOpen(false); await handleHeaderLogout(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer text-left"
                  >
                    <LogOut size={15} />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            ) : null}
            <div className={`flex ${isAuthenticated && authUser ? 'flex-col border-t border-[#E8DCC8] pt-2' : 'flex-col gap-1'}`}>
              {SECTION_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return isHome ? (
                  <a
                    key={item.targetId}
                    href={`#${item.targetId}`}
                    onClick={(e) => handleSectionAnchor(e, item.targetId)}
                    className={mobileLinkClass}
                  >
                    <Icon size={16} className="text-[#046A38]" aria-hidden="true" />
                    <span>{item.label}</span>
                  </a>
                ) : (
                  <NavLink
                    key={item.targetId}
                    to={`/#${item.targetId}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={mobileLinkClass}
                  >
                    <Icon size={16} className="text-[#046A38]" aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
              <NavLink
                to="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileLinkClass}
              >
                <Mail size={16} className="text-[#046A38]" aria-hidden="true" />
                <span>Contact</span>
              </NavLink>
              {!isAuthenticated || !authUser ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/login');
                  }}
                  className="mt-1 w-full py-3 rounded-xl text-sm font-black text-white bg-[#046A38] flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <Lock size={15} className="text-[#F9EBD7]" />
                  <span>Log In</span>
                  <ArrowRight size={15} />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
