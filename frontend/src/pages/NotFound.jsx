import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../auth/AuthContext';
import { getDefaultDashboardRoute } from '../auth/ProtectedRoute';
import { Stethoscope, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const { user: authUser } = useAuth();
  const activeUser = authUser || currentUser;

  const handleHome = () => {
    if (!activeUser) {
      navigate('/');
      return;
    }
    navigate(getDefaultDashboardRoute(activeUser));
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 animate-fade-in">
      <div className="w-16 h-16 bg-teal-50 text-primary rounded-2xl flex items-center justify-center mb-4 shadow-sm">
        <Stethoscope size={32} />
      </div>
      <h1 className="text-4xl font-extrabold text-text-primary tracking-tight">404</h1>
      <p className="text-lg font-semibold text-text-primary mt-2">Clinical Record or Page Not Found</p>
      <p className="text-sm text-text-secondary mt-1 max-w-md">
        The requested screen, patient document, or endpoint does not exist or has been relocated within the demo environment.
      </p>

      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={() => navigate(-1)}
          className="btn-outline flex items-center gap-2 cursor-pointer text-sm"
        >
          <ArrowLeft size={16} />
          <span>Go Back</span>
        </button>
        <button
          onClick={handleHome}
          className="btn-primary flex items-center gap-2 cursor-pointer text-sm"
        >
          <Home size={16} />
          <span>Return to Dashboard</span>
        </button>
      </div>
    </div>
  );
}
