import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../auth/AuthContext';
import ScrollHero3D from '../components/home/ScrollHero3D';
import patientImg from '../assets/images/patient.png';
import doctorImg from '../assets/images/doctor.png';
import pharmacistImg from '../assets/images/pharmacist.png';
import adminImg from '../assets/images/admin.png';
import latrocoreLogo from '../assets/Latrocore Medical Monogram Logo.png';
import {
  Search, Upload, ShieldCheck, Stethoscope, Pill, Activity,
  ArrowRight, Lock, FileText, Sparkles, Menu, X, BarChart3,
  Award, ThermometerSnowflake, Shield, LogOut
} from 'lucide-react';

// ── WORKSTATIONS (ROLE-BASED CLINICAL LAUNCHPAD) ────────────────────────
const WORKSTATIONS = [
  {
    role: 'patient',
    title: 'Patient Portal',
    desc: 'Monitor continuous glucose levels, track daily medicines, and get personalized diet care.',
    image: patientImg,
    route: '/patient/dashboard',
  },
  {
    role: 'doctor',
    title: 'Doctor Station',
    desc: 'Surveil cohort glycemic trajectories, review patient histories, and issue digital prescriptions.',
    image: doctorImg,
    route: '/doctor/dashboard',
  },
  {
    role: 'pharmacist',
    title: 'Pharmacist Station',
    desc: 'Reconcile medications, scan drug interactions, and adjust therapeutic dosages.',
    image: pharmacistImg,
    route: '/pharmacist/dashboard',
  },
  {
    role: 'admin',
    title: 'Admin Console',
    desc: 'Oversee platform security, compliance audit logs, and system user permissions.',
    image: adminImg,
    route: '/admin/dashboard',
  },
];

