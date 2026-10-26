import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Activity,
  Pill,
  Sparkles,
  TrendingDown,
  Clock,
  ShieldCheck,
  Droplets
} from 'lucide-react';
import bannerImg1 from '../../assets/images/banner-img-1.png';
import bannerImg2 from '../../assets/images/banner-img-2.png';
import bannerImg3 from '../../assets/images/banner-img-3.png';
import bannerImg4 from '../../assets/images/banner-img-4.png';

const BANNER_SLIDES = [
  {
    id: 1,
    titleText: 'Diabetes care, connected.',
    title: (
      <>
        <span className="text-[#093322]">Diabetes care,</span>
        <br />
        <span className="text-[#D84315]">connected.</span>
      </>
    ),
    subtitle: 'Keep your medicines, health records and care team together in real-time.',
    image: bannerImg1,
    buttonText: 'Explore LATROCORE',
    route: '/dashboard',
    hash: '#workstations',
    badge1: {
      icon: Activity,
      label: 'Continuous Glucose',
      value: '112 mg/dL',
      sub: 'Optimal Target',
      status: 'emerald',
    },
    badge2: {
      icon: Sparkles,
      label: 'Time in Range',
      value: '88%',
      sub: 'Target > 70% • Stable',
      status: 'emerald',
    },
  },
  {
    id: 2,
    titleText: 'Stay on track with your medicines.',
    title: (
      <span className="text-[#093322]">
        Stay on track
        <br />
        with your medicines.
      </span>
    ),
    subtitle: 'Prescription schedules, missed-dose logs and automated refill reminders.',
    image: bannerImg2,
    buttonText: 'Explore Medication Tools',
    route: '/patient/dashboard',
    hash: '#workstations',
    badge1: {
      icon: Pill,
      label: 'Reconciled Schedule',
      value: 'Metformin 500mg',
      sub: 'Taken 08:30 AM',
      status: 'emerald',
    },
    badge2: {
      icon: Clock,
      label: 'Next Scheduled Dose',
      value: '08:00 PM',
      sub: 'Glimepiride 1mg with dinner',
      status: 'vermilion',
    },
  },
  {
    id: 3,
    titleText: 'See your health trends clearly.',
    title: (
      <span className="text-[#093322]">
        See your health
        <br />
        trends clearly.
      </span>
    ),
    subtitle: 'Track glucose and other health measures. Keep check-ups and investigations in view.',
    image: bannerImg3,
    buttonText: 'Explore Health Tracking',
    route: '/patient/investigations',
    hash: '#workstations',
    badge1: {
      icon: TrendingDown,
      label: '90-Day Trajectory',
      value: 'HbA1c 6.4%',
      sub: '↓ -0.8% Improvement',
      status: 'emerald',
    },
    badge2: {
      icon: Droplets,
      label: 'Fasting Average',
      value: '104 mg/dL',
      sub: 'Telemetry Synced Daily',
      status: 'emerald',
    },
  },
  {
    id: 4,
    titleText: 'Understand your care, in your language.',
    title: (
      <span className="text-[#093322]">
        Understand your care,
        <br />
        in your language.
      </span>
    ),
    subtitle: 'Diabetes education in English, Tamil and Hindi, with clinical follow-up.',
    note: 'AI guides. Healthcare professionals make clinical decisions.',
    image: bannerImg4,
    buttonText: 'Explore Care Support',
    route: '/overview',
    hash: '#doctors',
    badge1: {
      icon: Sparkles,
      label: 'Clinical AI Companion',
      value: 'English • தமிழ் • हिन्दी',
      sub: 'Interactive Patient Guidance',
      status: 'emerald',
    },
    badge2: {
      icon: ShieldCheck,
      label: 'Physician Supervised',
      value: 'MD Reviewed',
      sub: 'Endocrinology Protocol',
      status: 'emerald',
    },
  },
];

