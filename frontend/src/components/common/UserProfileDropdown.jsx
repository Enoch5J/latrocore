import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutGrid, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { getDefaultDashboardRoute } from '../../auth/ProtectedRoute';
import { getUserInitial, getRoleDisplayLabel } from '../../utils/userProfile';

/**
 * Unified top-right profile trigger pill and dropdown menu following
 * the clean white floating popover card pattern.
 */
export default function UserProfileDropdown({
  user,
  onDashboard,
  onProfile,
  onSettings,
  onLogout,
  onMenuOpen,
  initialOpen = false,
  compactMobile = false,
  className = '',
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [openPath, setOpenPath] = useState(() => (initialOpen ? location.pathname : null));
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  const open = openPath === location.pathname;

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpenPath(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpenPath(null);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const displayName = user.name || user.email || 'User';
  const displayEmail = user.email || '';
  const initial = getUserInitial(user);
  const roleLabel = getRoleDisplayLabel(user.role);
  const roleBadge = roleLabel.toUpperCase();

  const toggleMenu = () => {
    const nextOpen = !open;
    setOpenPath(nextOpen ? location.pathname : null);
    if (nextOpen && onMenuOpen) {
      onMenuOpen();
    }
  };

  const handleAction = (callback, fallbackPath) => {
    setOpenPath(null);
    if (callback) {
      callback();
    } else if (fallbackPath) {
      navigate(fallbackPath);
    }
  };

  const dashboardPath = getDefaultDashboardRoute(user);

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutGrid,
      onClick: () => handleAction(onDashboard, dashboardPath),
    },
    {
      id: 'profile',
      label: 'My Profile',
      icon: User,
      onClick: () => handleAction(onProfile, '/profile'),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      onClick: () => handleAction(onSettings, '/settings'),
    },
  ];

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        id="header-user-profile-trigger"
        onClick={toggleMenu}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${displayName} account menu`}
        className={`group inline-flex items-center gap-2.5 rounded-2xl bg-white border transition-all duration-150 cursor-pointer select-none ${
          compactMobile ? 'p-1.5 sm:pl-2 sm:pr-3.5 sm:py-1.5' : 'pl-2 pr-3.5 py-1.5'
        } ${
          open
            ? 'border-[#A8D7BD] shadow-[0_6px_20px_-4px_rgba(4,106,56,0.16)] ring-2 ring-[#046A38]/10'
            : 'border-[#E8DCC8] shadow-[0_2px_8px_rgba(17,34,40,0.05)] hover:border-[#A8D7BD] hover:shadow-[0_4px_14px_rgba(17,34,40,0.08)]'
        }`}
      >
        <span className="w-9 h-9 rounded-xl bg-[#046A38] text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
          {initial}
        </span>

        <span className={`${compactMobile ? 'hidden sm:flex' : 'flex'} flex-col text-left leading-tight min-w-0 pr-0.5`}>
          <span className="text-[13.5px] font-bold text-[#112228] truncate max-w-[145px] sm:max-w-[175px]">
            {displayName}
          </span>
          <span className="text-[11.5px] font-medium text-slate-600 mt-0.5 truncate">
            {roleLabel}
          </span>
        </span>

        <ChevronDown
          size={15}
          strokeWidth={2.1}
          className={`${compactMobile ? 'hidden sm:block' : 'block'} text-slate-500 shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180 text-[#046A38]' : 'group-hover:text-[#112228]'
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account navigation"
          className="absolute right-0 top-full mt-2.5 w-[276px] sm:w-[292px] bg-white rounded-[22px] border border-[#E8DCC8] shadow-[0_18px_42px_-10px_rgba(17,34,40,0.18)] p-2.5 z-50 animate-fade-in origin-top-right"
        >
          {/* Inner Profile Summary Card */}
          <div className="rounded-2xl bg-[#E8F5EE]/75 border border-[#D1EBDD] p-3.5">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#046A38] text-white font-bold text-base flex items-center justify-center shrink-0 shadow-2xs select-none">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-[#112228] leading-snug truncate">
                  {displayName}
                </p>
                {displayEmail && (
                  <p className="text-xs font-medium text-slate-600 truncate mt-0.5">
                    {displayEmail}
                  </p>
                )}
                <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full bg-white border border-[#A8D7BD] text-[10px] font-extrabold uppercase tracking-wider text-[#046A38] shadow-2xs">
                  {roleBadge}
                </span>
              </div>
            </div>
          </div>

          {/* Primary Menu Links */}
          <div className="mt-2 space-y-0.5 px-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  onClick={item.onClick}
                  className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-semibold text-[#112228] hover:bg-[#FAF6EF] hover:text-[#046A38] transition-colors cursor-pointer text-left"
                >
                  <Icon
                    size={17}
                    strokeWidth={1.85}
                    className="text-slate-700 group-hover:text-[#046A38] transition-colors shrink-0"
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="my-1.5 mx-1 border-t border-[#E8DCC8]/75" />

          {/* Destructive Log Out Action */}
          <div className="px-0.5">
            <button
              type="button"
              role="menuitem"
              id="header-dropdown-logout-btn"
              onClick={() => handleAction(onLogout)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer text-left"
            >
              <LogOut size={17} strokeWidth={1.9} className="shrink-0" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
