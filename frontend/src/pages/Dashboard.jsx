import { useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useApp } from '../context/AppContext';

/**
 * Universal Dashboard Dispatcher
 * Automatically routes users directly to their designated clinical workstation:
 * - Doctor -> /doctor/dashboard
 * - Pharmacist / Care Team -> /pharmacist/dashboard
 * - Admin -> /admin/dashboard
 * - Patient -> /patient/dashboard
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { currentUser, data, setUser } = useApp();

  useEffect(() => {
    if (!loading && user) {
      if (!currentUser && data?.users) {
        const matched = Object.values(data.users).find(
          (u) => u.email?.toLowerCase() === user.email?.toLowerCase() || u.role === user.role
        );
        if (matched) {
          setUser(matched);
        }
      }

      const role = user.role;
      if (role === 'doctor') {
        navigate('/doctor/dashboard', { replace: true });
      } else if (role === 'pharmacist' || role === 'care_team') {
        navigate('/pharmacist/dashboard', { replace: true });
      } else if (role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/patient/dashboard', { replace: true });
      }
    } else if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, currentUser, data, setUser, navigate]);

  return (
    <div className="min-h-screen bg-[#FAF6EF] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 border-3 border-[#046A38] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-stone-600">Loading your workstation...</span>
      </div>
    </div>
  );
}
