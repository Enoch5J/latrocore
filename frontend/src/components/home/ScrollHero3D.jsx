import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Sparkles,
  TrendingUp,
  ArrowRight,
  ChevronDown
} from 'lucide-react';

// Transparent raster illustrations supplied in assets
import medicineIllustration from '../../assets/herosection-images/Friendly Medicine Reminder Companion-1.png';
import aiAssistantIllustration from '../../assets/herosection-images/Friendly woman and health assistant robot-2.png';
import progressTrackingIllustration from '../../assets/herosection-images/Doctor Tracking Glucose Trends-3.png';

// ── FEATURE SCENE CONFIGURATION ──────────────────────────────────────────
const FEATURES = [
  {
    id: 1,
    key: 'medicine',
    title: 'Medicine reminders',
    subtitle: 'Keep your prescribed routine on track.',
    description: 'Thoughtful daily alerts synchronized with your prescription routine to prevent missed doses.',
    image: medicineIllustration,
    imageAlt: 'Patient managing daily prescribed medicines with companion pill organiser',
    color: '#046A38',
    scrollRange: [0.10, 0.35],
    peakProgress: 0.22,
    badgeText: 'Prescription Routine',
  },
  {
    id: 2,
    key: 'ai-support',
    title: 'AI health support',
    subtitle: 'Ask questions. Understand your care.',
    description: 'Instant educational clarity on diabetic lab terms, dietary glycemic index, and lifestyle habits.',
    image: aiAssistantIllustration,
    imageAlt: 'Patient discussing questions with friendly AI health assistant robot',
    color: '#046A38',
    scrollRange: [0.35, 0.60],
    peakProgress: 0.47,
    badgeText: 'Educational Guidance',
  },
  {
    id: 3,
    key: 'progress-tracking',
    title: 'Progress tracking',
    subtitle: 'See your health trends over time.',
    description: 'Continuous glycemic telemetry curves, Time-in-Range tracking, and longitudinal milestones.',
    image: progressTrackingIllustration,
    imageAlt: 'Healthcare doctor reviewing patient glucose trends and longitudinal clinical progress',
    color: '#046A38',
    scrollRange: [0.60, 0.85],
    peakProgress: 0.72,
    badgeText: 'Longitudinal Telemetry',
  },
];

