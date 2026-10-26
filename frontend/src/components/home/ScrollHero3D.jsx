import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Sparkles,
  ArrowRight,
  Zap,
  ChevronDown
} from 'lucide-react';
import hero3dExploded from '../../assets/images/hero-3d-scroll-exploded.jpg';
import bannerImg1 from '../../assets/images/banner-img-1.png';
import patientImg from '../../assets/images/patient.png';
import doctorImg from '../../assets/images/doctor.png';
import pharmacistImg from '../../assets/images/pharmacist.png';
import adminImg from '../../assets/images/admin.png';

const STAGES = [
  {
    id: 1,
    tag: 'STAGE 01',
    title: 'Connected Biometric Sensor',
    subtitle: 'Continuous Glycemic Sensing with Sub-Minute Telemetry Precision',
    desc: 'An ultra-compact CGM sensor continuously samples interstitial glucose, beaming encrypted biometric trajectories directly to your clinical circle.',
    kicker: 'Continuous Telemetry Discovery',
  },
  {
    id: 2,
    tag: 'STAGE 02',
    title: 'Exploded 3D Spatial Architecture',
    subtitle: 'Multi-Layer Optical Sensing, Microfluidic Calibration & DDI Screening',
    desc: 'Scroll down to dissect the inner architecture: dual-wavelength enzymatic sensors, telemetry antennae, and on-device machine learning calibration.',
    kicker: 'Biometric Depth & Hardware Analysis',
  },
  {
    id: 3,
    tag: 'STAGE 03',
    title: '4-Pillar Clinical Synchrony',
    subtitle: 'Patients, Endocrinologists, Clinical Pharmacists & Administrators in One Loop',
    desc: 'Data transforms into synchronized clinical action: automated glycemic alerts, zero drug-interaction prescriptions, and longitudinal care tracking.',
    kicker: 'Synchronized Care Ecosystem',
  },
];

