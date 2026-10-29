import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ShieldCheck, Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }) {
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

  const isPending = user.role !== 'admin' && (user.status === 'pending' || user.approvalStatus === 'pending');

  // If user is pending admin approval and attempting to access clinical portals
  if (isPending && location.pathname !== '/waiting-approval') {
    return <Navigate to="/waiting-approval" replace />;
  }

  // If user is already approved and visits waiting page
  if (!isPending && location.pathname === '/waiting-approval') {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? children : <Outlet />;
}