export default function HeroBannerCarousel({ isAuthenticated, onGuidedDemo }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [touchStartX, setTouchStartX] = useState(null);
  const timerRef = useRef(null);
  const carouselRef = useRef(null);
  const navigate = useNavigate();

  // Autoplay timer: 6s
  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % BANNER_SLIDES.length);
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused]);

  // Smooth mouse tilt tracking for interactive 3D spatial depth
  const handleMouseMove = (e) => {
    if (!carouselRef.current) return;
    const rect = carouselRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5
    setTilt({ x: -(y * 12), y: x * 15 });
  };

  const handleMouseEnter = () => {
    setIsPaused(true);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  const handlePrev = (e) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + BANNER_SLIDES.length) % BANNER_SLIDES.length);
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % BANNER_SLIDES.length);
  };

  const handleDotClick = (index, e) => {
    e?.stopPropagation();
    setCurrentIndex(index);
  };

  const handleSlideAction = (slide) => {
    if (slide.id === 1) {
      if (isAuthenticated) {
        navigate('/dashboard');
      } else if (onGuidedDemo) {
        onGuidedDemo();
      } else {
        navigate('/login');
      }
      return;
    }

    if (slide.hash && document.querySelector(slide.hash)) {
      document.querySelector(slide.hash).scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (isAuthenticated) {
      navigate(slide.route);
    } else {
      navigate('/login');
    }
  };

  // Touch swipe support
  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
    setTouchStartX(null);
  };

  return (
    <div
      ref={carouselRef}
      className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-[#E8DCC8] shadow-sm hover:shadow-xl transition-all duration-300 select-none group bg-[#FDEFDF]"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="region"
      aria-label="Latrocore Hero Banners Carousel"
    >
      {/* ── BANNER SLIDES ── */}
      <div className="relative w-full min-h-[270px] sm:min-h-[300px] md:min-h-[340px] lg:min-h-[370px]">
        {BANNER_SLIDES.map((slide, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {/* Inner 2-Column Responsive Layout */}
              <div className="grid grid-cols-1 md:grid-cols-12 h-full items-center">
                
                {/* ── LEFT COLUMN: REAL HTML/CSS CONTENT ── */}
                <div className="md:col-span-6 lg:col-span-7 flex flex-col justify-center space-y-2 sm:space-y-2.5 md:space-y-3.5 p-4 sm:p-6 md:p-8 lg:pl-12 lg:pr-4 z-10">
                  {/* Brand Kicker + 3D Indicator */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-[11px] font-serif font-bold tracking-[0.25em] text-slate-600 uppercase">
                      LATROCORE
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/80 border border-[#A8D7BD] text-[9px] font-bold text-[#046A38] shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#046A38] animate-ping" />
                      <span>3D Telemetry</span>
                    </span>
                  </div>

                  {/* Main Serif Headline */}
                  <h2 className="font-serif font-bold text-2xl sm:text-3xl md:text-3.5xl lg:text-[40px] leading-[1.12] tracking-tight">
                    {slide.title}
                  </h2>

                  {/* Subtitle Description */}
                  <p className="text-xs sm:text-sm font-normal text-slate-700 leading-relaxed max-w-lg">
                    {slide.subtitle}
                  </p>

                  {/* Real Clickable CTA Button */}
                  <div className="pt-0.5 sm:pt-1">
                    <button
                      onClick={() => handleSlideAction(slide)}
                      className="inline-flex items-center gap-2 px-5 sm:px-7 py-2 sm:py-2.5 rounded-full bg-[#D84315] hover:bg-[#BF360C] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                    >
                      <span>{slide.buttonText}</span>
                      <span className="text-sm font-bold">→</span>
                    </button>
                    {slide.note && (
                      <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-1 sm:mt-1.5">
                        {slide.note}
                      </p>
                    )}
                  </div>
                </div>

                {/* ── RIGHT COLUMN: INTERACTIVE 3D HOLOGRAPHIC STAGE ── */}
                <div className="md:col-span-6 lg:col-span-5 relative flex items-center justify-center md:justify-end h-full min-h-[210px] sm:min-h-[250px] md:min-h-[290px] p-2 sm:p-4 md:pr-8 lg:pr-12 perspective-1200 overflow-visible">
                  
                  {/* Dynamic 3D Spatial Canvas */}
                  <div
                    className="relative w-full max-w-[320px] sm:max-w-[360px] md:max-w-[400px] h-[200px] sm:h-[240px] md:h-[280px] flex items-center justify-center preserve-3d"
                    style={{
                      transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                      transition: isHovered
                        ? 'transform 0.12s ease-out'
                        : 'transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    }}
                  >
                    {/* Layer 1: Ambient Emerald Volumetric Glow (Deepest Z) */}
                    <div
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-radial from-[#046A38]/30 via-[#046A38]/10 to-transparent blur-2xl pointer-events-none animate-glow-pulse"
                      style={{ transform: 'translateZ(-30px)' }}
                    />

                    {/* Layer 2: Rotating Concentric Telemetry Radar Ring */}
                    <div
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 sm:w-64 sm:h-64 rounded-full border border-dashed border-[#A8D7BD]/60 pointer-events-none animate-spin-slow"
                      style={{ transform: 'translateZ(-15px)' }}
                    >
                      {/* Revolving Orbit Vertex Dot */}
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#E34222] shadow-[0_0_10px_#E34222]" />
                    </div>

                    {/* Layer 3: Dark Emerald Arch Backdrop (Strictly behind graphic) */}
                    <div
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full bg-gradient-to-br from-[#093322] to-[#046A38] opacity-90 shadow-xl pointer-events-none"
                      style={{
                        transform: `translateZ(-5px) translateX(${tilt.y * -0.3}px)`,
                      }}
                    />

                    {/* Layer 4: Undulating Glycemic Wave Ribbon */}
                    <div
                      className="absolute inset-x-2 bottom-2 sm:bottom-4 h-14 pointer-events-none opacity-85 z-0"
                      style={{
                        transform: `translateZ(15px) translateY(${tilt.x * -0.4}px)`,
                      }}
                    >
                      <svg viewBox="0 0 300 70" className="w-full h-full fill-none overflow-visible">
                        <path
                          d="M 10,42 Q 50,18 90,44 T 170,26 T 240,50 T 290,22"
                          stroke="url(#emeraldRibbonGrad)"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          className="drop-shadow-[0_2px_8px_rgba(4,106,56,0.6)]"
                        />
                        <defs>
                          <linearGradient id="emeraldRibbonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#72BC97" stopOpacity="0.3" />
                            <stop offset="50%" stopColor="#046A38" stopOpacity="1" />
                            <stop offset="80%" stopColor="#E34222" stopOpacity="1" />
                            <stop offset="100%" stopColor="#046A38" stopOpacity="0.8" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>

                    {/* Layer 5: Central Floating 3D Graphic (In front of arch) */}
                    <div
                      className="relative z-10 flex items-center justify-center animate-float-3d"
                      style={{
                        transform: `translateZ(40px) scale(${1 + Math.abs(tilt.x) * 0.005})`,
                      }}
                    >
                      <img
                        src={slide.image}
                        alt={slide.titleText}
                        className="w-full max-w-[170px] sm:max-w-[210px] md:max-w-[250px] lg:max-w-[280px] h-auto object-contain drop-shadow-[0_18px_25px_rgba(0,0,0,0.25)] transition-transform duration-300 hover:scale-105"
                        loading={idx === 0 ? 'eager' : 'lazy'}
                      />
                    </div>

                    {/* Layer 6: Floating 3D Telemetry HUD Card 1 (Top-Left) */}
                    {slide.badge1 && (
                      <div
                        className="absolute top-1 sm:top-3 left-2 sm:left-4 z-20 flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 sm:py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E8DCC8] shadow-md transition-transform duration-150 animate-float-3d pointer-events-none whitespace-nowrap"
                        style={{
                          transform: `translateZ(65px) translateX(${tilt.y * 1.2}px) translateY(${tilt.x * 1.2}px)`,
                        }}
                      >
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            slide.badge1.status === 'vermilion'
                              ? 'bg-[#FDECE8] text-[#E34222]'
                              : 'bg-[#E8F5EE] text-[#046A38]'
                          }`}
                        >
                          <slide.badge1.icon size={15} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] sm:text-[11px] font-black text-slate-900 leading-tight">
                              {slide.badge1.value}
                            </span>
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                slide.badge1.status === 'vermilion'
                                  ? 'bg-[#E34222] animate-ping'
                                  : 'bg-[#046A38] animate-ping'
                              }`}
                            />
                          </div>
                          <p className="text-[9px] text-slate-500 font-semibold leading-none mt-0.5">
                            {slide.badge1.label}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Layer 7: Floating 3D Telemetry HUD Card 2 (Bottom-Right) */}
                    {slide.badge2 && (
                      <div
                        className="absolute bottom-1 sm:bottom-3 right-4 sm:right-8 z-20 flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 sm:py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E8DCC8] shadow-md transition-transform duration-150 animate-float-3d-reverse pointer-events-none whitespace-nowrap"
                        style={{
                          transform: `translateZ(75px) translateX(${tilt.y * -1.3}px) translateY(${tilt.x * -1.3}px)`,
                        }}
                      >
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            slide.badge2.status === 'vermilion'
                              ? 'bg-[#FDECE8] text-[#E34222]'
                              : 'bg-[#E8F5EE] text-[#046A38]'
                          }`}
                        >
                          <slide.badge2.icon size={15} />
                        </div>
                        <div>
                          <span className="text-[10px] sm:text-[11px] font-black text-slate-900 leading-tight block">
                            {slide.badge2.value}
                          </span>
                          <p className="text-[9px] text-slate-500 font-semibold leading-none mt-0.5">
                            {slide.badge2.sub}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* ── PREVIOUS SLIDE BUTTON ── */}
        <button
          onClick={handlePrev}
          className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-white/90 hover:bg-white text-slate-800 border border-[#E8DCC8] shadow-md flex items-center justify-center opacity-70 sm:opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
          aria-label="Previous banner slide"
        >
          <ChevronLeft size={20} className="text-[#046A38] stroke-[2.5]" />
        </button>

        {/* ── NEXT SLIDE BUTTON ── */}
        <button
          onClick={handleNext}
          className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-white/90 hover:bg-white text-slate-800 border border-[#E8DCC8] shadow-md flex items-center justify-center opacity-70 sm:opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
          aria-label="Next banner slide"
        >
          <ChevronRight size={20} className="text-[#046A38] stroke-[2.5]" />
        </button>

        {/* ── PAGINATION DOTS (BOTTOM CENTER) ── */}
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-3 sm:bottom-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/5 backdrop-blur-2xs"
          role="tablist"
          aria-label="Banner slides"
        >
          {BANNER_SLIDES.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={(e) => handleDotClick(idx, e)}
              className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentIndex
                  ? 'w-5 sm:w-6 bg-[#D84315] shadow-xs'
                  : 'w-2 sm:w-2.5 bg-[#B8C8BC] hover:bg-[#8EA693]'
              }`}
              role="tab"
              aria-selected={idx === currentIndex}
              aria-label={`Go to slide ${idx + 1}: ${slide.titleText}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

