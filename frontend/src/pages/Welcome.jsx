import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../auth/AuthContext';
import { usePrefersReducedMotion, useScrollReveals } from '../hooks/useScrollMotion';
import HeroCarousel from '../components/home/HeroCarousel';
import AboutSection from '../components/home/AboutSection';
import CareActionCarousel from '../components/home/CareActionCarousel';
import ExploreAICompanion from '../components/home/ExploreAICompanion';
import DailyCareCompanion from '../components/home/DailyCareCompanion';
import TrustPillarsSection from '../components/home/TrustPillarsSection';
import HowWeWorkSection from '../components/home/HowWeWorkSection';
import FaqSection from '../components/home/FaqSection';
import ContactCtaSection from '../components/home/ContactCtaSection';
import PublicHeader from '../components/home/PublicHeader';
import PublicFooter from '../components/home/PublicFooter';
import { getDefaultDashboardRoute } from '../auth/ProtectedRoute';
import { openAICompanionWithDraft } from '../utils/aiCompanionChat';
import patientImg from '../assets/images/patient.png';
import doctorImg from '../assets/images/doctor.png';
import pharmacistImg from '../assets/images/pharmacist.png';
import adminImg from '../assets/images/admin.png';
import {
  Upload, ArrowRight, FileText, X,
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
  const { isAuthenticated, user: authUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const syncAppUserFromAuth = () => {
    if (!authUser) return;
    if (data?.users) {
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

  // Navigation & UI state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const pageRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useScrollReveals(pageRef);

  // Scroll smoothly to hash target when returning from another page (e.g. /#faq)
  useEffect(() => {
    if (!location.hash) return;
    const target = document.getElementById(location.hash.slice(1));
    if (!target) return;
    requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  }, [location.hash, prefersReducedMotion]);

  const handleAnchorClick = (e, targetId) => {
    const target = document.getElementById(targetId);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
    if (window.location.hash !== `#${targetId}`) {
      window.history.replaceState(null, '', `#${targetId}`);
    }
  };

  // Launch Workstation (navigates authenticated users directly or to login)
  const handleWorkstationLaunch = (station) => {
    if (isAuthenticated && authUser) {
      if (authUser.role === station.role || (station.role === 'pharmacist' && authUser.role === 'care_team')) {
        navigate(station.route);
      } else {
        navigate(getDefaultDashboardRoute(authUser));
      }
    } else {
      navigate(`/login?role=${station.role}`);
    }
  };

  return (
    <div id="top" ref={pageRef} className="public-home min-h-screen w-full max-w-full overflow-x-clip bg-[#FAF6EF] text-slate-900 flex flex-col font-sans antialiased selection:bg-[#F9EBD7] selection:text-[#046A38]">

      <PublicHeader
        isHome
      />

      {/* -- HERO CAROUSEL (tab-based) ----------------------------------------- */}
      <HeroCarousel onAskLatroAI={openAICompanionWithDraft} />

      {/* ── ABOUT LATROCORE ─────────────────────────────────────────────── */}
      <AboutSection
        onExploreSolutions={(e) => handleAnchorClick(e, 'care-continuum')}
      />

      <CareActionCarousel />

      {/* ── EXPLORE THE LATROCORE AI COMPANION (INTERACTIVE FAN CAROUSEL) ─ */}
      <ExploreAICompanion onAskQuestion={openAICompanionWithDraft} />

      {/* ── EVERYDAY HEALTH COMPANION (3D CONNECTED CARE CARDS) ───────── */}
      <DailyCareCompanion isAuthenticated={isAuthenticated} />

      {/* ── ROLE-BASED WORKSTATIONS (ECOSYSTEM LAUNCHPAD) ───────────── */}
      <section id="workstations" className="home-scroll-target home-band-mint py-12 sm:py-16 border-b border-[#E8DCC8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div data-reveal="section" className="text-center max-w-2xl mx-auto mb-10">
            <p className="inline-flex items-center justify-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-[0.16em] text-[#046A38] font-['Inter',system-ui,sans-serif] mb-2.5">
              <span className="h-[2px] w-5 sm:w-6 bg-[#046A38]/75 rounded-full" aria-hidden="true" />
              <span>CARE TEAM PORTALS</span>
            </p>
            <h2 className="home-section-heading text-3xl sm:text-4xl lg:text-[42px] text-[#093322]">
              Clinical Workstations
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1.5">
              Select your role to access the dedicated portal.
            </p>
          </div>

          <div data-reveal-grid="workstations" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WORKSTATIONS.map(station => (
              <div key={station.role} data-reveal="card" className="flex">
                <div
                  onClick={() => handleWorkstationLaunch(station)}
                  className="w-full group bg-white rounded-2xl p-6 border border-[#E8DCC8] hover:border-[#046A38] shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col items-center text-center"
                >
                  {/* 3D Illustration */}
                  <div className="w-full aspect-square max-w-[190px] mb-4 flex items-center justify-center p-2 rounded-2xl bg-[#FAF6EF]/60 group-hover:bg-[#E8F5EE]/60 transition-colors">
                    <img
                      src={station.image}
                      alt={station.title}
                      width={1254}
                      height={1254}
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
              </div>
            ))}
          </div>

        </div>
      </section>



      {/* ── CARE YOU CAN FOLLOW BETWEEN VISITS (TRUST PILLARS) ─────────── */}
      <TrustPillarsSection />

      {/* ── HOW WE WORK ───────────────────────────────────────────────── */}
      <HowWeWorkSection />

      {/* ── FREQUENTLY ASKED QUESTIONS ────────────────────────────────── */}
      <FaqSection />

      {/* ── CONTACT CTA SECTION ───────────────────────────────────────── */}
      <ContactCtaSection />

      <PublicFooter />

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
