import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import AppLayout from './layouts/AppLayout';
import { ToastContainer } from './components/ui';
import GuidedDemo from './components/GuidedDemo';

// Pages
import Welcome from './pages/Welcome';
import ProjectOverview from './pages/ProjectOverview';
import NotFound from './pages/NotFound';

// Patient Pages
import PatientDashboard from './pages/patient/Dashboard';
import GlucoseMonitor from './pages/patient/GlucoseMonitor';
import PatientMedications from './pages/patient/Medications';
import PatientInvestigations from './pages/patient/Investigations';
import PatientLifestyle from './pages/patient/Lifestyle';
import PatientScreening from './pages/patient/Screening';
import SafetyAlerts from './pages/patient/SafetyAlerts';
import PatientAssistant from './pages/patient/Assistant';

// Doctor Pages
import DoctorDashboard from './pages/doctor/Dashboard';
import PatientOverview from './pages/doctor/PatientOverview';

// Pharmacist Pages
import PharmacistDashboard from './pages/pharmacist/Dashboard';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';

// Shared Pages
import Appointments from './pages/shared/Appointments';
import Messages from './pages/shared/Messages';
import Notifications from './pages/shared/Notifications';
import CareSummary from './pages/shared/CareSummary';

function AppRoutes() {
  const { toasts, removeToast } = useApp();

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <GuidedDemo />

      <Routes>
        {/* Welcome / Role Login */}
        <Route path="/" element={<Welcome />} />

        {/* Authenticated Layout Routes */}
        <Route element={<AppLayout />}>
          {/* Informational Project Presentation / Clinical Guidelines */}
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

          {/* Doctor Routes */}
          <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
          <Route path="/doctor/patients" element={<DoctorDashboard />} />
          <Route path="/doctor/patient/:id" element={<PatientOverview />} />
          <Route path="/doctor/prescriptions" element={<PatientOverview initialTab="prescriptions" />} />
          <Route path="/doctor/escalations" element={<DoctorDashboard />} />
          <Route path="/doctor/referrals" element={<PatientOverview initialTab="overview" />} />

          {/* Pharmacist Routes */}
          <Route path="/pharmacist/dashboard" element={<PharmacistDashboard />} />
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

          {/* Fallback 404 within Layout */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
