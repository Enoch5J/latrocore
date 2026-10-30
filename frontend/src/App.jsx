import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import WaitingApproval from './pages/WaitingApproval';
import ProjectOverview from './pages/ProjectOverview';
import NotFound from './pages/NotFound';
import { AppProvider, useApp } from './context/AppContext';
import AppLayout from './layouts/AppLayout';
import { ToastContainer } from './components/ui';
import FloatingAIAssistant from './components/FloatingAIAssistant';

// Patient Pages
import PatientDashboard from './pages/patient/Dashboard';
import GlucoseMonitor from './pages/patient/GlucoseMonitor';
import PatientMedications from './pages/patient/Medications';
import PatientInvestigations from './pages/patient/Investigations';
import PatientLifestyle from './pages/patient/Lifestyle';
import PatientScreening from './pages/patient/Screening';
import SafetyAlerts from './pages/patient/SafetyAlerts';
import PatientAssistant from './pages/patient/Assistant';
import CareChecklist from './pages/patient/CareChecklist';
import TestReminders from './pages/patient/TestReminders';

// Doctor Pages
import DoctorDashboard from './pages/doctor/Dashboard';
import PatientOverview from './pages/doctor/PatientOverview';

// Pharmacist Pages
import PharmacistDashboard from './pages/pharmacist/Dashboard';
import StockVerification from './pages/pharmacist/StockVerification';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';

// Shared Pages
import Appointments from './pages/shared/Appointments';
import Messages from './pages/shared/Messages';
import Notifications from './pages/shared/Notifications';
import CareSummary from './pages/shared/CareSummary';

function RoleDashboardRedirect() {
  const { user, loading } = useAuth();
  const { currentUser, data, setUser } = useApp();

  useEffect(() => {
    if (user && !currentUser && data?.users) {
      const matched = Object.values(data.users).find(
        (u) => u.email?.toLowerCase() === user.email?.toLowerCase() || u.role === user.role
      );
      if (matched) {
        setUser(matched);
      }
    }
  }, [user, currentUser, data, setUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF6EF] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#046A38] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const role = (user?.role || '').toLowerCase().trim();
  const userEmail = (user?.email || '').toLowerCase().trim();
  const isDemo = ['doctor@latrocore.com', 'pharmacist@latrocore.com', 'patient@latrocore.com', 'admin@latrocore.com'].includes(userEmail);

  if (userEmail === 'doctor@latrocore.com' || role === 'doctor') return <Navigate to="/doctor/dashboard" replace />;
  if (userEmail === 'pharmacist@latrocore.com' || role === 'pharmacist' || role === 'care_team') return <Navigate to="/pharmacist/dashboard" replace />;
  if (userEmail === 'admin@latrocore.com' || role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (userEmail === 'patient@latrocore.com' || role === 'patient') return <Navigate to="/patient/dashboard" replace />;

  const isPending = !isDemo && role !== 'admin' && (user?.status === 'pending' || user?.approvalStatus === 'pending');
  if (isPending) return <Navigate to="/waiting-approval" replace />;

  return <Navigate to="/" replace />;
}

function AppRoutes() {
  const { toasts, removeToast } = useApp();
  const location = useLocation();
  const isAuthPage = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify', '/waiting-approval'].some(
    (path) => location.pathname.toLowerCase().startsWith(path)
  );

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {!isAuthPage && <FloatingAIAssistant />}

      <Routes>
        {/* Public Landing Route (Default Home) */}
        <Route path="/" element={<Welcome />} />
        <Route path="/welcome" element={<Navigate to="/" replace />} />

        {/* Public Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Dedicated Admin Approval Waiting Route */}
        <Route
          path="/waiting-approval"
          element={
            <ProtectedRoute>
              <WaitingApproval />
            </ProtectedRoute>
          }
        />

        {/* Automatic Role-Based Dashboard Redirection */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RoleDashboardRedirect />
            </ProtectedRoute>
          }
        />

        {/* Protected Clinical Suite */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/overview" element={<ProjectOverview />} />
          {/* Patient Routes */}
          <Route path="/patient/dashboard" element={<PatientDashboard />} />
          <Route path="/patient/glucose" element={<GlucoseMonitor />} />
          <Route path="/patient/medications" element={<PatientMedications />} />
          <Route path="/patient/investigations" element={<PatientInvestigations />} />
          <Route path="/patient/lifestyle" element={<PatientLifestyle />} />
          <Route path="/patient/screening" element={<PatientScreening />} />
          <Route path="/patient/safety" element={<SafetyAlerts />} />
          <Route path="/patient/assistant" element={<PatientAssistant />} />
          <Route path="/patient/checklist" element={<CareChecklist />} />
          <Route path="/patient/care-checklist" element={<CareChecklist />} />
          <Route path="/patient/test-reminders" element={<TestReminders />} />
          <Route path="/patient/reminders" element={<TestReminders />} />

          {/* Doctor Routes */}
          <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
          <Route path="/doctor/patients" element={<DoctorDashboard />} />
          <Route path="/doctor/patient/:id" element={<PatientOverview />} />
          <Route path="/doctor/prescriptions" element={<PatientOverview initialTab="prescriptions" />} />
          <Route path="/doctor/escalations" element={<DoctorDashboard />} />
          <Route path="/doctor/referrals" element={<PatientOverview initialTab="overview" />} />

          {/* Pharmacist Routes */}
          <Route path="/pharmacist/dashboard" element={<PharmacistDashboard />} />
          <Route path="/pharmacist/stock-verification" element={<StockVerification />} />
          <Route path="/pharmacist/dispensing" element={<StockVerification />} />
          <Route path="/pharmacist/reviews" element={<PharmacistDashboard initialTab="reviews" />} />
          <Route path="/pharmacist/counselling" element={<PharmacistDashboard initialTab="counselling" />} />
          <Route path="/pharmacist/refills" element={<PharmacistDashboard initialTab="refills" />} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminDashboard initialTab="users" />} />
          <Route path="/admin/audit" element={<AdminDashboard initialTab="audit" />} />
          <Route path="/admin/config" element={<AdminDashboard initialTab="config" />} />

          {/* Shared Routes */}
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/care-summary" element={<CareSummary />} />
          <Route path="/care-summary/:patientId" element={<CareSummary />} />

          {/* Fallback 404 */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