export default function Welcome() {
  const { data, setUser, addToast } = useApp();
  const { isAuthenticated, user: authUser, logout } = useAuth();
  const navigate = useNavigate();

  const getRoleDashboardRoute = (role) => {
    switch (role) {
      case 'doctor':
        return '/doctor/dashboard';
      case 'pharmacist':
      case 'care_team':
        return '/pharmacist/dashboard';
      case 'admin':
        return '/admin/dashboard';
      case 'patient':
      default:
        return '/patient/dashboard';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'doctor':
        return 'Doctor';
      case 'pharmacist':
      case 'care_team':
        return 'Pharmacist';
      case 'admin':
        return 'Admin';
      case 'patient':
      default:
        return 'Patient';
    }
  };

  const handleDashboardClick = () => {
    if (!authUser) {
      navigate('/login');
      return;
    }
    if (data?.users) {
      const matched = Object.values(data.users).find(
        (u) => u.email?.toLowerCase() === authUser.email?.toLowerCase() || u.role === authUser.role
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
    }
    navigate(getRoleDashboardRoute(authUser.role));
  };

  // Navigation & UI state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Launch Workstation (navigates authenticated users directly or to login)
  const handleWorkstationLaunch = (station) => {
    if (isAuthenticated && authUser) {
      if (authUser.role === station.role || (station.role === 'pharmacist' && authUser.role === 'care_team')) {
        navigate(station.route);
      } else {
        navigate(getRoleDashboardRoute(authUser.role));
      }
    } else {
      navigate(`/login?role=${station.role}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6EF] text-slate-900 flex flex-col font-sans antialiased selection:bg-[#F9EBD7] selection:text-[#046A38]">

      {/* ── MAIN HEALTHCARE HEADER (WARM IVORY BRAND PALETTE) ────────── */}
      <header className="sticky top-0 z-40 bg-[#FAF6EF]/95 backdrop-blur-md border-b border-[#E8DCC8] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 sm:h-22 flex items-center justify-between gap-4 sm:gap-6">
          
          {/* Brand Logo & Name */}
          <div
            className="flex items-center cursor-pointer group shrink-0"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img
              src={latrocoreLogo}
              alt="LATROCORE Medical Monogram Logo"
              className="h-14 sm:h-16 w-auto object-contain mix-blend-multiply group-hover:scale-105 transition-transform drop-shadow-xs"
            />
          </div>

          {/* Interactive Healthcare Search Bar (Tata 1mg / Apollo Style) */}
          <div className="hidden md:flex flex-1 max-w-xl mx-2 relative">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Search size={17} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search specialists, investigations, medicines, or clinical guidelines..."
                className="w-full pl-11 pr-10 py-3 rounded-xl bg-white hover:bg-white focus:bg-white text-xs sm:text-[13px] font-semibold text-slate-900 border border-[#E8DCC8] focus:border-[#046A38] focus:ring-2 focus:ring-[#046A38]/20 focus:outline-none transition-all placeholder:text-slate-400 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Header Action Button (Clean Single CTA) */}
          <div className="flex items-center gap-3 shrink-0">
            {isAuthenticated && authUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDashboardClick}
                  id="header-user-dashboard-btn"
                  className="inline-flex items-center gap-2.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-[13px] font-bold text-white bg-[#046A38] hover:bg-[#03542C] shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                  title={`Logged in as ${authUser.name || authUser.email} (${getRoleLabel(authUser.role)}). Click to open ${getRoleLabel(authUser.role)} Dashboard`}
                >
                  <div className="w-7 h-7 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center text-white text-xs font-black shrink-0 uppercase">
                    {authUser.name ? authUser.name.charAt(0) : 'U'}
                  </div>
                  <div className="flex flex-col text-left leading-tight">
                    <span className="font-extrabold text-white text-xs sm:text-[13px] max-w-[130px] sm:max-w-[170px] truncate">
                      {authUser.name || authUser.email}
                    </span>
                    <span className="text-[10px] text-[#A8D7BD] font-bold tracking-wider uppercase">
                      {getRoleLabel(authUser.role)} Portal
                    </span>
                  </div>
                  <ArrowRight size={14} className="text-[#F9EBD7] ml-1 shrink-0" />
                </button>
                <button
                  onClick={async () => {
                    setUser(null);
                    if (logout) await logout();
                    addToast?.({ type: 'info', message: 'Signed out successfully' });
                  }}
                  id="header-signout-btn"
                  title="Sign Out"
                  className="p-2.5 rounded-xl border border-[#E8DCC8] bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                  aria-label="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                id="header-login-btn"
                className="inline-flex items-center gap-2.5 px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-[13px] font-black text-white bg-[#046A38] hover:bg-[#03542C] shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <Lock size={15} className="text-[#F9EBD7]" />
                <span>Sign In</span>
                <ArrowRight size={14} />
              </button>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center justify-center p-3 rounded-xl bg-[#FAF6EF] text-slate-800 border border-[#E8DCC8] cursor-pointer"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* ── MOBILE MENU SLIDE-DOWN ──────────────────────────────────── */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-[#E8DCC8] px-4 py-4 space-y-3 animate-fade-in shadow-xl">
            {/* Mobile Search */}
            <div className="relative w-full">
              <Search size={15} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search specialists, medicines, investigations..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF6EF] text-xs font-semibold border border-[#E8DCC8] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-2">
              <NavLink to="/patient/glucose" onClick={() => setMobileMenuOpen(false)} className="p-2.5 rounded-xl bg-[#FAF6EF] text-slate-800 text-center">
                📈 Glucose Monitor
              </NavLink>
              <NavLink to="/doctor/dashboard" onClick={() => setMobileMenuOpen(false)} className="p-2.5 rounded-xl bg-[#FAF6EF] text-slate-800 text-center">
                🩺 Doctor Station
              </NavLink>
              <a href="#workstations" onClick={() => setMobileMenuOpen(false)} className="p-2.5 rounded-xl bg-[#FAF6EF] text-slate-800 text-center">
                🛡️ Workstations
              </a>
              <NavLink to="/patient/investigations" onClick={() => setMobileMenuOpen(false)} className="p-2.5 rounded-xl bg-[#FAF6EF] text-slate-800 text-center">
                🧪 Investigations
              </NavLink>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (isAuthenticated && authUser) {
                    handleDashboardClick();
                  } else {
                    navigate('/login');
                  }
                }}
                className="w-full py-3 rounded-xl text-xs font-black text-white bg-[#046A38] flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Lock size={14} className="text-[#F9EBD7]" />
                <span>
                  {isAuthenticated && authUser
                    ? `Open ${getRoleLabel(authUser.role)} Portal (${authUser.name || authUser.email})`
                    : 'Sign In to Portal'}
                </span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── 3D SCROLL-DRIVEN HERO SECTION ────────────────────────────── */}
      <ScrollHero3D
        isAuthenticated={isAuthenticated}
      />

      {/* ── 6-PILLAR HEALTHCARE SERVICES GRID (APOLLO / 1MG ICONS) ─────── */}
      <section className="pt-5 pb-8 sm:pt-6 sm:pb-10 bg-white border-y border-[#E8DCC8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-5 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Comprehensive Diabetes Care Continuum
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
              Synchronized diagnostic telemetry, specialized clinical oversight, medication safety, and patient companion tools.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            
            {/* Card 1 */}
            <NavLink
              to="/patient/investigations"
              className="p-4 rounded-2xl bg-[#FAF6EF] hover:bg-[#F9EBD7]/60 border border-[#E8DCC8] hover:border-[#046A38] transition-all text-center group cursor-pointer shadow-2xs hover:shadow-md"
            >
              <div className="w-12 h-12 mx-auto rounded-xl bg-white flex items-center justify-center text-[#E34222] shadow-xs group-hover:scale-105 transition-transform mb-3">
                <Activity size={24} />
              </div>
              <h3 className="font-extrabold text-xs text-slate-900 mb-1 group-hover:text-[#046A38]">
                Lab Investigations
              </h3>
              <p className="text-[10px] text-slate-500 font-medium leading-tight">
                Longitudinal biomarkers & diagnostic records
              </p>
            </NavLink>

            {/* Card 2 */}
            <NavLink
              to="/doctor/dashboard"
              className="p-4 rounded-2xl bg-[#FAF6EF] hover:bg-[#F9EBD7]/60 border border-[#E8DCC8] hover:border-[#046A38] transition-all text-center group cursor-pointer shadow-2xs hover:shadow-md"
            >
              <div className="w-12 h-12 mx-auto rounded-xl bg-white flex items-center justify-center text-[#046A38] shadow-xs group-hover:scale-105 transition-transform mb-3">
                <Stethoscope size={24} />
              </div>
              <h3 className="font-extrabold text-xs text-slate-900 mb-1 group-hover:text-[#046A38]">
                Doctor Station
              </h3>
              <p className="text-[10px] text-slate-500 font-medium leading-tight">
                Glycemic cohort surveillance & digital prescriptions
              </p>
            </NavLink>

            {/* Card 3 */}
            <button
              onClick={() => setUploadModalOpen(true)}
              className="p-4 rounded-2xl bg-[#FAF6EF] hover:bg-[#F9EBD7]/60 border border-[#E8DCC8] hover:border-[#046A38] transition-all text-center group cursor-pointer shadow-2xs hover:shadow-md w-full"
            >
              <div className="w-12 h-12 mx-auto rounded-xl bg-white flex items-center justify-center text-[#E34222] shadow-xs group-hover:scale-105 transition-transform mb-3">
                <Pill size={24} />
              </div>
              <h3 className="font-extrabold text-xs text-slate-900 mb-1 group-hover:text-[#046A38]">
                Order Medicines
              </h3>
              <p className="text-[10px] text-slate-500 font-medium leading-tight">
                Pharm D checked prescriptions with zero DDI risks
              </p>
            </button>

            {/* Card 4 */}
            <NavLink
              to="/patient/glucose"
              className="p-4 rounded-2xl bg-[#FAF6EF] hover:bg-[#F9EBD7]/60 border border-[#E8DCC8] hover:border-[#046A38] transition-all text-center group cursor-pointer shadow-2xs hover:shadow-md"
            >
              <div className="w-12 h-12 mx-auto rounded-xl bg-white flex items-center justify-center text-[#046A38] shadow-xs group-hover:scale-105 transition-transform mb-3">
                <BarChart3 size={24} />
              </div>
              <h3 className="font-extrabold text-xs text-slate-900 mb-1 group-hover:text-[#046A38]">
                Glucose Monitor
              </h3>
              <p className="text-[10px] text-slate-500 font-medium leading-tight">
                Daily glycemic logs & Time-in-Range
              </p>
            </NavLink>

            {/* Card 5 */}
            <NavLink
              to="/patient/screening"
              className="p-4 rounded-2xl bg-[#FAF6EF] hover:bg-[#F9EBD7]/60 border border-[#E8DCC8] hover:border-[#046A38] transition-all text-center group cursor-pointer shadow-2xs hover:shadow-md"
            >
              <div className="w-12 h-12 mx-auto rounded-xl bg-white flex items-center justify-center text-[#E34222] shadow-xs group-hover:scale-105 transition-transform mb-3">
                <ShieldCheck size={24} />
              </div>
              <h3 className="font-extrabold text-xs text-slate-900 mb-1 group-hover:text-[#046A38]">
                Preventive Screening
              </h3>
              <p className="text-[10px] text-slate-500 font-medium leading-tight">
                Diabetic foot exam, neuropathy & fundus scans
              </p>
            </NavLink>

            {/* Card 6 */}
            <NavLink
              to="/patient/lifestyle"
              className="p-4 rounded-2xl bg-[#FAF6EF] hover:bg-[#F9EBD7]/60 border border-[#E8DCC8] hover:border-[#046A38] transition-all text-center group cursor-pointer shadow-2xs hover:shadow-md"
            >
              <div className="w-12 h-12 mx-auto rounded-xl bg-white flex items-center justify-center text-[#046A38] shadow-xs group-hover:scale-105 transition-transform mb-3">
                <Sparkles size={24} />
              </div>
              <h3 className="font-extrabold text-xs text-slate-900 mb-1 group-hover:text-[#046A38]">
                Diet & Lifestyle AI
              </h3>
              <p className="text-[10px] text-slate-500 font-medium leading-tight">
                Personalized low-GI diabetic meal planning
              </p>
            </NavLink>

          </div>
        </div>
      </section>

      {/* ── ROLE-BASED WORKSTATIONS (ECOSYSTEM LAUNCHPAD) ───────────── */}
      <section id="workstations" className="py-12 sm:py-16 bg-[#FAF6EF] border-b border-[#E8DCC8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#093322] tracking-tight">
              Clinical Workstations
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1.5">
              Select your role to access the dedicated portal.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WORKSTATIONS.map(station => (
              <div
                key={station.id}
                onClick={() => handleWorkstationLaunch(station)}
                className="group bg-white rounded-2xl p-6 border border-[#E8DCC8] hover:border-[#046A38] shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col items-center text-center"
              >
                {/* 3D Illustration */}
                <div className="w-full aspect-square max-w-[190px] mb-4 flex items-center justify-center p-2 rounded-2xl bg-[#FAF6EF]/60 group-hover:bg-[#E8F5EE]/60 transition-colors">
                  <img
                    src={station.image}
                    alt={station.title}
                    className="w-full h-full object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>

                {/* Title */}
                <h3 className="font-serif font-bold text-xl text-[#093322] mb-5 group-hover:text-[#046A38] transition-colors">
                  {station.title}
                </h3>

                {/* Clean Launch Button */}
                <button
                  type="button"
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#046A38] hover:bg-[#03542C] text-white flex items-center justify-center gap-1.5 transition-all shadow-xs group-hover:shadow-md cursor-pointer mt-auto"
                >
                  <span>Launch Station</span>
                  <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ))}
          </div>

        </div>
      </section>



      {/* ── WHY CHOOSE LATROCORE (APOLLO TRUST PILLARS) ───────────────── */}
      <section className="py-12 sm:py-16 bg-[#FAF6EF] border-b border-[#E8DCC8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Why Patients & Physicians Trust LATROCORE
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
              Engineered to clinical compliance benchmarks with zero tolerance for diagnostic errors.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-[#E8DCC8] shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#E8F5EE] flex items-center justify-center text-[#046A38] mb-3">
                <Award size={20} />
              </div>
              <h3 className="font-black text-sm text-slate-900 mb-1">Dual-Verified Pathology</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                NABL & CAP accredited partner laboratories with barcode-tracked specimen chains and double pathologist sign-offs.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E8DCC8] shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#FAF6EF] flex items-center justify-center text-[#E34222] border border-[#E8DCC8] mb-3">
                <ThermometerSnowflake size={20} />
              </div>
              <h3 className="font-black text-sm text-slate-900 mb-1">Cold-Chain Sample Logistics</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Temperature-monitored smart icebox carriers ensure enzymatic integrity for sensitive HbA1c and lipid samples.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E8DCC8] shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#E8F5EE] flex items-center justify-center text-[#046A38] mb-3">
                <ShieldCheck size={20} />
              </div>
              <h3 className="font-black text-sm text-slate-900 mb-1">Zero-Trust Cryptography</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Argon2id password hashing, ephemeral token rotations, and encrypted patient data compliant with HIPAA and CDSCO rules.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E8DCC8] shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#FDECE8] flex items-center justify-center text-[#E34222] mb-3">
                <Pill size={20} />
              </div>
              <h3 className="font-black text-sm text-slate-900 mb-1">Pharm D DDI Scanner</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Real-time surveillance detects dangerous drug-drug interactions before prescription dispensing takes place.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── HIGH-FIDELITY CLINICAL FOOTER (WARM IVORY & DEEP EMERALD PALETTE) ─── */}
      <footer className="relative bg-[#093322] text-[#E8F5EE] pt-14 pb-10 border-t-2 border-[#046A38] overflow-hidden">
        {/* Subtle Ambient Spotlights */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#046A38]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#E34222]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          


          {/* 4 Clean Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-12 border-b border-[#155238]">
            
            {/* Col 1: Brand & Certified Accreditations (Span 4) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="p-2 rounded-2xl bg-white border border-[#155238] shadow-sm shrink-0">
                  <img
                    src="/logo-emblem.png"
                    alt="LATROCORE"
                    className="h-11 w-11 sm:h-12 sm:w-12 object-contain"
                  />
                </div>
                <div>
                  <span className="font-serif font-black text-white text-2xl tracking-tight block leading-none">
                    LATROCORE
                  </span>
                  <span className="text-[10px] font-bold text-[#A8D7BD] tracking-[0.18em] uppercase mt-1 block">
                    Precision Diabetes &amp; Diagnostics
                  </span>
                </div>
              </div>
              
              <p className="text-xs text-[#D1E7DD] leading-relaxed max-w-sm font-normal">
                Closed-loop precision healthcare operating system connecting Type 2 diabetes patients, endocrinologists, and Pharm D clinical specialists with continuous biometric telemetry.
              </p>

              {/* Accreditations Badges */}
              <div className="pt-2 flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-[#046A38]/60 border border-[#155238] text-[11px] font-bold text-[#F9EBD7] inline-flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-[#A8D7BD]" />
                  <span>CDSCO Registered</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-[#046A38]/60 border border-[#155238] text-[11px] font-bold text-[#A8D7BD] inline-flex items-center gap-1.5">
                  <Award size={13} className="text-[#F9EBD7]" />
                  <span>NABL Partnered</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-[#046A38]/60 border border-[#155238] text-[11px] font-bold text-[#FBD4CB] inline-flex items-center gap-1.5">
                  <Shield size={13} className="text-[#E34222]" />
                  <span>HIPAA &amp; ISO 27001</span>
                </span>
              </div>
            </div>

            {/* Col 2: Diagnostic Services (Span 3) */}
            <div className="lg:col-span-3">
              <p className="font-serif text-xs font-black uppercase tracking-[0.2em] text-[#F9EBD7] mb-4">
                Diagnostic Telemetry
              </p>
              <ul className="space-y-2.5 text-xs text-[#D1E7DD] font-medium">
                <li>
                  <NavLink to="/patient/glucose" className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all">
                    <span className="text-[#A8D7BD]">›</span> Continuous CGM Sensor Sync
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/patient/investigations" className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all">
                    <span className="text-[#A8D7BD]">›</span> HbA1c &amp; Fasting Glucose Panels
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/patient/investigations" className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all">
                    <span className="text-[#A8D7BD]">›</span> Lipid &amp; Cardio-Renal Profiling
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/patient/screening" className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all">
                    <span className="text-[#A8D7BD]">›</span> Diabetic Neuropathy &amp; Eye Screening
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/patient/lifestyle" className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all">
                    <span className="text-[#A8D7BD]">›</span> Personalized Low-GI Meal Engine
                  </NavLink>
                </li>
              </ul>
            </div>

            {/* Col 3: Care Workstations (Span 2) */}
            <div className="lg:col-span-2">
              <p className="font-serif text-xs font-black uppercase tracking-[0.2em] text-[#A8D7BD] mb-4">
                Clinical Portals
              </p>
              <ul className="space-y-2.5 text-xs text-[#D1E7DD] font-medium">
                <li>
                  <NavLink to="/patient/dashboard" className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all">
                    <span className="text-[#A8D7BD]">›</span> Patient Station
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/doctor/dashboard" className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all">
                    <span className="text-[#A8D7BD]">›</span> Doctor Station
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/pharmacist/dashboard" className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all">
                    <span className="text-[#A8D7BD]">›</span> Pharmacist Console
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/dashboard" className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all">
                    <span className="text-[#A8D7BD]">›</span> Admin Governance
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/overview" className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all">
                    <span className="text-[#A8D7BD]">›</span> Blueprint Overview
                  </NavLink>
                </li>
              </ul>
            </div>

            {/* Col 4: Contact & Clinical Access (Span 3) */}
            <div className="lg:col-span-3">
              <p className="font-serif text-xs font-black uppercase tracking-[0.2em] text-[#FBD4CB] mb-4">
                Clinical Helpdesk
              </p>
              <div className="space-y-3 text-xs text-[#D1E7DD]">
                <div className="p-3 rounded-xl bg-[#046A38]/30 border border-[#155238]">
                  <span className="text-[10px] font-bold text-[#A8D7BD] uppercase tracking-wider block">
                    Emergency Hotline (24x7)
                  </span>
                  <span className="text-sm font-black text-white block mt-0.5">
                    1800-LATRO-CARE
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#046A38]/30 border border-[#155238]">
                  <span className="text-[10px] font-bold text-[#A8D7BD] uppercase tracking-wider block">
                    Clinical Communication
                  </span>
                  <span className="text-xs font-semibold text-white block mt-0.5">
                    clinical@latrocore.internal
                  </span>
                </div>
                <NavLink
                  to="/login"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#FAF6EF] hover:bg-[#F9EBD7] text-[#093322] shadow-sm transition-all cursor-pointer"
                >
                  <Lock size={13} className="text-[#046A38]" />
                  <span>Authorized Staff Portal Sign In</span>
                </NavLink>
              </div>
            </div>

          </div>

          {/* Bottom Bar: Copyright & Compliance */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#8FBAA3] gap-4">
            <p className="font-medium text-center sm:text-left">
              &copy; 2026 LATROCORE Healthcare Systems. All rights reserved.
            </p>
            <p className="text-[11px] text-[#A8D7BD]/80 text-center sm:text-right max-w-lg leading-relaxed">
              Clinical telemetry and medication titration tools operate under licensed physician oversight in accordance with CDSCO guidelines.
            </p>
          </div>

        </div>
      </footer>

      {/* ── QUICK PRESCRIPTION UPLOAD MODAL ─────────────────────────── */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative text-center">
            <button
              onClick={() => setUploadModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#E8F5EE] flex items-center justify-center text-[#046A38] mb-4">
              <Upload size={28} className="text-[#E34222]" />
            </div>

            <h3 className="text-lg font-black text-slate-900 mb-1">
              Upload Doctor's Prescription
            </h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Drop your prescription image or PDF. Our Pharm D clinical pharmacists will verify medications, screen for drug interactions, and arrange 2-hour doorstep delivery.
            </p>

            <div className="border-2 border-dashed border-[#A8D7BD] rounded-2xl p-6 bg-[#FAF6EF] hover:bg-[#F9EBD7]/40 transition-colors cursor-pointer mb-5">
              <FileText size={32} className="mx-auto text-[#046A38] mb-2" />
              <p className="text-xs font-bold text-slate-900">Click to Browse or Drag File Here</p>
              <p className="text-[10px] text-slate-500 mt-1">Supports JPG, PNG, PDF up to 10MB</p>
            </div>

            <button
              onClick={() => {
                setUploadModalOpen(false);
                addToast({
                  title: 'Prescription Uploaded',
                  message: 'Our Pharm D team is reviewing your prescription for DDI safety.',
                  type: 'success',
                });
              }}
              className="w-full py-3 rounded-xl text-xs font-black text-white bg-[#046A38] hover:bg-[#03542C] shadow-md cursor-pointer transition-all active:scale-95"
            >
              Upload & Verify with Pharmacist
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