export default function ScrollHero3D({ isAuthenticated }) {
  const containerRef = useRef(null);
  const stickyRef = useRef(null);
  const navigate = useNavigate();

  // Scroll & Phase state
  const [scrollProgress, setScrollProgress] = useState(0); // 0.0 to 1.0
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(-1); // -1 = intro/overview, 0 = medicine, 1 = ai, 2 = progress
  const [isOverviewPhase, setIsOverviewPhase] = useState(true);

  // Viewport & accessibility state
  const [isCompact, setIsCompact] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [mouseTilt, setMouseTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Check screen size & reduced motion preference
  useEffect(() => {
    const checkViewportAndMotion = () => {
      const compact = window.innerWidth < 1024 || window.innerHeight < 680;
      setIsCompact(compact);

      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(motionQuery.matches);
    };

    checkViewportAndMotion();
    window.addEventListener('resize', checkViewportAndMotion);

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e) => setPrefersReducedMotion(e.matches);
    motionQuery.addEventListener('change', handleMotionChange);

    return () => {
      window.removeEventListener('resize', checkViewportAndMotion);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  // Optimized Scroll-linked Progress Calculator
  useEffect(() => {
    if (isCompact || prefersReducedMotion) return;

    let rafId = null;

    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalScrollable = rect.height - windowHeight;

      if (totalScrollable <= 0) return;

      const currentScroll = -rect.top;
      const rawProgress = Math.min(Math.max(currentScroll / totalScrollable, 0), 1);

      rafId = requestAnimationFrame(() => {
        setScrollProgress(rawProgress);

        // Sequence phase mapping:
        // 0.00 - 0.10: Intro overview
        // 0.10 - 0.35: Feature 1 (Medicine reminders)
        // 0.35 - 0.60: Feature 2 (AI health support)
        // 0.60 - 0.85: Feature 3 (Progress tracking)
        // 0.85 - 1.00: Complete final overview
        if (rawProgress < 0.10) {
          setActiveFeatureIndex(-1);
          setIsOverviewPhase(true);
        } else if (rawProgress >= 0.10 && rawProgress < 0.35) {
          setActiveFeatureIndex(0);
          setIsOverviewPhase(false);
        } else if (rawProgress >= 0.35 && rawProgress < 0.60) {
          setActiveFeatureIndex(1);
          setIsOverviewPhase(false);
        } else if (rawProgress >= 0.60 && rawProgress < 0.85) {
          setActiveFeatureIndex(2);
          setIsOverviewPhase(false);
        } else {
          setActiveFeatureIndex(-1);
          setIsOverviewPhase(true);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isCompact, prefersReducedMotion]);

  // Subtle 2.5D mouse parallax tilt
  const handleMouseMove = useCallback((e) => {
    if (isCompact || prefersReducedMotion || !stickyRef.current) return;
    const rect = stickyRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseTilt({ x: -(y * 6), y: x * 8 });
  }, [isCompact, prefersReducedMotion]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setMouseTilt({ x: 0, y: 0 });
  }, []);

  // Jump to specific feature stage via pill / demo button
  const scrollToStage = (featureIdx) => {
    if (isCompact || prefersReducedMotion) {
      const targetEl = document.getElementById(`feature-card-${featureIdx}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const containerTop = rect.top + scrollTop;
    const totalScrollable = rect.height - window.innerHeight;

    let targetRatio = 0.22;
    if (featureIdx === 1) targetRatio = 0.47;
    if (featureIdx === 2) targetRatio = 0.72;
    if (featureIdx === 3) targetRatio = 0.95;

    const targetY = containerTop + targetRatio * totalScrollable;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/patient/dashboard');
    } else {
      navigate('/signup?role=patient');
    }
  };

  const handleExploreDemo = () => {
    scrollToStage(0);
  };

  // Helper to compute scene dynamic styles during pinned sequence
  const getSceneTransformStyles = (index) => {
    if (isCompact || prefersReducedMotion) {
      return {
        opacity: 1,
        transform: 'none',
        transition: 'none',
      };
    }

    // In intro or complete overview, all 3 are equal
    if (isOverviewPhase || activeFeatureIndex === -1) {
      return {
        opacity: 1,
        transform: `translateY(0px) scale(1)`,
        transition: 'all 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
      };
    }

    // When a specific feature is active:
    const isActive = activeFeatureIndex === index;
    if (isActive) {
      return {
        opacity: 1,
        transform: `translateY(-14px) scale(1.035)`,
        zIndex: 20,
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      };
    }

    // Inactive scenes stay readable and softly dimmed
    return {
      opacity: 0.58,
      transform: `translateY(4px) scale(0.975)`,
      zIndex: 10,
      transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    };
  };

  return (
    <section
      ref={containerRef}
      className={`relative w-full bg-[#FAF6EF] text-slate-900 selection:bg-[#F9EBD7] selection:text-[#046A38] ${isCompact || prefersReducedMotion ? 'min-h-0 py-8 sm:py-12' : 'min-h-[260vh]'
        }`}
      aria-label="LATROCORE Connected Healthcare Overview"
    >
      {/* ── ACCESSIBLE SKIP ANIMATION LINK ── */}
      <a
        href="#care-continuum"
        className="sr-only focus:not-sr-only focus:fixed focus:top-24 focus:left-6 z-50 px-4 py-2 bg-[#046A38] text-white font-bold text-xs rounded-xl shadow-lg ring-2 ring-white transition-all outline-hidden"
      >
        Skip animation to Care Continuum
      </a>

      {/* ── PINNED DESKTOP CONTAINER (OR NATURAL FLOW ON MOBILE/REDUCED MOTION) ── */}
      <div
        ref={stickyRef}
        className={`${isCompact || prefersReducedMotion
            ? 'w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
            : 'sticky top-20 sm:top-22 h-[calc(100vh-5rem)] sm:h-[calc(100vh-5.5rem)] min-h-[580px] max-h-[840px] w-full flex flex-col justify-between overflow-hidden px-4 sm:px-6 lg:px-8 py-3 select-none'
          }`}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
      >
        {/* Subtle Background Ambiance & Warm Glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-[#046A38]/5 blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-96 h-96 rounded-full bg-[#E34222]/4 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#E8DCC8_1px,transparent_1px),linear-gradient(to_bottom,#E8DCC8_1px,transparent_1px)] bg-[size:48px_48px] opacity-25" />
        </div>

        {/* ── TOP SECTION: COMPACT HEADLINE, SUPPORTING TEXT & CTAS ── */}
        <div className="relative z-30 max-w-5xl mx-auto w-full text-center flex flex-col items-center pt-1 sm:pt-2">

          {/* Main Editorial Headline */}
          <h1 className="font-serif font-black text-3xl sm:text-4xl lg:text-[40px] xl:text-[44px] text-[#093322] tracking-tight leading-[1.12] max-w-3xl">
            A little help, throughout your day.
          </h1>

          {/* Supporting Text */}
          <p className="mt-1.5 text-xs sm:text-sm lg:text-base font-medium text-[#45556C] max-w-2xl leading-relaxed">
            Your medicines, health questions and progress, thoughtfully connected.
          </p>

          {/* Action CTAs */}
          <div className="mt-3.5 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleGetStarted}
              id="hero-get-started-btn"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#046A38] hover:bg-[#03542C] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight size={15} />
            </button>

            <button
              onClick={handleExploreDemo}
              id="hero-explore-demo-btn"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-[#F9EBD7]/60 text-[#093322] border border-[#E8DCC8] hover:border-[#046A38] text-xs sm:text-sm font-semibold transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              <span>Explore Demo</span>
              <ChevronDown size={14} className="text-[#046A38]" />
            </button>
          </div>
        </div>

        {/* ── 3 SEPARATE FEATURE SCENES (BALANCED COMPOSITION) ── */}
        <div className="relative z-20 max-w-7xl mx-auto w-full my-auto py-1">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6 items-stretch">

            {/* ══════════════════════════════════════════════════════════
                SCENE 1: MEDICINE REMINDERS
                ══════════════════════════════════════════════════════════ */}
            <div
              id="feature-card-0"
              style={getSceneTransformStyles(0)}
              className={`relative rounded-3xl bg-white border transition-all duration-300 p-5 pt-3 sm:pt-4 flex flex-col justify-between overflow-visible shadow-xs ${activeFeatureIndex === 0
                  ? 'border-[#046A38] ring-2 ring-[#046A38]/15 shadow-xl bg-gradient-to-b from-white to-[#FAF6EF]/60'
                  : 'border-[#E8DCC8] hover:border-[#046A38]/50'
                }`}
            >

              {/* 2.5D Illustration Stage with Reserved Height */}
              <div className="relative w-full h-[215px] sm:h-[230px] xl:h-[245px] flex items-center justify-center overflow-visible mt-1 mb-2">

                {/* Independent 2.5D Parallax for Illustration */}
                <div
                  className="w-full h-full flex items-center justify-center transition-transform duration-300"
                  style={{
                    transform: isHovered && activeFeatureIndex === 0
                      ? `translate(${mouseTilt.y * 0.8}px, ${mouseTilt.x * 0.8}px)`
                      : 'none',
                  }}
                >
                  <img
                    src={FEATURES[0].image}
                    alt={FEATURES[0].imageAlt}
                    width={320}
                    height={320}
                    loading="eager"
                    className="max-h-[205px] sm:max-h-[220px] xl:max-h-[235px] w-auto max-w-full object-contain drop-shadow-[0_14px_24px_rgba(4,106,56,0.10)]"
                  />
                </div>

                {/* Separate HTML Reminder Card (Revealed on active stage or mobile) */}
                <div
                  className={`absolute -top-1 -right-1 sm:-right-3 z-30 max-w-[210px] p-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#A8D7BD] shadow-lg transition-all duration-300 pointer-events-none ${activeFeatureIndex === 0 || isCompact || prefersReducedMotion
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-2 scale-95'
                    }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#E8F5EE] text-[#046A38] flex items-center justify-center shrink-0 mt-0.5">
                      <Bell
                        size={15}
                        className={activeFeatureIndex === 0 ? 'rotate-12 transition-transform duration-500' : ''}
                      />
                    </div>
                    <div className="leading-tight">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#046A38]" />
                        <span className="text-[11px] font-black text-slate-900">
                          Time for your prescribed medicine
                        </span>
                      </div>
                      <span className="text-[9.5px] font-bold text-slate-500 mt-0.5 block">
                        9:00 AM • Morning Routine
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Real HTML Content Details */}
              <div className="pt-3.5 border-t border-[#E8DCC8]/70 mt-auto flex flex-col">
                <h2 className="font-serif font-bold text-xl sm:text-[22px] text-[#093322] tracking-tight leading-snug">
                  {FEATURES[0].title}
                </h2>
                <p className="text-xs sm:text-[13px] font-bold text-[#046A38] mt-1 leading-snug">
                  {FEATURES[0].subtitle}
                </p>
                <p className="text-xs text-[#45556C] font-normal leading-relaxed mt-1.5">
                  {FEATURES[0].description}
                </p>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                SCENE 2: AI HEALTH SUPPORT
                ══════════════════════════════════════════════════════════ */}
            <div
              id="feature-card-1"
              style={getSceneTransformStyles(1)}
              className={`relative rounded-3xl bg-white border transition-all duration-300 p-5 pt-3 sm:pt-4 flex flex-col justify-between overflow-visible shadow-xs ${activeFeatureIndex === 1
                  ? 'border-[#046A38] ring-2 ring-[#046A38]/15 shadow-xl bg-gradient-to-b from-white to-[#FAF6EF]/60'
                  : 'border-[#E8DCC8] hover:border-[#046A38]/50'
                }`}
            >

              {/* 2.5D Illustration Stage with Reserved Height */}
              <div className="relative w-full h-[215px] sm:h-[230px] xl:h-[245px] flex items-center justify-center overflow-visible mt-1 mb-2">

                {/* Independent 2.5D Parallax for Illustration */}
                <div
                  className="w-full h-full flex items-center justify-center transition-transform duration-300"
                  style={{
                    transform: isHovered && activeFeatureIndex === 1
                      ? `translate(${mouseTilt.y * 0.8}px, ${mouseTilt.x * 0.8}px)`
                      : 'none',
                  }}
                >
                  <img
                    src={FEATURES[1].image}
                    alt={FEATURES[1].imageAlt}
                    width={320}
                    height={320}
                    loading="eager"
                    className="max-h-[205px] sm:max-h-[220px] xl:max-h-[235px] w-auto max-w-full object-contain drop-shadow-[0_14px_24px_rgba(4,106,56,0.10)]"
                  />
                </div>

                {/* Separate HTML Chat Bubble & Educational Guidance Tag */}
                <div
                  className={`absolute -top-1 -left-1 sm:-left-3 z-30 max-w-[215px] p-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#A8D7BD] shadow-lg transition-all duration-300 pointer-events-none ${activeFeatureIndex === 1 || isCompact || prefersReducedMotion
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-2 scale-95'
                    }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#E8F5EE] text-[#046A38] flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles size={15} />
                    </div>
                    <div className="leading-tight">
                      <p className="text-[11px] font-black text-slate-900">
                        “What does HbA1c mean?”
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-[#FAF6EF] border border-[#E8DCC8] text-[9px] font-black text-[#046A38] uppercase">
                          Educational guidance
                        </span>
                        {/* Subtle typing pulse indicator */}
                        <span className="flex items-center gap-0.5">
                          <span className="w-1 h-1 rounded-full bg-[#046A38] animate-pulse" />
                          <span className="w-1 h-1 rounded-full bg-[#046A38] animate-pulse delay-100" />
                          <span className="w-1 h-1 rounded-full bg-[#046A38] animate-pulse delay-200" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Real HTML Content Details */}
              <div className="pt-3.5 border-t border-[#E8DCC8]/70 mt-auto flex flex-col">
                <h2 className="font-serif font-bold text-xl sm:text-[22px] text-[#093322] tracking-tight leading-snug">
                  {FEATURES[1].title}
                </h2>
                <p className="text-xs sm:text-[13px] font-bold text-[#046A38] mt-1 leading-snug">
                  {FEATURES[1].subtitle}
                </p>
                <p className="text-xs text-[#45556C] font-normal leading-relaxed mt-1.5">
                  {FEATURES[1].description}
                </p>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                SCENE 3: PATIENT-PROGRESS TRACKING
                ══════════════════════════════════════════════════════════ */}
            <div
              id="feature-card-2"
              style={getSceneTransformStyles(2)}
              className={`relative rounded-3xl bg-white border transition-all duration-300 p-5 pt-3 sm:pt-4 flex flex-col justify-between overflow-visible shadow-xs ${activeFeatureIndex === 2
                  ? 'border-[#046A38] ring-2 ring-[#046A38]/15 shadow-xl bg-gradient-to-b from-white to-[#FAF6EF]/60'
                  : 'border-[#E8DCC8] hover:border-[#046A38]/50'
                }`}
            >

              {/* 2.5D Illustration Stage with Reserved Height */}
              <div className="relative w-full h-[215px] sm:h-[230px] xl:h-[245px] flex items-center justify-center overflow-visible mt-1 mb-2">

                {/* Independent 2.5D Parallax for Illustration */}
                <div
                  className="w-full h-full flex items-center justify-center transition-transform duration-300"
                  style={{
                    transform: isHovered && activeFeatureIndex === 2
                      ? `translate(${mouseTilt.y * 0.8}px, ${mouseTilt.x * 0.8}px)`
                      : 'none',
                  }}
                >
                  <img
                    src={FEATURES[2].image}
                    alt={FEATURES[2].imageAlt}
                    width={320}
                    height={320}
                    loading="eager"
                    className="max-h-[205px] sm:max-h-[220px] xl:max-h-[235px] w-auto max-w-full object-contain drop-shadow-[0_14px_24px_rgba(4,106,56,0.10)]"
                  />
                </div>

                {/* Complementary Separate SVG Trend Card (Demo) */}
                <div
                  className={`absolute -top-1 -right-1 sm:-right-3 z-30 max-w-[215px] p-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#A8D7BD] shadow-lg transition-all duration-300 pointer-events-none ${activeFeatureIndex === 2 || isCompact || prefersReducedMotion
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-2 scale-95'
                    }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp size={13} className="text-[#046A38]" />
                      <span className="text-[11px] font-black text-slate-900">
                        Glucose Trends
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-md bg-[#FAF6EF] border border-[#E8DCC8] text-[9px] font-black text-slate-600 uppercase">
                      Demo
                    </span>
                  </div>

                  {/* Complementary Clean SVG Line Chart */}
                  <div className="w-full h-9 bg-[#E8F5EE]/50 rounded-lg p-1 flex items-center">
                    <svg viewBox="0 0 100 24" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#046A38" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#046A38" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0 16 Q 18 10, 35 14 T 70 8 T 100 6"
                        fill="none"
                        stroke="#046A38"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <circle cx="100" cy="6" r="2.5" fill="#046A38" />
                    </svg>
                  </div>

                  <div className="flex items-center justify-between text-[9.5px] font-bold text-slate-600 mt-1.5">
                    <span>Target 70–180 mg/dL</span>
                    <span className="text-[#046A38] font-black">88% in range</span>
                  </div>
                </div>

              </div>

              {/* Real HTML Content Details */}
              <div className="pt-3.5 border-t border-[#E8DCC8]/70 mt-auto flex flex-col">
                <h2 className="font-serif font-bold text-xl sm:text-[22px] text-[#093322] tracking-tight leading-snug">
                  {FEATURES[2].title}
                </h2>
                <p className="text-xs sm:text-[13px] font-bold text-[#046A38] mt-1 leading-snug">
                  {FEATURES[2].subtitle}
                </p>
                <p className="text-xs text-[#45556C] font-normal leading-relaxed mt-1.5">
                  {FEATURES[2].description}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* ── BOTTOM VIEWPORT BAR: INTERACTION CUE & PROGRESS BAR ── */}
        {!isCompact && !prefersReducedMotion && (
          <div className="relative z-30 max-w-7xl mx-auto w-full flex items-center justify-between pb-1 border-t border-[#E8DCC8]/70 pt-2 text-[11px] font-bold text-slate-600">
            {/* Scroll Direction / Status Hint */}
            <div className="flex items-center gap-2.5">
              <div className="w-4 h-6 rounded-full border-2 border-[#046A38] flex items-start justify-center p-0.5">
                <div className="w-1 h-1.5 rounded-full bg-[#046A38] animate-bounce" />
              </div>
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-700">
                {activeFeatureIndex === -1 && scrollProgress < 0.1
                  ? 'Scroll down to explore features'
                  : activeFeatureIndex === 0
                    ? 'Medicine Reminders'
                    : activeFeatureIndex === 1
                      ? 'AI Health Support'
                      : activeFeatureIndex === 2
                        ? 'Progress Tracking'
                        : 'Continue scrolling for Care Continuum'}
              </span>
            </div>

            {/* Visual Scrubbed Scroll Meter */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-[#046A38] tracking-wider uppercase">
                {Math.round(scrollProgress * 100)}% EXPLORED
              </span>
              <div className="w-28 sm:w-36 h-1.5 rounded-full bg-[#E8DCC8] overflow-hidden">
                <div
                  className="h-full bg-[#046A38] transition-all duration-150 rounded-full"
                  style={{ width: `${Math.max(scrollProgress * 100, 5)}%` }}
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