export default function ScrollHero3D({ isAuthenticated, onGuidedDemo }) {
  const containerRef = useRef(null);
  const stickyRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0); // 0.0 to 1.0
  const [activeStage, setActiveStage] = useState(0);
  const [mouseTilt, setMouseTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  // Scroll Progress Calculator
  useEffect(() => {
    let animationFrameId = null;

    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalScrollable = rect.height - windowHeight;

      if (totalScrollable <= 0) return;

      const currentScroll = -rect.top;
      const rawProgress = Math.min(Math.max(currentScroll / totalScrollable, 0), 1);

      animationFrameId = requestAnimationFrame(() => {
        setScrollProgress(rawProgress);

        if (rawProgress < 0.35) {
          setActiveStage(0);
        } else if (rawProgress < 0.72) {
          setActiveStage(1);
        } else {
          setActiveStage(2);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Mouse Parallax Tilt
  const handleMouseMove = (e) => {
    if (!stickyRef.current) return;
    const rect = stickyRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseTilt({ x: -(y * 10), y: x * 12 });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMouseTilt({ x: 0, y: 0 });
  };

  // Click stage pill to smoothly scroll to that phase
  const scrollToStage = (stageIdx) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const containerTop = rect.top + scrollTop;
    const totalScrollable = rect.height - window.innerHeight;

    let targetRatio = 0.05;
    if (stageIdx === 1) targetRatio = 0.5;
    if (stageIdx === 2) targetRatio = 0.95;

    const targetY = containerTop + targetRatio * totalScrollable;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  };

  const currentStageData = STAGES[activeStage];

  // Stage 2 & 3 dynamic interpolations
  const stage1Opacity = Math.max(0, 1 - scrollProgress * 3.2);
  const stage2Opacity = scrollProgress >= 0.25 && scrollProgress <= 0.8
    ? Math.min((scrollProgress - 0.25) * 4, 1, (0.8 - scrollProgress) * 4)
    : 0;
  const stage3Opacity = Math.max(0, (scrollProgress - 0.65) * 2.8);

  // 3D Exploded Layer separations
  const explodeZ = Math.min(Math.max((scrollProgress - 0.25) * 120, 0), 75);
  const explodeScale = 0.95 + scrollProgress * 0.15;
  const explodeRotate = mouseTilt.y + (scrollProgress - 0.5) * 12;

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-[220vh] bg-[#FAF6EF] selection:bg-[#F9EBD7] selection:text-[#046A38]"
    >
      {/* ── STICKY 3D SHOWCASE VIEWPORT ── */}
      <div
        ref={stickyRef}
        className="sticky top-20 sm:top-22 h-[calc(100vh-5rem)] sm:h-[calc(100vh-5.5rem)] min-h-[580px] max-h-[820px] w-full flex flex-col justify-between overflow-hidden px-4 sm:px-6 lg:px-8 py-3 sm:py-4 select-none"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
      >
        {/* Background Subtle Gradient & Ambience */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Volumetric Warm Ambient Spotlights */}
          <div className="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-radial from-[#046A38]/12 to-transparent blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 right-1/4 w-96 h-96 rounded-full bg-radial from-[#E34222]/8 to-transparent blur-3xl pointer-events-none" />
          {/* Fine Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#E8DCC8_1px,transparent_1px),linear-gradient(to_bottom,#E8DCC8_1px,transparent_1px)] bg-[size:48px_48px] opacity-40 pointer-events-none" />
        </div>

        {/* ── TOP CONTROLS & TIMELINE BAR ── */}
        <div className="relative z-30 max-w-7xl mx-auto w-full flex items-center justify-between gap-3 pt-1">
          {/* Brand Kicker + 3D Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-serif font-black tracking-[0.25em] text-[#046A38] uppercase">
              LATROCORE 3D SPATIAL
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 border border-[#A8D7BD] text-[10px] font-black text-[#046A38] shadow-2xs backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#046A38] animate-ping" />
              <span>SCROLL-DRIVEN ARCHITECTURE</span>
            </span>
          </div>
        </div>

        {/* ── MAIN STAGE CONTENT (2-COLUMN 3D PERSPECTIVE) ── */}
        <div className="relative z-20 max-w-7xl mx-auto w-full my-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* ── LEFT: DYNAMIC STORYTELLING TEXT ── */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-3.5 pr-2">
            
            {/* Stage Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8F5EE] border border-[#A8D7BD] text-xs font-black text-[#046A38] w-fit shadow-2xs">
              <Zap size={13} className="text-[#E34222]" />
              <span>{currentStageData.kicker}</span>
            </div>

            {/* Headline */}
            <h1 className="font-serif font-black text-3xl sm:text-4xl lg:text-[44px] leading-[1.08] text-slate-900 tracking-tight transition-all duration-300">
              {activeStage === 0 && (
                <>
                  <span className="text-[#046A38]">Continuous Diabetes</span>
                  <br />
                  <span className="text-[#D84315]">Care, Connected.</span>
                </>
              )}
              {activeStage === 1 && (
                <>
                  <span className="text-[#046A38]">Exploded Sensor</span>
                  <br />
                  <span className="text-[#D84315]">Micro-Architecture.</span>
                </>
              )}
              {activeStage === 2 && (
                <>
                  <span className="text-[#046A38]">4-Pillar Clinical</span>
                  <br />
                  <span className="text-[#D84315]">Synchrony Loop.</span>
                </>
              )}
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
              {currentStageData.subtitle}
            </p>

            {/* Description */}
            <p className="text-xs sm:text-[13px] font-normal text-slate-600 leading-relaxed max-w-md">
              {currentStageData.desc}
            </p>

            {/* Dynamic CTAs based on stage */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {activeStage === 2 ? (
                <>
                  <button
                    onClick={() => {
                      if (isAuthenticated) navigate('/patient/dashboard');
                      else navigate('/signup?role=patient');
                    }}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#046A38] hover:bg-[#03542C] text-white text-xs sm:text-sm font-black shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                  >
                    <span>Get Started</span>
                    <ArrowRight size={14} />
                  </button>
                  <a
                    href="#workstations"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-[#F9EBD7] text-slate-900 border border-[#E8DCC8] hover:border-[#046A38] text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <span>Explore All Stations</span>
                  </a>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      if (isAuthenticated) navigate('/dashboard');
                      else navigate('/login');
                    }}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#D84315] hover:bg-[#BF360C] text-white text-xs sm:text-sm font-black shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                  >
                    <span>Explore LATROCORE</span>
                    <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={() => scrollToStage(activeStage + 1)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-[#E8F5EE] text-[#046A38] border border-[#A8D7BD] text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <span>Next 3D Phase</span>
                    <ChevronDown size={14} />
                  </button>
                </>
              )}
            </div>

            {/* Live Telemetry Progress Mini-Stats */}
            <div className="pt-2 grid grid-cols-3 gap-2 border-t border-[#E8DCC8]/80 max-w-md">
              <div className="p-2 rounded-xl bg-white/70 border border-[#E8DCC8]">
                <span className="text-[10px] text-slate-500 font-bold block">Telemetry</span>
                <span className="text-xs font-black text-[#046A38]">112 mg/dL</span>
              </div>
              <div className="p-2 rounded-xl bg-white/70 border border-[#E8DCC8]">
                <span className="text-[10px] text-slate-500 font-bold block">In-Range</span>
                <span className="text-xs font-black text-[#046A38]">88% Stable</span>
              </div>
              <div className="p-2 rounded-xl bg-white/70 border border-[#E8DCC8]">
                <span className="text-[10px] text-slate-500 font-bold block">DDI Flags</span>
                <span className="text-xs font-black text-[#E34222]">0 Detected</span>
              </div>
            </div>
          </div>

          {/* ── RIGHT: 3D SCROLL-DRIVEN VISUAL STAGE ── */}
          <div className="lg:col-span-7 relative flex items-center justify-center min-h-[320px] sm:min-h-[380px] lg:min-h-[440px] perspective-1200 overflow-visible">
            
            {/* 3D Spatial Canvas with dynamic mouse & scroll tilt */}
            <div
              className="relative w-full max-w-[500px] h-[320px] sm:h-[380px] lg:h-[420px] flex items-center justify-center preserve-3d"
              style={{
                transform: `rotateX(${mouseTilt.x}deg) rotateY(${explodeRotate}deg) scale(${explodeScale})`,
                transition: isHovered
                  ? 'transform 0.12s ease-out'
                  : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            >
              {/* ── STAGE 1 VISUAL: ASSEMBLED SENSOR (Fades out on scroll) ── */}
              <div
                className="absolute inset-0 flex items-center justify-center preserve-3d transition-opacity duration-500 pointer-events-none"
                style={{
                  opacity: activeStage === 0 ? 1 : stage1Opacity,
                  transform: `translateZ(${-explodeZ * 0.5}px)`,
                }}
              >
                {/* Glowing Concentric Radar Rings */}
                <div className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-dashed border-[#A8D7BD]/60 animate-spin-slow pointer-events-none">
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#E34222] shadow-[0_0_12px_#E34222]" />
                </div>
                <div className="absolute w-48 h-48 sm:w-60 sm:h-60 rounded-full bg-gradient-to-br from-[#093322] to-[#046A38] opacity-90 shadow-2xl pointer-events-none" />
                
                {/* Assembled 3D Device */}
                <img
                  src={bannerImg1}
                  alt="3D Assembled Sensor"
                  className="relative z-10 w-full max-w-[220px] sm:max-w-[270px] h-auto object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.25)] animate-float-3d"
                />

                {/* Floating Telemetry Tag (Stage 1) */}
                <div
                  className="absolute -top-2 left-4 z-20 flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E8DCC8] shadow-lg animate-float-3d whitespace-nowrap"
                  style={{ transform: 'translateZ(50px)' }}
                >
                  <div className="w-8 h-8 rounded-xl bg-[#E8F5EE] text-[#046A38] flex items-center justify-center">
                    <Activity size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 leading-tight block">112 mg/dL</span>
                    <span className="text-[10px] text-slate-500 font-semibold">Continuous Telemetry</span>
                  </div>
                </div>
              </div>

              {/* ── STAGE 2 VISUAL: EXPLODED 3D SPATIAL ARCHITECTURE ── */}
              <div
                className="absolute inset-0 flex items-center justify-center preserve-3d transition-opacity duration-500 pointer-events-none"
                style={{
                  opacity: activeStage === 1 ? 1 : stage2Opacity,
                  transform: `translateZ(${explodeZ}px)`,
                }}
              >
                {/* Exploded 3D High-Res Concept Artwork */}
                <div className="relative w-full max-w-[420px] sm:max-w-[480px] rounded-3xl overflow-hidden border-2 border-[#E8DCC8] shadow-2xl bg-white/40 backdrop-blur-sm">
                  <img
                    src={hero3dExploded}
                    alt="Exploded 3D CGM Sensor Micro-Architecture"
                    className="w-full h-auto object-cover transform hover:scale-102 transition-transform duration-500"
                  />
                  
                  {/* Subtle Scanline Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#046A38]/15 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Floating 3D HUD Badge 1: Glucose Target (High Z-elevation) */}
                <div
                  className="absolute -top-3 -left-3 sm:-left-6 z-30 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-[#A8D7BD] shadow-xl animate-float-3d whitespace-nowrap"
                  style={{
                    transform: `translateZ(85px) translateX(${mouseTilt.y * 1.5}px)`,
                  }}
                >
                  <div className="w-8 h-8 rounded-xl bg-[#E8F5EE] text-[#046A38] flex items-center justify-center font-black">
                    <Activity size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-slate-900">112 mg/dL</span>
                      <span className="w-2 h-2 rounded-full bg-[#046A38] animate-ping" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold">Normal Glycemic Target</span>
                  </div>
                </div>

                {/* Floating 3D HUD Badge 2: Time in Range */}
                <div
                  className="absolute -bottom-3 -right-3 sm:-right-6 z-30 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E8DCC8] shadow-xl animate-float-3d-reverse whitespace-nowrap"
                  style={{
                    transform: `translateZ(95px) translateX(${mouseTilt.y * -1.8}px)`,
                  }}
                >
                  <div className="w-8 h-8 rounded-xl bg-[#FDECE8] text-[#E34222] flex items-center justify-center font-black">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block">88% In Range</span>
                    <span className="text-[10px] text-slate-500 font-semibold">Goal &gt; 70% • Zero Hypo</span>
                  </div>
                </div>
              </div>

              {/* ── STAGE 3 VISUAL: 4-PILLAR CLINICAL SYNCHRONY STATIONS ── */}
              <div
                className="absolute inset-0 flex items-center justify-center preserve-3d transition-opacity duration-500"
                style={{
                  opacity: activeStage === 2 ? 1 : stage3Opacity,
                  pointerEvents: activeStage === 2 ? 'auto' : 'none',
                  transform: `translateZ(${activeStage === 2 ? 40 : -20}px)`,
                }}
              >
                {/* 4-Pillar Orbital Arc */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-[420px] p-2">
                  
                  {/* Station 1: Patient */}
                  <div
                    onClick={() => navigate('/patient/dashboard')}
                    className="p-3 sm:p-3.5 rounded-2xl bg-white/95 hover:bg-white border border-[#E8DCC8] hover:border-[#046A38] shadow-md hover:shadow-xl transition-all cursor-pointer group hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <img src={patientImg} alt="Patient" className="w-7 h-7 rounded-lg object-contain bg-[#E8F5EE] p-0.5" />
                      <span className="text-xs font-black text-slate-900 group-hover:text-[#046A38]">Patient Station</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-tight">
                      CGM telemetry curves &amp; personalized diet adherence
                    </p>
                  </div>

                  {/* Station 2: Doctor */}
                  <div
                    onClick={() => navigate('/doctor/dashboard')}
                    className="p-3 sm:p-3.5 rounded-2xl bg-white/95 hover:bg-white border border-[#E8DCC8] hover:border-[#046A38] shadow-md hover:shadow-xl transition-all cursor-pointer group hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <img src={doctorImg} alt="Doctor" className="w-7 h-7 rounded-lg object-contain bg-[#E8F5EE] p-0.5" />
                      <span className="text-xs font-black text-slate-900 group-hover:text-[#046A38]">Doctor Station</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-tight">
                      Glycemic cohort surveillance &amp; digital prescriptions
                    </p>
                  </div>

                  {/* Station 3: Pharmacist */}
                  <div
                    onClick={() => navigate('/pharmacist/dashboard')}
                    className="p-3 sm:p-3.5 rounded-2xl bg-white/95 hover:bg-white border border-[#E8DCC8] hover:border-[#046A38] shadow-md hover:shadow-xl transition-all cursor-pointer group hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <img src={pharmacistImg} alt="Pharmacist" className="w-7 h-7 rounded-lg object-contain bg-[#FDECE8] p-0.5" />
                      <span className="text-xs font-black text-slate-900 group-hover:text-[#046A38]">Pharmacist Console</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-tight">
                      Prescription reconciliation &amp; DDI contraindication screening
                    </p>
                  </div>

                  {/* Station 4: Admin */}
                  <div
                    onClick={() => navigate('/admin/dashboard')}
                    className="p-3 sm:p-3.5 rounded-2xl bg-white/95 hover:bg-white border border-[#E8DCC8] hover:border-[#046A38] shadow-md hover:shadow-xl transition-all cursor-pointer group hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <img src={adminImg} alt="Admin" className="w-7 h-7 rounded-lg object-contain bg-[#E8F5EE] p-0.5" />
                      <span className="text-xs font-black text-slate-900 group-hover:text-[#046A38]">Admin Console</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-tight">
                      HIPAA compliance logs, security &amp; system users
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── BOTTOM PROGRESS & SCROLL CUE ── */}
        <div className="relative z-30 max-w-7xl mx-auto w-full flex items-center justify-between pb-1 border-t border-[#E8DCC8]/60 pt-2 text-[11px] font-bold text-slate-600">
          
          {/* Scroll Down Hint with Animated Mouse */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-7 rounded-full border-2 border-[#046A38] flex items-start justify-center p-1">
              <div className="w-1 h-2 rounded-full bg-[#E34222] animate-bounce" />
            </div>
            <span className="text-[10px] uppercase tracking-wider text-slate-700">
              {activeStage < 2 ? 'Scroll Down to Dissect 3D Architecture' : 'Scroll Down to Care Continuum'}
            </span>
          </div>

          {/* Continuous Progress Bar */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-[#046A38]">
              {Math.round(scrollProgress * 100)}% COMPLETE
            </span>
            <div className="w-28 sm:w-36 h-2 rounded-full bg-[#E8DCC8] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#046A38] via-[#1D8252] to-[#E34222] transition-all duration-150 rounded-full"
                style={{ width: `${Math.max(scrollProgress * 100, 6)}%` }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
