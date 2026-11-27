import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export default function PublicFooter() {
  const { isAuthenticated } = useAuth();

  return (
    <footer className="relative bg-[#093322] text-[#E8F5EE] pt-12 pb-8 border-t border-[#155238] overflow-hidden">
      <div className="absolute top-0 left-1/4 w-80 h-80 bg-[#046A38]/20 rounded-full blur-3xl pointer-events-none" />

      <div data-reveal="section" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-10 border-b border-[#155238]/90">
          {/* Brand Summary */}
          <div className="md:col-span-5 space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-xl bg-white/95 border border-[#155238] shadow-xs shrink-0">
                <img
                  src="/logo-emblem.png"
                  alt="LATROCORE"
                  width={40}
                  height={40}
                  className="h-9 w-9 object-contain"
                />
              </div>
              <div>
                <span className="font-serif font-black text-white text-xl sm:text-2xl tracking-tight block leading-none">
                  LATROCORE
                </span>
                <span className="text-[10px] font-bold text-[#A8D7BD] tracking-[0.16em] uppercase mt-1 block">
                  Diabetes Care &amp; Diagnostics
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-[13px] text-[#D1E7DD]/80 leading-relaxed max-w-xs">
              Connected diabetes care for patients, doctors, and clinical pharmacists.
            </p>
          </div>

          {/* Clean Link Columns */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#A8D7BD] mb-3.5">
                Care Tools
              </p>
              <ul className="space-y-2.5 text-xs sm:text-[13px] text-[#D1E7DD]/85 font-medium">
                <li>
                  <NavLink to="/patient/metrics?tab=glucose" className="hover:text-white transition-colors">
                    Glucose Monitor
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/patient/metrics?tab=investigations" className="hover:text-white transition-colors">
                    Lab Investigations
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/patient/medications" className="hover:text-white transition-colors">
                    Medications
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/patient/lifestyle" className="hover:text-white transition-colors">
                    Diet &amp; Lifestyle
                  </NavLink>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#A8D7BD] mb-3.5">
                Portals
              </p>
              <ul className="space-y-2.5 text-xs sm:text-[13px] text-[#D1E7DD]/85 font-medium">
                <li>
                  <NavLink to="/patient/dashboard" className="hover:text-white transition-colors">
                    Patient Portal
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/doctor/dashboard" className="hover:text-white transition-colors">
                    Doctor Station
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/pharmacist/dashboard" className="hover:text-white transition-colors">
                    Pharmacist Console
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/dashboard" className="hover:text-white transition-colors">
                    Admin Console
                  </NavLink>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#A8D7BD] mb-3.5">
                Account
              </p>
              <ul className="space-y-2.5 text-xs sm:text-[13px] text-[#D1E7DD]/85 font-medium">
                <li>
                  <NavLink
                    to={isAuthenticated ? '/dashboard' : '/login'}
                    className="hover:text-white transition-colors"
                  >
                    {isAuthenticated ? 'My Dashboard' : 'Sign In'}
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to={isAuthenticated ? '/profile' : '/signup'}
                    className="hover:text-white transition-colors"
                  >
                    {isAuthenticated ? 'My Profile' : 'Create Account'}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/overview" className="hover:text-white transition-colors">
                    Platform Overview
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/contact" className="hover:text-white transition-colors">
                    Contact
                  </NavLink>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#8FBAA3] gap-3">
          <p className="font-medium text-center sm:text-left">
            &copy; 2026 LATROCORE. All rights reserved.
          </p>
          <p className="text-[11px] text-[#A8D7BD]/75 text-center sm:text-right">
            Coordinated diabetes care &amp; clinical workflow support.
          </p>
        </div>
      </div>
    </footer>
  );
}
