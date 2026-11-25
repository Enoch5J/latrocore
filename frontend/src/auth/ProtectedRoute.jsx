import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ShieldCheck, Loader2 } from 'lucide-react';

export function normalizeRole(role) {
  const clean = (role || '').toLowerCase().trim();
  return clean === 'care_team' ? 'pharmacist' : clean;
}

export function getDefaultDashboardRoute(user) {
  const email = (user?.email || '').toLowerCase().trim();
  const role = normalizeRole(user?.role);

  if (email === 'doctor@latrocore.com' || role === 'doctor') return '/doctor/dashboard';
  if (email === 'pharmacist@latrocore.com' || role === 'pharmacist') return '/pharmacist/dashboard';
  if (email === 'admin@latrocore.com' || role === 'admin') return '/admin/dashboard';
  if (email === 'patient@latrocore.com' || role === 'patient') return '/patient/dashboard';
  return '/patient/dashboard';
}

export function isRoleAllowed(userRole, allowedRoles) {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  const normalizedUserRole = normalizeRole(userRole);
  return allowedRoles.some((allowed) => normalizeRole(allowed) === normalizedUserRole);
}

export default function ProtectedRoute({ children, allowedRoles, redirectTo }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Full-screen clean loading screen during silent session restoration
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-6 text-stone-800">
        <div className="w-16 h-16 rounded-2xl bg-[#0F2D25] flex items-center justify-center text-white shadow-lg mb-6 animate-pulse">
          <ShieldCheck className="w-8 h-8 text-emerald-400" />
        </div>
        <div className="flex items-center gap-3 text-stone-700 font-medium text-sm">
          <Loader2 className="w-5 h-5 text-[#1B4D3E] animate-spin" />
          <span>Restoring secure session...</span>
        </div>
        <p className="text-xs text-stone-400 mt-2 font-mono">
          Verifying cryptographic credentials
        </p>
      </div>
    );
  }

  if (!user) {
    // Preserve attempted destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userEmail = (user?.email || '').toLowerCase().trim();
  const userRole = normalizeRole(user?.role);
  const isDemo = ['doctor@latrocore.com', 'pharmacist@latrocore.com', 'patient@latrocore.com', 'admin@latrocore.com'].includes(userEmail);

  // Only doctor and pharmacist require administrative approval
  const requiresApproval = ['doctor', 'pharmacist'].includes(userRole);
  const isPending = !isDemo && requiresApproval && (user.status === 'pending' || user.approvalStatus === 'pending');

  // If user is pending admin approval and attempting to access clinical portals
  if (isPending && location.pathname !== '/waiting-approval') {
    return <Navigate to="/waiting-approval" replace />;
  }

  // If user is already approved and visits waiting page
  if (!isPending && location.pathname === '/waiting-approval') {
    return <Navigate to={getDefaultDashboardRoute(user)} replace />;
  }

  // Enforce strict role-based route access so users never load another role's portal
  if (allowedRoles && allowedRoles.length > 0 && !isRoleAllowed(userRole, allowedRoles)) {
    return <Navigate to={redirectTo || getDefaultDashboardRoute(user)} replace />;
  }

  return children ? children : <Outlet />;
}
